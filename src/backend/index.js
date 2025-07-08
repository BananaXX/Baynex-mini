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

const ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${APP_ID}`);

let balance = 0;
let winCount = 0;
let lossCount = 0;
let totalPnL = 0;
let lastBalance = 0;
let dailyProfit = 0;

const sendTelegramMessage = async (message) => {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message
    });
  } catch (error) {
    console.error('Telegram Error:', error.message);
  }
};

const resetDailyStats = () => {
  winCount = 0;
  lossCount = 0;
  totalPnL = 0;
  dailyProfit = 0;
  sendTelegramMessage('🔄 Daily stats reset.');
};

app.get('/', (req, res) => {
  res.send('✅ BAYNEX.A.X is running.');
});

app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});

ws.onopen = () => {
  sendTelegramMessage('🟢 BAYNEX Online');
  ws.send(JSON.stringify({ authorize: API_TOKEN }));
};

ws.onmessage = async (event) => {
  const data = JSON.parse(event.data);

  if (data.msg_type === 'authorize') {
    ws.send(JSON.stringify({ balance: 1, subscribe: 1 }));
    sendTelegramMessage('✅ Authorized. Tracking balance...');
  }

  if (data.msg_type === 'balance') {
    balance = data.balance.balance / 10000;
    if (lastBalance !== 0) {
      const profit = balance - lastBalance;
      totalPnL += profit;
      dailyProfit += profit;

      if (profit > 0) winCount++;
      else if (profit < 0) lossCount++;

      sendTelegramMessage(`📊 Balance: $${balance.toFixed(2)}\n✅ Wins: ${winCount} ❌ Losses: ${lossCount}\n💰 PnL: $${totalPnL.toFixed(2)}`);
    }
    lastBalance = balance;
  }

  if (data.msg_type === 'buy') {
    sendTelegramMessage(`✅ Trade Executed: ${data.buy.contract_id}`);
  }

  if (data.error) {
    sendTelegramMessage(`❌ Error: ${data.error.message}`);
  }
};

ws.onerror = (err) => {
  console.error('WebSocket Error:', err.message);
  sendTelegramMessage('❌ WebSocket disconnected.');
};

ws.onclose = () => {
  sendTelegramMessage('❌ Connection closed.');
};

// Reset stats every midnight (server time)
setInterval(() => {
  const now = new Date();
  if (now.getHours() === 0 && now.getMinutes() === 0) {
    resetDailyStats();
  }
}, 60 * 1000);
