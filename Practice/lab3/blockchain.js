const sha256 = require('sha256');

class Blockchain {
    constructor() {
        this.chain = [];
        this.newTransaction = [];
    }
}

// Lab 3: Hashing Block
Blockchain.prototype.hashBlock = function (
    previousBlockHash,
    currentBlockData,
    nonce
) {
    // the data string will consist of previous block, nonce and present block. This further makes the secret key generated difficult to compromise
    const dataAsString = previousBlockHash + nonce.toString() + JSON.stringify(currentBlockData);
    
    // the string of data is hashed next
    const hash = sha256(dataAsString);
    
    // the fina l hashed value is supplied next by method next
    return hash;
};

module.exports = Blockchain;
