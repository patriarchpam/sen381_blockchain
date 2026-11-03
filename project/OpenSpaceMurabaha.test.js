const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("OpenSpaceMurabaha Full Lifecycle, Security & Edge-Case Suite", function () {
  let token, murabaha;
  let admin, board1, board2, board3, sme, investor1, investor2, vendor, attacker;

  const MARKUP_BPS = 1000; // 10% fixed markup
  const GRACE_PERIOD = 7 * 24 * 60 * 60; // 7 days in seconds
  const COST = ethers.parseUnits("2000000", 18); // 2,000,000 NGN
  const TOTAL = ethers.parseUnits("2200000", 18); // 2,200,000 NGN
  const INSTALLMENTS = 4;
  const INTERVAL = 30 * 24 * 60 * 60; // 30 days in seconds

  beforeEach(async function () {
    [admin, board1, board2, board3, sme, investor1, investor2, vendor, attacker] =
      await ethers.getSigners();

    // Deploy Mock ERC20 Settlement Token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("OpenSpace Naira", "osNGN");
    await token.waitForDeployment();

    // Deploy OpenSpaceMurabaha Contract
    const OpenSpaceMurabaha = await ethers.getContractFactory("OpenSpaceMurabaha");
    murabaha = await OpenSpaceMurabaha.deploy(
      await token.getAddress(),
      [board1.address, board2.address, board3.address],
      MARKUP_BPS,
      GRACE_PERIOD
    );
    await murabaha.waitForDeployment();

    // Whitelist KYC for SME and Investors
    await murabaha.connect(admin).setKyc(sme.address, true);
    await murabaha.connect(admin).setKyc(investor1.address, true);
    await murabaha.connect(admin).setKyc(investor2.address, true);

    // Mint tokens to Investors and SME (for repayment markup)
    await token.mint(investor1.address, ethers.parseUnits("5000000", 18));
    await token.mint(investor2.address, ethers.parseUnits("5000000", 18));
    await token.mint(sme.address, ethers.parseUnits("5000000", 18));

    // Approve Murabaha contract to spend tokens
    const contractAddr = await murabaha.getAddress();
    await token.connect(investor1).approve(contractAddr, ethers.MaxUint256);
    await token.connect(investor2).approve(contractAddr, ethers.MaxUint256);
    await token.connect(sme).approve(contractAddr, ethers.MaxUint256);
  });

  it("1. Completes full happy-path lifecycle: Apply -> 2/3 Board Approve -> Pool Fund -> Direct Vendor Payout -> 4 Instalments -> Pro-Rata Claims -> Close", async function () {
    // 1. SME Applies
    await expect(
      murabaha
        .connect(sme)
        .applyForFinancing(vendor.address, COST, INSTALLMENTS, INTERVAL, "INV-2026-001#sha256")
    ).to.emit(murabaha, "Applied");

    // 2. Board Approves (2 of 3 required)
    await murabaha.connect(board1).approve(1);
    let deal = await murabaha.deals(1);
    expect(deal.status).to.equal(0); // Still Applied after 1 signature

    await expect(murabaha.connect(board2).approve(1))
      .to.emit(murabaha, "Approved")
      .withArgs(1, COST, TOTAL);

    deal = await murabaha.deals(1);
    expect(deal.status).to.equal(1); // Approved
    expect(deal.total).to.equal(TOTAL);

    // 3. Investors Fund (40% = 800k, 60% = 1.2M)
    const stake1 = ethers.parseUnits("800000", 18);
    const stake2 = ethers.parseUnits("1200000", 18);

    await murabaha.connect(investor1).fund(1, stake1);
    expect(await token.balanceOf(vendor.address)).to.equal(0); // Not yet full

    await expect(murabaha.connect(investor2).fund(1, stake2))
      .to.emit(murabaha, "VendorDisbursed")
      .withArgs(1, vendor.address, COST);

    // Verify Vendor received 100% of COST directly
    expect(await token.balanceOf(vendor.address)).to.equal(COST);

    // 4. SME Repays 4 instalments of 550,000 NGN each
    for (let i = 0; i < INSTALLMENTS; i++) {
      await murabaha.connect(sme).repay(1);
    }

    deal = await murabaha.deals(1);
    expect(deal.status).to.equal(3); // Closed
    expect(await murabaha.outstanding(1)).to.equal(0);

    // 5. Investors Claim Pro-Rata Payouts (880,000 and 1,320,000)
    const bal1Before = await token.balanceOf(investor1.address);
    await murabaha.connect(investor1).claim(1);
    const bal1After = await token.balanceOf(investor1.address);
    expect(bal1After - bal1Before).to.equal(ethers.parseUnits("880000", 18));

    const bal2Before = await token.balanceOf(investor2.address);
    await murabaha.connect(investor2).claim(1);
    const bal2After = await token.balanceOf(investor2.address);
    expect(bal2After - bal2Before).to.equal(ethers.parseUnits("1320000", 18));
  });

  it("2. Enforces security & tamper checks: non-KYC, non-board, double signing, and over-funding revert", async function () {
    // Non-KYC cannot apply
    await expect(
      murabaha.connect(attacker).applyForFinancing(vendor.address, COST, 4, INTERVAL, "REF")
    ).to.be.revertedWith("KYC required");

    await murabaha.connect(sme).applyForFinancing(vendor.address, COST, 4, INTERVAL, "REF");

    // Non-board cannot approve
    await expect(murabaha.connect(attacker).approve(1)).to.be.revertedWith("Only board member");

    // Same board member cannot sign twice
    await murabaha.connect(board1).approve(1);
    await expect(murabaha.connect(board1).approve(1)).to.be.revertedWith("Already signed");

    await murabaha.connect(board2).approve(1);

    // Over-funding reverts
    const tooMuch = COST + 1n;
    await expect(murabaha.connect(investor1).fund(1, tooMuch)).to.be.revertedWith(
      "Exceeds asset cost"
    );
  });

  it("3. Clears integer division rounding remainder on the final instalment without loss", async function () {
    // Cost = 1000, Total = 1100, Installments = 3 -> 366, 366, and final 368
    await murabaha.connect(sme).applyForFinancing(vendor.address, 1000n, 3, INTERVAL, "ROUND-REF");
    await murabaha.connect(board1).approve(1);
    await murabaha.connect(board2).approve(1);
    await murabaha.connect(investor1).fund(1, 1000n);

    await murabaha.connect(sme).repay(1); // 366
    expect((await murabaha.deals(1)).repaid).to.equal(366n);

    await murabaha.connect(sme).repay(1); // 366 -> 732
    expect((await murabaha.deals(1)).repaid).to.equal(732n);

    await murabaha.connect(sme).repay(1); // 1100 - 732 = 368 -> 1100
    const deal = await murabaha.deals(1);
    expect(deal.repaid).to.equal(1100n);
    expect(deal.status).to.equal(3); // Closed
  });

  it("4. Flags Default only after due date + grace period with zero compounding penalty", async function () {
    await murabaha.connect(sme).applyForFinancing(vendor.address, COST, 4, INTERVAL, "DEF-REF");
    await murabaha.connect(board1).approve(1);
    await murabaha.connect(board2).approve(1);
    await murabaha.connect(investor1).fund(1, COST);

    // Cannot flag default before due date + grace
    await expect(murabaha.connect(board3).markDefault(1)).to.be.revertedWith(
      "Grace period not expired"
    );

    // Advance time past 1st interval + grace period
    await time.increase(INTERVAL + GRACE_PERIOD + 10);

    await expect(murabaha.connect(board3).markDefault(1))
      .to.emit(murabaha, "Defaulted")
      .withArgs(1, board3.address);

    const deal = await murabaha.deals(1);
    expect(deal.status).to.equal(4); // Defaulted
    expect(deal.total).to.equal(TOTAL); // Total debt never compounds
  });
});

