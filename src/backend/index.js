// 📂 File: src/backend/index.js

const WebSocket = require('ws'); const axios = require('axios'); require('dotenv').config();

// ✅ Environment Variables const DERIV_API_TOKEN = process.env.DERIV_API_TOKEN; const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// ✅ Deriv WebSocket Setup const ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');

let isConnected = false; let isAuthorized = false; let isTradeActive = false;

// ✅ Telegram Messaging const sendTelegramMessage = async (message) => { const url = https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage; try { await axios.post(url, { chat_id: TELEGRAM_CHAT_ID, text: message, }); } catch (error) { console.error('Telegram error:', error.message); } };

// ✅ Place Trade const placeTrade = () => { if (isTradeActive) return; // Prevent multiple trades

isTradeActive = true;

const tradeRequest = { buy: 1, price: 1, parameters: { amount: 1, basis: 'stake', contract_type: 'CALL', currency: 'USD', duration: 1, duration_unit: 't', symbol: 'R_100', }, };

ws.send(JSON.stringify(tradeRequest)); sendTelegramMessage('✅ Trade Placed');

setTimeout(() => { isTradeActive = false; // Allow next trade after cooldown sendTelegramMessage('✅ Ready for next trade'); }, 60000); // 1-minute cooldown };

// ✅ WebSocket Events ws.on('open', () => { isConnected = true; console.log('✅ Connected'); sendTelegramMessage('✅ Bot connected to Deriv');

ws.send( JSON.stringify({ authorize: DERIV_API_TOKEN }) ); });

ws.on('message', (data) => { const response = JSON.parse(data);

if (response.msg_type === 'authorize') { isAuthorized = true; sendTelegramMessage('✅ Authorized'); placeTrade(); }

if (response.msg_type === 'buy') { sendTelegramMessage(✅ Buy Confirmed: ${response.buy.contract_id}); }

if (response.msg_type === 'error') { sendTelegramMessage(❌ Error: ${response.error.message}); } });

ws.on('close', () => { isConnected = false; isAuthorized = false; sendTelegramMessage('❌ Disconnected. Attempting reconnect...');

setTimeout(() => { process.exit(1); // Auto-restart by Render }, 5000); });

// ✅ Keep process alive setInterval(() => {}, 10000);

