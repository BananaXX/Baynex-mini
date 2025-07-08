const express = require('express');
const WebSocket = require('ws');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

const API_TOKEN = process.env.DERIV_API_TOKEN;
const APP_ID = process.env.DERIV_APP_ID;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${APP_ID}`);

let isAuthorized = false;
let balance = 0;

const sendTelegram = async (message) => {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
    });
  } catch (err) {
    console.error('Telegram Error:', err.message);
  }
};

ws.onopen = () => {
  sendTelegram('🟢 BAYNEX Phase 3 Online');
  ws.send(JSON.stringify({ authorize: API_TOKEN }));
};

ws.onmessage = async (msg) => {
  const data = JSON.parse(msg.data);

  if (data.error) {
    sendTelegram(`❌ Error: ${data.error.message}`);
    return;
  }

  if (data.msg_type === 'authorize') {
    isAuthorized = true;
    sendTelegram('✅ Authorized on Deriv');
    ws.send(JSON.stringify({ balance: 1, subscribe: 1 }));
  }

  if (data.msg_type === 'balance') {
    balance = data.balance.balance / 10000;
    sendTelegram(`💰 Balance: $${balance.toFixed(2)}`);
  }

  if (data.msg_type === 'buy') {
    const contractId = data.buy?.contract_id || 'N/A';
    sendTelegram(`✅ Trade Confirmed: ${contractId}`);
  }
};

ws.onerror = (err) => {
  console.error('WebSocket Error:', err.message);
  sendTelegram('❌ Disconnected from Deriv');
};

ws.onclose = () => {
  sendTelegram('❌ Connection closed.');
};

app.get('/', (req, res) => {
  res.send('✅ BAYNEX Phase 3 Backend Running');
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
