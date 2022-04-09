import './styles/App.css';
import { ethers } from 'ethers';
import twitterLogo from './assets/twitter-logo.svg';
import React, { useEffect, useState } from "react";
import paperNft from './utils/PaperHands.json';
import daoVote from './utils/DaoVote.json';

// Constants
const TWITTER_HANDLE = 'wc49358';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;
const OPENSEA_LINK = 'https://testnets.opensea.io/collection/buildstream-v2';
const SUPERFLUID_LINK = 'https://app.superfluid.finance/dashboard';
const TOTAL_MINT_COUNT = 50;
const CONTRACT_ADDRESS = "0xBF257534eC102dBF2C0935D64dDD004e680ABE0c";
const DAO_CONTRACT_ADDRESS = "0x79dF4FbB23c5a78cA26f8960f009176E146df8a5";

const App = () => {

  const [currentAccount, setCurrentAccount] = useState("");
  const [loading, setLoading] = useState(false);
  const [nftMinted, setNFTMinted] = useState(false);
  const [nftBurned, setNFTBurned] = useState(false);
  const [idToBurn, setIdToBurn] = useState("");
  const [time, setTime] = useState("");
  const [proposalAddress, setProposalAddress] = useState("");
  const [proposalLive, setProposalLive] = useState(false);
  const [proposalID, setProposalID] = useState(null);
  const [votes, setVote] = useState(null);

  const checkIfWalletIsConnected = async () => {
    const { ethereum } = window;

    if (!ethereum) {
      console.log("Make sure you have metamask!");
      return;
    } else {
      console.log("We have the ethereum object", ethereum);
    }

    const accounts = await ethereum.request({ method: "eth_accounts"});

    /*
      * User can have multiple authorized accounts, we grab the first one if its there!
      */
    if (accounts.length !== 0) {
      const account = accounts[0];
      console.log("Found an authorized account:", account);
      setCurrentAccount(account)
      // Setup listener! This is for the case where a user comes to our site
      // and ALREADY had their wallet connected + authorized.
      setupEventListener()
    } else {
      console.log("No authorized account found")
    }
  }

  const connectWallet = async () => {
    try {
      const { ethereum } = window;

      if (!ethereum) {
        alert("Get MetaMask!");
        return;
      }

      /*
      * Fancy method to request access to account.
      */
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });

      /*
      * Boom! This should print out public address once we authorize Metamask.
      */
      console.log("Connected", accounts[0]);
      setCurrentAccount(accounts[0]); 
      // Setup listener! This is for the case where a user comes to our site
      // and connected their wallet for the first time.
      setupEventListener() 
    } catch (error) {
      console.log(error)
    }
  }


  const setupEventListener = async () => {
    try {
      const { ethereum } = window;

      if (ethereum) {
        
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const connectedContract = new ethers.Contract(CONTRACT_ADDRESS, paperNft.abi, signer);

      /*
        // This will essentially "capture" our event when our contract throws it.
        connectedContract.on("NewEpicNFTMinted", (from, tokenId) => {
          console.log(from, tokenId.toNumber())
          alert(`Hey there! We've minted your NFT and sent it to your wallet. It may be blank right now. It can take a max of 10 min to show up on OpenSea. Here's the link: https://testnets.opensea.io/assets/${CONTRACT_ADDRESS}/${tokenId.toNumber()}`)
        });*/

        console.log("Setup event listener!")

      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error)
    }
  }

  const handleChange = (e) => {
    setIdToBurn(e.target.value);
    console.log(idToBurn);
  };
  /////////////////////////////////
  const askContractToMintNft = async () => {
    
      try {
        const { ethereum } = window;
  
        if (ethereum) {
          const provider = new ethers.providers.Web3Provider(ethereum);
          const signer = provider.getSigner();
          const connectedContract = new ethers.Contract(CONTRACT_ADDRESS, paperNft.abi, signer);
  
          console.log("Going to pop wallet now to pay gas...")
          let nftTxn = await connectedContract.mintNFT(currentAccount,
            {value: ethers.utils.parseEther('0')});

          setLoading(true);
          setNFTMinted(false);
  
          console.log("Mining...please wait.")
          await nftTxn.wait();
          
          console.log(`Mined, see transaction: https://rinkeby.etherscan.io/tx/${nftTxn.hash}`);
          setLoading(false);
          setNFTMinted(true);
        } else {
          console.log("Ethereum object doesn't exist!");
        }
      } catch (error) {
        console.log(error)
      }
  }

  const askContractToBurnNft = async () => {
    
    try {
      const { ethereum } = window;

      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const connectedContract = new ethers.Contract(CONTRACT_ADDRESS, paperNft.abi, signer);

        console.log("Going to pop wallet now to pay gas...")
        let nftTxn = await connectedContract.burnNFT(idToBurn);

        setLoading(true);
        setNFTBurned(false);

        console.log("Mining...please wait.")
        await nftTxn.wait();
        
        console.log(`Mined, see transaction: https://rinkeby.etherscan.io/tx/${nftTxn.hash}`);
        setLoading(false);
        setNFTBurned(true);
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error)
    }
  }

  const joinDAO = async () => {
    
    try {
      const { ethereum } = window;

      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const connectedContract = new ethers.Contract(CONTRACT_ADDRESS, paperNft.abi, signer);

        console.log("Going to pop wallet now to pay gas...")
        let nftTxn = await connectedContract["safeTransferFrom(address,address,uint256)"](currentAccount, DAO_CONTRACT_ADDRESS, idToBurn);

        setLoading(true);

        console.log("Mining...please wait.")
        await nftTxn.wait();
        
        console.log(`Mined, see transaction: https://rinkeby.etherscan.io/tx/${nftTxn.hash}`);
        setLoading(false);
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error)
    }
  }

  const getTokenTime = async () => {
    
    try {
      const { ethereum } = window;

      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const connectedContract = new ethers.Contract(CONTRACT_ADDRESS, paperNft.abi, signer);

        let tokenIdTimeStamp = await connectedContract.tokenTimestamp(idToBurn);
        let stamp = String(tokenIdTimeStamp);
        let stamps = Number(stamp);
        let time = new Date(stamps * 1000);
        let times = String(time)
        setTime(times);
        console.log("timestamp", time)
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error)
    }
  }
  //////////////////////////////////////
   //DAO Functions
   const daoHandleChange = (e) => {
    setProposalAddress(e.target.value);
    console.log(proposalAddress);
  };
  
  const createProposal = async () => {
    
    try {
      const { ethereum } = window;

      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const connectedContract = new ethers.Contract(DAO_CONTRACT_ADDRESS, daoVote.abi, signer);

        console.log("Going to pop wallet now to pay gas...")
        let nftTxn = await connectedContract.createProposal(proposalAddress);

        setLoading(true);

        await nftTxn.wait();
        
        setLoading(false);
        setProposalLive(true);
        let ppsl = await connectedContract.numProposals();
        console.log('ppsl', ppsl)
        let numOfProposals = String(ppsl - 1);
        console.log('numofProposals', numOfProposals)
        setProposalID(numOfProposals );
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error)
    }
  }

  const executeProposal = async () => {
    
    try {
      const { ethereum } = window;

      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const connectedContract = new ethers.Contract(DAO_CONTRACT_ADDRESS, daoVote.abi, signer);

        console.log("Going to pop wallet now to pay gas...")
        let nftTxn = await connectedContract.executeProposal(proposalID);

        setLoading(true);

        await nftTxn.wait();
        
        setLoading(false);
        
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error)
    }
  }

  const quitTheDAO = async () => {
    
    try {
      const { ethereum } = window;

      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const connectedContract = new ethers.Contract(DAO_CONTRACT_ADDRESS, daoVote.abi, signer);

        console.log("Going to pop wallet now to pay gas...")
        let nftTxn = await connectedContract.quit();

        setLoading(true);

        await nftTxn.wait();
        
        setLoading(false);
        
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error)
    }
  }

  const voteProposalYes = async () => {
    
    try {
      const { ethereum } = window;

      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const connectedContract = new ethers.Contract(DAO_CONTRACT_ADDRESS, daoVote.abi, signer);
  

        console.log("Going to pop wallet now to pay gas...")
        let nftTxn = await connectedContract.voteOnProposal(proposalID, 0);

        setLoading(true);

        console.log("Mining...please wait.")
        await nftTxn.wait();
        setLoading(false);
        
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error)
    }
  }

  const voteProposalNo = async () => {
    
    try {
      const { ethereum } = window;

      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const connectedContract = new ethers.Contract(DAO_CONTRACT_ADDRESS, daoVote.abi, signer);
  

        console.log("Going to pop wallet now to pay gas...")
        let nftTxn = await connectedContract.voteOnProposal(proposalID, 1);

        setLoading(true);

        console.log("Mining...please wait.")
        await nftTxn.wait();
        setLoading(false);
        
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    checkIfWalletIsConnected();
  }, [])

  // Render Methods
  const renderNotConnectedContainer = () => (
    <button onClick={ connectWallet } className="cta-button connect-wallet-button">
      Connect to Wallet
    </button>
  );

  /*
  * Buttons
  */
  const renderMintUI = () => (
    <button onClick={askContractToMintNft} className="cta-button connect-wallet-button">
      Mint NFT
    </button>
  );

  const renderBurnUI = () => (
    <button onClick={askContractToBurnNft} className="cta-button connect-wallet-button">
      Burn NFT
    </button>
  );

  const nftTimeStamp = () => (
    <button onClick={getTokenTime} className="cta-button connect-wallet-button">
      View Timestamp
    </button>
  );

  const joinTheDAO = () => (
    <button onClick={joinDAO} className="cta-button connect-wallet-button">
      Join DAO
    </button>
  );

  const startAProposal = () => (
    <button onClick={createProposal} className="cta-button connect-wallet-button">
      Create Proposal
    </button>
  );

  const vote = () => (
    <>
    <button onClick={voteProposalYes}  className="cta-button connect-wallet-button-small">
      yes
    </button>
    <button onClick={voteProposalNo} className="cta-button connect-wallet-button-small">
    no
    </button>
    </>
  );

  const execute = () => (
    <button onClick={executeProposal} className="cta-button connect-wallet-button">
      Execute
    </button>
  );

  const leave = () => (
    <button onClick={quitTheDAO} className="cta-button connect-wallet-button">
      Leave the DAO
    </button>
  );


  return (
    <div className="App">
      <div className="container">
        <div className="header-container">
          <p className="header gradient-text">PaperHands DOA Mint</p>
          <p className="sub-text">
            Have Diamond Hands? Mint NFT now.
          </p>
          {currentAccount === "" ? renderNotConnectedContainer() : renderMintUI()}
        </div>
        {loading && (
        <>
          <p className="sub-text">
            Please wait a few minutes. Doing Something...
          </p>
        <br />
        </>
      )}

      {nftMinted && (
        <div>
          <p className="sub-text">
          <a
            href={OPENSEA_LINK}
            target="_blank"
            rel="noreferrer"
          >{`View NFT on OpenSea`}</a></p>
        </div>
      )}
      <div className='row'>
      <div className='column'>
         <div>
       <p className="sub-text-small">Vote Power</p>
          {joinTheDAO()}
          <div></div>
         <input type="text" name="TokenID" value={idToBurn} placeholder="Token ID" onChange={handleChange} />
         </div>

         <div>
         <p className="sub-text-small">Check Timestamp</p>
         {nftTimeStamp()}
         <div></div>
         <input type="text" name="TokenID" value={idToBurn} placeholder="Token ID" onChange={handleChange} />
         <div className='sub-text-small'>{time}</div>
         </div>
         <div>
          <p className="sub-text-small">Oh, you got paperhands?</p>
         {renderBurnUI()}
          <div></div>
        <input type="text" name="TokenID" value={idToBurn} placeholder="Token ID" onChange={handleChange} />
         </div>

      </div>


      <div className='column'>
        <div>
          <p className="sub-text-small">You need a staked NFT to start a proposal</p>
            {startAProposal()}
           <div></div>
          <input type="text" name="address" value={proposalAddress} placeholder="address" onChange={daoHandleChange} />
        </div>
        <div>
          <p className="sub-text-small">Vote Proposal ID:  {proposalID}</p>
            {vote()}
        </div>
        <div>
          <p className="sub-text-small">Execute Passed Proposal</p>
            {execute()}
        </div>
        <div>
          <p className="sub-text-small">PaperHanded</p>
            {leave()}
        </div>


      </div>



      </div> {/*The container for columns */}

      {nftBurned && (
        <div>
          <p className="sub-text">
          <a
            href={SUPERFLUID_LINK}
            target="_blank"
            rel="noreferrer"
          >{`View Your Stream On SuperFluid`}</a></p>
        </div>
      )}


        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built by me`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;