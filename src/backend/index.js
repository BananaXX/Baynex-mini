require('dotenv').config();
const WebSocket = require('ws');
const axios = require('axios');

const API_TOKEN = process.env.DERIV_API_TOKEN;
const APP_ID = process.env.DERIV_APP_ID;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${APP_ID}`);

let isAuthorized = false;
let balance = 0;
let openContracts = 0;
let dailyLoss = 0;
let lastBalance = 0;
let maxContracts = 100;
let dailyStopLossLimit = 50;  // Stop if losses exceed this amount

const sendTelegram = async (message) => {
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

const sendTrade = () => {
  if (openContracts >= maxContracts) {
    sendTelegram('❌ Error: Max open contracts reached. Waiting...');
    return;
  }

  const tradeRequest = {
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

  ws.send(JSON.stringify(tradeRequest));
  openContracts++;
  sendTelegram('🚀 Trade Sent: Momentum - $0.35');
};

ws.onopen = () => {
  sendTelegram('🟢 BAYNEX Phase 3.5 Online');
  ws.send(JSON.stringify({ authorize: API_TOKEN }));
};

ws.onmessage = async (event) => {
  const data = JSON.parse(event.data);

  if (data.msg_type === 'authorize') {
    isAuthorized = true;
    sendTelegram('✅ Authorized on Deriv');
    ws.send(JSON.stringify({ balance: 1, subscribe: 1 }));
  }

  if (data.msg_type === 'balance') {
    const newBalance = data.balance.balance / 10000;

    // Track profits or losses
    const change = newBalance - lastBalance;
    dailyLoss += change < 0 ? Math.abs(change) : 0;
    lastBalance = newBalance;

    balance = newBalance;
    sendTelegram(`💰 Balance: $${newBalance.toFixed(2)}`);

    if (dailyLoss >= dailyStopLossLimit) {
      sendTelegram('❌ Daily stop loss hit. Stopping.');
      ws.close();
      return;
    }

    sendTrade();
  }

  if (data.msg_type === 'buy') {
    const contractId = data.buy?.contract_id;
    if (contractId) {
      sendTelegram(`✅ Trade Confirmed: ${contractId}`);
    }
  }

  if (data.error) {
    sendTelegram(`❌ Error: ${data.error.message}`);
  }
};

ws.onerror = (err) => {
  sendTelegram(`❌ Connection error: ${err.message}`);
};

ws.onclose = () => {
  sendTelegram('❌ Connection closed.');
};
