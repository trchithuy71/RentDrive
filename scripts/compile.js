const fs = require('fs');
const path = require('path');
const solc = require('solc');

async function compile() {
  const contractPath = path.resolve(__dirname, '../src/contracts/RentDrive.sol');
  const source = fs.readFileSync(contractPath, 'utf8');

  const input = {
    language: 'Solidity',
    sources: {
      'RentDrive.sol': {
        content: source,
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

  console.log('Compiling RentDrive.sol...');
  const tempFile = path.resolve(__dirname, '../src/contracts/RentDrive.json');
  
  try {
    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    
    if (output.errors) {
      output.errors.forEach((err) => {
        console.error(err.formattedMessage);
      });
    }

    const contract = output.contracts['RentDrive.sol']['RentDrive'];
    const artifact = {
      abi: contract.abi,
      bytecode: contract.evm.bytecode.object,
    };

    fs.writeFileSync(tempFile, JSON.stringify(artifact, null, 2), 'utf8');
    console.log('Compilation success! Output saved to src/contracts/RentDrive.json');
  } catch (error) {
    console.error('Compilation failed:', error);
  }
}

compile();
