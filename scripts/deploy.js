require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createWalletClient, createPublicClient, http } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { arcTestnet } = require('viem/chains');

async function deploy() {
  const artifactPath = path.resolve(__dirname, '../src/contracts/RentDrive.json');
  const nftArtifactPath = path.resolve(__dirname, '../src/contracts/VehicleNFT.json');
  const poolArtifactPath = path.resolve(__dirname, '../src/contracts/InsurancePool.json');
  const oracleArtifactPath = path.resolve(__dirname, '../src/contracts/OracleRegistry.json');

  if (
    !fs.existsSync(artifactPath) ||
    !fs.existsSync(nftArtifactPath) ||
    !fs.existsSync(poolArtifactPath) ||
    !fs.existsSync(oracleArtifactPath)
  ) {
    console.error('Artifacts not found. Please run: node scripts/compile.js');
    process.exit(1);
  }

  const { abi: rentDriveAbi, bytecode: rentDriveBytecode } = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const { abi: nftAbi, bytecode: nftBytecode } = JSON.parse(fs.readFileSync(nftArtifactPath, 'utf8'));
  const { abi: poolAbi, bytecode: poolBytecode } = JSON.parse(fs.readFileSync(poolArtifactPath, 'utf8'));
  const { abi: oracleAbi, bytecode: oracleBytecode } = JSON.parse(fs.readFileSync(oracleArtifactPath, 'utf8'));

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('PRIVATE_KEY environment variable is missing.');
    process.exit(1);
  }

  const rpcUrl = process.env.ARC_TESTNET_RPC_URL || 'https://rpc.testnet.arc.network';
  const usdcTokenAddress = process.env.NEXT_PUBLIC_USDC_TOKEN_ADDRESS || '0x3600000000000000000000000000000000000000';
  const eurcTokenAddress = process.env.NEXT_PUBLIC_EURC_TOKEN_ADDRESS || '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a';

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

  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   RentDrive Stack Deployment (Arc Testnet)       ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`  Deployer:     ${account.address}`);
  console.log(`  USDC Token:   ${usdcTokenAddress}`);
  console.log(`  EURC Token:   ${eurcTokenAddress}`);
  console.log(`  RPC:          ${rpcUrl}`);
  console.log(`  Chain ID:     ${arcTestnet.id}`);
  console.log('');

  try {
    // 1. Deploy VehicleNFT
    console.log('1. Deploying VehicleNFT...');
    const nftHash = await walletClient.deployContract({
      abi: nftAbi,
      bytecode: nftBytecode.startsWith('0x') ? nftBytecode : `0x${nftBytecode}`,
    });
    console.log(`   Tx Hash:     ${nftHash}`);
    const nftReceipt = await publicClient.waitForTransactionReceipt({ hash: nftHash });
    const nftAddress = nftReceipt.contractAddress;
    console.log(`   VehicleNFT:  ${nftAddress}`);
    console.log('');

    // 2. Deploy InsurancePool
    console.log('2. Deploying InsurancePool...');
    const poolHash = await walletClient.deployContract({
      abi: poolAbi,
      bytecode: poolBytecode.startsWith('0x') ? poolBytecode : `0x${poolBytecode}`,
      args: [usdcTokenAddress],
    });
    console.log(`   Tx Hash:     ${poolHash}`);
    const poolReceipt = await publicClient.waitForTransactionReceipt({ hash: poolHash });
    const poolAddress = poolReceipt.contractAddress;
    console.log(`   InsurancePool: ${poolAddress}`);
    console.log('');

    // 3. Deploy RentDriveV2
    console.log('3. Deploying RentDriveV2...');
    const rentDriveHash = await walletClient.deployContract({
      abi: rentDriveAbi,
      bytecode: rentDriveBytecode.startsWith('0x') ? rentDriveBytecode : `0x${rentDriveBytecode}`,
      args: [usdcTokenAddress, eurcTokenAddress, nftAddress],
    });
    console.log(`   Tx Hash:     ${rentDriveHash}`);
    const rentDriveReceipt = await publicClient.waitForTransactionReceipt({ hash: rentDriveHash });
    const rentDriveAddress = rentDriveReceipt.contractAddress;
    console.log(`   RentDriveV2: ${rentDriveAddress}`);
    console.log('');

    // 4. Deploy OracleRegistry
    console.log('4. Deploying OracleRegistry...');
    const oracleHash = await walletClient.deployContract({
      abi: oracleAbi,
      bytecode: oracleBytecode.startsWith('0x') ? oracleBytecode : `0x${oracleBytecode}`,
    });
    console.log(`   Tx Hash:     ${oracleHash}`);
    const oracleReceipt = await publicClient.waitForTransactionReceipt({ hash: oracleHash });
    const oracleAddress = oracleReceipt.contractAddress;
    console.log(`   OracleRegistry: ${oracleAddress}`);
    console.log('');

    // 5. Link RentDriveV2 to VehicleNFT
    console.log('5. Linking RentDriveV2 to VehicleNFT...');
    const { request: nftRequest } = await publicClient.simulateContract({
      address: nftAddress,
      abi: nftAbi,
      functionName: 'setRentDrive',
      args: [rentDriveAddress],
      account,
    });
    const linkNftHash = await walletClient.writeContract(nftRequest);
    console.log(`   Tx Hash:     ${linkNftHash}`);
    await publicClient.waitForTransactionReceipt({ hash: linkNftHash });
    console.log('   RentDrive linked to NFT successfully!');
    console.log('');

    // 6. Link RentDriveV2 to InsurancePool
    console.log('6. Linking RentDriveV2 to InsurancePool...');
    const { request: poolRequest } = await publicClient.simulateContract({
      address: poolAddress,
      abi: poolAbi,
      functionName: 'setRentDrive',
      args: [rentDriveAddress],
      account,
    });
    const linkPoolHash = await walletClient.writeContract(poolRequest);
    console.log(`   Tx Hash:     ${linkPoolHash}`);
    await publicClient.waitForTransactionReceipt({ hash: linkPoolHash });
    console.log('   RentDrive linked to InsurancePool successfully!');
    console.log('');

    // 7. Set InsurancePool on RentDriveV2
    console.log('7. Configuring InsurancePool in RentDriveV2...');
    const { request: rentDriveRequest } = await publicClient.simulateContract({
      address: rentDriveAddress,
      abi: rentDriveAbi,
      functionName: 'setInsurancePool',
      args: [poolAddress],
      account,
    });
    const configPoolHash = await walletClient.writeContract(rentDriveRequest);
    console.log(`   Tx Hash:     ${configPoolHash}`);
    await publicClient.waitForTransactionReceipt({ hash: configPoolHash });
    console.log('   InsurancePool configured in RentDrive successfully!');
    console.log('');

    // 8. Set OracleRegistry on RentDriveV2
    console.log('8. Configuring OracleRegistry in RentDriveV2...');
    const { request: rentDriveOracleRequest } = await publicClient.simulateContract({
      address: rentDriveAddress,
      abi: rentDriveAbi,
      functionName: 'setOracleRegistry',
      args: [oracleAddress],
      account,
    });
    const configOracleHash = await walletClient.writeContract(rentDriveOracleRequest);
    console.log(`   Tx Hash:     ${configOracleHash}`);
    await publicClient.waitForTransactionReceipt({ hash: configOracleHash });
    console.log('   OracleRegistry configured in RentDrive successfully!');
    console.log('');

    // 9. Register 3 default oracle nodes as ERC-8004 AI agents
    console.log('9. Registering 3 Oracle Agents on-chain (ERC-8004 compliant)...');
    
    // We register the deployer as Oracle 1
    const oracleAddressesList = [
      account.address,
      '0x1234567890123456789012345678901234567891', // dummy oracle 2
      '0x1234567890123456789012345678901234567892'  // dummy oracle 3
    ];

    for (let i = 0; i < oracleAddressesList.length; i++) {
      const address = oracleAddressesList[i];
      const metadataCard = JSON.stringify({
        name: `RentDrive Telemetry Oracle Agent #${i + 1}`,
        description: `ERC-8004 registered AI agent validating telematics for RentDrive`,
        version: "1.0.0",
        capabilities: ["telemetry_validation", "crash_sensor_readings", "geofence_checks"],
        endpoints: {
          mcp: `https://agent-oracle-${i + 1}.rentdrive.io/mcp`,
          api: `https://agent-oracle-${i + 1}.rentdrive.io/api`
        }
      });
      const uri = `data:application/json;base64,${Buffer.from(metadataCard).toString('base64')}`;

      console.log(`   Registering Oracle #${i + 1}: ${address}`);
      const { request: regRequest } = await publicClient.simulateContract({
        address: oracleAddress,
        abi: oracleAbi,
        functionName: 'registerAgent',
        args: [address, uri],
        account,
      });
      const regTx = await walletClient.writeContract(regRequest);
      await publicClient.waitForTransactionReceipt({ hash: regTx });
      console.log(`   Registered NFT Token ID #${i + 1}`);
    }
    console.log('');

    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║              DEPLOYMENT SUCCESSFUL               ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log(`  RentDrive:      ${rentDriveAddress}`);
    console.log(`  VehicleNFT:     ${nftAddress}`);
    console.log(`  InsurancePool:  ${poolAddress}`);
    console.log(`  OracleRegistry: ${oracleAddress}`);
    console.log('');
    console.log('  → Copy addresses to .env:');
    console.log(`  NEXT_PUBLIC_RENTDRIVE_CONTRACT_ADDRESS=${rentDriveAddress}`);
    console.log(`  NEXT_PUBLIC_VEHICLE_NFT_ADDRESS=${nftAddress}`);
    console.log(`  NEXT_PUBLIC_INSURANCE_POOL_ADDRESS=${poolAddress}`);
    console.log(`  NEXT_PUBLIC_ORACLE_REGISTRY_ADDRESS=${oracleAddress}`);
    console.log('');
  } catch (error) {
    console.error('Deployment failed:', error.message || error);
    process.exit(1);
  }
}

deploy();
