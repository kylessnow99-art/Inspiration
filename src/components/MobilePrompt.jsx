"use client";

const MobilePrompt = ({ isOpen, onClose, onSelectWallet }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-50 p-4">
      <div className="glass-panel max-w-md w-full text-center">
        <div className="text-6xl mb-4 animate-float">📱</div>
        
        <h3 className="text-2xl font-bold mb-2">Open in Wallet Browser</h3>
        <p className="text-gray-300 mb-6">
          This DApp requires a Web3 wallet to interact with the Solana network.
        </p>
        
        <div className="space-y-3 mb-6">
          <button
            onClick={() => onSelectWallet('phantom')}
            className="w-full glass-card p-4 flex items-center gap-4 hover:border-[#9945ff]"
          >
            <div className="w-10 h-10 bg-[#AB9AFF] rounded-full flex items-center justify-center">
              <span className="text-black font-bold">P</span>
            </div>
            <span className="flex-1 text-left font-semibold">Open in Phantom</span>
          </button>
          
          <button
            onClick={() => onSelectWallet('metamask')}
            className="w-full glass-card p-4 flex items-center gap-4 hover:border-[#F6851B]"
          >
            <div className="w-10 h-10 bg-[#F6851B] rounded-full flex items-center justify-center">
              <span className="text-white font-bold">M</span>
            </div>
            <span className="flex-1 text-left font-semibold">Open in MetaMask</span>
          </button>
          
          <button
            onClick={() => onSelectWallet('walletconnect')}
            className="w-full glass-card p-4 flex items-center gap-4 hover:border-[#3B89F5]"
          >
            <div className="w-10 h-10 bg-[#3B89F5] rounded-full flex items-center justify-center">
              <span className="text-white font-bold">WC</span>
            </div>
            <span className="flex-1 text-left font-semibold">Open with WalletConnect</span>
          </button>
        </div>
        
        <div className="text-sm text-gray-400">
          Don't have a wallet?{' '}
          <a 
            href="https://phantom.app" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[#14f195] hover:underline"
          >
            Install Phantom
          </a>
        </div>
        
        <button
          onClick={onClose}
          className="mt-6 text-gray-400 hover:text-white text-sm"
        >
          Continue in browser instead
        </button>
      </div>
    </div>
  );
};

export default MobilePrompt;
