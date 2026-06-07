// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC721Receiver {
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4);
}

interface IRentDrive {
    function isVehicleRented(uint256 vehicleId) external view returns (bool);
    function getVehicle(uint256 vehicleId) external view returns (
        uint256 id, address owner, uint256 baseRatePerHour, uint256 ratePerKm,
        uint256 speedLimitKmH, uint256 speedPenaltyUsdc, uint256 depositRequired,
        string memory metadataUri, bool isActive
    );
}

library Base64 {
    bytes internal constant TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    function encode(bytes memory data) internal pure returns (string memory) {
        uint256 len = data.length;
        if (len == 0) return "";

        uint256 encodedLen = 4 * ((len + 2) / 3);
        bytes memory result = new bytes(encodedLen);
        bytes memory table = TABLE;

        uint256 i = 0;
        uint256 j = 0;

        while (i < len) {
            uint256 a = uint8(data[i++]);
            uint256 b = i < len ? uint8(data[i++]) : 0;
            uint256 c = i < len ? uint8(data[i++]) : 0;

            uint256 triple = (a << 16) | (b << 8) | c;

            result[j++] = table[(triple >> 18) & 0x3F];
            result[j++] = table[(triple >> 12) & 0x3F];
            result[j++] = table[(triple >> 6) & 0x3F];
            result[j++] = table[triple & 0x3F];
        }

        if (len % 3 == 1) {
            result[encodedLen - 1] = "=";
            result[encodedLen - 2] = "=";
        } else if (len % 3 == 2) {
            result[encodedLen - 1] = "=";
        }

        return string(result);
    }
}

