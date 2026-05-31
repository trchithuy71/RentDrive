require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createWalletClient, createPublicClient, http } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { arcTestnet } = require('viem/chains');

async function deploy() {
  const artifactPath = path.resolve(__dirname, '../src/contracts/RentDrive.json');
  if (!fs.existsSync(artifactPath)) {
    console.error('Artifact not found. Please run compile.js first.');
    process.exit(1);
  }

  const { abi, bytecode } = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('PRIVATE_KEY environment variable is missing.');
    process.exit(1);
  }

  const rpcUrl = process.env.ARC_TESTNET_RPC_URL || 'https://rpc.testnet.arc.network';
  const usdcTokenAddress = process.env.NEXT_PUBLIC_USDC_TOKEN_ADDRESS || '0x3600000000000000000000000000000000000000';

  // Ensure privateKey has 0x prefix if not already present
  const formattedPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  const account = privateKeyToAccount(formattedPrivateKey);

  const publicClient = createPublicClient({
    chain: arcTestnet,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain: arcTestnet,
    transport: http(rpcUrl),
  });

  console.log(`Deploying from account: ${account.address}`);
  console.log(`USDC Token Address: ${usdcTokenAddress}`);

  try {
    const hash = await walletClient.deployContract({
      abi,
      bytecode: bytecode.startsWith('0x') ? bytecode : `0x${bytecode}`,
      args: [usdcTokenAddress],
    });

    console.log(`Deployment transaction sent. Hash: ${hash}`);
    console.log('Waiting for transaction to be mined...');

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`Contract successfully deployed!`);
    console.log(`Contract Address: ${receipt.contractAddress}`);
    console.log(`Transaction Status: ${receipt.status}`);
  } catch (error) {
    console.error('Deployment failed:', error);
  }
}

deploy();
