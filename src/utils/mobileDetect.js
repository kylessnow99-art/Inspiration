export const isMobileBrowser = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

export const openInWallet = (walletType, url) => {
  const universalLinks = {
    phantom: `https://phantom.app/ul/browse/${encodeURIComponent(url)}`,
    metamask: `https://metamask.app.link/dapp/${encodeURIComponent(url.replace(/^https?:\/\//, ''))}`,
    trust: `https://link.trustwallet.com/open?url=${encodeURIComponent(url)}`,
    walletconnect: `wc:?uri=${encodeURIComponent(url)}`
  };
  
  // Try universal link first
  window.location.href = universalLinks[walletType] || url;
  
  // If still in browser after 2 seconds, show instructions
  setTimeout(() => {
    if (document.visibilityState === 'visible') {
      alert(`Please open ${walletType} app and browse to: ${url}`);
    }
  }, 2000);
};