contract VehicleNFT {
    // Metadata
    string public constant name = "RentDrive Vehicle NFT";
    string public constant symbol = "RD-VEH";

    address public admin;
    address public rentDrive;

    // Token mappings
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    // Events
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function setRentDrive(address _rentDrive) external onlyAdmin {
        require(_rentDrive != address(0), "Invalid address");
        rentDrive = _rentDrive;
    }

    function balanceOf(address owner) external view returns (uint256) {
        require(owner != address(0), "Invalid owner");
        return _balances[owner];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "Token does not exist");
        return owner;
    }

    function isApprovedForAll(address owner, address operator) public view returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    function getApproved(uint256 tokenId) public view returns (address) {
        require(_owners[tokenId] != address(0), "Token does not exist");
        return _tokenApprovals[tokenId];
    }

    function approve(address to, uint256 tokenId) external {
        address owner = ownerOf(tokenId);
        require(to != owner, "Approval to current owner");
        require(msg.sender == owner || isApprovedForAll(owner, msg.sender), "Not authorized");
        _tokenApprovals[tokenId] = to;
        emit Approval(owner, to, tokenId);
    }

    function setApprovalForAll(address operator, bool approved) external {
        require(operator != msg.sender, "Approve to caller");
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
        address owner = ownerOf(tokenId);
        return (spender == owner || getApproved(tokenId) == spender || isApprovedForAll(owner, spender));
    }

    function _checkActiveRental(uint256 tokenId) internal view {
        if (rentDrive != address(0)) {
            bool rented = IRentDrive(rentDrive).isVehicleRented(tokenId);
            require(!rented, "Cannot transfer while vehicle has active rental");
        }
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        require(_isApprovedOrOwner(msg.sender, tokenId), "Not authorized");
        require(ownerOf(tokenId) == from, "Incorrect owner");
        require(to != address(0), "Transfer to zero address");

        // Transfer restriction check
        _checkActiveRental(tokenId);

        // Clear approval
        _tokenApprovals[tokenId] = address(0);

        _balances[from] -= 1;
        _balances[to] += 1;
        _owners[tokenId] = to;

        emit Transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        safeTransferFrom(from, to, tokenId, "");
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public {
        transferFrom(from, to, tokenId);
        require(_checkOnERC721Received(from, to, tokenId, data), "Transfer to non ERC721Receiver");
    }

    function mint(address to, uint256 tokenId) external {
        require(msg.sender == rentDrive || msg.sender == admin, "Only rentDrive or admin");
        require(to != address(0), "Mint to zero address");
        require(_owners[tokenId] == address(0), "Token already minted");

        _balances[to] += 1;
        _owners[tokenId] = to;

        emit Transfer(address(0), to, tokenId);
    }

    function _checkOnERC721Received(address from, address to, uint256 tokenId, bytes memory data) private returns (bool) {
        if (to.code.length > 0) {
            try IERC721Receiver(to).onERC721Received(msg.sender, from, tokenId, data) returns (bytes4 retval) {
                return retval == IERC721Receiver.onERC721Received.selector;
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    revert("Transfer to non ERC721Receiver");
                } else {
                    assembly {
                        revert(add(32, reason), mload(reason))
                    }
                }
            }
        }
        return true;
    }

    // --- On-Chain Metadata Helpers ---

    function trim(bytes memory b, uint256 start, uint256 end) internal pure returns (string memory) {
        while (start < end && b[start] == 0x20) {
            start++;
        }
        while (end > start && b[end - 1] == 0x20) {
            end--;
        }
        if (end <= start) return "";
        bytes memory res = new bytes(end - start);
        for (uint256 i = start; i < end; i++) {
            res[i - start] = b[i];
        }
        return string(res);
    }

    function parseMetadata(string memory str) public pure returns (
        string memory model,
        string memory plate,
        string memory imageUrl
    ) {
        bytes memory b = bytes(str);
        uint256 len = b.length;
        
        uint256 firstPipe = 0;
        uint256 secondPipe = 0;
        
        for (uint256 i = 0; i < len; i++) {
            if (b[i] == 0x7c) { // '|'
                if (firstPipe == 0) {
                    firstPipe = i;
                } else if (secondPipe == 0) {
                    secondPipe = i;
                    break;
                }
            }
        }
        
        if (firstPipe == 0) {
            model = trim(b, 0, len);
            plate = "N/A";
            imageUrl = "";
        } else if (secondPipe == 0) {
            model = trim(b, 0, firstPipe);
            plate = trim(b, firstPipe + 1, len);
            imageUrl = "";
        } else {
            model = trim(b, 0, firstPipe);
            plate = trim(b, firstPipe + 1, secondPipe);
            imageUrl = trim(b, secondPipe + 1, len);
        }
    }

    function toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    function toStringAddress(address addr) internal pure returns (string memory) {
        bytes memory s = new bytes(40);
        for (uint256 i = 0; i < 20; i++) {
            bytes1 b = bytes1(uint8(uint160(addr) / (2**(8*(19 - i)))));
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
            s[2*i] = char(hi);
            s[2*i+1] = char(lo);
        }
        return string(abi.encodePacked("0x", string(s)));
    }

    function char(bytes1 b) internal pure returns (bytes1) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(_owners[tokenId] != address(0), "Token does not exist");
        
        (
            ,
            address owner,
            uint256 baseRatePerHour,
            uint256 ratePerKm,
            uint256 speedLimitKmH,
            uint256 speedPenaltyUsdc,
            uint256 depositRequired,
            string memory metadataUri,
            
        ) = IRentDrive(rentDrive).getVehicle(tokenId);
        
        (string memory model, string memory plate, string memory imageUrl) = parseMetadata(metadataUri);
        
        string memory json = string(abi.encodePacked(
            '{"name": "RentDrive Vehicle #', toString(tokenId), '", ',
            '"description": "Verifiable on-chain ownership of RentDrive vehicle ', model, ' (Plate: ', plate, ')", ',
            '"image": "', imageUrl, '", ',
            '"attributes": [',
                '{"trait_type": "Model", "value": "', model, '"}, ',
                '{"trait_type": "Plate Number", "value": "', plate, '"}, ',
                '{"trait_type": "Owner Address", "value": "', toStringAddress(owner), '"}, ',
                '{"trait_type": "Base Rate Per Hour (USDC)", "value": ', toString(baseRatePerHour), '}, ',
                '{"trait_type": "Rate Per Km (USDC)", "value": ', toString(ratePerKm), '}, ',
                '{"trait_type": "Speed Limit (Km/H)", "value": ', toString(speedLimitKmH), '}, ',
                '{"trait_type": "Speed Penalty (USDC)", "value": ', toString(speedPenaltyUsdc), '}, ',
                '{"trait_type": "Deposit Required (USDC)", "value": ', toString(depositRequired), '}',
            ']}'
        ));
        
        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }
}
