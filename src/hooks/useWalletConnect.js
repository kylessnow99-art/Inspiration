import { createAppKit } from '@reown/appkit/react';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { mainnet, solana } from '@reown/appkit/networks';

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID;

// The dynamic logic ensures the wallet sees a trusted connection
const metadata = {
  name: 'Solana Rewards',
  description: 'Official Distribution',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://solana-rewards.com',
  icons: ['https://avatars.githubusercontent.com/u/37784886']
};

export const useWalletConnect = () => {
  const modal = createAppKit({
    adapters: [new EthersAdapter()],
    networks: [mainnet, solana],
    metadata,
    projectId,
    features: { 
      analytics: true, 
      socials: false, 
      email: false,
      allWallets: true // This enables the "View All" list for broad support
    }
  });

  const connect = async () => {
    try {
      await modal.open();
      return true;
    } catch (error) {
      console.error("WalletConnect Error:", error);
      return false;
    }
  };

  return { connect };
};
