const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

let cachedProvider = null;
let cachedSigner = null;
let cachedContract = null;
let cachedAbi = null;
let abiLoadAttempted = false;

const isBlockchainEnabled = () =>
    Boolean(
        process.env.ETH_RPC_URL &&
            process.env.TRACE_CONTRACT_ADDRESS &&
            process.env.TRACE_SIGNER_PRIVATE_KEY
    );

const resolveAbi = () => {
    if (cachedAbi || abiLoadAttempted) {
        return cachedAbi;
    }

    abiLoadAttempted = true;

    try {
        const fallbackPath = path.join(__dirname, '../abis/trace-abi.json');
        const abiPath = process.env.TRACE_CONTRACT_ABI_PATH || fallbackPath;

        if (!fs.existsSync(abiPath)) {
            console.warn('[blockchain] ABI file not found at', abiPath);
            return null;
        }

        const raw = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
        cachedAbi = Array.isArray(raw) ? raw : raw.abi;

        if (!Array.isArray(cachedAbi)) {
            console.warn('[blockchain] ABI file does not contain a valid array. Please update it with your contract ABI.');
            cachedAbi = null;
        }
    } catch (error) {
        console.warn('[blockchain] Failed to load ABI:', error.message);
        cachedAbi = null;
    }

    return cachedAbi;
};

const getBlockchainProvider = () => {
    if (!isBlockchainEnabled()) {
        return null;
    }

    if (!cachedProvider) {
        cachedProvider = new ethers.JsonRpcProvider(process.env.ETH_RPC_URL);
    }

    return cachedProvider;
};

const getBlockchainSigner = () => {
    if (!isBlockchainEnabled()) {
        return null;
    }

    if (!cachedSigner) {
        const provider = getBlockchainProvider();
        cachedSigner = new ethers.Wallet(process.env.TRACE_SIGNER_PRIVATE_KEY, provider);
    }

    return cachedSigner;
};

const getTraceContract = () => {
    if (!isBlockchainEnabled()) {
        return null;
    }

    if (cachedContract) {
        return cachedContract;
    }

    const abi = resolveAbi();

    if (!abi) {
        console.warn('[blockchain] ABI is missing. Skipping contract initialisation.');
        return null;
    }

    const signer = getBlockchainSigner();

    if (!signer) {
        return null;
    }

    try {
        cachedContract = new ethers.Contract(
            process.env.TRACE_CONTRACT_ADDRESS,
            abi,
            signer
        );
    } catch (error) {
        console.warn('[blockchain] Failed to initialise contract:', error.message);
        cachedContract = null;
    }

    return cachedContract;
};

module.exports = {
    isBlockchainEnabled,
    getBlockchainProvider,
    getBlockchainSigner,
    getTraceContract,
};

