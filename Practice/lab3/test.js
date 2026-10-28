const Blockchain = require('./blockchain');
const veroin = new Blockchain();

// define a sample random previous block
const previousBlockHash = 'OINAISDFN09N3240NGSF';

// define sample current block data
const currentBlockData = [
    {
        amount: 101,
        sender: 'WUBDHBWHBIWBXBUB',
        recipient: 'CEUECYEVCEYWEUVC'
    },
    {
        amount: 501,
        sender: 'WUBDHBWHBIWBXBUB',
        recipient: 'CEUECYEVCEYWEUVC' 
    }
];
const nonce = 100; 
console.log("Previous Block Hash :", previousBlockHash);
console.log("Nonce               :", nonce);
console.log("Generated Block Hash:", veroin.hashBlock(previousBlockHash, currentBlockData, nonce));
