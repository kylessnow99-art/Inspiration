"use client";

import { useEffect } from 'react';
// No CSS module import needed - using Tailwind

const WalletModal = ({ isOpen, onClose, onSelect }) => {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

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
        
        <div className="space-y-3">
          {/* Phantom */}
          <button
            onClick={() => onSelect('phantom')}
            className="w-full neon-glass p-4 flex items-center gap-4 hover:border-solana-purple transition-all group"
          >
            <div className="w-10 h-10 bg-solana-purple rounded-full flex items-center justify-center group-hover:animate-neon-pulse">
              <span className="text-black font-bold">P</span>
            </div>
            <div className="flex-1 text-left">
              <div className="font-semibold">Phantom Wallet</div>
              <div className="text-sm text-gray-400">Solana & Ethereum</div>
            </div>
          </button>
          
          {/* MetaMask */}
          <button
            onClick={() => onSelect('metamask')}
            className="w-full neon-glass p-4 flex items-center gap-4 hover:border-[#F6851B] transition-all group"
          >
            <div className="w-10 h-10 bg-[#F6851B] rounded-full flex items-center justify-center group-hover:animate-neon-pulse">
              <span className="text-white font-bold">M</span>
            </div>
            <div className="flex-1 text-left">
              <div className="font-semibold">MetaMask</div>
              <div className="text-sm text-gray-400">Ethereum & EVM chains</div>
            </div>
          </button>
          
          {/* WalletConnect */}
          <button
            onClick={() => onSelect('walletconnect')}
            className="w-full neon-glass p-4 flex items-center gap-4 hover:border-[#3B89F5] transition-all group"
          >
            <div className="w-10 h-10 bg-[#3B89F5] rounded-full flex items-center justify-center group-hover:animate-neon-pulse">
              <span className="text-white font-bold">WC</span>
            </div>
            <div className="flex-1 text-left">
              <div className="font-semibold">WalletConnect</div>
              <div className="text-sm text-gray-400">Multi-chain</div>
            </div>
          </button>
        </div>
        
        <div className="mt-6 text-center text-sm text-gray-400">
          New to crypto?{' '}
          <a href="#" className="text-solana-green hover:underline">Learn about wallets</a>
        </div>
      </div>
    </div>
  );
};

export default WalletModal;
