import { NextRequest, NextResponse } from 'next/server';
import { getIndicativeRate, type CurrencySymbol, CURRENCY_CONFIG } from '@/lib/stablefx';
import { Address, createWalletClient, http, createPublicClient, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// We import dynamically to ensure it runs only in Node.js environment
async function executeOnChainSwap(
  tokenIn: CurrencySymbol,
  tokenOut: CurrencySymbol,
  amountIn: string,
  recipientAddress: string
) {
  const privateKey = process.env.PRIVATE_KEY;
  const kitKey = process.env.CIRCLE_KIT_KEY;

  if (!privateKey || !kitKey) {
    throw new Error('Missing PRIVATE_KEY or CIRCLE_KIT_KEY env vars');
  }

  // Load App Kit dynamically
  const { AppKit } = await import('@circle-fin/app-kit');
  const { createViemAdapterFromPrivateKey } = await import('@circle-fin/adapter-viem-v2');

  const kit = new AppKit();
  const adapter = createViemAdapterFromPrivateKey({
    privateKey: privateKey as `0x${string}`,
  });

  console.log(`[Swap Relayer] Swapping ${amountIn} ${tokenIn} -> ${tokenOut} on Arc_Testnet...`);
  
  // 1. Perform Swap via Circle App Kit on Arc Testnet
  const swapResult = await kit.swap({
    from: { adapter, chain: 'Arc_Testnet' },
    tokenIn,
    tokenOut,
    amountIn,
    config: {
      kitKey: kitKey,
      slippageBps: 200, // 2% slippage tolerance
    },
  });

  console.log('[Swap Relayer] Swap finished. txHash:', swapResult.txHash);

  // 2. Transfer swapped tokens to recipient address on-chain
  const amountOut = swapResult.amountOut || '0';
  const tokenOutAddress = CURRENCY_CONFIG[tokenOut].address;

  const rpcUrl = process.env.ARC_TESTNET_RPC_URL || 'https://rpc.testnet.arc.network';
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  
  const walletClient = createWalletClient({
    account,
    chain: {
      id: 57073, // Arc Testnet
      name: 'Arc Testnet',
      nativeCurrency: { name: 'USD Coin', symbol: 'USDC', decimals: 18 },
      rpcUrls: { default: { http: [rpcUrl] } },
    },
    transport: http(),
  });

  const publicClient = createPublicClient({
    chain: {
      id: 57073,
      name: 'Arc Testnet',
      nativeCurrency: { name: 'USD Coin', symbol: 'USDC', decimals: 18 },
      rpcUrls: { default: { http: [rpcUrl] } },
    },
    transport: http(),
  });

  // ERC-20 transfer ABI
  const erc20TransferAbi = [
    {
      name: 'transfer',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'recipient', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
      outputs: [{ type: 'bool' }],
    },
  ];

  const decimals = CURRENCY_CONFIG[tokenOut].decimals;
  const parsedAmountOut = parseUnits(amountOut, decimals);

  console.log(`[Swap Relayer] Transferring ${amountOut} ${tokenOut} to ${recipientAddress}...`);
  const transferHash = await walletClient.writeContract({
    address: tokenOutAddress as Address,
    abi: erc20TransferAbi,
    functionName: 'transfer',
    args: [recipientAddress as Address, parsedAmountOut],
  });

  await publicClient.waitForTransactionReceipt({ hash: transferHash });
  console.log('[Swap Relayer] Transfer completed. txHash:', transferHash);

  return {
    txHash: swapResult.txHash,
    transferHash,
    amountOut,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tokenIn, tokenOut, amountIn, recipientAddress } = body;

    if (!tokenIn || !tokenOut || !amountIn || !recipientAddress) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    if (tokenIn === tokenOut) {
      return NextResponse.json({ error: 'Source and target tokens must differ' }, { status: 400 });
    }

    // Get live FX rates from StableFX
    const rateData = await getIndicativeRate(tokenIn as CurrencySymbol, tokenOut as CurrencySymbol, amountIn);
    const estimatedAmountOut = (parseFloat(amountIn) * rateData.rate).toFixed(6);

    try {
      // Attempt on-chain swap
      const chainResult = await executeOnChainSwap(
        tokenIn as CurrencySymbol,
        tokenOut as CurrencySymbol,
        amountIn,
        recipientAddress
      );

      return NextResponse.json({
        success: true,
        source: 'onchain',
        txHash: chainResult.txHash,
        transferHash: chainResult.transferHash,
        amountIn,
        amountOut: chainResult.amountOut,
        rate: rateData.rate,
      });

    } catch (err: any) {
      console.error('[Swap API] Onchain execution failed:', err.message);

      return NextResponse.json({
        success: false,
        error: `On-chain stablecoin swap failed: ${err.message}`
      }, { status: 500 });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
