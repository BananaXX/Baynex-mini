// File: src/backend/index.js

const WebSocket = require('ws'); const axios = require('axios'); require('dotenv').config();

const APP_ID = process.env.DERIV_APP_ID; const API_TOKEN = process.env.DERIV_API_TOKEN; const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const ws = new WebSocket(wss://ws.binaryws.com/websockets/v3?app_id=${APP_ID});

let balance = 0; let wins = 0; let losses = 0;

const sendTelegramMessage = async (message) => { const url = https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage; try { await axios.post(url, { chat_id: TELEGRAM_CHAT_ID, text: message, }); } catch (error) { console.error('Telegram send error:', error.message); } };

const authorize = () => { ws.send(JSON.stringify({ authorize: API_TOKEN })); };

const placeTrade = () => { const proposal = { buy: 1, price: 1, parameters: { amount: 1, basis: 'stake', contract_type: 'CALL', currency: 'USD', duration: 1, duration_unit: 'm', symbol: 'R_100', }, }; ws.send(JSON.stringify(proposal)); };

ws.onopen = () => { console.log('✅ Connected'); sendTelegramMessage('✅ BAYNEX Connected'); authorize(); };

ws.onmessage = (msg) => { const data = JSON.parse(msg.data);

if (data.msg_type === 'authorize') { sendTelegramMessage('✅ Authorized. Placing trade...'); placeTrade(); }

if (data.msg_type === 'buy') { sendTelegramMessage(✅ Buy Confirmed: ${data.buy.contract_id}); }

if (data.msg_type === 'proposal_open_contract') { const contract = data.proposal_open_contract; if (contract.is_sold) { if (contract.profit > 0) { wins++; sendTelegramMessage(✅ Win! Profit: $${contract.profit}); } else { losses++; sendTelegramMessage(❌ Loss. Amount: $${contract.profit}); } balance += contract.profit; sendTelegramMessage(📊 Balance: $${balance.toFixed(2)} | Wins: ${wins} | Losses: ${losses}); placeTrade(); } } };

ws.onerror = (err) => { console.error('WebSocket error:', err.message); sendTelegramMessage('❌ WebSocket error occurred.'); };

ws.onclose = () => { console.log('❌ Disconnected'); sendTelegramMessage('❌ Disconnected. Attempting reconnect...'); setTimeout(() => { // Auto reconnect const newWs = new WebSocket(wss://ws.binaryws.com/websockets/v3?app_id=${APP_ID}); }, 3000); };

