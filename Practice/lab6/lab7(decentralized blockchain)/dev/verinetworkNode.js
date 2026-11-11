// Import the Express framework to build our HTTP server and API endpoints
const express = require('express');

// Create an Express application instance to handle incoming HTTP requests and routes
const app = express();

// Import body-parser middleware so our server can read JSON and form data sent in POST request bodies
const bodyParser = require('body-parser');

// Import our custom Blockchain class constructor from blockchain.js
const Blockchain = require('./blockchain');

// Import the v1 function from the uuid library to generate a unique random string for this node's wallet address
const { v1: uuid } = require('uuid');

// Read the port number from the 2nd command-line argument (e.g., 3001, 3002, 3003)
// Why: This allows us to run multiple instances of this same file on different ports to simulate a decentralized network
const port = process.argv[2];

// Import request-promise so this node can make asynchronous HTTP requests to other nodes in the network
const rp = require('request-promise');

// Generate a unique wallet address for this node (removing dashes) to receive mining rewards
const nodeAddress = uuid().split('-').join('');

// Instantiate a new Blockchain copy for this specific network node
const bitcoin = new Blockchain();

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
    // Send the entire bitcoin instance (chain, pendingTransactions, currentNodeUrl, networkNodes) as JSON
    res.send(bitcoin);
});

// Endpoint 2 ('POST /transaction'): creates a new transaction and adds it to this node's pendingTransactions
app.post('/transaction', function (req, res) {
    // Log the incoming request body to the terminal for debugging/verification
    console.log(req.body);

    // Call createNewTransaction with the amount, sender, and recipient from req.body; returns the next block index
    const blockIndex = bitcoin.createNewTransaction(
        req.body.amount,
        req.body.sender,
        req.body.recipient
    );

    // Respond with a JSON confirmation message telling the user which block will include this transaction
    res.json({ note: `Transaction will be added in block ${blockIndex}.` });
});

// Endpoint 3 ('GET /mine'): mines a new block using Proof of Work and adds it to this node's chain
app.get('/mine', function (req, res) {
    // Retrieve the most recent block in the chain so we can reference its hash and index
    const lastBlock = bitcoin.getLastBlock();

    // Extract the hash of the last block to link the new block to it
    const previousBlockHash = lastBlock['hash'];

    // Bundle the current pending transactions and the new block's index into an object for hashing
    const currentBlockData = {
        transactions: bitcoin.pendingTransactions,
        index: lastBlock['index'] + 1
    };

    // Run Proof of Work to find the valid nonce that makes the block hash start with '0000'
    const nonce = bitcoin.proofOfWork(previousBlockHash, currentBlockData);

    // Generate the final SHA-256 hash for the new block using the previous hash, current data, and winning nonce
    const blockHash = bitcoin.hashBlock(previousBlockHash, currentBlockData, nonce);

    // Create the new block and append it to this node's blockchain
    const newBlock = bitcoin.createNewBlock(nonce, previousBlockHash, blockHash);

    // Send a JSON response back to the client confirming the block was mined and showing the block details
    res.json({
        note: "New block mined successfully",
        block: newBlock
    });

    // Reward the miner (this node) with 12.5 coins from system address "00" (queued for the next block)
    bitcoin.createNewTransaction(12.5, "00", nodeAddress);
});

// Endpoint 4 ('POST /register-and-broadcast-node'): registers a new node on this server AND broadcasts it to all peer nodes
app.post('/register-and-broadcast-node', function (req, res) {
    // Extract the URL of the new node wanting to join the network from the request body
    const newNodeUrl = req.body.newNodeUrl;

    // Check if the new node URL is not already in this node's networkNodes array (-1 means not found)
    if (bitcoin.networkNodes.indexOf(newNodeUrl) == -1) {
        // Add the new node URL to this node's list of known peer nodes
        bitcoin.networkNodes.push(newNodeUrl);
    }

    // Create an array to hold all the HTTP request promises as we broadcast to every existing peer node
    const regNodesPromises = [];

    // Loop through every peer node URL currently registered in this node's networkNodes list
    bitcoin.networkNodes.forEach(networkNodeUrl => {
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
                body: { allNetworkNodes: [...bitcoin.networkNodes, bitcoin.currentNodeUrl] },
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

// Endpoint 5 ('POST /register-node'): receives a broadcast from a peer and registers the new node locally
// Why: Prevents an infinite broadcast loop because this endpoint only adds the node without re-broadcasting it
app.post('/register-node', function (req, res) {
    // Extract the new node's URL from the incoming POST request body
    const newNodeUrl = req.body.newNodeUrl;

    // Check that the new node URL is not already present in this node's networkNodes array
    const nodeNotAlreadyPresent = bitcoin.networkNodes.indexOf(newNodeUrl) == -1;

    // Check that the new node URL is not this node's own URL (a node shouldn't list itself as a peer)
    const notCurrentNode = bitcoin.currentNodeUrl !== newNodeUrl;

    // Only add the new node if both checks pass (not a duplicate and not self)
    if (nodeNotAlreadyPresent && notCurrentNode) {
        // Push the new node URL into this node's networkNodes array
        bitcoin.networkNodes.push(newNodeUrl);
    }

    // Respond with a confirmation JSON message
    res.json({ note: 'New node registered successfully with node.' });
});

// Endpoint 6 ('POST /register-nodes-bulk'): registers all existing network nodes on the newly joined node at once
// Why: Ensures the new node immediately learns about every other node that was already in the network before it joined
app.post('/register-nodes-bulk', function (req, res) {
    // Extract the array of all existing network node URLs from the request body
    const allNetworkNodes = req.body.allNetworkNodes;

    // Iterate over every node URL in the received array
    allNetworkNodes.forEach(networkNodeUrl => {
        // Verify this node URL is not already in our networkNodes list to avoid duplicates
        const nodeNotAlreadyPresent = bitcoin.networkNodes.indexOf(networkNodeUrl) == -1;

        // Verify this node URL is not our own currentNodeUrl so we don't register ourselves as a peer
        const notCurrentNode = bitcoin.currentNodeUrl !== networkNodeUrl;

        // If the URL is neither already present nor our own URL, add it to networkNodes
        if (nodeNotAlreadyPresent && notCurrentNode) {
            // Add the peer node URL to this node's networkNodes array
            bitcoin.networkNodes.push(networkNodeUrl);
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
