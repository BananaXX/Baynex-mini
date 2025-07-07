const WebSocket = require('ws');
const axios = require('axios');
require('dotenv').config();

const DERIV_APP_ID = process.env.DERIV_APP_ID;
const DERIV_API_TOKEN = process.env.DERIV_API_TOKEN;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

let ws = null;
let isTrading = false;
let lastTradeTime = 0;
const TRADE_COOLDOWN_MS = 60000; // 1 minute cooldown

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
    sendTelegramMessage('✅ BAYNEX Bot Connected to Deriv');
    authorize();
  });

  ws.on('message', (data) => {
    const res = JSON.parse(data.toString());
    handleResponse(res);
  });
};

const authorize = () => {
  const authRequest = { authorize: DERIV_API_TOKEN };
  ws.send(JSON.stringify(authRequest));
};

const handleResponse = (res) => {
  if (res.msg_type === 'authorize') {
    sendTelegramMessage('✅ Authorized on Deriv');
    startTrading();
  }
};

const startTrading = () => {
  const now = Date.now();
  if (isTrading || now - lastTradeTime < TRADE_COOLDOWN_MS) {
    console.log('⏳ Waiting for cooldown or trade in progress');
    return;
  }

  isTrading = true;
  lastTradeTime = now;

  const tradeDetails = {
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
    },
  };

  ws.send(JSON.stringify(tradeDetails));

  sendTelegramMessage('🚀 Trade Sent: CALL R_100');

  setTimeout(() => {
    isTrading = false;
    console.log('✅ Ready for next trade');
  }, TRADE_COOLDOWN_MS);
};

connectToDeriv();
