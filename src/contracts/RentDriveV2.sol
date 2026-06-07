// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IVehicleNFT {
    function mint(address to, uint256 tokenId) external;
}

interface IInsurancePool {
    function deposit(address depositor, uint256 amount) external;
    function claimPayout(address owner, address renter, uint256 depositAmount) external;
    function premiumRateBps() external view returns (uint256);
}

interface IOracleRegistry {
    function isRegisteredOracle(address oracleAddress) external view returns (bool);
    function incrementReportCount(address oracleAddress) external;
    function slashOracle(address oracleAddress, uint256 penalty) external;
}

/**
 * @title RentDriveV2
 * @notice Decentralized P2P vehicle rental with telematics escrow on Arc Network.
 * @dev Security hardened: ReentrancyGuard, Pausable, checks-effects-interactions,
 *      input validation, two-step admin transfer, deposit caps.
 */
contract RentDriveV2 {
    // ─── State ────────────────────────────────────────────────────────
    address public admin;
    address public pendingAdmin;
    address public immutable usdcToken;
    address public immutable eurcToken;
    uint256 public platformFeeBps = 200; // 2%
    bool public paused;
    bool private _locked; // reentrancy mutex
    address public nftContract;
    mapping(uint256 => bool) public isRented;
    address public insurancePool;
    mapping(address => bool) public acceptedTokens;
    address public oracleRegistry;

    struct ReportState {
        uint256 votes;
        address[] voters;
    }

    // Consensus storage
    mapping(uint256 => mapping(uint256 => mapping(bytes32 => ReportState))) public reportVotes;
    mapping(uint256 => mapping(uint256 => bytes32[])) public cycleHashes;
    mapping(uint256 => uint256) public currentTelemetryCycle;
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public hasVotedInCycle;

    event TelemetryReportSubmitted(uint256 indexed rentalId, uint256 indexed cycle, address indexed reporter, bytes32 reportHash);

    uint256 public constant MAX_DEPOSIT = 10_000_000_000; // 10,000 USDC (6 decimals)
    uint256 public constant MAX_FEE_BPS = 1000; // 10% max platform fee

    struct Vehicle {
        uint256 id;
        address owner;
        uint256 baseRatePerHour;
        uint256 ratePerKm;
        uint256 speedLimitKmH;
        uint256 speedPenaltyUsdc;
        uint256 depositRequired;
        string metadataUri;
        bool isActive;
        int256 centerLat;
        int256 centerLng;
        uint256 radiusMeters;
        uint256 geofenceViolationPenalty;
        address acceptedToken; // USDC or EURC
    }

    enum RentalStatus { Requested, Active, Completed, Disputed, Resolved }

    struct Rental {
        uint256 id;
        uint256 vehicleId;
        address renter;
        uint256 startTime;
        uint256 endTime;
        uint256 startOdometerMeters;
        uint256 currentOdometerMeters;
        uint256 escrowBalance;
        uint256 speedPenaltiesAccrued;
        uint256 distanceChargesAccrued;
        RentalStatus status;
        bool crashDetected;
        uint256 lastTelemetryTime;
        uint256 geofencePenaltiesAccrued;
        address paymentToken; // Token used for this rental
    }

    uint256 public vehicleCount;
    uint256 public rentalCount;

    mapping(uint256 => Vehicle) public vehicles;
    mapping(uint256 => Rental) public rentals;
    mapping(address => uint256) public pendingEarnings;
    mapping(address => uint256) public pendingEarningsEurc;
    mapping(uint256 => mapping(address => bool)) public hasReviewed;

    // ─── Events ───────────────────────────────────────────────────────
    event VehicleListed(uint256 indexed vehicleId, address indexed owner, uint256 depositRequired, string metadataUri);
    event RentalStarted(uint256 indexed rentalId, uint256 indexed vehicleId, address indexed renter, uint256 deposit);
    event TelemetryUpdated(uint256 indexed rentalId, uint256 odometerMeters, uint256 currentSpeed, bool crashDetected, bool geofenceViolated);
    event RentalCompleted(uint256 indexed rentalId, uint256 finalBilling, uint256 refundAmount);
    event CrashEscrowFrozen(uint256 indexed rentalId, uint256 frozenAmount);
    event DisputeResolved(uint256 indexed rentalId, uint256 payoutToOwner, uint256 refundToRenter);
    event EarningsWithdrawn(address indexed owner, uint256 amount);
    event AdminTransferInitiated(address indexed currentAdmin, address indexed newAdmin);
    event AdminTransferCompleted(address indexed oldAdmin, address indexed newAdmin);
    event Paused(address indexed admin);
    event Unpaused(address indexed admin);
    event PlatformFeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
    event VehicleStatusChanged(uint256 indexed vehicleId, bool isActive);
    event ReviewSubmitted(uint256 indexed rentalId, address indexed reviewer, uint8 rating);

    // ─── Modifiers ────────────────────────────────────────────────────
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    modifier nonReentrant() {
        require(!_locked, "Reentrant call");
        _locked = true;
        _;
        _locked = false;
    }

    modifier validAddress(address _addr) {
        require(_addr != address(0), "Invalid address");
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────
    constructor(address _usdcToken, address _eurcToken, address _nftContract) validAddress(_usdcToken) validAddress(_eurcToken) validAddress(_nftContract) {
        admin = msg.sender;
        usdcToken = _usdcToken;
        eurcToken = _eurcToken;
        nftContract = _nftContract;
        acceptedTokens[_usdcToken] = true;
        acceptedTokens[_eurcToken] = true;
    }

    // ─── Admin Functions ──────────────────────────────────────────────
    function pause() external onlyAdmin {
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyAdmin {
        paused = false;
        emit Unpaused(msg.sender);
    }

    function transferAdmin(address _newAdmin) external onlyAdmin validAddress(_newAdmin) {
        pendingAdmin = _newAdmin;
        emit AdminTransferInitiated(admin, _newAdmin);
    }

    function acceptAdmin() external {
        require(msg.sender == pendingAdmin, "Not pending admin");
        address oldAdmin = admin;
        admin = pendingAdmin;
        pendingAdmin = address(0);
        emit AdminTransferCompleted(oldAdmin, admin);
    }

    function setPlatformFee(uint256 _newFeeBps) external onlyAdmin {
        require(_newFeeBps <= MAX_FEE_BPS, "Fee exceeds maximum");
        uint256 oldFee = platformFeeBps;
        platformFeeBps = _newFeeBps;
        emit PlatformFeeUpdated(oldFee, _newFeeBps);
    }

    function setInsurancePool(address _insurancePool) external onlyAdmin {
        require(_insurancePool != address(0), "Invalid insurance pool address");
        insurancePool = _insurancePool;
    }

    function setOracleRegistry(address _oracleRegistry) external onlyAdmin {
        require(_oracleRegistry != address(0), "Invalid registry address");
        oracleRegistry = _oracleRegistry;
    }

    // ─── Vehicle Management ───────────────────────────────────────────
    function listVehicle(
        uint256 _baseRatePerHour,
        uint256 _ratePerKm,
        uint256 _speedLimitKmH,
        uint256 _speedPenaltyUsdc,
        uint256 _depositRequired,
        string memory _metadataUri,
        int256 _centerLat,
        int256 _centerLng,
        uint256 _radiusMeters,
        uint256 _geofenceViolationPenalty,
        address _acceptedToken
    ) external whenNotPaused {
        require(_depositRequired > 0, "Deposit must be > 0");
        require(_depositRequired <= MAX_DEPOSIT, "Deposit exceeds maximum");
        require(_speedLimitKmH > 0, "Speed limit must be > 0");
        require(bytes(_metadataUri).length > 0, "Metadata URI required");
        require(acceptedTokens[_acceptedToken], "Token not accepted");

        vehicleCount++;
        vehicles[vehicleCount] = Vehicle({
            id: vehicleCount,
            owner: msg.sender,
            baseRatePerHour: _baseRatePerHour,
            ratePerKm: _ratePerKm,
            speedLimitKmH: _speedLimitKmH,
            speedPenaltyUsdc: _speedPenaltyUsdc,
            depositRequired: _depositRequired,
            metadataUri: _metadataUri,
            isActive: true,
            centerLat: _centerLat,
            centerLng: _centerLng,
            radiusMeters: _radiusMeters,
            geofenceViolationPenalty: _geofenceViolationPenalty,
            acceptedToken: _acceptedToken
        });

        // Mint NFT for listed vehicle
        IVehicleNFT(nftContract).mint(msg.sender, vehicleCount);

        emit VehicleListed(vehicleCount, msg.sender, _depositRequired, _metadataUri);
    }

    function setVehicleActive(uint256 vehicleId, bool _isActive) external {
        require(vehicles[vehicleId].owner == msg.sender, "Only vehicle owner");
        vehicles[vehicleId].isActive = _isActive;
        emit VehicleStatusChanged(vehicleId, _isActive);
    }

    // ─── Rental Operations ────────────────────────────────────────────
    function startRental(uint256 vehicleId, uint256 startOdometerMeters) external whenNotPaused nonReentrant {
        Vehicle storage vehicle = vehicles[vehicleId];
        require(vehicle.isActive, "Vehicle not active");
        require(vehicle.owner != msg.sender, "Cannot rent own vehicle");
        require(vehicle.depositRequired > 0, "Vehicle not configured");

        address token = vehicle.acceptedToken;
        require(acceptedTokens[token], "Payment token not accepted");

        uint256 deposit = vehicle.depositRequired;
        uint256 premium = 0;
        if (insurancePool != address(0)) {
            premium = (deposit * IInsurancePool(insurancePool).premiumRateBps()) / 10_000;
        }

        // Checks-effects-interactions: update state BEFORE external call
        rentalCount++;
        rentals[rentalCount] = Rental({
            id: rentalCount,
            vehicleId: vehicleId,
            renter: msg.sender,
            startTime: block.timestamp,
            endTime: 0,
            startOdometerMeters: startOdometerMeters,
            currentOdometerMeters: startOdometerMeters,
            escrowBalance: deposit,
            speedPenaltiesAccrued: 0,
            distanceChargesAccrued: 0,
            status: RentalStatus.Active,
            crashDetected: false,
            lastTelemetryTime: block.timestamp,
            geofencePenaltiesAccrued: 0,
            paymentToken: token
        });

        isRented[vehicleId] = true;

        // External calls LAST — use the vehicle's accepted token
        require(
            IERC20(token).transferFrom(msg.sender, address(this), deposit),
            "Deposit transfer failed"
        );
        if (premium > 0) {
            require(
                IERC20(token).transferFrom(msg.sender, insurancePool, premium),
                "Premium transfer failed"
            );
            IInsurancePool(insurancePool).deposit(msg.sender, premium);
        }

        emit RentalStarted(rentalCount, vehicleId, msg.sender, deposit);
    }

    function startRentalOnBehalf(
        uint256 vehicleId,
        uint256 startOdometerMeters,
        address renter
    ) external whenNotPaused nonReentrant {
        Vehicle storage vehicle = vehicles[vehicleId];
        require(vehicle.isActive, "Vehicle not active");
        require(vehicle.owner != renter, "Cannot rent own vehicle");
        require(vehicle.depositRequired > 0, "Vehicle not configured");

        address token = vehicle.acceptedToken;
        require(acceptedTokens[token], "Payment token not accepted");

        uint256 deposit = vehicle.depositRequired;
        uint256 premium = 0;
        if (insurancePool != address(0)) {
            premium = (deposit * IInsurancePool(insurancePool).premiumRateBps()) / 10_000;
        }

        // Checks-effects-interactions: update state BEFORE external call
        rentalCount++;
        rentals[rentalCount] = Rental({
            id: rentalCount,
            vehicleId: vehicleId,
            renter: renter,
            startTime: block.timestamp,
            endTime: 0,
            startOdometerMeters: startOdometerMeters,
            currentOdometerMeters: startOdometerMeters,
            escrowBalance: deposit,
            speedPenaltiesAccrued: 0,
            distanceChargesAccrued: 0,
            status: RentalStatus.Active,
            crashDetected: false,
            lastTelemetryTime: block.timestamp,
            geofencePenaltiesAccrued: 0,
            paymentToken: token
        });

        isRented[vehicleId] = true;

        // External calls LAST — transferFrom msg.sender (relayer)
        require(
            IERC20(token).transferFrom(msg.sender, address(this), deposit),
            "Deposit transfer failed"
        );
        if (premium > 0) {
            require(
                IERC20(token).transferFrom(msg.sender, insurancePool, premium),
                "Premium transfer failed"
            );
            IInsurancePool(insurancePool).deposit(renter, premium);
        }

        emit RentalStarted(rentalCount, vehicleId, renter, deposit);
    }

    function updateTelemetry(
        uint256 rentalId,
        uint256 currentOdometerMeters,
        uint256 currentSpeedKmH,
        bool crashDetected,
        bool geofenceViolated
    ) external whenNotPaused {
        if (msg.sender == admin) {
            _executeTelemetryUpdate(rentalId, currentOdometerMeters, currentSpeedKmH, crashDetected, geofenceViolated);
            return;
        }

        require(oracleRegistry != address(0), "Oracle registry not set");
        require(IOracleRegistry(oracleRegistry).isRegisteredOracle(msg.sender), "Not authorized oracle");

        uint256 cycle = currentTelemetryCycle[rentalId];
        require(!hasVotedInCycle[rentalId][cycle][msg.sender], "Already reported for this cycle");
        hasVotedInCycle[rentalId][cycle][msg.sender] = true;

        bytes32 hash = keccak256(abi.encodePacked(currentOdometerMeters, currentSpeedKmH, crashDetected, geofenceViolated));
        ReportState storage state = reportVotes[rentalId][cycle][hash];
        if (state.votes == 0) {
            cycleHashes[rentalId][cycle].push(hash);
        }
        state.votes++;
        state.voters.push(msg.sender);

        emit TelemetryReportSubmitted(rentalId, cycle, msg.sender, hash);

        // Consensus threshold is 2 matching reports
        if (state.votes >= 2) {
            _executeTelemetryUpdate(rentalId, currentOdometerMeters, currentSpeedKmH, crashDetected, geofenceViolated);

            // Reward consensus reporters
            for (uint256 i = 0; i < state.voters.length; i++) {
                IOracleRegistry(oracleRegistry).incrementReportCount(state.voters[i]);
            }

            // Slash divergent/malicious reporters in this cycle
            bytes32[] storage hashes = cycleHashes[rentalId][cycle];
            for (uint256 i = 0; i < hashes.length; i++) {
                bytes32 otherHash = hashes[i];
                if (otherHash != hash) {
                    ReportState storage wrongState = reportVotes[rentalId][cycle][otherHash];
                    for (uint256 j = 0; j < wrongState.voters.length; j++) {
                        IOracleRegistry(oracleRegistry).slashOracle(wrongState.voters[j], 25);
                    }
                }
            }

            currentTelemetryCycle[rentalId]++;
        }
    }

    function _executeTelemetryUpdate(
        uint256 rentalId,
        uint256 currentOdometerMeters,
        uint256 currentSpeedKmH,
        bool crashDetected,
        bool geofenceViolated
    ) internal {
        Rental storage rental = rentals[rentalId];
        require(rental.status == RentalStatus.Active, "Rental not active");
        Vehicle storage vehicle = vehicles[rental.vehicleId];

        // 1. Distance charges
        if (currentOdometerMeters > rental.currentOdometerMeters) {
            uint256 deltaMeters = currentOdometerMeters - rental.currentOdometerMeters;
            uint256 charge = (deltaMeters * vehicle.ratePerKm) / 1000;

            if (rental.escrowBalance >= charge) {
                rental.escrowBalance -= charge;
                rental.distanceChargesAccrued += charge;
            } else {
                rental.distanceChargesAccrued += rental.escrowBalance;
                rental.escrowBalance = 0;
            }
            rental.currentOdometerMeters = currentOdometerMeters;
        }

        // 2. Speed penalty
        if (currentSpeedKmH > vehicle.speedLimitKmH) {
            uint256 penalty = vehicle.speedPenaltyUsdc;
            if (rental.escrowBalance >= penalty) {
                rental.escrowBalance -= penalty;
                rental.speedPenaltiesAccrued += penalty;
            } else {
                rental.speedPenaltiesAccrued += rental.escrowBalance;
                rental.escrowBalance = 0;
            }
        }

        // 3. Geofence penalty
        if (geofenceViolated) {
            uint256 penalty = vehicle.geofenceViolationPenalty;
            if (rental.escrowBalance >= penalty) {
                rental.escrowBalance -= penalty;
                rental.geofencePenaltiesAccrued += penalty;
            } else {
                rental.geofencePenaltiesAccrued += rental.escrowBalance;
                rental.escrowBalance = 0;
            }
        }

        // 4. Crash detection
        if (crashDetected && !rental.crashDetected) {
            rental.crashDetected = true;
            emit CrashEscrowFrozen(rentalId, rental.escrowBalance);

            if (insurancePool != address(0)) {
                // Auto pay owner 80% of deposit requirement from the pool
                IInsurancePool(insurancePool).claimPayout(vehicle.owner, rental.renter, vehicle.depositRequired);

                // Refund renter remaining 20% of deposit from escrow (capped at remaining escrowBalance)
                uint256 refundAmount = (vehicle.depositRequired * 20) / 100;
                if (refundAmount > rental.escrowBalance) {
                    refundAmount = rental.escrowBalance;
                }
                
                uint256 remainingEscrow = rental.escrowBalance - refundAmount;
                rental.escrowBalance = 0;
                rental.status = RentalStatus.Resolved;
                isRented[rental.vehicleId] = false;

                if (refundAmount > 0) {
                    require(IERC20(rental.paymentToken).transfer(rental.renter, refundAmount), "Refund to renter failed");
                }
                
                // Rest of escrow goes back to pool to reimburse
                if (remainingEscrow > 0) {
                    require(IERC20(rental.paymentToken).transfer(insurancePool, remainingEscrow), "Transfer to pool failed");
                }
            } else {
                rental.status = RentalStatus.Disputed;
            }
        }

        rental.lastTelemetryTime = block.timestamp;
        emit TelemetryUpdated(rentalId, currentOdometerMeters, currentSpeedKmH, crashDetected, geofenceViolated);
    }

    function endRental(uint256 rentalId) external whenNotPaused nonReentrant {
        Rental storage rental = rentals[rentalId];
        require(rental.status == RentalStatus.Active, "Cannot end inactive/disputed rental");
        require(msg.sender == rental.renter || msg.sender == admin, "Not authorized");

        Vehicle storage vehicle = vehicles[rental.vehicleId];
        rental.endTime = block.timestamp;

        // Calculate time charges
        uint256 durationHours = (block.timestamp - rental.startTime + 3599) / 3600;
        uint256 timeCharge = durationHours * vehicle.baseRatePerHour;

        // Total costs: distance + penalties already deducted from escrow, plus time charge
        uint256 totalCostToDeduct = rental.distanceChargesAccrued + rental.speedPenaltiesAccrued + rental.geofencePenaltiesAccrued + timeCharge;

        uint256 initialDeposit = vehicle.depositRequired;
        uint256 refundAmount = 0;
        uint256 totalOwnerPayout = 0;

        if (initialDeposit > totalCostToDeduct) {
            refundAmount = initialDeposit - totalCostToDeduct;
            totalOwnerPayout = totalCostToDeduct;
        } else {
            // Cost exceeds deposit — owner gets entire deposit
            totalOwnerPayout = initialDeposit;
            refundAmount = 0;
        }

        // Platform fee
        uint256 platformFee = (totalOwnerPayout * platformFeeBps) / 10000;
        uint256 netOwnerPayout = totalOwnerPayout - platformFee;

        // Checks-effects: update ALL state BEFORE external calls
        rental.status = RentalStatus.Completed;
        rental.escrowBalance = 0;
        isRented[rental.vehicleId] = false;

        // Track earnings in the correct token bucket
        if (rental.paymentToken == eurcToken) {
            pendingEarningsEurc[vehicle.owner] += netOwnerPayout;
            pendingEarningsEurc[admin] += platformFee;
        } else {
            pendingEarnings[vehicle.owner] += netOwnerPayout;
            pendingEarnings[admin] += platformFee;
        }

        uint256 totalBilling = rental.distanceChargesAccrued + rental.speedPenaltiesAccrued + rental.geofencePenaltiesAccrued + timeCharge;

        // Interactions: external call LAST — refund in the original payment token
        if (refundAmount > 0) {
            require(IERC20(rental.paymentToken).transfer(rental.renter, refundAmount), "Refund failed");
        }

        emit RentalCompleted(rentalId, totalBilling, refundAmount);
    }

    function resolveDispute(
        uint256 rentalId,
        uint256 payoutToOwner,
        uint256 refundToRenter
    ) external onlyAdmin whenNotPaused nonReentrant {
        Rental storage rental = rentals[rentalId];
        require(rental.status == RentalStatus.Disputed, "Rental not disputed");
        Vehicle storage vehicle = vehicles[rental.vehicleId];

        uint256 totalHeld = rental.escrowBalance;
        require(payoutToOwner + refundToRenter <= totalHeld, "Exceeds locked escrow");

        // Checks-effects: update state BEFORE transfers
        rental.status = RentalStatus.Resolved;
        rental.escrowBalance = 0;
        isRented[rental.vehicleId] = false;

        if (payoutToOwner > 0) {
            uint256 platformFee = (payoutToOwner * platformFeeBps) / 10000;
            uint256 netPayout = payoutToOwner - platformFee;
            if (rental.paymentToken == eurcToken) {
                pendingEarningsEurc[vehicle.owner] += netPayout;
                pendingEarningsEurc[admin] += platformFee;
            } else {
                pendingEarnings[vehicle.owner] += netPayout;
                pendingEarnings[admin] += platformFee;
            }
        }

        // Interactions: external call LAST
        if (refundToRenter > 0) {
            require(IERC20(rental.paymentToken).transfer(rental.renter, refundToRenter), "Refund failed");
        }

        emit DisputeResolved(rentalId, payoutToOwner, refundToRenter);
    }

    function withdrawEarnings() external nonReentrant {
        uint256 usdcAmount = pendingEarnings[msg.sender];
        uint256 eurcAmount = pendingEarningsEurc[msg.sender];
        require(usdcAmount > 0 || eurcAmount > 0, "No earnings to withdraw");

        // Checks-effects: zero balances BEFORE transfers
        pendingEarnings[msg.sender] = 0;
        pendingEarningsEurc[msg.sender] = 0;

        // Interactions: external calls LAST
        if (usdcAmount > 0) {
            require(IERC20(usdcToken).transfer(msg.sender, usdcAmount), "USDC transfer failed");
        }
        if (eurcAmount > 0) {
            require(IERC20(eurcToken).transfer(msg.sender, eurcAmount), "EURC transfer failed");
        }
        emit EarningsWithdrawn(msg.sender, usdcAmount + eurcAmount);
    }

    // ─── View Functions ───────────────────────────────────────────────
    function getVehicle(uint256 vehicleId) external view returns (
        uint256 id, address owner, uint256 baseRatePerHour, uint256 ratePerKm,
        uint256 speedLimitKmH, uint256 speedPenaltyUsdc, uint256 depositRequired,
        string memory metadataUri, bool isActive, int256 centerLat, int256 centerLng,
        uint256 radiusMeters, uint256 geofenceViolationPenalty, address acceptedToken
    ) {
        Vehicle storage v = vehicles[vehicleId];
        return (v.id, v.owner, v.baseRatePerHour, v.ratePerKm,
                v.speedLimitKmH, v.speedPenaltyUsdc, v.depositRequired,
                v.metadataUri, v.isActive, v.centerLat, v.centerLng,
                v.radiusMeters, v.geofenceViolationPenalty, v.acceptedToken);
    }

    function getRental(uint256 rentalId) external view returns (
        uint256 id, uint256 vehicleId, address renter, uint256 startTime,
        uint256 endTime, uint256 escrowBalance, uint256 speedPenaltiesAccrued,
        uint256 distanceChargesAccrued, RentalStatus status, bool crashDetected,
        uint256 geofencePenaltiesAccrued, address paymentToken
    ) {
        Rental storage r = rentals[rentalId];
        return (r.id, r.vehicleId, r.renter, r.startTime, r.endTime,
                r.escrowBalance, r.speedPenaltiesAccrued, r.distanceChargesAccrued,
                r.status, r.crashDetected, r.geofencePenaltiesAccrued, r.paymentToken);
    }

    function getVehicleCount() external view returns (uint256) {
        return vehicleCount;
    }

    function getRentalCount() external view returns (uint256) {
        return rentalCount;
    }

    function getEarnings(address owner) external view returns (uint256) {
        return pendingEarnings[owner];
    }

    function getEarningsEurc(address owner) external view returns (uint256) {
        return pendingEarningsEurc[owner];
    }

    function isVehicleRented(uint256 vehicleId) external view returns (bool) {
        return isRented[vehicleId];
    }

    function submitReview(uint256 rentalId, uint8 rating) external whenNotPaused {
        Rental storage rental = rentals[rentalId];
        require(rental.status == RentalStatus.Completed || rental.status == RentalStatus.Resolved, "Rental not completed or resolved");
        Vehicle storage vehicle = vehicles[rental.vehicleId];
        require(msg.sender == rental.renter || msg.sender == vehicle.owner, "Not authorized to review");
        require(rating >= 1 && rating <= 5, "Rating must be 1 to 5");
        require(!hasReviewed[rentalId][msg.sender], "Already reviewed");

        hasReviewed[rentalId][msg.sender] = true;
        emit ReviewSubmitted(rentalId, msg.sender, rating);
    }
}
