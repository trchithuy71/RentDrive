const fs = require('fs');
const path = require('path');
const solc = require('solc');

async function compile() {
  const rentDrivePath = path.resolve(__dirname, '../src/contracts/RentDriveV2.sol');
  const rentDriveSource = fs.readFileSync(rentDrivePath, 'utf8');

  const nftPath = path.resolve(__dirname, '../src/contracts/VehicleNFT.sol');
  const nftSource = fs.readFileSync(nftPath, 'utf8');

  const poolPath = path.resolve(__dirname, '../src/contracts/InsurancePool.sol');
  const poolSource = fs.readFileSync(poolPath, 'utf8');

  const oraclePath = path.resolve(__dirname, '../src/contracts/OracleRegistry.sol');
  const oracleSource = fs.readFileSync(oraclePath, 'utf8');

  const input = {
    language: 'Solidity',
    sources: {
      'RentDriveV2.sol': {
        content: rentDriveSource,
      },
      'VehicleNFT.sol': {
        content: nftSource,
      },
      'InsurancePool.sol': {
        content: poolSource,
      },
      'OracleRegistry.sol': {
        content: oracleSource,
      },
    },
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode'],
        },
      },
    },
  };

  console.log('Compiling Solidity contracts (RentDriveV2, VehicleNFT, InsurancePool, and OracleRegistry)...');
  const rentDriveArtifactFile = path.resolve(__dirname, '../src/contracts/RentDrive.json');
  const nftArtifactFile = path.resolve(__dirname, '../src/contracts/VehicleNFT.json');
  const poolArtifactFile = path.resolve(__dirname, '../src/contracts/InsurancePool.json');
  const oracleArtifactFile = path.resolve(__dirname, '../src/contracts/OracleRegistry.json');

  try {
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
      const hasError = output.errors.some((err) => err.severity === 'error');
      output.errors.forEach((err) => {
        console.error(err.formattedMessage);
      });
      if (hasError) {
        console.error('Compilation failed with errors.');
        process.exit(1);
      }
    }

    // RentDriveV2
    const rentDriveContract = output.contracts['RentDriveV2.sol']['RentDriveV2'];
    const rentDriveArtifact = {
      abi: rentDriveContract.abi,
      bytecode: rentDriveContract.evm.bytecode.object,
    };
    fs.writeFileSync(rentDriveArtifactFile, JSON.stringify(rentDriveArtifact, null, 2), 'utf8');
    console.log('RentDriveV2 compiled successfully! Output: src/contracts/RentDrive.json');

    // VehicleNFT
    const nftContract = output.contracts['VehicleNFT.sol']['VehicleNFT'];
    const nftArtifact = {
      abi: nftContract.abi,
      bytecode: nftContract.evm.bytecode.object,
    };
    fs.writeFileSync(nftArtifactFile, JSON.stringify(nftArtifact, null, 2), 'utf8');
    console.log('VehicleNFT compiled successfully! Output: src/contracts/VehicleNFT.json');

    // InsurancePool
    const poolContract = output.contracts['InsurancePool.sol']['InsurancePool'];
    const poolArtifact = {
      abi: poolContract.abi,
      bytecode: poolContract.evm.bytecode.object,
    };
    fs.writeFileSync(poolArtifactFile, JSON.stringify(poolArtifact, null, 2), 'utf8');
    console.log('InsurancePool compiled successfully! Output: src/contracts/InsurancePool.json');

    // OracleRegistry
    const oracleContract = output.contracts['OracleRegistry.sol']['OracleRegistry'];
    const oracleArtifact = {
      abi: oracleContract.abi,
      bytecode: oracleContract.evm.bytecode.object,
    };
    fs.writeFileSync(oracleArtifactFile, JSON.stringify(oracleArtifact, null, 2), 'utf8');
    console.log('OracleRegistry compiled successfully! Output: src/contracts/OracleRegistry.json');

  } catch (error) {
    console.error('Compilation failed:', error);
    process.exit(1);
  }
}

compile();
