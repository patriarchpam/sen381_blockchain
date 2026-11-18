// Import the Express framework to build our HTTP server and API endpoints
const express = require('express');

// Create an Express application instance to handle incoming HTTP requests and routes
const app = express();

// Import body-parser middleware so our server can read JSON and form data sent in POST request bodies
const bodyParser = require('body-parser');

// Import our custom Blockchain class constructor from blockchain.js
const Blockchain = require('./blockchain');

// Import the uuid library to generate a unique random string for this node's wallet address
const uuid = require('uuid');

// Read the port number from the 2nd command-line argument (e.g., 3001, 3002, 3003, 3004, 3005)
// Why: This allows us to run multiple instances of this same file on different ports to simulate a decentralized network
const port = process.argv[2];

// Import request-promise so this node can make asynchronous HTTP requests to other nodes in the network
const rp = require('request-promise');

// Generate a unique wallet address for this node (removing dashes) to receive mining rewards
const nodeAddress = uuid.v1().split('-').join('');

// Instantiate a new Blockchain copy named 'veroin' for this specific network node
const veroin = new Blockchain();

// Register bodyParser.json() middleware to automatically parse incoming JSON payloads into req.body
app.use(bodyParser.json());

// Register bodyParser.urlencoded() middleware to parse URL-encoded form data into req.body
app.use(bodyParser.urlencoded({ extended: false }));

// Home route ('/'): simple health-check endpoint to verify the server is up and responding
app.get('/', function (req, res) {
    // Send a plain text greeting back to the client/browser
    res.send('Hello Yeips');
});

// Endpoint 1 ('GET /blockchain'): fetches and returns the entire blockchain state stored on this node
app.get('/blockchain', function (req, res) {
    // Send the entire veroin blockchain instance (chain, pendingTransactions, currentNodeUrl, networkNodes) as JSON
    res.send(veroin);
});

// Endpoint 2 ('POST /transaction'): receives a transaction object from a broadcast and adds it to this node's pendingTransactions
// create a new transaction
app.post('/transaction', function (req, res) {
    // Extract the complete transaction object (amount, sender, recipient, transactionId) sent in the request body
    const newTransaction = req.body;

    // Add the transaction object to this node's pendingTransactions array and get the index of the next block
    const blockIndex = veroin.addTransactionToPendingTransactions(newTransaction);

    // Respond with a JSON confirmation message telling the caller which block will include this transaction
    res.json({ note: `Transaction will be added in block ${blockIndex}.` });
});

// Endpoint 3 ('POST /transaction/broadcast'): creates a new transaction on this node AND broadcasts it to all peer nodes
// broadcast transaction
app.post('/transaction/broadcast', function (req, res) {
    // Create a new transaction object (with a unique transactionId) using amount, sender, and recipient from req.body
    const newTransaction = veroin.createNewTransaction(
        req.body.amount,
        req.body.sender,
        req.body.recipient
    );

    // Add the newly created transaction to this current node's own pendingTransactions array
    veroin.addTransactionToPendingTransactions(newTransaction);

    // Create an array to hold all the HTTP request promises as we broadcast the transaction to every peer node
    const requestPromises = [];

    // Loop through every peer node URL currently registered in veroin.networkNodes
    veroin.networkNodes.forEach(networkNodeUrl => {
        // Configure the POST request options to send newTransaction to each peer node's '/transaction' endpoint
        const requestOptions = {
            // Target the peer node's '/transaction' route
            uri: networkNodeUrl + '/transaction',
            // Use HTTP POST method
            method: 'POST',
            // Send the complete newTransaction object in the request body
            body: newTransaction,
            // Automatically serialize body as JSON and parse response as JSON
            json: true
        };

        // Execute the asynchronous HTTP request and push the promise into requestPromises
        requestPromises.push(rp(requestOptions));
    });

    // Wait for all broadcast requests to every peer node to complete
    Promise.all(requestPromises)
        .then(data => {
            // Send a JSON response confirming the transaction was created locally and broadcast across the network
            res.json({ note: 'Transaction created and broadcast successfully.' });
        });
});

