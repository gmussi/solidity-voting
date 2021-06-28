const Poll = artifacts.require("../contracts/Poll.sol");

contract("Poll", async (accounts) => {
    let {0: guilherme, // owner of polling stattion
        1: fernando, // wants to create a poll
        2: marcelo, // wants to vote on a poll
        3: matheus,  // wants to sell a vote
        4: luciano, // wants to buy a vote
        5: eduardo, // wants to delegate a vote
        6: manuela, // wants to for twice
    } = accounts;

    // number of votes each option has must be correct after everyone voted

    context("Delegating votes", async () => {
        it ("Should allow an address to delegate vote");
        it ("Should prevent the original owner from voting after delegation");
        it ("Should allow new owner to vote after delegation");
    });

    context("Selling votes", async () => {
        it ("Should allow an address to put vote for sale");
        it ("Should allow address to purchase vote for sale");
        it ("Should prevent address from purchase vote not for sale");
        it ("Vote should no longer be for sale after purchase");
        it ("Should change owner after purchasing");
        it ("Should allow new owner to vote");
        it ("Should give change when buying vote");
    });
});