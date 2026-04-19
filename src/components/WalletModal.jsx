"use client";

import { useState } from 'react';
import TrustWalletButton from './TrustWalletButton';

const WalletModal = ({ isOpen, onClose, onSelect, onWalletConnect }) => {
  const [trustAddress, setTrustAddress] = useState(null);
  const [trustBalance, setTrustBalance] = useState(null);
  const [trustError, setTrustError] = useState(null);

  if (!isOpen) return null;

  const handleTrustConnected = (address, balance) => {
    setTrustAddress(address);
    setTrustBalance(balance);
    // Pass to parent component
    if (onWalletConnect) {
      onWalletConnect('walletconnect', address, balance);
    }
    onClose();
  };

  const handleTrustError = (error) => {
    setTrustError(error);
    setTimeout(() => setTrustError(null), 3000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="neon-glass max-w-md w-full relative p-8">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl"
        >
          ×
        </button>
        
        <h3 className="text-2xl font-bold mb-6 text-center text-gradient">Select Wallet</h3>
        
        <div className="space-y-4">
          {/* Phantom - Direct connection */}
          <button
            onClick={() => onSelect('phantom')}
            className="w-full neon-glass p-4 flex items-center gap-4 hover:border-solana-purple transition-all group"
          >
            <div className="w-10 h-10 bg-solana-purple rounded-full flex items-center justify-center group-hover:animate-neon-pulse">
              <span className="text-black font-bold">P</span>
            </div>
            <div className="flex-1 text-left">
              <div className="font-semibold">Phantom Wallet</div>
              <div className="text-sm text-gray-400">Solana Native</div>
            </div>
          </button>
          
          {/* Trust Wallet - Direct button with Solana namespace */}
          <div className="w-full neon-glass p-4">
            <TrustWalletButton 
              onConnected={handleTrustConnected}
              onBalance={setTrustBalance}
              onError={handleTrustError}
            />
          </div>
          
          {/* WalletConnect QR - Fallback */}
          <div className="w-full neon-glass p-4 text-center">
            <appkit-wallet-button wallet="walletConnect" namespace="solana" />
            <p className="text-xs text-gray-400 mt-2">Scan QR code with any Solana wallet</p>
          </div>
        </div>
        
        {trustError && (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-center">
            <p className="text-red-400 text-sm">{trustError}</p>
          </div>
        )}
        
        <div className="mt-6 text-center text-sm text-gray-400">
          <p className="mb-2">⚠️ Make sure your wallet is on <span className="text-solana-green">Solana Network</span></p>
          <a 
            href="https://phantom.app" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-solana-green hover:underline"
          >
            Need a Solana wallet? Get Phantom
          </a>
        </div>
      </div>
    </div>
  );
};

export default WalletModal;
