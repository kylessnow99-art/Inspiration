"use client";

const WalletModal = ({ isOpen, onClose, onSelect }) => {
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
              <div className="text-sm text-gray-400">Solana Native</div>
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
              <div className="text-sm text-gray-400">Connect any Solana wallet</div>
            </div>
          </button>
        </div>
        
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
