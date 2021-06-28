pragma solidity >=0.5.16;

import "@gmussi-contracts/gmussi-claimable/contracts/Claimable.sol";

/**
 * A poll is a contract that stores potential options to vote on, as well as which addresses have voted already.
 * Addresses can vote on the poll until the poll owner closes the contract.
 * Addresses can also put their votes for sale as long as they have not voted yet.
 */
contract Poll is Claimable {
    struct Vote {
        bool used;
        bool forSale;
        uint price;
        address payable owner;
    }

    string public name; // name of this poll - is this necessary?

    bytes32[] public options; // options that can be voted on
    mapping(bytes32 => uint) public voteCounts; // number of votes for each option

    mapping(address => Vote) private votes; // stores the votes of everyone

    bool public closed; // stores if the polling is still accepting votes

    /**
     * Event triggered every time a new vote is given in this poll
     */
    event NewVote (bytes32 option, address indexed voter);

    /**
     * Event triggered when a vote is put for sale
     */
    event VoteForSale(address seller, uint price);

    /**
     * Event triggered when a vote is sold 
     */
    event VoteOwnershipChanged(address seller, address buyer);

    /**
     * Event triggered when the poll is closed
     */
    event PollClosed (address pollAddr);

    /**
     * A poll requires a name and a bytes32 for each option.
     */
    constructor(string memory _name, bytes32[] memory _options) public {
        require(_options.length > 0);

        name = _name;
        for (uint i = 0; i < _options.length; i++) {
            options.push(_options[i]);
            voteCounts[_options[i]] = 0;
        }
    }

    /**
     * Stores a vote from the message sender. 
     * Each address can vote only once and only as long as the poll is not closed.
     * Each address can also sell their voting rights for others, which allows the buyer to vote.
     * @param _option a bytes32 representing the option to vote.
     * @dev Refer to `options` property  
     * @param _voter address of the voter this vote refers to. Message sender must own that right
     */
    function vote(bytes32 _option, address _voter) public notVoted(_voter) ownsVote(_voter) pollOpen {
        voteCounts[_option]++;
        votes[_voter].used = true;

        emit NewVote(_option, msg.sender);
    } 

    /**
     * Buys a vote for sale. Enough funds must be transferred to this method. 
     * More funds than necessary will be refunded.
     * @dev This method only works if the vote has not been used AND is for sale 
     * @param _voteAddr the address of the seller whose vote is intended to buy
     */
    function buysVote(address payable _voteAddr) public payable notVoted(_voteAddr) forSale(_voteAddr) pollOpen {
        Vote storage _vote = votes[_voteAddr];

        if (_vote.price > 0) {
            uint change = msg.value - _vote.price;

            require(change >= 0, "Not enough funds transferred");

            _voteAddr.transfer(_vote.price); // sends the price value to the seller
            if (change > 0) {
                msg.sender.transfer(change); // send the change back to the buyer
            }
        }

        _vote.owner = msg.sender;
        emit VoteOwnershipChanged(_voteAddr, msg.sender);
    }

    /**
     * Delegates a vote to someone else.
     * @param _owner address of the new owner of this vote
     */
    function delegateVote(address payable _owner) public notVoted(msg.sender) ownsVote(msg.sender) pollOpen {
        votes[msg.sender].owner = _owner;

        emit VoteOwnershipChanged(msg.sender, _owner);
    }

    /**
     * Closes the poll. This action is irreversible and can only be performed once.
     */
    function closePoll() public pollOpen onlyOwner {
        closed = true;

        emit PollClosed(address(this));
    }

    /**
     * Function modifier that checks if the poll is still opened.
     */
    modifier pollOpen () {
        require(!closed);
        _;
    }

    /**
     * Function modifier that checks if the message sender has already voted in this poll
     */
    modifier notVoted(address _voter) {
        require(!votes[_voter].used);
        _;
    }

    /**
     * Function modifier that checks if the address trying to vote owns that vote 
     */
    modifier ownsVote(address _voter) {
        require((votes[_voter].owner == address(0) && _voter == msg.sender) || votes[_voter].owner == msg.sender);
        _;
    } 

    /**
     * Function modifier that checks if a vote is for sale
     */
    modifier forSale(address _vote) {
        require(votes[_vote].forSale);
        _;
    }

    function getOptions() public view returns (bytes32[] memory) {
        return options;
    }
 }