// Endpoint 4 ('GET /mine'): mines a new block using Proof of Work, broadcasts the new block to all peers, and broadcasts the mining reward
// mine a block
app.get('/mine', function (req, res) {
    // Retrieve the most recent block in the chain so we can reference its hash and index
    const lastBlock = veroin.getLastBlock();

    // Extract the hash of the last block to cryptographically link the new block to it
    const previousBlockHash = lastBlock['hash'];

    // Bundle the current pending transactions and the upcoming block's index into an object for Proof of Work hashing
    const currentBlockData = {
        transactions: veroin.pendingTransactions,
        index: lastBlock['index'] + 1
    };

    // Run Proof of Work to find the valid nonce that makes the block hash start with '0000'
    const nonce = veroin.proofOfWork(previousBlockHash, currentBlockData);

    // Generate the final SHA-256 hash for the new block using the previous hash, current data, and winning nonce
    const blockHash = veroin.hashBlock(previousBlockHash, currentBlockData, nonce);

    // Create the new block and append it to this node's chain (also clears this node's pendingTransactions)
    const newBlock = veroin.createNewBlock(nonce, previousBlockHash, blockHash);

    // Create an array to hold the HTTP request promises for broadcasting the newly mined block to all peer nodes
    const requestPromises = [];

    // Loop through every registered peer node URL in the network
    veroin.networkNodes.forEach(networkNodeUrl => {
        // Configure the POST request to send the newly mined block to each peer's '/receive-new-block' endpoint
        const requestOptions = {
            uri: networkNodeUrl + '/receive-new-block',
            method: 'POST',
            body: { newBlock: newBlock },
            json: true
        };

        // Send the request and store the promise in requestPromises
        requestPromises.push(rp(requestOptions));
    });

    // Wait for all peer nodes to receive and process the newly mined block
    Promise.all(requestPromises)
        .then(data => {
            // Once all nodes have the new block, broadcast the 12.5 coin mining reward transaction to the entire network
            const requestOptions = {
                // Call our own '/transaction/broadcast' endpoint so the reward is queued locally AND sent to all peers
                uri: veroin.currentNodeUrl + '/transaction/broadcast',
                method: 'POST',
                body: {
                    amount: 12.5,
                    sender: "00",
                    recipient: nodeAddress
                },
                json: true
            };

            // Execute the mining-reward broadcast request
            return rp(requestOptions);
        })
        .then(data => {
            // Send a JSON response back to the client confirming the block was mined and broadcast across all nodes
            res.json({
                note: "New block mined & broadcast successfully",
                block: newBlock
            });
        });
});

// Endpoint 5 ('POST /receive-new-block'): receives a newly mined block broadcast by a peer node, validates it, and adds it to the chain
// receive new block
app.post('/receive-new-block', function (req, res) {
    // Extract the newly mined block object from the incoming request body
    const newBlock = req.body.newBlock;

    // Get this node's current last block so we can validate the incoming block against it
    const lastBlock = veroin.getLastBlock();

    // Check 1: Does the new block's previousBlockHash match the hash of our current last block?
    const correctHash = lastBlock.hash === newBlock.previousBlockHash;

    // Check 2: Is the new block's index exactly 1 greater than our current last block's index?
    const correctIndex = lastBlock['index'] + 1 === newBlock['index'];

    // If both checks pass, the block is legitimate and fits right onto the end of our chain
    if (correctHash && correctIndex) {
        // Append the validated new block to this node's chain
        veroin.chain.push(newBlock);

        // Clear this node's pendingTransactions because those transactions are now inside newBlock
        veroin.pendingTransactions = [];
        veroin.pendingTransaction = veroin.pendingTransactions;
        veroin.newTransaction = veroin.pendingTransactions;

        // Respond confirming that the new block was accepted
        res.json({
            note: 'New block received and accepted.',
            newBlock: newBlock
        });
    } else {
        // If either check fails, reject the block and do not modify our chain
        res.json({
            note: 'New block rejected.',
            newBlock: newBlock
        });
    }
});

