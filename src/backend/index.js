// File: /src/backend/index.js

const WebSocket = require('ws'); const axios = require('axios'); require('dotenv').config();

const DERIV_APP_ID = process.env.DERIV_APP_ID; const DERIV_API_TOKEN = process.env.DERIV_API_TOKEN; const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

let ws = null; let isTrading = false;

const sendTelegramMessage = async (message) => { const url = https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage; await axios.post(url, { chat_id: TELEGRAM_CHAT_ID, text: message, }); };

const connectToDeriv = () => { ws = new WebSocket(wss://ws.derivws.com/websockets/v3?app_id=${DERIV_APP_ID});

ws.on('open', () => { console.log('✅ Connected to Deriv'); sendTelegramMessage('✅ BAYNEX Bot Connected to Deriv'); authorize(); });

ws.on('message', (data) => { const res = JSON.parse(data.toString()); handleResponse(res); });

ws.on('error', (err) => { console.error('WebSocket Error:', err); sendTelegramMessage('❌ WebSocket Error'); });

ws.on('close', () => { console.log('🔌 WebSocket closed. Reconnecting...'); sendTelegramMessage('🔌 WebSocket disconnected. Reconnecting...'); setTimeout(connectToDeriv, 3000); }); };

const authorize = () => { ws.send(JSON.stringify({ authorize: DERIV_API_TOKEN })); };

const handleResponse = (res) => { if (res.msg_type === 'authorize') { console.log('✅ Authorized on Deriv'); sendTelegramMessage('✅ Authorized on Deriv'); placeTrade(); } else if (res.msg_type === 'buy') { console.log(✅ Trade Placed: ${res.buy.purchase_id}); sendTelegramMessage(✅ Trade Placed: ${res.buy.purchase_id}); setTimeout(() => { placeTrade(); }, 1000); } };

const placeTrade = () => { if (isTrading) return; isTrading = true;

const tradeRequest = { buy: 1, price: 1, parameters: { amount: 1, basis: 'stake', contract_type: 'CALL', currency: 'USD', duration: 1, duration_unit: 't', symbol: 'R_100' } };

ws.send(JSON.stringify(tradeRequest));

setTimeout(() => { isTrading = false; }, 3000); };

connectToDeriv();

