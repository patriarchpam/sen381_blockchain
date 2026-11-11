// Import the sha256 library to generate cryptographic SHA-256 hashes for blocks
const sha256 = require('sha256');

// Read the current node's URL from the 3rd command-line argument (or fall back to localhost:<port>)
// Why: Each node in the decentralized network needs to know its own unique URL so it can identify itself
const currentNodeUrl = process.argv[3] || `http://localhost:${process.argv[2]}`;

// Define the Blockchain class that represents our decentralized ledger data structure
class Blockchain {
    // The constructor runs automatically whenever a new Blockchain instance is created
    constructor() {
        // Initialize an empty array to store all mined and verified blocks in the blockchain
        this.chain = [];

        // Initialize an empty array to hold unconfirmed transactions waiting to be mined into the next block
        this.pendingTransactions = [];

        // Create an alias reference to pendingTransactions for backward compatibility with previous labs
        this.newTransaction = this.pendingTransactions;

        // Assign this node's own URL so the blockchain instance knows which network node it belongs to
        this.currentNodeUrl = currentNodeUrl;

        // Initialize an empty array to store the URLs of all other peer nodes in the decentralized network
        this.networkNodes = [];

        // Create the Genesis Block (the very first block in the chain) with arbitrary starter values (nonce: 100, previousHash: '0', hash: '0')
        this.createNewBlock(100, '0', '0');
    }
}

// Method to create a new block, clear pending transactions, and append the block to the chain
Blockchain.prototype.createNewBlock = function (nonce, previousBlockHash, hash) {
    // Construct a new block object containing all required block metadata and transactions
    const newBlock = {
        // Block number/height in the chain (1-based index)
        index: this.chain.length + 1,
        // Exact time (in milliseconds since Jan 1, 1970) when the block was created
        timestamp: Date.now(),
        // All pending transactions that have been collected since the previous block was mined
        transactions: this.pendingTransactions,
        // The Proof-of-Work number (nonce) that solved the cryptographic puzzle for this block
        nonce: nonce,
        // The SHA-256 hash fingerprint of the current block's data
        hash: hash,
        // The SHA-256 hash of the previous block, cryptographically linking the chain together
        previousBlockHash: previousBlockHash,
    };

    // Reset the pendingTransactions array to empty so new transactions can be collected for the next block
    this.pendingTransactions = [];

    // Update the alias reference to point to the newly reset pendingTransactions array
    this.newTransaction = this.pendingTransactions;

    // Push the newly created block onto the end of the blockchain array
    this.chain.push(newBlock);

    // Return the newly created block so the caller (e.g., the /mine endpoint) can send it in the response
    return newBlock;
};

// Method to retrieve the most recently added block at the tip of the blockchain
Blockchain.prototype.getLastBlock = function () {
    // Return the last element in the chain array (index is length - 1)
    return this.chain[this.chain.length - 1];
};

// Method to create a new transaction and queue it in pendingTransactions for the next block
Blockchain.prototype.createNewTransaction = function (amount, sender, recipient) {
    // Create a transaction object recording how much is sent, who sent it, and who receives it
    const newTransaction = {
        // The quantity of coins/tokens being transferred
        amount: amount,
        // The wallet address or identifier of the sender
        sender: sender,
        // The wallet address or identifier of the recipient
        recipient: recipient,
    };

    // Add this new transaction to the pendingTransactions array to wait for the next mining round
    this.pendingTransactions.push(newTransaction);

    // Return the index number of the upcoming block that this transaction will be added into
    return this.getLastBlock()['index'] + 1;
};

// Method to hash a block's data into a fixed-length 64-character SHA-256 hexadecimal string
Blockchain.prototype.hashBlock = function (previousBlockHash, currentBlockData, nonce) {
    // Concatenate the previous block hash, the nonce (converted to string), and the JSON string of currentBlockData into one single string
    const dataAsString = previousBlockHash + nonce.toString() + JSON.stringify(currentBlockData);

    // Pass the combined string into the sha256 function to compute its cryptographic hash
    const hash = sha256(dataAsString);

    // Return the resulting hash string
    return hash;
};

// Method to perform Proof of Work (consensus algorithm) by repeatedly hashing until a hash starting with '0000' is found
Blockchain.prototype.proofOfWork = function (previousBlockHash, currentBlockData) {
    // Start the nonce counter at 0 for our first trial attempt
    let nonce = 0;

    // Calculate the initial hash using nonce = 0
    let hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);

    // Keep looping as long as the first 4 characters of the hash are NOT '0000' (the difficulty target)
    while (hash.substring(0, 4) !== '0000') {
        // Increment the nonce by 1 to try a completely different hash on the next iteration
        nonce++;

        // Re-compute the SHA-256 hash using the new nonce value
        hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
    }

    // Return the winning nonce value that produced a valid hash starting with '0000'
    return nonce;
};

// Export the Blockchain class so it can be imported and used in verinetworkNode.js and test.js
module.exports = Blockchain;
