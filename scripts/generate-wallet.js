const fs = require('fs');
const path = require('path');
const { generatePrivateKey, privateKeyToAccount } = require('viem/accounts');

function generate() {
  const envPath = path.resolve(__dirname, '../.env');
  
  if (fs.existsSync(envPath)) {
    console.log('.env file already exists. Skipping generation.');
    return;
  }

  const pkey = generatePrivateKey();
  const account = privateKeyToAccount(pkey);

  const envContent = `# RentDrive Environment Variables

# Supabase Configurations (Optional for local testing, set these if using Supabase)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Circle Developer Platform API (Set these from console.circle.com)
CIRCLE_API_KEY=
CIRCLE_ENTITY_SECRET=

# Wallet Private Key for Oracle/Admin updates & Deployment
PRIVATE_KEY=${pkey}

# Arc Network Configuration
ARC_TESTNET_RPC_URL=https://rpc.testnet.arc.network
NEXT_PUBLIC_USDC_TOKEN_ADDRESS=0x3600000000000000000000000000000000000000

# RainbowKit Wallet Connect Project ID
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=cb4474775d710b77626922d56a2bb215

# Deployed Contract Address (Fill this after deployment)
NEXT_PUBLIC_RENTDRIVE_CONTRACT_ADDRESS=
`;

  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('Generated a new Admin/Oracle Wallet for RentDrive!');
  console.log(`Wallet Address: ${account.address}`);
  console.log('This has been saved to your local .env file.');
  console.log('Please fund this wallet with Gas USDC from https://faucet.circle.com to deploy the contract.');
}

generate();
