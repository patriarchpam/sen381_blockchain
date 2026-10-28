class Blockchain {
    constructor() {
        this.chain=[];
        this.newTransaction=[];
        
    }
}

Blockchain.prototype.createNewBlock = function (
    nonce,
    previousBlockHash,
    hash
) {
    const newBlock={
        index:this.chain.length+1,
        timesstamp:Date.now(),
        transactions:this.newTransaction,
        nonce:nonce,
        hash:hash,
        previousBlockHash:previousBlockHash,
    };
    this.newTransaction=[];
    this.chain.push(newBlock);
    return newBlock;
    
};

Blockchain.prototype.getLastBlock=function(){
    return this.chain[this.chain.length-1];
};
Blockchain.prototype.createNewTransaction=function(
    amount,
    sender,
    recipient

){
    const newTransaction={

    
    amount:amount,
    sender:sender,
    recipient:recipient
    };
    this.newTransaction.push(newTransaction);
    return this.getLastBlock();

};

module.exports=Blockchain;