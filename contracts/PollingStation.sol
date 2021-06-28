pragma solidity >=0.5.16;

import "@gmussi-contracts/gmussi-claimable/contracts/Claimable.sol";
import "./Poll.sol";

/**
 * This contract allows for the creation and management of Polls
 */
contract PollingStation is Claimable {
    Poll[] public polls;
    mapping (address => uint[]) pollByOwners;

    event PollCreated (address indexed creator, uint indexed pollId, address indexed pollAddr, string name);

    function createPoll(string memory _name, bytes32[] memory _options) public returns(uint, address) {
        Poll poll = new Poll(_name, _options);
                
        uint pollId = polls.push(poll);
        pollByOwners[msg.sender].push(pollId);

        emit PollCreated(msg.sender, pollId, address(poll), _name);

        poll.transferOwnership(msg.sender); // why does this fail if i place right after "new"?

        return (pollId, address(poll));
    }

    function closePoll(uint pollId) public onlyCreator(pollId) {
        Poll poll = polls[pollId];
        poll.closePoll();
    }

    function getMyPolls() public view returns(uint[] memory) {
        return pollByOwners[msg.sender];
    }

    modifier onlyCreator (uint pollId) {
        require(polls[pollId].owner() == msg.sender);
        _;
    }

    function getBalance() public view onlyOwner returns (uint256) {
        return address(this).balance;
    } 
}