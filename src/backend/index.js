const WebSocket = require('ws');
const axios = require('axios');
const express = require('express');
const app = express();

const API_TOKEN = process.env.DERIV_API_TOKEN;
const APP_ID = process.env.DERIV_APP_ID;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('✅ BAYNEX Backend Running');
});

app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});

const ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${APP_ID}`);

const sendTelegramMessage = async (message) => {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message
    });
  } catch (error) {
    console.error('Telegram send error:', error.message);
  }
};

let isAuthorized = false;
let accountBalance = 0;

ws.onopen = () => {
  sendTelegramMessage('✅ BAYNEX System Online');
  ws.send(JSON.stringify({ authorize: API_TOKEN }));
};

ws.onmessage = async (event) => {
  const data = JSON.parse(event.data);

  if (data.msg_type === 'authorize') {
    isAuthorized = true;
    sendTelegramMessage('✅ Authorized on Deriv');
    ws.send(JSON.stringify({ balance: 1, subscribe: 1 }));
  }

  if (data.msg_type === 'balance') {
    accountBalance = data.balance.balance / 10000;
    sendTelegramMessage(`💰 Balance: $${accountBalance.toFixed(2)}`);
  }

  if (data.msg_type === 'buy') {
    sendTelegramMessage(`✅ Buy Confirmed: ${data.buy.contract_id}`);
  }

  if (data.error) {
    sendTelegramMessage(`❌ Error: ${data.error.message}`);
  }
};

ws.onerror = (err) => {
  console.error('WebSocket error:', err.message);
  sendTelegramMessage('❌ Disconnected from Deriv');
};

ws.onclose = () => {
  sendTelegramMessage('❌ Disconnected from Deriv');
};
