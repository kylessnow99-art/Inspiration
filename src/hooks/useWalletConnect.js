"use client";

import { useCallback } from 'react';
import WalletConnectProvider from '@walletconnect/web3-provider';
import { ethers } from 'ethers';

export const useWalletConnect = () => {
  const connect = useCallback(async () => {
    try {
      const provider = new WalletConnectProvider({
        infuraId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
        rpc: {
          1: 'https://mainnet.infura.io/v3/...',
          137: 'https://polygon-rpc.com'
        },
        qrcodeModalOptions: {
          mobileLinks: ['metamask', 'trust', 'rainbow']
        }
      });
      
      await provider.enable();
      
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const address = await signer.getAddress();
      
      // Store provider for later use
      window.walletConnectProvider = provider;
      
      return address;
      
    } catch (error) {
      console.error('WalletConnect failed:', error);
      throw error;
    }
  }, []);

  return { connect };
};
