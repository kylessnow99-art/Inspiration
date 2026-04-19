"use client";

import { createAppKit } from '@reown/appkit/react';
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react';
import { solana } from '@reown/appkit/networks';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!projectId && typeof window !== 'undefined') {
  console.error('WalletConnect Project ID is required');
}

// Create Solana Adapter - SOLANA ONLY
const solanaWeb3JsAdapter = new SolanaAdapter();

// Force Solana only - no EVM networks
const solanaOnlyNetworks = [solana];

const metadata = {
  name: 'Solana Rewards',
  description: 'Community Rewards Program',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://solana-rewards.vercel.app',
  icons: ['https://solana-rewards.vercel.app/favicon.ico']
};

// Initialize AppKit ONLY on client side, not during SSR
if (typeof window !== 'undefined' && projectId) {
  createAppKit({
    adapters: [solanaWeb3JsAdapter],
    projectId,
    networks: solanaOnlyNetworks,
    metadata,
    defaultNetwork: solana,
    features: {
      analytics: false,
      email: false,
      socials: []
    },
    themeMode: 'dark',
    themeVariables: {
      '--w3m-accent': '#9945FF',
      '--w3m-background': '#0A0B2D'
    },
    // CRITICAL: Force Solana only, disable auto-connect
    enableEIP6963: false,
    enableCoinbase: false,
    enableInjected: false
  });
}

export function AppKitProvider({ children }) {
  return <>{children}</>;
}
