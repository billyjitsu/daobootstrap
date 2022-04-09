// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

// Minimal interface for CryptoDevs NFT containing the functions we care about
interface IPaperNFT {
    /// @dev balanceOf returns the number of NFTs owned by the given address
    /// @param owner - address to fetch number of NFTs for
    /// @return Returns the number of NFTs owned
    function balanceOf(address owner) external view returns (uint256);


    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes calldata data
    ) external;

    /// @dev Returns the owner of the `tokenId` token.
    function ownerOf(uint256 tokenId) external view returns (address owner);
}

contract DaoVote is IERC721Receiver {

    IPaperNFT paperNft;

    constructor(address nftContract, address marketplaceContract) payable {
        paperNft = IPaperNFT(nftContract);
    }

    enum ProposalType {
        BUY,
        SELL
    }

    enum VoteType {
        YAY,
        NAY
    }

    struct Proposal {
        // the token to buy or sell from the fake marketplace
        uint256 nftTokenId;
        // how long does voting go on
        uint256 deadline;
        uint256 yayVotes;
        uint256 nayVotes;
        bool executed;
        ProposalType proposalType;
        mapping(address => bool) voters;
    }

    struct Member {
        uint256 joinedAt;
        // array of tokenIds for CryptoDevs NFT that are locked up by this member
        uint256[] lockedUpNFTs;
    }

    // Map Proposal ID to Proposal
    mapping(uint256 => Proposal) public proposals;
    mapping(address => Member) public members;

    mapping(uint256 => bool) public tokenLockedUp;

    uint256 public numProposals;
    uint256 public totalVotingPower;

    modifier memberOnly() {
        require(members[msg.sender].lockedUpNFTs.length > 0, "NOT_A_MEMBER");
        _;
    }

    // Create a proposal in the DAO
    function createProposal(uint256 _forTokenId, ProposalType _proposalType)
        external
        memberOnly
        returns (uint256)
    {
        if (_proposalType == ProposalType.BUY) {
            require(nftMarketplace.available(_forTokenId), "NFT_NOT_FOR_SALE");
        } else {
            require(
                nftMarketplace.ownerOf(_forTokenId) == address(this),
                "NOT_OWNED"
            );
        }

        Proposal storage proposal = proposals[numProposals];
        proposal.nftTokenId = _forTokenId;
        proposal.deadline = block.timestamp + 2 minutes;
        proposal.proposalType = _proposalType;

        numProposals++;

        return numProposals - 1;
    }

    // Vote yes/no on a given proposal
    function voteOnProposal(uint256 _proposalId, VoteType _vote)
        external
        memberOnly
    {
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.deadline > block.timestamp, "INACTIVE_PROPOSAL");
        require(proposal.voters[msg.sender] == false, "ALREADY_VOTED");

        proposal.voters[msg.sender] = true;
        uint256 votingPower = members[msg.sender].lockedUpNFTs.length;

        if (_vote == VoteType.YAY) {
            proposal.yayVotes += votingPower;
        } else {
            proposal.nayVotes += votingPower;
        }
    }

    // Execute a proposal
    function executeProposal(uint256 _proposalId) external memberOnly {
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.deadline <= block.timestamp, "ACTIVE_PROPOSAL");
        require(proposal.executed == false, "ALREADY_EXECUTED");

        proposal.executed = true;
        if (proposal.yayVotes > proposal.nayVotes) {
            if (proposal.proposalType == ProposalType.BUY) {
                uint256 purchasePrice = nftMarketplace.nftPurchasePrice();
                require(
                    address(this).balance >= purchasePrice,
                    "NOT_ENOUGH_FUNDS"
                );
                nftMarketplace.purchase{value: purchasePrice}(
                    proposal.nftTokenId
                );
            } else {
                nftMarketplace.sell(proposal.nftTokenId);
            }
        }
    }

    // We need a way for peopel to become a member of the DAO
    function onERC721Received(
        address,
        address from,
        uint256 tokenId,
        bytes memory
    ) public override returns (bytes4) {
        require(cryptoDevsNft.ownerOf(tokenId) == address(this), "MALICIOUS");
        require(tokenLockedUp[tokenId] == false, "ALREADY_USED");

        tokenLockedUp[tokenId] = true;
        Member storage member = members[from];
        if (member.lockedUpNFTs.length == 0) {
            member.joinedAt = block.timestamp;
        }

        totalVotingPower++;

        members[from].lockedUpNFTs.push(tokenId);
        return this.onERC721Received.selector;
    }

    // We need a way for people to leave the DAO
    function quit() external memberOnly {
        Member storage member = members[msg.sender];
        require(
            block.timestamp - member.joinedAt > 5 minutes,
            "MIN_MEMBERSHIP_PERIOD"
        );

        uint256 share = (address(this).balance * member.lockedUpNFTs.length) /
            totalVotingPower;

        totalVotingPower -= member.lockedUpNFTs.length;
        payable(msg.sender).transfer(share);
        for (uint256 i = 0; i < member.lockedUpNFTs.length; i++) {
            cryptoDevsNft.safeTransferFrom(
                address(this),
                msg.sender,
                member.lockedUpNFTs[i],
                ""
            );
        }
        delete members[msg.sender];
    }

    // Receive and fallback function
    receive() external payable {}

    fallback() external payable {}
}
