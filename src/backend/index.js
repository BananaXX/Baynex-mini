const WebSocket = require('ws');
const axios = require('axios');
require('dotenv').config();
const { decideTrade } = require('./strategy');
const { recordWin, recordLoss, getStats } = require('./stats');

const DERIV_APP_ID = process.env.DERIV_APP_ID;
const DERIV_API_TOKEN = process.env.DERIV_API_TOKEN;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

let ws = null;
let lastTicks = [];
let isAuthorized = false;

const sendTelegramMessage = async (message) => {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  await axios.post(url, {
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
  });
};

const connectToDeriv = () => {
  ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${DERIV_APP_ID}`);

  ws.on('open', () => {
    console.log('✅ Connected');
    sendTelegramMessage('✅ BAYNEX Connected');
    ws.send(JSON.stringify({ authorize: DERIV_API_TOKEN }));
  });

  ws.on('message', (data) => {
    const res = JSON.parse(data.toString());
    handleResponse(res);
  });

  ws.on('close', () => {
    console.log('❌ Disconnected');
    sendTelegramMessage('❌ Disconnected. Reconnecting...');
    setTimeout(connectToDeriv, 3000);
  });

  ws.on('error', (err) => console.error('WebSocket Error:', err.message));
};

const handleResponse = (response) => {
  if (response.msg_type === 'authorize') {
    isAuthorized = true;
    sendTelegramMessage('✅ Authorized');
    subscribeTicks();
  }

  if (response.msg_type === 'tick') {
    const price = parseFloat(response.tick.quote);
    lastTicks.push(price);
    if (lastTicks.length > 10) lastTicks.shift();

    const decision = decideTrade(lastTicks);
    if (decision) placeTrade(decision);
  }

  if (response.msg_type === 'buy') {
    sendTelegramMessage(`✅ Trade Placed: ${response.buy.transaction_id}`);
  }

  if (response.msg_type === 'proposal_open_contract') {
    if (response.proposal_open_contract.is_sold) {
      const profit = parseFloat(response.proposal_open_contract.profit);
      if (profit > 0) {
        recordWin(profit);
        sendTelegramMessage(`✅ Win: +$${profit.toFixed(2)} | Stats: ${JSON.stringify(getStats())}`);
      } else {
        recordLoss(Math.abs(profit));
        sendTelegramMessage(`❌ Loss: -$${Math.abs(profit).toFixed(2)} | Stats: ${JSON.stringify(getStats())}`);
      }
    }
  }
};

const subscribeTicks = () => {
  ws.send(JSON.stringify({ ticks: 'R_100' }));
};

const placeTrade = (contractType) => {
  const trade = {
    buy: 1,
    price: 0.35,
    parameters: {
      amount: 0.35,
      basis: 'stake',
      contract_type: contractType,
      currency: 'USD',
      duration: 1,
      duration_unit: 'm',
      symbol: 'R_100'
    }
  };
  ws.send(JSON.stringify(trade));
};

connectToDeriv();
