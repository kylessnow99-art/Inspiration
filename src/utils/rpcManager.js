import { Connection } from '@solana/web3.js';

// Uses environment variable for RPC endpoint
export const getConnection = () => {
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC;
  
  if (!rpcUrl) {
    throw new Error('NEXT_PUBLIC_SOLANA_RPC environment variable is not set');
  }
  
  return new Connection(rpcUrl, {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000
  });
};

export const executeWithRetry = async (fn, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error.message);
      if (i === retries - 1) throw error;
      // Exponential backoff: 1s, 2s, 4s
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
};
