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
        Poll _poll = new Poll(_name, _options);
                
        polls.push(_poll);
        uint pollId = polls.length - 1;
        pollByOwners[msg.sender].push(pollId);

        emit PollCreated(msg.sender, pollId, address(_poll), _name);

        _poll.transferOwnership(msg.sender); // why does this fail if i place right after "new"?

        return (pollId, address(_poll));
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

    function getCount() public view returns(uint count) {
        return polls.length;
    }
}