const express = require("express");
const Web3 = require("web3");
const fs = require('fs');
const app = express();

// address of contract from 'truffle deploy'
const POLLSTATION_ADDRESS = "0xd5Fa77f7b8732d42b0d6162189FCE919cCc4663d";
const POLLSTATION_ABI = JSON.parse(fs.readFileSync("../bin/contracts/PollingStation.abi"));
const POLL_ABI = JSON.parse(fs.readFileSync("../bin/contracts/Poll.abi"));
const ENDPOINT = "http://127.0.0.1:7545";

const provider = new Web3.providers.HttpProvider(ENDPOINT);
const web3 = new Web3(provider);
const pollingStation = new web3.eth.Contract(POLLSTATION_ABI, POLLSTATION_ADDRESS);

// serve html files
app.use(express.static("."))

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
            let poll = new web3.eth.Contract(POLL_ABI, pollAddr);

            let name = await poll.methods.name().call();
            let options = await poll.methods.getOptions().call();
            let closed = await poll.methods.closed().call();
            //let voteCount = await poll.methods.getVoteCount().call();

            output.push({
                pollAddr: pollAddr,
                pollId: pollIds[i],
                name: name,
                options: options,
                closed: closed
            });
        } catch (err) {
            console.log(err);
        }
    }

    
    res.send(output);
});

// get all polls
app.use("/api/polls/:includeOpen/:includeClosed", async (req, res) => {
    let count = await pollingStation.methods.getCount().call();

    let polls = [];
    for (let i = 0; i < count; i++) {
        //let pollAddr = pollingStation.methods.polls()
    }

    res.send(polls);
});

app.listen(3000, () => {
    console.log("Listening on port 3000");
});

