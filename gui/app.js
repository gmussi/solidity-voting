var GLOBAL = {
    myaddress: null,
    POLL_ABI: null,
    POLLSTATION_ABI: null,
    POLLSTATION_ADDRESS: null,
    options: []
}, pollingStation;

const loadConfig = async() => {
    let output = await fetch(`/config`);
    let config = await output.json();

    GLOBAL.POLL_ABI = config.POLL_ABI;
    GLOBAL.POLLSTATION_ABI = config.POLLSTATION_ABI;
    GLOBAL.POLLSTATION_ADDRESS = config.POLLSTATION_ADDRESS;
}

/**
 * Check if Ethereum/MetaMask is installed on the browser
 */
const ethEnabled = async () => {  
    if (window.ethereum) {    
        await ethereum.request({ method: 'eth_requestAccounts' });
        window.web3 = new Web3(window.ethereum);    
        return true;  
    }  
    return false;
}