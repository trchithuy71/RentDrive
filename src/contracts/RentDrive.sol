// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

contract RentDrive {
    address public admin;
    address public usdcToken; // Arc Testnet USDC: 0x3600000000000000000000000000000000000000
    uint256 public platformFeeBps = 200; // 2% platform fee

    struct Vehicle {
        uint256 id;
        address owner;
        uint256 baseRatePerHour; // in USDC (6 decimals)
        uint256 ratePerKm;      // in USDC (6 decimals)
        uint256 speedLimitKmH;  // speed limit in km/h
        uint256 speedPenaltyUsdc; // penalty in USDC (6 decimals)
        uint256 depositRequired; // deposit in USDC (6 decimals)
        string metadataUri;      // e.g. IPFS hash, model details, plate number
        bool isActive;
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
        uint256 escrowBalance; // USDC currently locked in escrow
        uint256 speedPenaltiesAccrued; // USDC penalty charged
        uint256 distanceChargesAccrued; // USDC distance charge charged
        RentalStatus status;
        bool crashDetected;
        uint256 lastTelemetryTime;
    }

    uint256 public vehicleCount;
    uint256 public rentalCount;

    mapping(uint256 => Vehicle) public vehicles;
    mapping(uint256 => Rental) public rentals;
    mapping(address => uint256) public pendingEarnings; // owner earnings ready to withdraw

    event VehicleListed(uint256 indexed vehicleId, address indexed owner, uint256 depositRequired, string metadataUri);
    event RentalStarted(uint256 indexed rentalId, uint256 indexed vehicleId, address indexed renter, uint256 deposit);
    event TelemetryUpdated(uint256 indexed rentalId, uint256 odometerMeters, uint256 currentSpeed, bool crashDetected);
    event RentalCompleted(uint256 indexed rentalId, uint256 finalBilling, uint256 refundAmount);
    event CrashEscrowFrozen(uint256 indexed rentalId, uint256 frozenAmount);
    event DisputeResolved(uint256 indexed rentalId, uint256 payoutToOwner, uint256 refundToRenter);
    event EarningsWithdrawn(address indexed owner, uint256 amount);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    modifier onlyVehicleOwner(uint256 vehicleId) {
        require(vehicles[vehicleId].owner == msg.sender, "Only vehicle owner");
        _;
    }

    constructor(address _usdcToken) {
        admin = msg.sender;
        usdcToken = _usdcToken;
    }

    function listVehicle(
        uint256 _baseRatePerHour,
        uint256 _ratePerKm,
        uint256 _speedLimitKmH,
        uint256 _speedPenaltyUsdc,
        uint256 _depositRequired,
        string memory _metadataUri
    ) external {
        require(_depositRequired > 0, "Deposit must be > 0");
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
            isActive: true
        });

        emit VehicleListed(vehicleCount, msg.sender, _depositRequired, _metadataUri);
    }

    function startRental(uint256 vehicleId, uint256 startOdometerMeters) external {
        Vehicle storage vehicle = vehicles[vehicleId];
        require(vehicle.isActive, "Vehicle not active");
        require(vehicle.owner != msg.sender, "Cannot rent own vehicle");

        uint256 deposit = vehicle.depositRequired;
        
        // Transfer USDC deposit to contract escrow
        require(
            IERC20(usdcToken).transferFrom(msg.sender, address(this), deposit),
            "USDC deposit transfer failed"
        );

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
            lastTelemetryTime: block.timestamp
        });

        emit RentalStarted(rentalCount, vehicleId, msg.sender, deposit);
    }

    // Telemetry updates would typically come from an authorized DePIN Oracle or Platform Wallet
    function updateTelemetry(
        uint256 rentalId,
        uint256 currentOdometerMeters,
        uint256 currentSpeedKmH,
        bool crashDetected
    ) external onlyAdmin {
        Rental storage rental = rentals[rentalId];
        require(rental.status == RentalStatus.Active, "Rental not active");
        Vehicle storage vehicle = vehicles[rental.vehicleId];

        // 1. Check odometer and calculate delta
        if (currentOdometerMeters > rental.currentOdometerMeters) {
            uint256 deltaMeters = currentOdometerMeters - rental.currentOdometerMeters;
            uint256 charge = (deltaMeters * vehicle.ratePerKm) / 1000; // ratePerKm is per km, odometer in meters
            
            // Accrue charge from escrow balance
            if (rental.escrowBalance >= charge) {
                rental.escrowBalance -= charge;
                rental.distanceChargesAccrued += charge;
            } else {
                // Renter ran out of deposit, charge all remaining
                rental.distanceChargesAccrued += rental.escrowBalance;
                rental.escrowBalance = 0;
            }
            rental.currentOdometerMeters = currentOdometerMeters;
        }

        // 2. Check speed limit breach and charge penalty
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

        // 3. Check crash detector
        if (crashDetected && !rental.crashDetected) {
            rental.crashDetected = true;
            rental.status = RentalStatus.Disputed;
            emit CrashEscrowFrozen(rentalId, rental.escrowBalance);
        }

        rental.lastTelemetryTime = block.timestamp;
        emit TelemetryUpdated(rentalId, currentOdometerMeters, currentSpeedKmH, crashDetected);
    }

    function endRental(uint256 rentalId) external {
        Rental storage rental = rentals[rentalId];
        require(rental.status == RentalStatus.Active, "Cannot end inactive/disputed rental");
        require(msg.sender == rental.renter || msg.sender == admin, "Not authorized");
        
        Vehicle storage vehicle = vehicles[rental.vehicleId];
        rental.endTime = block.timestamp;

        // Calculate time duration charges
        uint256 durationHours = (block.timestamp - rental.startTime + 3599) / 3600; // ceil logic
        uint256 timeCharge = durationHours * vehicle.baseRatePerHour;

        uint256 totalBilling = rental.distanceChargesAccrued + rental.speedPenaltiesAccrued + timeCharge;
        uint256 refundAmount = 0;
        uint256 payoutToOwner = 0;

        uint256 totalCostToDeduct = rental.distanceChargesAccrued + rental.speedPenaltiesAccrued + timeCharge;

        uint256 initialDeposit = vehicle.depositRequired;

        if (initialDeposit > totalCostToDeduct) {
            refundAmount = initialDeposit - totalCostToDeduct;
            payoutToOwner = totalCostToDeduct - rental.speedPenaltiesAccrued; // standard distance + time charges
        } else {
            payoutToOwner = initialDeposit - rental.speedPenaltiesAccrued;
            refundAmount = 0;
        }

        // Speed penalties go directly to the owner
        uint256 totalOwnerPayout = payoutToOwner + rental.speedPenaltiesAccrued;

        // Deduct platform fee from owner payout
        uint256 platformFee = (totalOwnerPayout * platformFeeBps) / 10000;
        uint256 netOwnerPayout = totalOwnerPayout - platformFee;

        rental.status = RentalStatus.Completed;
        rental.escrowBalance = 0;

        // Transfer refund to renter
        if (refundAmount > 0) {
            require(IERC20(usdcToken).transfer(rental.renter, refundAmount), "USDC refund failed");
        }

        // Add net owner payout to pending earnings
        pendingEarnings[vehicle.owner] += netOwnerPayout;
        
        // Admin gets platform fee
        pendingEarnings[admin] += platformFee;

        emit RentalCompleted(rentalId, totalBilling, refundAmount);
    }

    function resolveDispute(uint256 rentalId, uint256 payoutToOwner, uint256 refundToRenter) external onlyAdmin {
        Rental storage rental = rentals[rentalId];
        require(rental.status == RentalStatus.Disputed, "Rental not disputed");
        Vehicle storage vehicle = vehicles[rental.vehicleId];

        uint256 totalHeld = rental.escrowBalance;
        require(payoutToOwner + refundToRenter <= totalHeld, "Exceeds locked escrow");

        rental.status = RentalStatus.Resolved;
        rental.escrowBalance = 0;

        if (refundToRenter > 0) {
            require(IERC20(usdcToken).transfer(rental.renter, refundToRenter), "Refund failed");
        }

        if (payoutToOwner > 0) {
            // Deduct platform fee
            uint256 platformFee = (payoutToOwner * platformFeeBps) / 10000;
            uint256 netPayout = payoutToOwner - platformFee;

            pendingEarnings[vehicle.owner] += netPayout;
            pendingEarnings[admin] += platformFee;
        }

        emit DisputeResolved(rentalId, payoutToOwner, refundToRenter);
    }

    function withdrawEarnings() external {
        uint256 amount = pendingEarnings[msg.sender];
        require(amount > 0, "No earnings to withdraw");
        pendingEarnings[msg.sender] = 0;

        require(IERC20(usdcToken).transfer(msg.sender, amount), "USDC transfer failed");
        emit EarningsWithdrawn(msg.sender, amount);
    }
}
