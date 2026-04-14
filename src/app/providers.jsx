"use client";

import { createAppKit } from '@reown/appkit/react';
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react';
import { solana, solanaTestnet, solanaDevnet } from '@reown/appkit/networks';

// Your Project ID from Reown Dashboard
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
  throw new Error('WalletConnect Project ID is required');
}

// 1. Create Solana Adapter (NO wallets array needed for basic functionality)
const solanaWeb3JsAdapter = new SolanaAdapter();

// 2. Create metadata for your app
const metadata = {
  name: 'Solana Rewards',
  description: 'Community Rewards Program',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://solana-rewards.vercel.app',
  icons: ['https://solana-rewards.vercel.app/favicon.ico']
};

// 3. Initialize AppKit
createAppKit({
  adapters: [solanaWeb3JsAdapter],
  projectId,
  networks: [solana, solanaTestnet, solanaDevnet],
  metadata,
  features: {
    analytics: true,
    email: false, // Disable email login
    socials: []   // Disable social login
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#9945FF',
    '--w3m-background': '#0A0B2D'
  }
});

export function AppKitProvider({ children }) {
  return <>{children}</>;
  }
