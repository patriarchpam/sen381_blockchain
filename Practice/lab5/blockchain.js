const sha256 = require('sha256');

class Blockchain {
    constructor() {
        this.chain = [];
        this.pendingTransactions = [];
        this.newTransaction = this.pendingTransactions;

        // Genesis Block
        this.createNewBlock(100, '0', '0');
    }
}

// Create a new block and add it to the chain
Blockchain.prototype.createNewBlock = function (nonce, previousBlockHash, hash) {
    const newBlock = {
        index: this.chain.length + 1,
        timestamp: Date.now(),
        transactions: this.pendingTransactions,
        nonce: nonce,
        hash: hash,
        previousBlockHash: previousBlockHash,
    };

    this.pendingTransactions = [];
    this.newTransaction = this.pendingTransactions;
    this.chain.push(newBlock);

    return newBlock;
};

// Retrieve the last block in the blockchain
Blockchain.prototype.getLastBlock = function () {
    return this.chain[this.chain.length - 1];
};

// Create a new transaction to be added to the next mined block
Blockchain.prototype.createNewTransaction = function (amount, sender, recipient) {
    const newTransaction = {
        amount: amount,
        sender: sender,
        recipient: recipient,
    };

    this.pendingTransactions.push(newTransaction);
    return this.getLastBlock()['index'] + 1;
};

// Hash block data using SHA-256
Blockchain.prototype.hashBlock = function (previousBlockHash, currentBlockData, nonce) {
    const dataAsString = previousBlockHash + nonce.toString() + JSON.stringify(currentBlockData);
    const hash = sha256(dataAsString);
    return hash;
};

// Proof of Work: find nonce that produces hash starting with '0000'
Blockchain.prototype.proofOfWork = function (previousBlockHash, currentBlockData) {
    let nonce = 0;
    let hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);

    while (hash.substring(0, 4) !== '0000') {
        nonce++;
        hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
    }

    return nonce;
};

module.exports = Blockchain;
