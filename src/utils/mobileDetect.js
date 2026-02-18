export const isMobileBrowser = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

export const openInWallet = (walletType, url) => {
  const deepLinks = {
    phantom: `phantom://browse?url=${encodeURIComponent(url)}`,
    metamask: `metamask://dapp/${encodeURIComponent(url)}`,
    trust: `trust://open?url=${encodeURIComponent(url)}`,
    walletconnect: `wc:?uri=${encodeURIComponent(url)}`
  };
  
  // Try deep link
  window.location.href = deepLinks[walletType] || url;
  
  // Fallback: open in new tab
  setTimeout(() => {
    window.open(url, '_blank');
  }, 500);
};
