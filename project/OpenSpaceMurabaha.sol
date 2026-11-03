// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title IERC20
 * @notice Minimal ERC-20 interface for settlement token transfers.
 */
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/**
 * @title OpenSpaceMurabaha
 * @notice Blockchain layer for ethical, asset-backed SME financing (OpenSpace Finance).
 * @dev Enforces KYC gating, 2-of-3 board approval with immutable fixed markup,
 *      direct vendor disbursement, fixed-instalment repayment, pro-rata pull claims,
 *      and non-compounding default flagging.
 */
contract OpenSpaceMurabaha {
    enum Status {
        Applied,
        Approved,
        Funded,
        Closed,
        Defaulted,
        Rejected
    }

    struct Deal {
        address sme;
        address vendor;
        uint256 cost;
        uint256 total;
        uint256 installments;
        uint256 interval;
        uint256 raised;
        uint256 repaid;
        uint256 paidCount;
        uint256 fundedAt;
        uint256 approvals;
        Status status;
        string assetRef;
    }

    IERC20 public immutable token;
    address public immutable admin;
    uint256 public immutable markupBps;
    uint256 public immutable threshold;
    uint256 public immutable grace;

    uint256 public dealCount;
    bool private locked;

    mapping(address => bool) public kyc;
    mapping(address => bool) public boardMember;
    mapping(uint256 => Deal) public deals;
    mapping(uint256 => mapping(address => bool)) public signed;
    mapping(uint256 => mapping(address => uint256)) public stake;
    mapping(uint256 => mapping(address => uint256)) public claimed;

    event KycUpdated(address indexed account, bool approved);
    event Applied(
        uint256 indexed id,
        address indexed sme,
        address indexed vendor,
        uint256 cost,
        uint256 installments,
        uint256 interval,
        string assetRef
    );
    event BoardSigned(uint256 indexed id, address indexed member, uint256 approvals);
    event Approved(uint256 indexed id, uint256 cost, uint256 total);
    event Rejected(uint256 indexed id, address indexed member);
    event Funded(uint256 indexed id, address indexed investor, uint256 amount, uint256 raised);
    event VendorDisbursed(uint256 indexed id, address indexed vendor, uint256 cost);
    event Repaid(uint256 indexed id, uint256 amount, uint256 repaid, uint256 paidCount);
    event Closed(uint256 indexed id);
    event Claimed(uint256 indexed id, address indexed investor, uint256 amount);
    event Defaulted(uint256 indexed id, address indexed flaggedBy);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    modifier onlyBoard() {
        require(boardMember[msg.sender], "Only board member");
        _;
    }

    modifier onlyKyc() {
        require(kyc[msg.sender], "KYC required");
        _;
    }

    modifier nonReentrant() {
        require(!locked, "ReentrancyGuard: reentrant call");
        locked = true;
        _;
        locked = false;
    }

    /**
     * @param _token ERC20 settlement token address
     * @param _board Array of 3 board member addresses
     * @param _markupBps Fixed markup in basis points (e.g., 1000 = 10%, max 5000 = 50%)
     * @param _grace Grace period in seconds after due date before default can be flagged
     */
    constructor(
        address _token,
        address[3] memory _board,
        uint256 _markupBps,
        uint256 _grace
    ) {
        require(_token != address(0), "Invalid token");
        require(_markupBps <= 5000, "Markup exceeds 50% cap");

        token = IERC20(_token);
        admin = msg.sender;
        markupBps = _markupBps;
        threshold = 2; // 2-of-3 multisig board approval
        grace = _grace;

        for (uint256 i = 0; i < 3; i++) {
            require(_board[i] != address(0), "Invalid board member");
            require(!boardMember[_board[i]], "Duplicate board member");
            boardMember[_board[i]] = true;
        }
    }

    /**
     * @notice Whitelist or revoke a KYC-verified wallet.
     */
    function setKyc(address account, bool approved) external onlyAdmin {
        require(account != address(0), "Zero address");
        kyc[account] = approved;
        emit KycUpdated(account, approved);
    }

    /**
     * @notice SME submits an application for asset-backed Murabaha financing.
     */
    function applyForFinancing(
        address vendor,
        uint256 cost,
        uint256 installments,
        uint256 interval,
        string calldata assetRef
    ) external onlyKyc returns (uint256 id) {
        require(vendor != address(0) && vendor != msg.sender, "Invalid vendor");
        require(cost > 0, "Cost must be > 0");
        require(installments > 0, "Installments must be > 0");
        require(interval > 0, "Interval must be > 0");
        require(bytes(assetRef).length > 0, "Asset reference required");

        id = ++dealCount;
        deals[id] = Deal({
            sme: msg.sender,
            vendor: vendor,
            cost: cost,
            total: 0,
            installments: installments,
            interval: interval,
            raised: 0,
            repaid: 0,
            paidCount: 0,
            fundedAt: 0,
            approvals: 0,
            status: Status.Applied,
            assetRef: assetRef
        });

        emit Applied(id, msg.sender, vendor, cost, installments, interval, assetRef);
    }

    /**
     * @notice Board member signs approval. Second signature locks total = cost + fixed markup.
     */
    function approve(uint256 id) external onlyBoard {
        Deal storage d = deals[id];
        require(d.cost > 0, "Deal does not exist");
        require(d.status == Status.Applied, "Not in Applied state");
        require(!signed[id][msg.sender], "Already signed");

        signed[id][msg.sender] = true;
        d.approvals += 1;
        emit BoardSigned(id, msg.sender, d.approvals);

        if (d.approvals >= threshold) {
            d.total = d.cost + ((d.cost * markupBps) / 10000);
            d.status = Status.Approved;
            emit Approved(id, d.cost, d.total);
        }
    }

    /**
     * @notice Board member rejects an application before it is approved.
     */
    function reject(uint256 id) external onlyBoard {
        Deal storage d = deals[id];
        require(d.cost > 0, "Deal does not exist");
        require(d.status == Status.Applied, "Not in Applied state");

        d.status = Status.Rejected;
        emit Rejected(id, msg.sender);
    }

    /**
     * @notice KYC-approved investor funds an approved deal.
     *         When raised reaches cost, the contract disburses directly to the vendor.
     */
    function fund(uint256 id, uint256 amount) external onlyKyc nonReentrant {
        Deal storage d = deals[id];
        require(d.status == Status.Approved, "Deal not open for funding");
        require(amount > 0, "Amount must be > 0");
        require(d.raised + amount <= d.cost, "Exceeds asset cost");

        d.raised += amount;
        stake[id][msg.sender] += amount;

        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        emit Funded(id, msg.sender, amount, d.raised);

        if (d.raised == d.cost) {
            d.status = Status.Funded;
            d.fundedAt = block.timestamp;
            require(token.transfer(d.vendor, d.cost), "Vendor payout failed");
            emit VendorDisbursed(id, d.vendor, d.cost);
        }
    }

    /**
     * @notice SME repays fixed instalments; final instalment clears any rounding remainder.
     */
    function repay(uint256 id) external nonReentrant {
        Deal storage d = deals[id];
        require(msg.sender == d.sme, "Only deal SME");
        require(d.status == Status.Funded, "Deal not in Funded state");
        require(d.paidCount < d.installments, "All installments paid");

        uint256 amount;
        if (d.paidCount + 1 == d.installments) {
            amount = d.total - d.repaid;
        } else {
            amount = d.total / d.installments;
        }

        d.repaid += amount;
        d.paidCount += 1;

        require(token.transferFrom(msg.sender, address(this), amount), "Repay transfer failed");
        emit Repaid(id, amount, d.repaid, d.paidCount);

        if (d.repaid == d.total) {
            d.status = Status.Closed;
            emit Closed(id);
        }
    }

    /**
     * @notice Investors pull their pro-rata share of repayments made so far.
     */
    function claim(uint256 id) external nonReentrant {
        Deal storage d = deals[id];
        uint256 userStake = stake[id][msg.sender];
        require(userStake > 0, "No stake in deal");

        uint256 totalEntitled = (d.repaid * userStake) / d.cost;
        uint256 alreadyClaimed = claimed[id][msg.sender];
        require(totalEntitled > alreadyClaimed, "Nothing to claim");

        uint256 payout = totalEntitled - alreadyClaimed;
        claimed[id][msg.sender] = totalEntitled;

        require(token.transfer(msg.sender, payout), "Claim transfer failed");
        emit Claimed(id, msg.sender, payout);
    }

    /**
     * @notice Board flags a deal as Defaulted if an instalment is overdue past the grace period.
     *         No compounding interest or late penalty is added to d.total.
     */
    function markDefault(uint256 id) external onlyBoard {
        Deal storage d = deals[id];
        require(d.status == Status.Funded, "Deal not active");
        uint256 nextDueDate = d.fundedAt + ((d.paidCount + 1) * d.interval);
        require(block.timestamp > nextDueDate + grace, "Grace period not expired");

        d.status = Status.Defaulted;
        emit Defaulted(id, msg.sender);
    }

    /**
     * @notice View remaining unpaid balance on a deal.
     */
    function outstanding(uint256 id) external view returns (uint256) {
        Deal storage d = deals[id];
        if (d.total <= d.repaid) return 0;
        return d.total - d.repaid;
    }
}

