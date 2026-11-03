# OpenSpace Finance (OpenSpace Ledger) — Complete Frontend, System & Lecturer Defense Guide

**Business-Block Name:** OpenSpace Finance (`openspace.finance` / OpenSpace Ledger)  
**Course:** SEN 381 — Blockchain Technology & Applications (Blockchain Elective)  
**Student:** Pam Patriarch (`VUG/SEN/24/12478`)  
**Lecturer:** Dr. Valentine Chibueze  
**Project Files:**
- **Live Blockchain Frontend:** [`index.html`](file:///c:/Users/user/Desktop/Blockchain/project/index.html)
- **Solidity Smart Contract:** [`OpenSpaceMurabaha.sol`](file:///c:/Users/user/Desktop/Blockchain/project/OpenSpaceMurabaha.sol)
- **Hardhat Test Suite:** [`OpenSpaceMurabaha.test.js`](file:///c:/Users/user/Desktop/Blockchain/project/OpenSpaceMurabaha.test.js)
- **Official Brand Logo:** [`Open-Spcae-Logo2-1.png`](file:///c:/Users/user/Desktop/Blockchain/project/Open-Spcae-Logo2-1.png)
- **Defense Slide Deck:** [`OpenSpace_Ledger_System_Deck.pptx`](file:///c:/Users/user/Desktop/Blockchain/project/OpenSpace_Ledger_System_Deck.pptx)

---

## PART 1: HOW TO EXPLAIN THE SYSTEM TO DR. VALENTINE CHIBUEZE (WORD-FOR-WORD SCRIPT)

### 1.1 The 30-Second Elevator Pitch (Start Here)

> *"Good day Dr. Chibueze. My project is **OpenSpace Finance (OpenSpace Ledger)**—a blockchain layer for **ethical, asset-backed SME financing** based on the **Murabaha** (cost-plus-markup) model.*
>
> *In ethical finance, investors do not lend cash for interest; they pool funds to purchase a real piece of productive equipment from a vendor and sell it to an SME at a fixed, pre-agreed markup paid in scheduled instalments. Today, platforms run this on private SQL databases where an administrator can silently edit deal terms, or borrowers can divert cash instead of buying the equipment. My smart contract, [`OpenSpaceMurabaha.sol`](file:///c:/Users/user/Desktop/Blockchain/project/OpenSpaceMurabaha.sol), solves both problems by locking the markup permanently after a 2-of-3 board multi-signature approval, disbursing the pooled funds **directly to the vendor** the instant funding reaches 100%, and allowing investors to pull their exact pro-rata repayments automatically with zero compounding late fees."*

---

### 1.2 Explaining the 5 Actors on the Chain

Point to the **Active Wallet Role** bar at the top of [`index.html`](file:///c:/Users/user/Desktop/Blockchain/project/index.html) and explain that every action is gated by Solidity modifiers (`onlyAdmin`, `onlyBoard`, `onlyKyc`):

1. **Admin (`0xAD01...9001`):** Deploys the contract, configures the 3 board members and the fixed markup (`1000 bps = 10%`), and whitelists KYC-verified wallets via `setKyc(address, bool)`. No wallet can apply or invest without passing KYC.
2. **SME Borrower (`0xSME0...1104`):** A KYC-verified business that requests equipment financing via `applyForFinancing()` by specifying the **Vendor wallet address**, the **Asset Cost**, the **number of instalments**, the **repayment interval**, and the **cryptographic hash of the vendor's invoice** (`assetRef`).
3. **The Board (3 Members — 2-of-3 Multi-Sig Gate):** Three independent reviewers (`Board #1`, `Board #2`, `Board #3`). When the **2nd of 3** board members calls `approve(id)`, the contract computes and permanently locks `total = cost + fixed markup`. Neither the Admin nor the Board can alter it afterwards.
4. **Investors (`Investor 1` & `Investor 2`):** KYC-verified liquidity providers who deposit ERC-20 settlement tokens (`osNGN`) into approved deals via `fund(id, amount)` and withdraw their proportional returns via `claim(id)`.
5. **Vendor (`0xVEND...8800` — Asset Seller):** Supplies the physical machinery/equipment to the SME. The smart contract pays the Vendor **directly** as soon as the pool is 100% funded, so the SME never touches the principal cash.

---

### 1.3 Live 5-Minute Walkthrough Using the 6 Gold/Lime Buttons on `index.html`

Open [`index.html`](file:///c:/Users/user/Desktop/Blockchain/project/index.html) in your browser and click the **⚡ 5-Minute Defense Walkthrough** buttons (`1` to `6`) in order while narrating:

- **Button `1. SME Apply (₦2M)`**
  - *What happens on screen:* Switches to the SME wallet and calls `applyForFinancing()` for a **₦2,000,000** solar equipment purchase from Vendor `0xVEND...8800` over **4 instalments** (every 30 days) with invoice reference `INV-2026-SOLAR-01`.
  - *What to say:* *"Deal #1 is created on-chain in `Status(0) Applied`. Total owed is still ₦0 until the board approves."*

- **Button `2. Board 2/3 Approve (Locks ₦2.2M)`**
  - *What happens on screen:* Board #1 signs (`approvals = 1/2`), then Board #2 signs (`approvals = 2/2`). State jumps to `Status(1) Approved` and `d.total` locks at **₦2,200,000**.
  - *What to say:* *"Because our threshold is 2-of-3, the second signature triggers `d.total = cost + (cost * markupBps / 10000)`. That locks **₦2,200,000** (₦2,000,000 cost + ₦200,000 fixed 10% markup) immutably on-chain."*

- **Button `3. Investors Fund (Auto-Pays Vendor)`**
  - *What happens on screen:* Investor 1 funds **₦800,000** (40%) and Investor 2 funds **₦1,200,000** (60%). Watch the **Vendor (`SolarEquip Ltd`)** balance in the right column jump from `₦0` to `₦2,000,000` automatically!
  - *What to say:* *"The exact moment `d.raised == d.cost` (₦2,000,000), the contract transitions to `Status(2) Funded` and executes `token.transfer(d.vendor, d.cost)`. The money goes straight from the smart contract pool to the equipment vendor, eliminating borrower fund diversion."*

- **Button `4. SME Repay Instalment (₦550k)` (Click 4 Times)**
  - *What happens on screen:* Each click transfers **₦550,000** (`₦2,200,000 / 4`) from the SME to the contract pool. On the 4th click, `d.repaid == d.total` (`₦2,200,000`), the state transitions to `Status(3) Closed`, and the Off-Chain Title Status changes to **`TRANSFERRED TO SME (Closed Event Fired)`**.
  - *What to say:* *"The SME repays in 4 fixed instalments. In Solidity, integer division can leave remainders (for example, ₦1,000,000 divided by 3). Our `repay()` function checks if it is the final instalment (`paidCount + 1 == installments`) and charges `d.total - d.repaid`, guaranteeing 100% lossless settlement down to the last token unit."*

- **Button `5. Investors Claim Pro-Rata`**
  - *What happens on screen:* Investor 1 calls `claim(1)` and withdraws **₦880,000** (40% of ₦2.2M = ₦800k principal + ₦80k profit). Investor 2 calls `claim(1)` and withdraws **₦1,320,000** (60% of ₦2.2M = ₦1.2M principal + ₦120k profit).
  - *What to say:* *"Instead of looping over an investor array inside `repay()`—which could run out of gas or let one broken wallet block repayments—we use the **pull-payment pattern**. Each investor independently pulls `((repaid * stake) / cost) - claimed`."*

- **Button `6. Tamper Test (Revert!)`**
  - *What happens on screen:* Switches to the unverified **Tamper / Non-KYC (`0xDEAD...BEEF`)** wallet and attempts to call `applyForFinancing()`. A red toast banner and a red **`EVM REVERT: require() failed: "KYC required"`** block appear in the event log.
  - *What to say:* *"Any unauthorized action—applying without KYC, a non-board member trying to approve, a board member trying to sign twice, or an investor trying to over-fund—immediately reverts on the EVM."*

---

### 1.4 Three Engineering & Security Highlights to Mention

1. **Hybrid On-Chain / Off-Chain Architecture (Why We Use Both EVM + Supabase):**
   - Storing PDFs or personal identity cards on an Ethereum blockchain is expensive and violates data privacy.
   - Therefore, PDF invoices, user profiles, and KYC documents live off-chain in **Supabase**, while their **SHA-256 reference (`assetRef`)**, **KYC boolean (`kyc[addr]`)**, and all **escrow/payout rules** live on-chain in [`OpenSpaceMurabaha.sol`](file:///c:/Users/user/Desktop/Blockchain/project/OpenSpaceMurabaha.sol).
2. **Defense-in-Depth Smart Contract Security:**
   - **Reentrancy Lock (`nonReentrant`):** Applied to all token-moving functions (`fund`, `repay`, `claim`) along with *Checks-Effects-Interactions* state ordering (`claimed` is updated *before* `token.transfer`).
   - **Markup Cap (`markupBps <= 5000`):** Enforced in the constructor so a predatory markup above 50% can never be deployed.
3. **Ethical Non-Compounding Default (`markDefault`):**
   - If the SME misses an instalment past `nextDueDate + grace` (30 days + 7 days grace = Day 37), a board member can call `markDefault(id)` to flag the deal `Status(4) Defaulted` on-chain.
   - Unlike conventional loans that compound penalty interest, `d.total` never increases upon default, strictly adhering to Murabaha ethical finance rules.

---

### 1.5 Three Honest Architectural Limitations (State These First!)

Lecturers give top marks when you state your system's real-world boundaries before they ask:
1. **No Hardware/Delivery Oracle Yet:** The smart contract proves the vendor was paid on-chain, but verifying that the vendor physically delivered the solar equipment to the SME relies on off-chain inspection by the **2-of-3 trusted board**.
2. **Off-Chain Legal Ownership Transfer:** When the final instalment is paid, the contract emits the `Closed(id)` event on-chain, which triggers the off-chain legal transfer of equipment title stored in Supabase.
3. **Testnet Prototype Status:** The system uses an ERC-20 mock Naira stablecoin (`osNGN`) for demonstration and requires an independent smart contract security audit and formal Shariah supervisory board certification before mainnet launch.

---

### 1.6 Anticipated Questions from Dr. Valentine Chibueze & Your Ready Answers

| Likely Question | Your Exact Answer |
| :--- | :--- |
| **"Why not just build this in a normal PostgreSQL or Supabase database?"** | *"A normal database is cheaper and faster, which is why we still use Supabase for caching and PDF storage. However, in a normal database, the database administrator has `UPDATE` privileges and can silently alter markup terms or redirect funds. By putting the escrow, 2-of-3 board lock, direct vendor payout, and pro-rata math on-chain in `OpenSpaceMurabaha.sol`, not even the `admin` who deployed the contract can edit a deal after approval or touch investor funds."* |
| **"How do you stop the SME borrower from taking the money and disappearing?"** | *"The SME borrower never receives the money. In `fund()`, once investor deposits reach `d.cost`, the smart contract transfers the ERC-20 tokens directly to `d.vendor`. The SME only receives the physical machinery from the vendor."* |
| **"Why don't you automatically loop through all investors and send them their money inside `repay()`?"** | *"In Solidity, looping over an dynamic array of investors to push tokens is a classic Denial-of-Service (DoS) vulnerability—if the array grows large it exceeds the block gas limit, or a single blacklisted/malicious investor address could make `repay()` revert for the whole deal. Using a pull-payment `claim()` function makes every withdrawal $O(1)$ gas and completely isolated."* |
| **"What happens if `total` doesn't divide evenly by `installments`?"** | *"Solidity integer division truncates decimals. In `repay()`, instalments $1$ to $N-1$ pay `d.total / d.installments`, and the final instalment ($N$) pays `d.total - d.repaid`, so every single remainder unit is collected on the last payment."* |

---

## PART 2: TECHNICAL BREAKDOWN OF THE FRONTEND (`index.html`)

### 2.1 Brand Theme & Visual Design
The frontend ([`index.html`](file:///c:/Users/user/Desktop/Blockchain/project/index.html)) is styled directly around the official **OpenSpace Finance** brand logo ([`Open-Spcae-Logo2-1.png`](file:///c:/Users/user/Desktop/Blockchain/project/Open-Spcae-Logo2-1.png)):
- **OpenSpace Forest Green (`#2B5E26` / `#1B3E17`):** Header banner, active role buttons, active state machine nodes, and primary action buttons.
- **OpenSpace Lime Green (`#CADB2A` / `#6D7D0B`):** Header accent border, logo frame, progress bar gradients, and pro-rata claim buttons.
- **Soft Sage & Cream Cards (`#F3F6F2` / `#F7FAE6`):** High-contrast financial tables and struct inspectors.
- **Alert Terracotta Red (`#A63A2A`):** Highlights EVM reverts (`require()` failures), rejected deals, and defaulted deals.

### 2.2 Dual Execution Modes
1. **Deterministic In-Browser EVM Simulation Mode (Default):** Mirrors every variable, mapping, modifier, arithmetic formula, and event of [`OpenSpaceMurabaha.sol`](file:///c:/Users/user/Desktop/Blockchain/project/OpenSpaceMurabaha.sol) inside JavaScript so you can demonstrate the entire lifecycle offline or on any classroom computer with zero setup.
2. **Web3 / MetaMask Mode (`ethers.js` v6):** Clicking **Connect MetaMask / EVM** in the top-right bar connects to `window.ethereum` for live testnet or local Hardhat node interaction.

### 2.3 Complete Mapping: Frontend UI Controls to `OpenSpaceMurabaha.sol` Functions

| Lifecycle Stage | Frontend Action in `index.html` | Solidity Function in `OpenSpaceMurabaha.sol` | Access Guard | On-Chain State & Token Effect |
| :--- | :--- | :--- | :--- | :--- |
| **1. KYC Whitelist** | Select **Admin** → Choose wallet → Click **Whitelist (true)** | [`setKyc(account, approved)`](file:///c:/Users/user/Desktop/Blockchain/project/OpenSpaceMurabaha.sol#L121-L125) | `onlyAdmin` | Updates `kyc[account] = approved` and emits `KycUpdated`. |
| **2. SME Application** | Select **SME** → Enter Cost, Instalments, Interval, Asset Ref → Click **Submit** | [`applyForFinancing(vendor, cost, installments, interval, assetRef)`](file:///c:/Users/user/Desktop/Blockchain/project/OpenSpaceMurabaha.sol#L130-L162) | `onlyKyc` | Initializes `deals[id]` in `Status.Applied` and emits `Applied`. |
| **3. Board Approval** | Select **Board #1** & **Board #2** → Click **Sign approve(1)** | [`approve(id)`](file:///c:/Users/user/Desktop/Blockchain/project/OpenSpaceMurabaha.sol#L167-L183) | `onlyBoard` | Records `signed[id][msg.sender] = true`. At 2nd sig (`approvals >= 2`), locks `d.total = cost + (cost * markupBps / 10000)` and sets `Status.Approved`. |
| **4. Board Rejection** | Select **Board #1–#3** → Click **reject(1)** | [`reject(id)`](file:///c:/Users/user/Desktop/Blockchain/project/OpenSpaceMurabaha.sol#L188-L196) | `onlyBoard` | Transitions an `Applied` deal to `Status.Rejected` and emits `Rejected`. |
| **5. Pool Funding & Vendor Payout** | Select **Investor 1** (`₦800k`) & **Investor 2** (`₦1.2M`) → Click **Fund Deal Pool** | [`fund(id, amount)`](file:///c:/Users/user/Desktop/Blockchain/project/OpenSpaceMurabaha.sol#L202-L221) | `onlyKyc`, `nonReentrant` | Pulls `amount` from investor into contract (`stake[id][investor] += amount`). When `d.raised == d.cost`, sets `Status.Funded`, records `fundedAt`, and transfers `d.cost` directly to `d.vendor`. |
| **6. SME Repayment** | Select **SME** → Click **Pay Next Fixed Instalment** | [`repay(id)`](file:///c:/Users/user/Desktop/Blockchain/project/OpenSpaceMurabaha.sol#L226-L249) | `msg.sender == d.sme`, `nonReentrant` | Pulls `d.total / d.installments` (or `d.total - d.repaid` on last instalment) from SME. When `d.repaid == d.total`, sets `Status.Closed` and emits `Closed(id)`. |
| **7. Investor Pro-Rata Claim** | Select **Investor 1** or **Investor 2** → Click **Withdraw Pro-Rata Claim** | [`claim(id)`](file:///c:/Users/user/Desktop/Blockchain/project/OpenSpaceMurabaha.sol#L254-L269) | `stake > 0`, `nonReentrant` | Calculates `entitled = (d.repaid * stake) / d.cost`, updates `claimed[id][investor] = entitled`, and transfers `entitled - alreadyClaimed` to investor. |
| **8. Ethical Default Flag** | Select **Board #1–#3** → Click **+40 Days Clock** → Click **markDefault(1)** | [`markDefault(id)`](file:///c:/Users/user/Desktop/Blockchain/project/OpenSpaceMurabaha.sol#L275-L284) | `onlyBoard` | Verifies `block.timestamp > nextDueDate + grace`. Sets `Status.Defaulted` and emits `Defaulted` with **0% penalty interest**. |

