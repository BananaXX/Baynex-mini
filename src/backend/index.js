/* BAYNEX.A.X - Complete Backend Trading System (Phase 2.5) Includes:

Deriv Connection & Balance Fetch

Telegram Alerts

Basic Trade Execution (Momentum Placeholder)

Smart Error Handling */


// src/backend/index.js

const WebSocket = require('ws'); const axios = require('axios'); require('dotenv').config();

const API_TOKEN = process.env.DERIV_API_TOKEN; const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');

let isAuthorized = false;

const sendTelegramMessage = async (message) => { const url = https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage; try { await axios.post(url, { chat_id: TELEGRAM_CHAT_ID, text: message }); } catch (error) { console.error('Telegram send error:', error.message); } };

const authorize = () => { ws.send(JSON.stringify({ authorize: API_TOKEN })); };

const getBalance = () => { ws.send(JSON.stringify({ balance: 1 })); };

const placeTrade = () => { const proposal = { buy: 1, parameters: { amount: 0.35, basis: 'stake', contract_type: 'CALL', currency: 'USD', duration: 1, duration_unit: 'm', symbol: 'R_100' } }; ws.send(JSON.stringify(proposal)); };

ws.onopen = () => { sendTelegramMessage('✅ BAYNEX System Online'); authorize(); };

ws.onmessage = async (msg) => { const data = JSON.parse(msg.data);

if (data.msg_type === 'authorize') { isAuthorized = true; sendTelegramMessage('✅ Authorized on Deriv'); getBalance(); }

if (data.msg_type === 'balance') { const balance = (data.balance?.balance || 0) / 100; sendTelegramMessage(💰 Balance: $${balance.toFixed(2)});

// Example: Auto trigger Momentum strategy
placeTrade();

}

if (data.msg_type === 'buy') { sendTelegramMessage(🚀 Trade Sent: Momentum - $0.35\n✅ Buy Confirmed: ${data.buy.contract_id}); }

if (data.error) { sendTelegramMessage(❌ Error: ${data.error.message}); } };

ws.onclose = () => { sendTelegramMessage('❌ Disconnected from Deriv'); isAuthorized = false; };

// --- package.json --- { "name": "baynex-backend", "version": "1.0.3", "main": "src/backend/index.js", "scripts": { "start": "node src/backend/index.js" }, "dependencies": { "axios": "^1.6.7", "dotenv": "^16.3.1", "ws": "^8.16.0" } }

// --- tsconfig.json --- { "compilerOptions": { "target": "ES6", "module": "commonjs", "strict": true, "esModuleInterop": true, "outDir": "dist" }, "include": ["src/**/*"] }

/* ✅ NEXT: Phase 3 - Win/Loss tracking, Goal System, Strategy Switcher Ready. Say "Go" */

