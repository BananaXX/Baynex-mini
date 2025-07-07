const WebSocket = require('ws');
const axios = require('axios');

const API_TOKEN = process.env.DERIV_API_TOKEN;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

let isRunning = false;
let profit = 0;
let winCount = 0;
let lossCount = 0;
let balance = 0;

let dailyTarget = 2;       // Example: +$2 daily target
let stopLossLimit = -3;     // Example: -$3 daily limit

const sendTelegramMessage = async (message) => {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(url, { chat_id: TELEGRAM_CHAT_ID, text: message });
  } catch (err) {
    console.error('Telegram error:', err.message);
  }
};

const connectWebSocket = () => {
  const ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');

  ws.on('open', () => {
    sendTelegramMessage('✅ Connected to Deriv');
    ws.send(JSON.stringify({ authorize: API_TOKEN }));
  });

  ws.on('message', async (data) => {
    const response = JSON.parse(data);

    if (response.msg_type === 'authorize') {
      sendTelegramMessage('✅ Authorized on Deriv');
      getBalance(ws);
      if (isRunning) executeTrade(ws);
    }

    if (response.msg_type === 'balance') {
      balance = response.balance.balance;
      sendTelegramMessage(`💰 Balance: $${balance.toFixed(2)}`);
    }

    if (response.msg_type === 'buy') {
      sendTelegramMessage(`🚀 Trade Sent: Momentum - $0.35`);
    }

    if (response.msg_type === 'proposal_open_contract') {
      const isSold = response.proposal_open_contract.is_sold;
      if (isSold) {
        const profitVal = response.proposal_open_contract.profit || 0;
        profit += profitVal;
        if (profitVal > 0) {
          winCount++;
          sendTelegramMessage(`✅ Win: $${profitVal.toFixed(2)} | PnL: $${profit.toFixed(2)}`);
        } else {
          lossCount++;
          sendTelegramMessage(`❌ Loss: $${profitVal.toFixed(2)} | PnL: $${profit.toFixed(2)}`);
        }

        // Check Goal System:
        if (profit >= dailyTarget) {
          sendTelegramMessage(`🎯 Daily Target Achieved: $${profit.toFixed(2)} ✅ Stopping.`);
          isRunning = false;
          ws.close();
        } else if (profit <= stopLossLimit) {
          sendTelegramMessage(`🛑 Stop Loss Hit: $${profit.toFixed(2)} ❌ Stopping.`);
          isRunning = false;
          ws.close();
        } else {
          getBalance(ws);
          if (isRunning) executeTrade(ws);
        }
      }
    }
  });

  ws.on('error', () => sendTelegramMessage('❌ Connection Error'));
  ws.on('close', () => sendTelegramMessage('❌ Disconnected from Deriv'));
};

const getBalance = (ws) => {
  ws.send(JSON.stringify({ balance: 1, subscribe: 0 }));
};

const executeTrade = (ws) => {
  const trade = {
    buy: 1,
    price: 0.35,
    parameters: {
      amount: 0.35,
      basis: 'stake',
      contract_type: 'CALL',
      currency: 'USD',
      duration: 1,
      duration_unit: 't',
      symbol: 'R_100'
    }
  };
  ws.send(JSON.stringify(trade));
};

const startBot = () => {
  if (!isRunning) {
    isRunning = true;
    sendTelegramMessage('🤖 BAYNEX Bot Started');
    connectWebSocket();
  }
};

const stopBot = () => {
  isRunning = false;
  sendTelegramMessage('⛔ Bot Stopped');
};

// Telegram Bot Commands
const telegramPolling = () => {
  let lastCommand = '';

  setInterval(async () => {
    try {
      const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`;
      const response = await axios.get(url);
      const updates = response.data.result;

      if (updates.length > 0) {
        const lastMessage = updates[updates.length - 1].message.text;
        if (lastMessage !== lastCommand) {
          lastCommand = lastMessage;

          if (lastMessage === '/start') startBot();
          if (lastMessage === '/stop') stopBot();
          if (lastMessage === '/balance') sendTelegramMessage(`💰 Balance: $${balance.toFixed(2)}`);
        }
      }
    } catch (err) {
      console.error('Telegram polling error:', err.message);
    }
  }, 3000);
};

sendTelegramMessage('✅ BAYNEX System Online');
telegramPolling();
