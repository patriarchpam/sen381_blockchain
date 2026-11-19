// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VeroinBankAndToken
 * @notice A complete sample Smart Contract demonstrating:
 *         1. State Variables (stored permanently on the blockchain)
 *         2. Events (logged on the blockchain for frontends/explorers)
 *         3. Modifiers (access control checks)
 *         4. Functions (deposit, withdraw, transfer, and read balances)
 *         5. Inline EVM Assembly (Yul) inside a Smart Contract
 */
contract VeroinBankAndToken {
    // ==========================================
    // 1. STATE VARIABLES (Permanent Blockchain Storage)
    // ==========================================

    // Address of the person who deployed the smart contract (slot 0)
    address public owner;

    // Total Ether (in Wei) held in the bank contract (slot 1)
    uint256 public totalBankBalance;

    // Mapping from a user's wallet address to their deposited balance
    mapping(address => uint256) public balances;

    // ==========================================
    // 2. EVENTS (Blockchain Logs)
    // ==========================================

    // Emitted whenever a user deposits funds
    event Deposited(address indexed user, uint256 amount);

    // Emitted whenever a user withdraws funds
    event Withdrawn(address indexed user, uint256 amount);

    // Emitted whenever a user transfers balance to another user inside the contract
    event Transferred(address indexed from, address indexed to, uint256 amount);

    // ==========================================
    // 3. MODIFIERS (Reusable Security Checks)
    // ==========================================

    // Restricts a function so only the contract owner can call it
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized: caller is not the owner");
        _; // Continue executing the function body
    }

    // ==========================================
    // 4. CONSTRUCTOR (Runs ONCE when deployed)
    // ==========================================

    constructor() {
        // msg.sender is the wallet address that deployed this contract
        owner = msg.sender;
    }

    // ==========================================
    // 5. CORE SMART CONTRACT FUNCTIONS
    // ==========================================

    /**
     * @notice Deposit ETH into your bank balance on the blockchain.
     *         The `payable` keyword allows this function to receive ETH (`msg.value`).
     */
    function deposit() public payable {
        // Ensure the user sent more than 0 ETH
        require(msg.value > 0, "Deposit amount must be greater than 0");

        // Increase the sender's recorded balance
        balances[msg.sender] += msg.value;

        // Increase the total bank balance
        totalBankBalance += msg.value;

        // Emit a blockchain event log
        emit Deposited(msg.sender, msg.value);
    }

    /**
     * @notice Transfer part of your deposited balance to another wallet address.
     * @param recipient The wallet address receiving the funds
     * @param amount The amount (in Wei) to transfer
     */
    function transferInternal(address recipient, uint256 amount) public {
        // Check that recipient is not the zero address
        require(recipient != address(0), "Invalid recipient address");

        // Check that the sender has enough balance
        require(balances[msg.sender] >= amount, "Insufficient balance");

        // Deduct from sender and add to recipient
        balances[msg.sender] -= amount;
        balances[recipient] += amount;

        // Emit transfer event
        emit Transferred(msg.sender, recipient, amount);
    }

    /**
     * @notice Withdraw your ETH back to your wallet.
     * @param amount The amount (in Wei) to withdraw
     */
    function withdraw(uint256 amount) public {
        // 1. Checks: Verify the caller has enough deposited balance
        require(balances[msg.sender] >= amount, "Insufficient balance to withdraw");

        // 2. Effects: Update state BEFORE sending ETH (protects against Re-entrancy attacks)
        balances[msg.sender] -= amount;
        totalBankBalance -= amount;

        // 3. Interactions: Send the ETH back to msg.sender
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "ETH transfer failed");

        // Emit withdrawal event
        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @notice Read the caller's own balance.
     */
    function getMyBalance() public view returns (uint256) {
        return balances[msg.sender];
    }

    // ==========================================
    // 6. BONUS: INLINE EVM ASSEMBLY IN SOLIDITY
    // ==========================================

    /**
     * @notice Demonstrates how Assembly (Yul) works inside a Smart Contract.
     *         Reads storage slot 1 (`totalBankBalance`) and adds a bonus using EVM opcodes.
     */
    function previewBalanceWithBonusAssembly(uint256 bonus) public view returns (uint256 totalWithBonus) {
        assembly {
            // SLOAD opcode: load the 256-bit value stored at storage slot 1 (totalBankBalance)
            let currentTotal := sload(1)

            // ADD opcode: add `currentTotal` and `bonus` on the EVM stack
            totalWithBonus := add(currentTotal, bonus)
        }
    }
}
