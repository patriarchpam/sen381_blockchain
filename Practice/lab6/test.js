const Blockchain = require('./blockchain');

const Yeicoin = new Blockchain();

// test 1 A 
// console.log("test 1A \n ", Yeicoin);

// test 1 B
Yeicoin.createNewBlock();
console.log("\ntest 1B \n", Yeicoin);

// test 1 C
Yeicoin.createNewBlock(231, "PamPatriarch", "08035379edu082");
console.log("\ntest 1C \n", Yeicoin);

// test 1 D
Yeicoin.createNewBlock(2341, "VeritasDevinchidozie", "21219328edu372");
console.log("\ntest 1D \n", Yeicoin);

// test 2A
Yeicoin.createNewBlock(1, "PamPatriarch", "GenesisBlock");

Yeicoin.createNewTransaction(101, "Yeicoin", "PamPatriarch");
console.log("\ntest 2A with new Transaction \n", Yeicoin);

// Yeicoin.createNewTransaction(501, "WUBDHBWHBIWBXBUB", "CEUECYEVCEYWEUVC");
// Yeicoin.createNewTransaction(430, "WUBDHBWHBIWBXBUB", "CEUECYEVCEYWEUVC");
// Yeicoin.createNewTransaction(901, "WUBDHBWHBIWBXBUB", "CEUECYEVCEYWEUVC");
// console.log("\ntest 2D with new Transaction \n", Yeicoin);

// const previousBlockHash = "23E389HFDF4F9823UB4FUBBUJ488FBUYUFI";
// const currentBlockData = [
//   {
//      amount: 10,
//      sender: "PFDVR8FNAEGNLSNFIDURERFWN",
//      recipient: "dbcueycyveycvabyvbyrbyvyb"
//   }
// ];
// const nonce = 200;
// const hash = Yeicoin.hashBlock(previousBlockHash, currentBlockData, nonce);
// console.log("\ntest 2E with hash\n", hash);

const previousBlockHash = "23E389HFDF4F9823UB4FUBBUJ488FBUYUFUBR";
const currentBlockData = [
    {
        amount: 10,
        sender: "PFDVR8FNAEGNLSNFIDURERFWN",
        recipient: "dbcueycyveycvabyvbyrbyvyb"
    },
    {
        amount: 100,
        sender: "EUDMUITIAICIEEURNEUBESUCE",
        recipient: "CXBIUEVUEIWUMIEUIOUNI"
    },
    {
        amount: 200,
        sender: "WUBDHBWHBIWBXBUB",
        recipient: "CEUECYEVCEYWEUVC"
    }
];

// Test Proof of Work
const nonce = Yeicoin.proofOfWork(previousBlockHash, currentBlockData);
console.log("\nCorrect Nonce:", nonce);

// Use hashBlock method to find the exact solution block
console.log("\nExact Solution Block Hash:\n", Yeicoin.hashBlock(previousBlockHash, currentBlockData, nonce));

// Genesis block output
console.log("\nBlockchain with Genesis Block:\n", Yeicoin);
