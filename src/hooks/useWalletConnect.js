"use client";

import { createAppKit } from '@reown/appkit';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { SolanaAdapter } from '@reown/appkit-adapter-solana';
import { mainnet } from '@reown/appkit/networks';
import { useCallback, useEffect, useState } from 'react';

let appKitInstance = null;

export const useWalletConnect = () => {
  const [address, setAddress] = useState(null);
  const [provider, setProvider] = useState(null);

  useEffect(() => {
    if (!appKitInstance && typeof window !== 'undefined') {
      const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
      
      if (!projectId) {
        console.error('WalletConnect Project ID missing');
        return;
      }

      const metadata = {
        name: 'Solana Rewards',
        description: 'Community Rewards Program',
        url: window.location.origin,
        icons: ['https://solana-rewards.vercel.app/favicon.ico']
      };

      const ethersAdapter = new EthersAdapter();
      const solanaAdapter = new SolanaAdapter();

      appKitInstance = createAppKit({
        adapters: [ethersAdapter, solanaAdapter],
        networks: [mainnet],
        projectId,
        metadata,
        features: {
          analytics: true,
          email: false,
          socials: []
        },
        themeMode: 'dark',
        themeVariables: {
          '--w3m-accent': '#9945FF',
          '--w3m-background': '#0A0B2D',
          '--w3m-color-mix': '#14F195',
          '--w3m-color-mix-strength': 20
        }
      });
    }
  }, []);

  const connect = useCallback(async () => {
    try {
      if (!appKitInstance) throw new Error('AppKit not initialized');
      
      await appKitInstance.open();
      const accounts = await appKitInstance.getAccounts();
      const walletAddress = accounts?.[0]?.address;
      
      if (walletAddress) {
        setAddress(walletAddress);
        setProvider(appKitInstance);
        return walletAddress;
      }
      throw new Error('No account selected');
      
    } catch (error) {
      console.error('WalletConnect v3 failed:', error);
      throw error;
    }
  }, []);

  return { connect, address, provider };
};
