const Blockchain=require('./blockchain');
//test 1  A 
const Devcoin=new Blockchain();
// console.log("test 1A \n ",Devcoin)

// //test 1 B
// Devcoin.createNewBlock();
// console.log("\ntest 1B \n",Devcoin)

// //test 1 C
// Devcoin.createNewBlock(231,"DevinChidozie","0903328edu372");
// console.log("\ntest 1C \n",Devcoin)

// //test 1 D
// Devcoin.createNewBlock(2341,"VeritasDevinchidozie","21219328edu372");
// console.log("\ntest 1D \n",Devcoin)

//test 2A
Devcoin.createNewBlock(2341,"VeritasDevinchidozie","21219328edu372");

Devcoin.createNewTransaction(101,"WUBDHBWHBIWBXBUB","CEUECYEVCEYWEUVC");
console.log("\ntest 2A with new Transaction  \n",Devcoin)

Devcoin.createNewTransaction(501,"WUBDHBWHBIWBXBUB","CEUECYEVCEYWEUVC");
Devcoin.createNewTransaction(430,"WUBDHBWHBIWBXBUB","CEUECYEVCEYWEUVC");
Devcoin.createNewTransaction(901,"WUBDHBWHBIWBXBUB","CEUECYEVCEYWEUVC");
console.log("\ntest 2D with new Transaction  \n",Devcoin)


