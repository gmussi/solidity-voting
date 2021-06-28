const PollingStation = artifacts.require("../contracts/PollingStation.sol");
const Poll = artifacts.require("../contracts/Poll.sol");

const utils = require("./helpers/utils");

contract("PollingStation", (accounts) => {
    let {0: owner, // owner of polling stattion
        1: guilherme, // wants to create a poll
        2: fernando, // wants to vote on a poll
        3: matheus, // wants to sell a vote
        4: marcelo, // wants to buy a vote
    } = accounts;

    let pollStation;
    beforeEach(async () => {
        pollStation = await PollingStation.deployed();
    });
    
    let firstOption = "A";
    let secondOption = "B";
    let options = [web3.utils.asciiToHex(firstOption), web3.utils.asciiToHex(secondOption)];

    context("poll management", async () => {

        it ("Should allow creation of a poll", async () => {
            let pollName = "Poll " + new Date().toUTCString();
            let result = await pollStation.createPoll(pollName, options, {from: owner});
    
            let pollAddr = result.receipt.logs[1].args.pollAddr;

            let poll = await Poll.at(pollAddr);

            assert.equal(await poll.name(), pollName, "Poll name not saved");

            let savedOptions = await poll.getOptions();
            assert.equal(web3.utils.toUtf8(savedOptions[0]), firstOption, "First option did not match");
            assert.equal(web3.utils.toUtf8(savedOptions[1]), secondOption, "Second option did not match");
            assert.equal(savedOptions.length, 2, "Array should have 2 items");
        });

        it ("Should allow owner to close a poll, only once", async () => {
            let pollName = "Poll " + new Date().toUTCString();
            let result = await pollStation.createPoll(pollName, options, {from: guilherme});
            let pollAddr = result.receipt.logs[1].args.pollAddr;

            let poll = await Poll.at(pollAddr);

            utils.shouldThrow(poll.closePoll({from: fernando})); // should fail because this user is not the owner
            await poll.closePoll({from: guilherme}); // this time it should work
            utils.shouldThrow(poll.closePoll({from: guilherme})); // should fail because it is already closed

            assert.isTrue(await poll.closed(), "Poll should be closed but isn't");
        });

        it ("Should fail creation with invalid parameters", async () => {
            utils.shouldThrow(pollStation.createPoll("NN", [], {from: guilherme})); // should fail without options
        });

        it ("Should give me my polls", async () => {
            let pollName = "Poll " + new Date().toUTCString();
            let result = await pollStation.createPoll(pollName, options, {from: guilherme}); 
            let pollId = result.receipt.logs[1].args.pollId.toNumber();

            result = await pollStation.getMyPolls({from: guilherme}); // list my polls
            result = result.map(bn => bn.toNumber()); // results are all in BN, map to number
            assert.isTrue(result.includes(pollId), "Poll id did not match"); // ensure poll created is here 
        });

    });

    context("Voting", async () => {
        it ("Should allow an address to vote, but only once", async () => {
            let pollName = "Poll " + new Date().toUTCString();
            let result = await pollStation.createPoll(pollName, options, {from: guilherme}); 
            
            let pollAddr = result.receipt.logs[1].args.pollAddr;

            let poll = await Poll.at(pollAddr);

            await poll.vote(options[0], fernando, {from: fernando}); // voting first time should work
            utils.shouldThrow(poll.vote(options[1], fernando, {from: fernando}), "Voting second time must not work");

        });
        it ("Should allow an address to vote, only if owning the vote", async () => {
            let pollName = "Poll " + new Date().toUTCString();
            let result = await pollStation.createPoll(pollName, options, {from: guilherme}); 
            
            let pollAddr = result.receipt.logs[1].args.pollAddr;

            let poll = await Poll.at(pollAddr);

            await poll.vote(options[0], fernando, {from: fernando}); // voting in his name should work
            utils.shouldThrow(poll.vote(options[1], matheus, {from: marcelo}), "Voting for someone should not work here"); // voting for someone else should not work (without selling the vote first)
        });
    });

})