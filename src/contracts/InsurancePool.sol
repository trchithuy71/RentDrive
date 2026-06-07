// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract InsurancePool {
    IERC20 public immutable usdc;
    address public admin;
    address public rentDrive;

    uint256 public totalPremiumsCollected;
    uint256 public premiumRateBps = 500; // 5% default (500 bps = 5%)

    event PremiumDeposited(address indexed renter, uint256 amount);
    event PayoutClaimed(address indexed owner, address indexed renter, uint256 payoutAmount);
    event PremiumRateUpdated(uint256 oldRateBps, uint256 newRateBps);
    event AdminWithdrawn(address indexed admin, uint256 amount);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    modifier onlyRentDrive() {
        require(msg.sender == rentDrive, "Only RentDrive");
        _;
    }

    constructor(address _usdc) {
        require(_usdc != address(0), "Invalid USDC address");
        usdc = IERC20(_usdc);
        admin = msg.sender;
    }

    function setRentDrive(address _rentDrive) external onlyAdmin {
        require(_rentDrive != address(0), "Invalid RentDrive address");
        rentDrive = _rentDrive;
    }

    function setPremiumRate(uint256 _newRateBps) external onlyAdmin {
        require(_newRateBps >= 200 && _newRateBps <= 1000, "Premium rate must be between 2% (200 bps) and 10% (1000 bps)");
        uint256 oldRate = premiumRateBps;
        premiumRateBps = _newRateBps;
        emit PremiumRateUpdated(oldRate, _newRateBps);
    }

    function deposit(address depositor, uint256 amount) external onlyRentDrive {
        totalPremiumsCollected += amount;
        emit PremiumDeposited(depositor, amount);
    }

    function claimPayout(address owner, address renter, uint256 depositAmount) external onlyRentDrive {
        uint256 payoutAmount = (depositAmount * 80) / 100;
        require(usdc.balanceOf(address(this)) >= payoutAmount, "Insufficient pool balance for claim");
        require(usdc.transfer(owner, payoutAmount), "USDC payout failed");
        emit PayoutClaimed(owner, renter, payoutAmount);
    }

    function getPoolBalance() public view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    function withdraw(uint256 amount) external onlyAdmin {
        uint256 reserve = (totalPremiumsCollected * 10) / 100;
        uint256 balance = getPoolBalance();
        require(balance >= amount, "Insufficient pool balance");
        require(balance - amount >= reserve, "Cannot withdraw below minimum reserve");
        require(usdc.transfer(admin, amount), "USDC transfer failed");
        emit AdminWithdrawn(admin, amount);
    }
}
