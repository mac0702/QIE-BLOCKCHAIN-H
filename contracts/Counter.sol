// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title GlobeFi - DeFi Without Borders
 * @notice Borderless financial protocol: Remittance, Savings & Microloans
 * @dev Uses OpenZeppelin ERC20 standard and ReentrancyGuard for safety.
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GlobeFi is ReentrancyGuard, Ownable {
    // -----------------------------------------------------------
    // VARIABLES & STRUCTS
    // -----------------------------------------------------------
    IERC20 public token; // ERC20 stablecoin (e.g., USDC)
    uint256 public totalPool;
    uint256 public interestRate = 5; // Simplified fixed rate (5%)

    struct User {
        uint256 savingsBalance;
        uint256 borrowedAmount;
        uint256 creditScore; // Updated by owner / AI oracle
    }

    mapping(address => User) public users;

    // -----------------------------------------------------------
    // EVENTS
    // -----------------------------------------------------------
    event Remittance(address indexed from, address indexed to, uint256 amount);
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event Borrowed(address indexed user, uint256 amount);
    event Repaid(address indexed user, uint256 amount);
    event CreditScoreUpdated(address indexed user, uint256 newScore);
    event InterestRateUpdated(uint256 newRate);

    // -----------------------------------------------------------
    // CONSTRUCTOR
    // -----------------------------------------------------------
    constructor(address _tokenAddress) Ownable(msg.sender) {
        token = IERC20(_tokenAddress);
    }

    // -----------------------------------------------------------
    // 1️⃣ REMITTANCE — Send tokens across borders instantly
    // -----------------------------------------------------------
    function sendRemittance(address _to, uint256 _amount)
        external
        nonReentrant
    {
        require(_amount > 0, "Amount must be > 0");
        require(token.transferFrom(msg.sender, _to, _amount), "Transfer failed");
        emit Remittance(msg.sender, _to, _amount);
    }

    // -----------------------------------------------------------
    // 2️⃣ SAVINGS POOL — Deposit & Withdraw
    // -----------------------------------------------------------
    function deposit(uint256 _amount) external nonReentrant {
        require(_amount > 0, "Deposit must be > 0");
        require(
            token.transferFrom(msg.sender, address(this), _amount),
            "Transfer failed"
        );

        users[msg.sender].savingsBalance += _amount;
        totalPool += _amount;
        emit Deposited(msg.sender, _amount);
    }

    function withdraw(uint256 _amount) external nonReentrant {
        require(users[msg.sender].savingsBalance >= _amount, "Insufficient balance");

        users[msg.sender].savingsBalance -= _amount;
        totalPool -= _amount;

        require(token.transfer(msg.sender, _amount), "Withdraw failed");
        emit Withdrawn(msg.sender, _amount);
    }

    function calculateInterest(address _user) public view returns (uint256) {
        return (users[_user].savingsBalance * interestRate) / 100;
    }

    // -----------------------------------------------------------
    // 3️⃣ MICROLOANS — Borrow and Repay
    // -----------------------------------------------------------
    function setCreditScore(address _user, uint256 _score) external onlyOwner {
        require(_score <= 100, "Invalid score");
        users[_user].creditScore = _score;
        emit CreditScoreUpdated(_user, _score);
    }

    function borrow(uint256 _amount) external nonReentrant {
        User storage user = users[msg.sender];
        require(user.creditScore > 50, "Low credit score");
        require(_amount <= totalPool / 2, "Insufficient liquidity");

        user.borrowedAmount += _amount;
        totalPool -= _amount;

        require(token.transfer(msg.sender, _amount), "Borrow transfer failed");
        emit Borrowed(msg.sender, _amount);
    }

    function repay(uint256 _amount) external nonReentrant {
        User storage user = users[msg.sender];
        require(user.borrowedAmount > 0, "No active loan");
        require(_amount >= user.borrowedAmount, "Repay full loan");

        require(
            token.transferFrom(msg.sender, address(this), _amount),
            "Repay transfer failed"
        );

        totalPool += _amount;
        emit Repaid(msg.sender, _amount);
        user.borrowedAmount = 0;
    }

    // -----------------------------------------------------------
    // ADMIN FUNCTIONS
    // -----------------------------------------------------------
    function updateInterestRate(uint256 _rate) external onlyOwner {
        interestRate = _rate;
        emit InterestRateUpdated(_rate);
    }

    function getUserData(address _user)
        external
        view
        returns (uint256 savings, uint256 borrowed, uint256 score)
    {
        User memory u = users[_user];
        return (u.savingsBalance, u.borrowedAmount, u.creditScore);
    }
}
