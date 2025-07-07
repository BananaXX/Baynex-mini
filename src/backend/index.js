// File: src/backend/index.js const WebSocket = require('ws'); const axios = require('axios'); require('dotenv').config();

const DERIV_APP_ID = process.env.DERIV_APP_ID; const DERIV_API_TOKEN = process.env.DERIV_API_TOKEN; const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

let ws = null; let isTrading = false; let tradeCount = 0; let dailyProfit = 0;

const MAX_TRADES_PER_SESSION = 3; const COOLDOWN_MS = 60000; // 1 minute cooldown const DAILY_PROFIT_TARGET = 3; // $3 const DAILY_LOSS_LIMIT = -3; // -$3

const sendTelegramMessage = async (message) => { const url = https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage; await axios.post(url, { chat_id: TELEGRAM_CHAT_ID, text: message, }); };

const connectToDeriv = () => { ws = new WebSocket(wss://ws.derivws.com/websockets/v3?app_id=${DERIV_APP_ID});

ws.on('open', () => { console.log('✅ Connected to Deriv'); sendTelegramMessage('✅ BAYNEX Bot Connected to Deriv'); authorize(); });

ws.on('message', (data) => { const res = JSON.parse(data.toString()); handleResponse(res); });

ws.on('close', () => { console.log('❌ Disconnected. Reconnecting...'); sendTelegramMessage('❌ BAYNEX Bot Disconnected. Reconnecting...'); setTimeout(connectToDeriv, 5000); }); };

const authorize = () => { ws.send(JSON.stringify({ authorize: DERIV_API_TOKEN })); };

const placeTrade = () => { if (tradeCount >= MAX_TRADES_PER_SESSION || isTrading) return; if (dailyProfit >= DAILY_PROFIT_TARGET || dailyProfit <= DAILY_LOSS_LIMIT) { sendTelegramMessage('🚫 Trading paused: Goal or Stop-Loss reached.'); return; }

isTrading = true; const tradeRequest = { buy: 1, price: 1, parameters: { amount: 1, basis: 'stake', contract_type: 'CALL', currency: 'USD', duration: 1, duration_unit: 'm', symbol: 'R_100' } };

ws.send(JSON.stringify(tradeRequest)); sendTelegramMessage('🚀 Trade Sent: CALL R_100'); };

const handleResponse = (res) => { if (res.msg_type === 'authorize') { sendTelegramMessage('✅ Authorized on Deriv'); placeTrade(); }

if (res.msg_type === 'buy') { tradeCount++; const transactionId = res.buy.transaction_id; sendTelegramMessage(✅ Trade Placed: ${transactionId});

setTimeout(() => {
  isTrading = false;
  sendTelegramMessage('✅ Ready for next trade');
  placeTrade();
}, COOLDOWN_MS);

}

if (res.msg_type === 'profit_table') { const profit = res.profit_table.profit; dailyProfit += profit; } };

connectToDeriv();

