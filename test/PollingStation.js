const PollingStation = artifacts.require("../contracts/PollingStation.sol");
const Poll = artifacts.require("../contracts/Poll.sol");

const utils = require("./helpers/utils");

/**
 * Variables below are needed as utils for the test functions
 */
let pollStation, pollOwner; 
let firstOption = "A";
let secondOption = "B";
let options = [web3.utils.asciiToHex(firstOption), web3.utils.asciiToHex(secondOption)];

/**
 * Although we have 2 contracts in this code, they are so intelinked that all tests are grouped in this file.
 */
contract("PollingStation", async (accounts) => {
    let {0: owner, // owner of polling stattion
        1: guilherme, // wants to create a poll
        2: fernando, // wants to vote on a poll
        3: voteSeller, // wants to sell a vote
        4: voteBuyer, // wants to buy a vote
        5: luciano, // wants to delegate a vote
    } = accounts;
    
    
    
    beforeEach(async () => {
        pollStation = await PollingStation.deployed();
        pollOwner = guilherme;
    });
    
    
    context("poll management", async () => {

        it ("Should allow creation of a poll", async () => {
            let pollName = "Poll " + new Date().toUTCString();
            let poll = await createPoll({ pollName: pollName });

            assert.equal(await poll.name(), pollName, "Poll name not saved");

            let savedOptions = await poll.getOptions();
            assert.equal(web3.utils.toUtf8(savedOptions[0]), firstOption, "First option did not match");
            assert.equal(web3.utils.toUtf8(savedOptions[1]), secondOption, "Second option did not match");
            assert.equal(savedOptions.length, 2, "Array should have 2 items");
        });

        it ("Should allow owner to close a poll, only once", async () => {
            let poll = await createPoll();

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
            let poll = await createPoll();

            await poll.vote(options[0], fernando, {from: fernando}); // voting first time should work
            utils.shouldThrow(poll.vote(options[1], fernando, {from: fernando}), "Voting second time must not work");

        });
        it ("Should allow an address to vote, only if owning the vote", async () => {
            let poll = await createPoll();

            await poll.vote(options[0], fernando, {from: fernando}); // voting in his name should work
            utils.shouldThrow(poll.vote(options[1], voteSeller, {from: voteBuyer}), "Voting for someone should not work here"); // voting for someone else should not work (without selling the vote first)
        });
        it ("Should count votes correctly", async () => {
            let poll = await createPoll();

            await poll.vote(options[0], guilherme, {from: guilherme}); // vote option 1
            await poll.vote(options[0], fernando, {from: fernando}); // vote option 1
            await poll.vote(options[0], voteSeller, {from: voteSeller}); // vote option 1
            await poll.vote(options[1], voteBuyer, {from: voteBuyer}); // vote option 2

            //let result = await poll.countVotes();
            //console.log("RESULT", result);
        });
    });

    context("Delegating votes", async () => {
        it ("Should allow an address to delegate vote", async () => {
            let poll = await createPoll();
            
            await poll.delegateVote(luciano, fernando, {from: luciano}); // should work fine: luciano delegates to fernando
            utils.shouldThrow(poll.delegateVote(luciano, guilherme, {from: luciano})); // should fail as the user no longer owns the vote
            await poll.delegateVote(luciano, guilherme, {from: fernando}); // fernando is the owner of the vote of luciano, so he can delegate that vote to guilherme
        });
        it ("Should prevent the original owner from voting after delegation", async () => {
            let poll = await createPoll();

            await poll.delegateVote(luciano, fernando, {from: luciano}); // should work fine: luciano delegates to fernando
            utils.shouldThrow(poll.vote(luciano, {from: luciano})); // luciano cannot vote as fernando owns his vote now
        });
        it ("Should allow new owner to vote after delegation", async () => {
            let poll = await createPoll();

            await poll.delegateVote(luciano, fernando, {from: luciano}); // should work fine: luciano delegates to fernando
            await poll.vote(options[0], luciano, {from: fernando}); // should work fine: fernando owns the vote from luciano
        });
    });

    context("Selling votes", async () => {
        it ("Should allow an address to put vote for sale", async () => {
            let poll = await createPoll();

            await poll.sellVote(voteSeller, 5000, {from: voteSeller}); // voteSeller puts vote for sale
            
            utils.shouldThrow(poll.sellVote(guilherme, 5000, {from: voteBuyer})); // should fail as voteBuyer does not own this vote

        });
        it ("Should allow address to purchase vote for sale", async () => {
            let poll = await createPoll();

            await poll.sellVote(voteSeller, 5000, {from: voteSeller}); // voteSeller puts vote for sale
            await poll.buysVote(voteSeller, {from: voteBuyer, value: 5000}); // should work with the right amount
        });
        it ("Should prevent address from purchase vote not for sale", async () => {
            let poll = await createPoll();

            utils.shouldThrow(poll.buysVote(voteSeller, {from: voteBuyer, value: 6000})); // should fail as vote not for sale
        });
        it ("Vote should no longer be for sale after purchase", async () => {
            let poll = await createPoll();

            await poll.sellVote(voteSeller, 5000, {from: voteSeller}); // voteSeller puts vote for sale
            await poll.buysVote(voteSeller, {from: voteBuyer, value: 5000}); // voteBuyer buys vote from voteSeller
            
            utils.shouldThrow(poll.buysVote(voteSeller, {from: guilherme, value: 5000}), "Vote no longer for sale") // should fail as vote no longer for sale
        });
        it ("Should allow new owner to vote", async () => {
            let poll = await createPoll();

            await poll.sellVote(voteSeller, 5000, {from: voteSeller}); // voteSeller puts vote for sale
            await poll.buysVote(voteSeller, {from: voteBuyer, value: 5000}); // voteBuyer buys vote from voteSeller

            utils.shouldThrow(poll.vote(options[1], voteSeller, {from: voteSeller}), "voteSeller doesnt own the vote anymore"); // should fail as voteSeller sold his vote and can no longer vote with it
            await poll.vote(options[1], voteSeller, {from: voteBuyer}); // should work as voteBuyer bought vote from voteSeller
        });
        
        it ("Should give change when buying vote", async () => {
            let ask = web3.utils.toWei("0.50");
            let bid = web3.utils.toWei("1");
            
            let poll = await createPoll();

            let voteBuyer_initialBalance = await web3.eth.getBalance(voteBuyer);

            await poll.sellVote(voteSeller, ask, {from: voteSeller}); // voteSeller puts vote for sale
            let result = await poll.buysVote(voteSeller, {from: voteBuyer, value: bid}); // voteBuyer buys vote from voteSeller with 1000 more than needed

            let gasUsed = result.receipt.gasUsed; // how much gas was used by the operation
            let tx = await web3.eth.getTransaction(result.tx); // get transaction to obtain gas price

            let gasPrice = web3.utils.toBN(tx.gasPrice); // get the gas price

            let gasCost = web3.utils.toBN(gasPrice * gasUsed); // final gas cost is gas used multiplied by gas cost
            let totalPaid = web3.utils.toBN(ask).add(gasCost);

            let voteBuyer_finalBalance = await web3.eth.getBalance(voteBuyer); 

            let voteBuyer_difference = web3.utils.toBN(voteBuyer_initialBalance).sub(web3.utils.toBN(voteBuyer_finalBalance));

            assert.equal(voteBuyer_difference.cmp(totalPaid), 0, "Change is wrong"); // account should be only 0.50 less plus the gas fee
        });
    });

})

async function createPoll(input = {}) {
    let pollName = input.pollName ? input.pollName : "Poll " + new Date().toUTCString();
    let result = await pollStation.createPoll(pollName, options, {from: pollOwner}); 
    
    let pollAddr = result.receipt.logs[1].args.pollAddr;

    let poll = await Poll.at(pollAddr);

    return poll;
}