const express = require("express");
const Web3 = require("web3");
const fs = require('fs');
const app = express();

// address of contract from 'truffle deploy'
const POLLSTATION_ADDRESS = "0x0a5654Bb328Bea24A2E1787971cF7794DaC0894c";
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
    if (!web3.utils.isAddress(address)) {
        return;
    }

    let pollIds = await pollingStation.methods.getMyPolls().call({from: address});

    let output = [];
    
    for (let i = 0; i < pollIds.length; i++) {
        try { 
            let pollAddr = await pollingStation.methods.polls(parseInt(pollIds[i])).call({from: address});
            
            let poll = await loadPoll(pollAddr);
            output.push(poll);
        } catch (err) {
            console.log(err);
        }
    }
    res.send(output);
});

// get all polls
app.use("/api/polls", async (req, res) => {
    let count = await pollingStation.methods.getCount().call();
    let polls = [];
    for (let i = 0; i < count; i++) {
        let pollAddr = await pollingStation.methods.polls(i).call();
        let poll = await loadPoll(pollAddr);
        polls.push(poll);
    }
    res.send(polls);
});

app.use("/api/poll/:pollAddr", async (req, res) => {
    res.send(await loadPoll(req.params.pollAddr));
});

/**
 * Gets all votes currently for sale
 * @dev This method is highly innefficient.
 * @todo Listen to events and cache this information locally for all polls
 */
app.use("/api/votes/:pollAddr/sell", async (req, res) => {
    let poll = await new web3.eth.Contract(POLL_ABI, req.params.pollAddr);
    
    // find all votes ever put on sale
    let events = await poll.getPastEvents("VoteForSale", {
        fromBlock: 1
    });
    
    let votes = [];
    let addressesChecked = [];
    // check if the votes are still for sale
    for (let event of events) {
        let voteAddr = event.returnValues.voteAddr;
        if (addressesChecked.indexOf(voteAddr) == -1) {
            addressesChecked.push(voteAddr);

            let vote = await loadVote(poll, voteAddr);
            if (!vote.used && vote.forSale) {
                votes.push(vote);
            }
        }
    }

    res.send(votes);
});

app.use("/api/votes/:pollAddr/:userAddr", async (req, res) => {
    let poll = new web3.eth.Contract(POLL_ABI, req.params.pollAddr);
    let userAddr = req.params.userAddr;
    try {
        let votes = [];
        let addressesChecked = [];

        let vote = await loadVote(poll, userAddr);
        addressesChecked.push(userAddr);
        let voteOwner = vote.owner === "0x0000000000000000000000000000000000000000" ? vote.address : vote.owner;

        if (!vote.used && userAddr.toLowerCase() === voteOwner.toLowerCase()) {
            votes.push(vote);
        }

        // find all votes ever bought by this address
        let events = await poll.getPastEvents("VoteOwnershipChanged", {
            fromBlock: "earliest",
            filter: {
                buyer: req.params.userAddr
            }
        });    
        
        for (let event of events) {
            let voteAddr = event.returnValues.voteAddr;

            if (addressesChecked.indexOf(voteAddr) == -1) {
                addressesChecked.push(voteAddr);
    
                vote = await loadVote(poll, voteAddr);

                voteOwner = vote.owner === "0x0000000000000000000000000000000000000000" ? vote.address : vote.owner;
                if (!vote.used && userAddr.toLowerCase() === voteOwner.toLowerCase()) {
                    votes.push(vote);
                }
            }
        }

        res.send(votes);
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

    return {
        name,
        pollAddr,
        options : options.map(web3.utils.hexToAscii),
        closed,
        owner
    };
}

const loadVote = async (poll, address) => {
    let {0: used, 1: forSale, 2: price, 3: owner} = await poll.methods.getVote(address).call();
    return {
        used, 
        forSale,
        price,
        owner,
        address
    }
}