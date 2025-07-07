import WebSocket from 'ws';
import axios from 'axios';
import { config } from 'dotenv';

config();

const DERIV_APP_ID = process.env.DERIV_APP_ID!;
const DERIV_API_TOKEN = process.env.DERIV_API_TOKEN!;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

let ws: WebSocket | null = null;
let isTrading = false;

const sendTelegramMessage = async (message: string) => {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  await axios.post(url, {
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
  });
};

const connectToDeriv = () => {
  ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${DERIV_APP_ID}`);

  ws.on('open', () => {
    console.log('✅ Connected to Deriv');
    sendTelegramMessage('✅ BAYNEX Bot Connected to Deriv');
    authorize();
  });

  ws.on('message', (data: any) => {
    const response = JSON.parse(data);
    handleResponse(response);
  });

  ws.on('close', () => {
    console.log('❌ Disconnected. Reconnecting...');
    setTimeout(connectToDeriv, 3000);
  });

  ws.on('error', (err) => {
    console.error('❌ WebSocket Error:', err.message);
  });
};

const authorize = () => {
  ws?.send(JSON.stringify({
    authorize: DERIV_API_TOKEN
  }));
};

const handleResponse = (response: any) => {
  if (response.msg_type === 'authorize') {
    console.log('✅ Authorized on Deriv');
    sendTelegramMessage('✅ Authorized on Deriv');
    if (!isTrading) startTrade();
  }

  if (response.msg_type === 'buy') {
    console.log('✅ Trade Placed:', response.buy.transaction_id);
    sendTelegramMessage(`✅ Trade Placed: ${response.buy.transaction_id}`);
  }
};

const startTrade = () => {
  if (!ws) return;
  isTrading = true;

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
  sendTelegramMessage('🚀 Trade Sent: CALL on R_100');
};

connectToDeriv();
