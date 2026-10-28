const Blockchain = require('./blockchain');

const Devcoin = new Blockchain();

// test 1 A 
// console.log("test 1A \n ", Devcoin);

// test 1 B
// Devcoin.createNewBlock();
// console.log("\ntest 1B \n", Devcoin);

// test 1 C
// Devcoin.createNewBlock(231, "DevinChidozie", "0903328edu372");
// console.log("\ntest 1C \n", Devcoin);

// test 1 D
// Devcoin.createNewBlock(2341, "VeritasDevinchidozie", "21219328edu372");
// console.log("\ntest 1D \n", Devcoin);

// test 2A
// Devcoin.createNewBlock(2341, "VeritasDevinchidozie", "21219328edu372");

// Devcoin.createNewTransaction(101, "WUBDHBWHBIWBXBUB", "CEUECYEVCEYWEUVC");
// console.log("\ntest 2A with new Transaction \n", Devcoin);

// Devcoin.createNewTransaction(501, "WUBDHBWHBIWBXBUB", "CEUECYEVCEYWEUVC");
// Devcoin.createNewTransaction(430, "WUBDHBWHBIWBXBUB", "CEUECYEVCEYWEUVC");
// Devcoin.createNewTransaction(901, "WUBDHBWHBIWBXBUB", "CEUECYEVCEYWEUVC");
// console.log("\ntest 2D with new Transaction \n", Devcoin);

// const previousBlockHash = "23E389HFDF4F9823UB4FUBBUJ488FBUYUFI";
// const currentBlockData = [
//   {
//      amount: 10,
//      sender: "PFDVR8FNAEGNLSNFIDURERFWN",
//      recipient: "dbcueycyveycvabyvbyrbyvyb"
//   }
// ];
// const nonce = 200;
// const hash = Devcoin.hashBlock(previousBlockHash, currentBlockData, nonce);
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
const nonce = Devcoin.proofOfWork(previousBlockHash, currentBlockData);
console.log("\nCorrect Nonce:", nonce);

// Use hashBlock method to find the exact solution block
console.log("\nExact Solution Block Hash:\n", Devcoin.hashBlock(previousBlockHash, currentBlockData, nonce));

// Genesis block output
console.log("\nBlockchain with Genesis Block:\n", Devcoin);