// Endpoint 6 ('POST /register-and-broadcast-node'): registers a new node on this server AND broadcasts it to all peer nodes
app.post('/register-and-broadcast-node', function (req, res) {
    // Extract the URL of the new node wanting to join the network from the request body
    const newNodeUrl = req.body.newNodeUrl;

    // Check if the new node URL is not already in this node's networkNodes array (-1 means not found)
    if (veroin.networkNodes.indexOf(newNodeUrl) == -1) {
        // Add the new node URL to this node's list of known peer nodes
        veroin.networkNodes.push(newNodeUrl);
    }

    // Create an array to hold all the HTTP request promises as we broadcast to every existing peer node
    const regNodesPromises = [];

    // Loop through every peer node URL currently registered in this node's networkNodes list
    veroin.networkNodes.forEach(networkNodeUrl => {
        // Configure the POST request options to call '/register-node' on each existing peer node
        const requestOptions = {
            // Target URL of the peer node's '/register-node' endpoint
            uri: networkNodeUrl + '/register-node',
            // Use HTTP POST method to send data
            method: 'POST',
            // Send the new node's URL in the request body so the peer can add it
            body: { newNodeUrl: newNodeUrl },
            // Automatically serialize the body as JSON and parse the response as JSON
            json: true
        };

        // Send the asynchronous request via request-promise and store the promise in our array
        regNodesPromises.push(rp(requestOptions));
    });

    // Wait for all broadcast requests to existing peer nodes to finish
    Promise.all(regNodesPromises)
        .then(data => {
            // Once all existing nodes know about the new node, send all existing nodes' URLs to the new node at once
            const bulkRegisterOptions = {
                // Target the '/register-nodes-bulk' endpoint on the newly joined node
                uri: newNodeUrl + '/register-nodes-bulk',
                // Use HTTP POST method
                method: 'POST',
                // Send an array containing all known peer nodes PLUS this current node's own URL
                body: { allNetworkNodes: [...veroin.networkNodes, veroin.currentNodeUrl] },
                // Automatically format and parse as JSON
                json: true
            };

            // Execute the bulk registration HTTP request to the new node
            return rp(bulkRegisterOptions);
        })
        .then(data => {
            // After both broadcasting and bulk registration complete, send a success response back to the client
            res.json({ note: 'New node registered with network successfully.' });
        });
});

// Endpoint 7 ('POST /register-node'): receives a broadcast from a peer and registers the new node locally
// Why: Prevents an infinite broadcast loop because this endpoint only adds the node without re-broadcasting it
app.post('/register-node', function (req, res) {
    // Extract the new node's URL from the incoming POST request body
    const newNodeUrl = req.body.newNodeUrl;

    // Check that the new node URL is not already present in this node's networkNodes array
    const nodeNotAlreadyPresent = veroin.networkNodes.indexOf(newNodeUrl) == -1;

    // Check that the new node URL is not this node's own URL (a node shouldn't list itself as a peer)
    const notCurrentNode = veroin.currentNodeUrl !== newNodeUrl;

    // Only add the new node if both checks pass (not a duplicate and not self)
    if (nodeNotAlreadyPresent && notCurrentNode) {
        // Push the new node URL into this node's networkNodes array
        veroin.networkNodes.push(newNodeUrl);
    }

    // Respond with a confirmation JSON message
    res.json({ note: 'New node registered successfully with node.' });
});

// Endpoint 8 ('POST /register-nodes-bulk'): registers all existing network nodes on the newly joined node at once
// Why: Ensures the new node immediately learns about every other node that was already in the network before it joined
app.post('/register-nodes-bulk', function (req, res) {
    // Extract the array of all existing network node URLs from the request body
    const allNetworkNodes = req.body.allNetworkNodes;

    // Iterate over every node URL in the received array
    allNetworkNodes.forEach(networkNodeUrl => {
        // Verify this node URL is not already in our networkNodes list to avoid duplicates
        const nodeNotAlreadyPresent = veroin.networkNodes.indexOf(networkNodeUrl) == -1;

        // Verify this node URL is not our own currentNodeUrl so we don't register ourselves as a peer
        const notCurrentNode = veroin.currentNodeUrl !== networkNodeUrl;

        // If the URL is neither already present nor our own URL, add it to networkNodes
        if (nodeNotAlreadyPresent && notCurrentNode) {
            // Add the peer node URL to this node's networkNodes array
            veroin.networkNodes.push(networkNodeUrl);
        }
    });

    // Send a JSON confirmation indicating bulk registration succeeded
    res.json({ note: 'Bulk registration successful.' });
});

// Start the Express HTTP server listening on the dynamic port passed via process.argv[2]
app.listen(port, function () {
    // Print a message to the console showing which port this specific node is running on
    console.log(`Listening on port ${port}...`);
});
