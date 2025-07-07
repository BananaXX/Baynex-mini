const WebSocket = require('ws');
const axios = require('axios');
require('dotenv').config();

const API_TOKEN = process.env.DERIV_API_TOKEN;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');

const sendTelegramMessage = async (message) => {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
    });
  } catch (error) {
    console.error('Telegram Error:', error.message);
  }
};

ws.on('open', () => {
  console.log('✅ Connected');
  ws.send(JSON.stringify({ authorize: API_TOKEN }));
});

ws.on('message', async (data) => {
  const response = JSON.parse(data);

  if (response.msg_type === 'authorize') {
    console.log('✅ Authorized on Deriv');
    sendTelegramMessage('✅ Authorized on Deriv');
    ws.send(JSON.stringify({
      buy: 1,
      price: 0.35,
      parameters: {
        amount: 0.35,
        basis: 'stake',
        contract_type: 'CALL',
        currency: 'USD',
        duration: 1,
        duration_unit: 'm',
        symbol: 'R_100',
      }
    }));
  }

  if (response.msg_type === 'buy') {
    const contractId = response.buy.contract_id;
    console.log(`✅ Buy Confirmed: ${contractId}`);
    sendTelegramMessage(`✅ Buy Confirmed: ${contractId}`);
  }

  if (response.msg_type === 'portfolio') {
    console.log('📊 Portfolio update:', response);
  }
});

ws.on('error', (err) => {
  console.error('❌ WebSocket error:', err.message);
  sendTelegramMessage('❌ WebSocket error: ' + err.message);
});

ws.on('close', () => {
  console.log('❌ Disconnected');
  sendTelegramMessage('❌ Disconnected from Deriv');
});
