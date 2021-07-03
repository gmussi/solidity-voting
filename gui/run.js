const express = require("express");
const Web3 = require("web3");
const fs = require('fs');
const app = express();

// address of contract from 'truffle deploy'
const POLLSTATION_ADDRESS = "0xde02035F3Ad66f5680ac7a40126DA046e0304cAC";
const POLLSTATION_ABI = JSON.parse(fs.readFileSync("../bin/contracts/PollingStation.abi"));
const POLL_ABI = JSON.parse(fs.readFileSync("../bin/contracts/Poll.abi"));
const ENDPOINT = "http://127.0.0.1:7545";

const provider = new Web3.providers.HttpProvider(ENDPOINT);
const web3 = new Web3(provider);
const pollingStation = new web3.eth.Contract(POLLSTATION_ABI, POLLSTATION_ADDRESS);

// serve html files
app.use(express.static("."));

// serve abi files
app.use("/config", (req, res) => {
    res.send({
        POLLSTATION_ADDRESS: POLLSTATION_ADDRESS,
        POLLSTATION_ABI: POLLSTATION_ABI,
        POLL_ABI: POLL_ABI
    });
});

// get my polls
app.use("/api/mypolls/:address", async (req, res) => {
    let address = req.params.address;
    if (!address) {
        return;
    }

    let pollIds = await pollingStation.methods.getMyPolls().call({from: address});

    let output = [];
    
    for (let i = 0; i < pollIds.length; i++) {
        try { 
            let pollAddr = await pollingStation.methods.polls(parseInt(pollIds[i])).call({from: address});
            console.log("address", pollAddr)
            
            let poll = await loadPoll(pollAddr);
            output.push(poll);
        } catch (err) {
            console.log(err);
        }
    }
    res.send(output);
});

app.use("/api/poll/:pollAddr", async (req, res) => {
    res.send(await loadPoll(req.params.pollAddr));
});

app.use("/api/votes/:pollAddr/:userAddr", async (req, res) => {
    let poll = new web3.eth.Contract(POLL_ABI, req.params.pollAddr);

    try {
        let myvote = await poll.methods.getVote(req.params.userAddr).call();
        console.log(myvote)

        let votes = [];
        votes.push(myvote);
        res.send(myvote);
    } catch (err) {
        console.log(err);
    }
});

app.listen(3000, () => {
    console.log("Listening on port 3000");
});

const loadPoll = async (pollAddr) => {
    let poll = new web3.eth.Contract(POLL_ABI, pollAddr);

    let name = await poll.methods.name().call();
    let options = await poll.methods.getOptions().call();
    let closed = await poll.methods.closed().call();
    let owner = await poll.methods.owner().call();
    //let voteCount = await poll.methods.getVoteCount().call();

    return {
        name: name,
        pollAddr: pollAddr,
        options : options.map(web3.utils.hexToAscii),
        closed : closed,
        owner: owner
    };
}