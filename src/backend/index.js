require('dotenv').config();
const WebSocket = require('ws');
const axios = require('axios');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 10000;

const API_TOKEN = process.env.DERIV_API_TOKEN;
const APP_ID = process.env.DERIV_APP_ID;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

let ws = null;

let balance = 0;
let lastBalance = 0;
let winCount = 0;
let lossCount = 0;
let totalPnL = 0;
let activeStrategy = 'Momentum';
let isTrading = true;

const sendTelegram = async (message) => {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(url, { chat_id: TELEGRAM_CHAT_ID, text: message });
  } catch (err) {
    console.error('Telegram Error:', err.message);
  }
};

const connectWebSocket = () => {
  ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${APP_ID}`);

  ws.onopen = () => {
    sendTelegram('🟢 BAYNEX Phase 3 Online');
    ws.send(JSON.stringify({ authorize: API_TOKEN }));
  };

  ws.onmessage = async (event) => {
    const data = JSON.parse(event.data);

    if (data.msg_type === 'authorize') {
      sendTelegram('✅ Authorized on Deriv');
      ws.send(JSON.stringify({ balance: 1, subscribe: 1 }));
      runStrategy();
    }

    if (data.msg_type === 'balance') {
      const current = data.balance.balance / 10000;
      if (lastBalance !== 0) {
        const pnl = current - lastBalance;
        totalPnL += pnl;
        if (pnl > 0) winCount++;
        else if (pnl < 0) lossCount++;

        sendTelegram(`📊 Balance: $${current.toFixed(2)} | 🏆 ${winCount} Wins | ❌ ${lossCount} Losses | 💰 PnL: $${totalPnL.toFixed(2)}`);
      }
      lastBalance = current;
      balance = current;
    }

    if (data.msg_type === 'buy') {
      sendTelegram(`✅ Trade Confirmed: ${data.buy.contract_id}`);
    }

    if (data.error) {
      sendTelegram(`❌ Error: ${data.error.message}`);
    }
  };

  ws.onerror = (err) => {
    console.error('WebSocket Error:', err.message);
    sendTelegram('❌ WebSocket error occurred.');
  };

  ws.onclose = () => {
    sendTelegram('❌ WebSocket disconnected. Reconnecting...');
    setTimeout(connectWebSocket, 5000);
  };
};

const runStrategy = () => {
  if (!isTrading) return;

  let proposal = {};

  switch (activeStrategy) {
    case 'Momentum':
      proposal = { buy: 1, price: 0.35, parameters: { amount: 0.35, basis: 'stake', contract_type: 'CALL', currency: 'USD', duration: 1, duration_unit: 't', symbol: 'R_100' } };
      break;
    case 'Reversal':
      proposal = { buy: 1, price: 0.35, parameters: { amount: 0.35, basis: 'stake', contract_type: 'PUT', currency: 'USD', duration: 1, duration_unit: 't', symbol: 'R_100' } };
      break;
    case 'Swing':
      proposal = { buy: 1, price: 0.35, parameters: { amount: 0.35, basis: 'stake', contract_type: 'CALL', currency: 'USD', duration: 2, duration_unit: 't', symbol: 'R_100' } };
      break;
    default:
      proposal = {};
  }

  if (Object.keys(proposal).length > 0) {
    ws.send(JSON.stringify({ buy: 1, parameters: proposal.parameters }));
    sendTelegram(`🚀 Executing ${activeStrategy} strategy trade`);
  }
};

const resetStatsDaily = () => {
  winCount = 0;
  lossCount = 0;
  totalPnL = 0;
  sendTelegram('🔄 Daily stats reset.');
};

setInterval(() => {
  const now = new Date();
  if (now.getHours() === 0 && now.getMinutes() === 0) {
    resetStatsDaily();
  }
}, 60 * 1000);

app.get('/', (req, res) => {
  res.send('✅ BAYNEX Phase 3 Running');
});

app.get('/status', (req, res) => {
  res.json({
    balance,
    winCount,
    lossCount,
    totalPnL,
    strategy: activeStrategy,
    isTrading
  });
});

app.get('/strategy/:name', (req, res) => {
  const { name } = req.params;
  activeStrategy = name;
  sendTelegram(`🔄 Strategy switched to: ${activeStrategy}`);
  res.send(`Strategy switched to ${activeStrategy}`);
});

app.get('/stop', (req, res) => {
  isTrading = false;
  sendTelegram('⏹ Trading Stopped.');
  res.send('Trading Stopped.');
});

app.get('/start', (req, res) => {
  isTrading = true;
  sendTelegram('▶️ Trading Resumed.');
  runStrategy();
  res.send('Trading Resumed.');
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  connectWebSocket();
});
