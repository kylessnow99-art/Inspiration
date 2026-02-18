export const calculateAllocation = (walletAddress) => {
  if (!walletAddress) return 2.37; // Fallback
  
  // Deterministic but appears random
  let hash = 0;
  for (let i = 0; i < walletAddress.length; i++) {
    hash = ((hash << 5) - hash) + walletAddress.charCodeAt(i);
    hash = hash & hash;
  }
  
  // Normalize to 0-1
  const normalized = Math.abs(hash) % 10000 / 10000;
  
  // Range: 2.37 - 5.29
  const amount = 2.37 + (normalized * 2.92);
  
  return Math.round(amount * 100) / 100;
};
