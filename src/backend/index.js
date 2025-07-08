// File: src/backend/index.js

const WebSocket = require('ws'); const axios = require('axios'); require('dotenv').config();

const API_TOKEN = process.env.DERIV_API_TOKEN; const APP_ID = process.env.DERIV_APP_ID; const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const ws = new WebSocket(wss://ws.binaryws.com/websockets/v3?app_id=${APP_ID});

const sendTelegram = async (message) => { const url = https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage; try { await axios.post(url, { chat_id: TELEGRAM_CHAT_ID, text: message }); } catch (error) { console.error('Telegram Error:', error.message); } };

let balance = 0; let openTrades = 0; const profitTarget = 10;  // $10 daily goal const lossLimit = -5;     // -$5 daily stop let dailyPnL = 0;

const authorize = () => { ws.send(JSON.stringify({ authorize: API_TOKEN })); };

const subscribeBalance = () => { ws.send(JSON.stringify({ balance: 1, subscribe: 1 })); };

const placeTrade = () => { if (dailyPnL >= profitTarget) { sendTelegram(🎯 Profit target reached: $${dailyPnL.toFixed(2)}. Trading paused.); return; } if (dailyPnL <= lossLimit) { sendTelegram(⚠️ Loss limit reached: $${dailyPnL.toFixed(2)}. Trading stopped.); return; }

const proposal = { buy: 1, price: 0.35, parameters: { amount: 0.35, basis: 'stake', contract_type: 'CALL', currency: 'USD', duration: 1, duration_unit: 'm', symbol: 'R_100' } };

if (openTrades < 100) { ws.send(JSON.stringify(proposal)); sendTelegram('🚀 Trade Sent: Momentum - $0.35'); openTrades++; } else { sendTelegram('❌ Max contracts open. Waiting to clear.'); } };

ws.onopen = () => { sendTelegram('🟢 BAYNEX Phase 3 Online'); authorize(); };

ws.onmessage = (msg) => { const data = JSON.parse(msg.data);

if (data.msg_type === 'authorize') { sendTelegram('✅ Authorized on Deriv'); subscribeBalance(); }

if (data.msg_type === 'balance') { balance = data.balance.balance / 10000; sendTelegram(💰 Balance: $${balance.toFixed(2)}); }

if (data.msg_type === 'buy') { if (data.buy && data.buy.contract_id) { sendTelegram(✅ Trade Confirmed: ${data.buy.contract_id}); } }

if (data.msg_type === 'profit_table') { const lastProfit = data.profit_table.profit; dailyPnL += lastProfit; }

if (data.error) { sendTelegram(❌ Error: ${data.error.message}); } };

ws.onclose = () => { sendTelegram('❌ Connection closed.'); };

setInterval(placeTrade, 60000);

