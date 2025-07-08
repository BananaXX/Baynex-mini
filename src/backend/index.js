const WebSocket = require('ws');
const axios = require('axios');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;

const API_TOKEN = process.env.DERIV_API_TOKEN;
const APP_ID = process.env.DERIV_APP_ID;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

let balance = 0;
let totalProfit = 0;
let totalWins = 0;
let totalLosses = 0;
let targetProfit = 2;  // Example target
let dailyTrades = 0;
let maxDailyTrades = 10;

const sendTelegram = async (message) => {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message
    });
  } catch (err) {
    console.error('Telegram Error:', err.message);
  }
};

const ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${APP_ID}`);

const dailyReset = () => {
  totalProfit = 0;
  totalWins = 0;
  totalLosses = 0;
  dailyTrades = 0;
  sendTelegram('🔄 Daily stats reset.');
};

ws.onopen = () => {
  sendTelegram('🟢 BAYNEX Phase 3 Online');
  ws.send(JSON.stringify({ authorize: API_TOKEN }));
};

ws.onmessage = async (msg) => {
  const data = JSON.parse(msg.data);

  if (data.msg_type === 'authorize') {
    sendTelegram('✅ Authorized on Deriv');
    ws.send(JSON.stringify({ balance: 1, subscribe: 1 }));
  }

  if (data.msg_type === 'balance') {
    balance = parseFloat(data.balance.balance);
    sendTelegram(`💰 Balance: $${balance.toFixed(2)}`);

    if (dailyTrades < maxDailyTrades && totalProfit < targetProfit) {
      placeTrade();
    }
  }

  if (data.msg_type === 'buy' && data.buy) {
    sendTelegram(`✅ Trade Confirmed: ${data.buy.contract_id}`);
  }

  if (data.msg_type === 'profit' && data.profit !== undefined) {
    const profitValue = parseFloat(data.profit);
    totalProfit += profitValue;
    dailyTrades++;

    if (profitValue > 0) {
      totalWins++;
      sendTelegram(`✅ Win! Profit: $${profitValue.toFixed(2)} | Total: $${totalProfit.toFixed(2)}`);
    } else {
      totalLosses++;
      sendTelegram(`❌ Loss: $${profitValue.toFixed(2)} | Total: $${totalProfit.toFixed(2)}`);
    }

    if (totalProfit >= targetProfit) {
      sendTelegram('🎯 Target achieved! Trading stopped.');
      ws.close();
    }
  }

  if (data.error) {
    sendTelegram(`❌ Error: ${data.error.message}`);
  }
};

const placeTrade = () => {
  const tradeRequest = {
    buy: 1,
    price: 0.35,
    parameters: {
      amount: 0.35,
      basis: 'stake',
      contract_type: 'CALL',
      currency: 'USD',
      duration: 1,
      duration_unit: 'm',
      symbol: 'R_100'
    }
  };
  ws.send(JSON.stringify(tradeRequest));
  sendTelegram('🚀 Trade Sent: Momentum - $0.35');
};

ws.onclose = () => {
  sendTelegram('❌ Connection closed.');
};

ws.onerror = (err) => {
  console.error('WebSocket error:', err.message);
  sendTelegram('❌ Disconnected from Deriv');
};

// Daily reset every 24 hours
setInterval(dailyReset, 24 * 60 * 60 * 1000);

app.get('/', (req, res) => res.send('🟢 BAYNEX Running'));
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
