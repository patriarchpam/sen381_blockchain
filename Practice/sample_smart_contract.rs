// ============================================================================
// SAMPLE SMART CONTRACT IN RUST (Solana / Anchor + Pure Rust Ledger Example)
// ============================================================================
// This file contains two parts:
//   PART 1: A runnable Pure-Rust Smart Contract State Machine (`VeroinContract`)
//           that shows how balances, deposits, transfers, and error handling work.
//   PART 2: A Solana Anchor Smart Contract example showing how on-chain Rust
//           programs are written on Solana.
// ============================================================================

use std::collections::HashMap;

// ============================================================================
// PART 1: PURE RUST SMART CONTRACT STATE MACHINE
// ============================================================================

/// Custom error enum representing all reasons a smart contract call can revert
#[derive(Debug)]
pub enum ContractError {
    ZeroAmountNotAllowed,
    InsufficientBalance { available: u64, required: u64 },
    UnauthorizedCaller,
}

/// Event struct logged whenever a transaction succeeds
#[derive(Debug)]
pub struct TransferEvent {
    pub from: String,
    pub to: String,
    pub amount: u64,
}

/// The Smart Contract state stored on the blockchain
pub struct VeroinSmartContract {
    pub owner: String,
    pub total_supply: u64,
    pub balances: HashMap<String, u64>,
    pub events: Vec<TransferEvent>,
}

impl VeroinSmartContract {
    /// 1. CONSTRUCTOR: Initializes the smart contract and sets the deployer as `owner`
    pub fn new(deployer_address: &str) -> Self {
        Self {
            owner: deployer_address.to_string(),
            total_supply: 0,
            balances: HashMap::new(),
            events: Vec::new(),
        }
    }

    /// 2. MINT / DEPOSIT: Mints new tokens into a user's wallet balance
    pub fn deposit(&mut self, caller: &str, amount: u64) -> Result<u64, ContractError> {
        // Equivalent to Solidity's `require(amount > 0, "ZeroAmountNotAllowed");`
        if amount == 0 {
            return Err(ContractError::ZeroAmountNotAllowed);
        }

        // Look up the caller's balance (or default to 0) and add `amount`
        let user_balance = self.balances.entry(caller.to_string()).or_insert(0);
        *user_balance += amount;

        // Increase total contract supply
        self.total_supply += amount;

        Ok(*user_balance)
    }

    /// 3. TRANSFER: Moves tokens safely from `sender` to `recipient`
    pub fn transfer(
        &mut self,
        sender: &str,
        recipient: &str,
        amount: u64,
    ) -> Result<(), ContractError> {
        if amount == 0 {
            return Err(ContractError::ZeroAmountNotAllowed);
        }

        // Read sender's current balance (0 if not found)
        let sender_balance = self.balance_of(sender);

        // Verify the sender has enough tokens
        if sender_balance < amount {
            return Err(ContractError::InsufficientBalance {
                available: sender_balance,
                required: amount,
            });
        }

        // 1. Deduct from sender
        self.balances
            .insert(sender.to_string(), sender_balance - amount);

        // 2. Add to recipient
        let recipient_balance = self.balances.entry(recipient.to_string()).or_insert(0);
        *recipient_balance += amount;

        // 3. Emit/record transfer event
        self.events.push(TransferEvent {
            from: sender.to_string(),
            to: recipient.to_string(),
            amount,
        });

        Ok(())
    }

    /// 4. VIEW FUNCTION: Reads a wallet's balance without modifying state (`&self`)
    pub fn balance_of(&self, wallet: &str) -> u64 {
        // `.copied().unwrap_or(0)` returns the balance if present, or 0 if not
        self.balances.get(wallet).copied().unwrap_or(0)
    }
}

fn main() {
    // 1. Deploy the smart contract with "Alice" as owner
    let mut contract = VeroinSmartContract::new("Alice");

    // 2. Deposit 500 coins into Alice's account
    contract.deposit("Alice", 500).unwrap();
    println!("Alice initial balance: {}", contract.balance_of("Alice"));

    // 3. Transfer 150 coins from Alice to Bob
    match contract.transfer("Alice", "Bob", 150) {
        Ok(()) => println!(
            "Transfer succeeded! Alice: {}, Bob: {}",
            contract.balance_of("Alice"),
            contract.balance_of("Bob")
        ),
        Err(e) => println!("Transfer failed: {:?}", e),
    }

    // 4. Try transferring more than Alice has (triggers InsufficientBalance error!)
    match contract.transfer("Alice", "Bob", 9999) {
        Ok(()) => println!("Transfer succeeded!"),
        Err(e) => println!("Expected Revert Caught Safely: {:?}", e),
    }
}

// ============================================================================
// PART 2: HOW THIS LOOKS ON SOLANA (ANCHOR FRAMEWORK SMART CONTRACT)
// ============================================================================
/*
use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod veroin_solana_vault {
    use super::*;

    // Initialize a new on-chain vault account for a user
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.owner = ctx.accounts.user.key();
        vault.balance = 0;
        Ok(())
    }

    // Record a deposit into the user's on-chain vault account
    pub fn deposit(ctx: Context<UpdateVault>, amount: u64) -> Result<()> {
        require!(amount > 0, VaultError::ZeroAmount);
        let vault = &mut ctx.accounts.vault;
        vault.balance += amount;
        Ok(())
    }
}

// On-chain account data structure stored on Solana
#[account]
pub struct VaultAccount {
    pub owner: Pubkey,
    pub balance: u64,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = user, space = 8 + 32 + 8)]
    pub vault: Account<'info, VaultAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateVault<'info> {
    #[account(mut, has_one = owner)]
    pub vault: Account<'info, VaultAccount>,
    pub owner: Signer<'info>,
}

#[error_code]
pub enum VaultError {
    #[msg("Amount must be greater than zero.")]
    ZeroAmount,
}
*/
