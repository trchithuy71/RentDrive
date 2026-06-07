// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title OracleRegistry
 * @notice On-chain identity & reputation registry for RentDrive AI Agent Oracle Network.
 * @dev Compliant with ERC-8004 specifications for AI Agent validation and identity.
 */
contract OracleRegistry {
    string public constant name = "Arc Agent Oracle Registry";
    string public constant symbol = "AA-ORACLE";

    address public admin;

    // ERC-8004 Compliant properties
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(address => uint256) public agentTokens; // maps wallet address to agent tokenId
    mapping(uint256 => string) public agentMetadataUris;
    uint256 public nextTokenId = 1;

    struct OracleAgent {
        address wallet;
        uint256 consensusWeight;
        uint256 reputationScore; // starts at 100, drops on slash
        uint256 totalReports;
        uint256 totalSlashes;
        bool isSlashed;
        bool isActive;
    }

    mapping(address => OracleAgent) public oracles;
    address[] public oracleAddresses;

    event AgentRegistered(address indexed agentAddress, uint256 indexed tokenId, string metadataUri);
    event OracleAdded(address indexed oracleAddress, uint256 weight);
    event OracleRemoved(address indexed oracleAddress);
    event OracleSlashed(address indexed oracleAddress, uint256 reputationPenalty);
    event OracleReputationUpdated(address indexed oracleAddress, uint256 newReputation);
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function registerAgent(address agentAddress, string calldata metadataUri) external onlyAdmin returns (uint256) {
        require(agentAddress != address(0), "Invalid address");
        require(agentTokens[agentAddress] == 0, "Agent already registered");

        uint256 tokenId = nextTokenId++;
        _owners[tokenId] = agentAddress;
        _balances[agentAddress]++;
        agentTokens[agentAddress] = tokenId;
        agentMetadataUris[tokenId] = metadataUri;

        oracles[agentAddress] = OracleAgent({
            wallet: agentAddress,
            consensusWeight: 1,
            reputationScore: 100,
            totalReports: 0,
            totalSlashes: 0,
            isSlashed: false,
            isActive: true
        });
        oracleAddresses.push(agentAddress);

        emit AgentRegistered(agentAddress, tokenId, metadataUri);
        emit OracleAdded(agentAddress, 1);
        emit Transfer(address(0), agentAddress, tokenId);

        return tokenId;
    }

    function addOracle(address oracleAddress, uint256 consensusWeight) external onlyAdmin {
        require(oracleAddress != address(0), "Invalid address");
        require(agentTokens[oracleAddress] > 0, "Oracle must be registered as agent");
        
        oracles[oracleAddress].isActive = true;
        oracles[oracleAddress].consensusWeight = consensusWeight;
        
        emit OracleAdded(oracleAddress, consensusWeight);
    }

    function removeOracle(address oracleAddress) external onlyAdmin {
        require(oracleAddress != address(0), "Invalid address");
        oracles[oracleAddress].isActive = false;
        emit OracleRemoved(oracleAddress);
    }

    function isRegisteredOracle(address oracleAddress) public view returns (bool) {
        return agentTokens[oracleAddress] > 0 && oracles[oracleAddress].isActive && !oracles[oracleAddress].isSlashed;
    }

    function getReputationScore(address oracleAddress) public view returns (uint256) {
        return oracles[oracleAddress].reputationScore;
    }

    function incrementReportCount(address oracleAddress) external {
        require(msg.sender == admin || isRegisteredOracle(msg.sender), "Not authorized");
        if (oracles[oracleAddress].isActive) {
            oracles[oracleAddress].totalReports++;
            if (oracles[oracleAddress].reputationScore < 100) {
                oracles[oracleAddress].reputationScore++;
            }
        }
    }

    function slashOracle(address oracleAddress, uint256 penalty) external {
        require(msg.sender == admin || isRegisteredOracle(msg.sender), "Not authorized");
        if (oracles[oracleAddress].isActive) {
            oracles[oracleAddress].totalSlashes++;
            if (oracles[oracleAddress].reputationScore > penalty) {
                oracles[oracleAddress].reputationScore -= penalty;
            } else {
                oracles[oracleAddress].reputationScore = 0;
                oracles[oracleAddress].isSlashed = true;
                oracles[oracleAddress].isActive = false;
            }
            emit OracleSlashed(oracleAddress, penalty);
        }
    }

    function getOracleAddresses() external view returns (address[] memory) {
        return oracleAddresses;
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        address owner = _owners[tokenId];
        require(owner != address(0), "Token does not exist");
        return agentMetadataUris[tokenId];
    }
}
