// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ISuperfluid, ISuperToken, ISuperApp} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";
import {IConstantFlowAgreementV1} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/IConstantFlowAgreementV1.sol";


contract PaperHands is ERC721, Ownable {
    ISuperfluid private _host; // host
    IConstantFlowAgreementV1 private _cfa; // the stored constant flow agreement class address
    ISuperToken public _acceptedToken; // accepted token

    mapping(uint256 => int96) public flowRates;
    mapping(uint256 => uint256) public tokenTimestamp;

    uint256 public nextId; // this is so we can increment the number (each stream has new id we store in flowRates)
    /// testing vars
    int96 public timeStampValue; //pulling this value for number

    string public nftBaseURI = 'ipfs://QmQsMwfqUXpXMheDptT4jaG9FzEU82KirM1ZRBCiepArCU/1.json';

	bool public paused = false;

    constructor(
        string memory _name,
        string memory _symbol,
        ISuperfluid host,
        IConstantFlowAgreementV1 cfa,
        ISuperToken acceptedToken
    ) ERC721(_name, _symbol) {
        _host = host;
        _cfa = cfa;
        _acceptedToken = acceptedToken;

        nextId = 0;

        assert(address(_host) != address(0));
        assert(address(_cfa) != address(0));
        assert(address(_acceptedToken) != address(0));
    }

    event NFTMinted(uint256 tokenId, address receiver, uint256 timeStampValue);
    event tokenBurned(uint256 tokenId, address receiver, int96 flow);

    
    //Create a public mint
    function mintNFT(address receiver) public payable {
        _issueNFT(receiver);
    }

    function daoMintNFT(address receiver)  external onlyOwner {
        _issueNFT(receiver);
    }

    function _issueNFT(address receiver) internal {
        require(!paused, "the contract is paused");
        require(receiver != address(this), "Issue to a new address");

        tokenTimestamp[nextId] = block.timestamp;
        emit NFTMinted(nextId, receiver, tokenTimestamp[nextId]);
        _mint(receiver, nextId);
        nextId += 1;
    }


    function burnNFT(uint256 tokenId) external onlyOwner exists(tokenId) {
        // require(flowRate > 0, "flowRate must be positive!");
        address receiver = ownerOf(tokenId);
        //Get the time of token mint and held
        uint256 hodl = tokenTimestamp[tokenId];
        uint256 timeHeld = block.timestamp - hodl;
        // convert time held to a int96 usable flow rate
        int96 flowTime = int96(int256(timeHeld));
        timeStampValue = flowTime / 60 / 60 / 24; // Divide by 60 seconds , 60 minutes, 24 hours
        int96 burnFlowRate = timeStampValue * 385802469; //Multiply times .001 token a month
        flowRates[tokenId] = burnFlowRate;
        //burn NFT
        _burn(tokenId);
        
        //Create a flow of tokens based of time held
       _createFlow(receiver, burnFlowRate);

        //emit event
        emit tokenBurned(nextId, receiver, flowRates[tokenId]);
    }

    /**************************************************************************
     * Modifiers
     *************************************************************************/

    modifier exists(uint256 tokenId) {
        require(_exists(tokenId), "token doesn't exist or has been burnt");
        _;
    }

    /**************************************************************************
     * Library
     *************************************************************************/
    //this will reduce the flow or delete it
    function _reduceFlow(address to, int96 flowRate) internal {
        if (to == address(this)) return;

        (, int96 outFlowRate, , ) = _cfa.getFlow(
            _acceptedToken,
            address(this),
            to
        );

        if (outFlowRate == flowRate) {
            _deleteFlow(address(this), to);
        } else if (outFlowRate > flowRate) {
            // reduce the outflow by flowRate;
            // shouldn't overflow, because we just checked that it was bigger.
            _updateFlow(to, outFlowRate - flowRate);
        }
        // won't do anything if outFlowRate < flowRate
    }

    //this will increase the flow or create it
    function _increaseFlow(address to, int96 flowRate) internal {
        (, int96 outFlowRate, , ) = _cfa.getFlow(
            _acceptedToken,
            address(this),
            to
        ); //returns 0 if stream doesn't exist
        if (outFlowRate == 0) {
            _createFlow(to, flowRate);
        } else {
            // increase the outflow by flowRates[tokenId]
            _updateFlow(to, outFlowRate + flowRate);
        }
    }

    function _createFlow(address to, int96 flowRate) internal {
        if (to == address(this) || to == address(0)) return;
        _host.callAgreement(
            _cfa,
            abi.encodeWithSelector(
                _cfa.createFlow.selector,
                _acceptedToken,
                to,
                flowRate,
                new bytes(0) // placeholder
            ),
            "0x"
        );
    }

    function _updateFlow(address to, int96 flowRate) internal {
        if (to == address(this) || to == address(0)) return;
        _host.callAgreement(
            _cfa,
            abi.encodeWithSelector(
                _cfa.updateFlow.selector,
                _acceptedToken,
                to,
                flowRate,
                new bytes(0) // placeholder
            ),
            "0x"
        );
    }

    function _deleteFlow(address from, address to) internal {
        _host.callAgreement(
            _cfa,
            abi.encodeWithSelector(
                _cfa.deleteFlow.selector,
                _acceptedToken,
                from,
                to,
                new bytes(0) // placeholder
            ),
            "0x"
        );
    }

    // Extra Items
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

        string memory currentBaseURI = _baseURI();
        return bytes(currentBaseURI).length > 0
         ? string(abi.encodePacked(currentBaseURI))
            : "";
    }

    function setNFTBaseURI(string memory _nftBaseURI) public onlyOwner() {
    	nftBaseURI = _nftBaseURI;
  	}

    function pause(bool _state) public onlyOwner {
    	paused = _state;
  	}

    //function to pull out token
    function withdrawToken(IERC20 token) public onlyOwner {
        require(token.transfer(msg.sender, token.balanceOf(address(this))), "Unable to transfer");
    }

    function withdraw() public payable onlyOwner {
        (bool success, ) = payable(msg.sender).call{value: address(this).balance}("");
        require(success);
    }

}