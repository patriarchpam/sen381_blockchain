let express = require('express');
const app = express();
const bodyParser = require('body-parser');
// const Blockchain = require('./blockchain');

// const bitcoin = new Blockchain();

// Middleware to parse JSON and urlencoded request bodies
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: false }));

// Home endpoint for testing
app.get('/', function (req, res) {
    res.send('Hello Yeips');
});

// Endpoint 1: Fetch the entire blockchain
app.get('/blockchain', function (req, res) {
    res.send(bitcoin);
});

// Endpoint 2: Create a new transaction in pending transactions
app.post('/transaction', function (req, res) {
    const blockIndex = bitcoin.createNewTransaction(
        req.body.amount,
        req.body.sender,
        req.body.recipient
    );
    res.json({ note: `Transaction will be added in block ${blockIndex}.` });
});

// Endpoint 3: Mine a new block
app.get('/mine', function (req, res) {
    const lastBlock = bitcoin.getLastBlock();
    const previousBlockHash = lastBlock['hash'];
    const currentBlockData = {
        transactions: bitcoin.pendingTransactions,
        index: lastBlock['index'] + 1
    };

    const nonce = bitcoin.proofOfWork(previousBlockHash, currentBlockData);
    const blockHash = bitcoin.hashBlock(previousBlockHash, currentBlockData, nonce);

    const newBlock = bitcoin.createNewBlock(nonce, previousBlockHash, blockHash);

    res.json({
        note: "New block mined successfully",
        block: newBlock
    });
});

app.listen(3000, function () {
    console.log('Listening on port 3000...');
});
