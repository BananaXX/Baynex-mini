// src/backend/index.js

require('dotenv').config(); const WebSocket = require('ws'); const axios = require('axios');

const API_TOKEN = process.env.DERIV_API_TOKEN; const APP_ID = process.env.DERIV_APP_ID; const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const ws = new WebSocket(wss://ws.binaryws.com/websockets/v3?app_id=${APP_ID});

let isTrading = false; let lastBalance = 0; let wins = 0; let losses = 0; let profitTarget = 1; // Example goal let currentProfit = 0;

const sendTelegramMessage = async (message) => { const url = https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage; try { await axios.post(url, { chat_id: TELEGRAM_CHAT_ID, text: message }); } catch (error) { console.error('Telegram send error:', error.message); } };

const authorize = () => { ws.send(JSON.stringify({ authorize: API_TOKEN })); };

const getBalance = () => { ws.send(JSON.stringify({ balance: 1, subscribe: 1 })); };

const placeTrade = () => { const tradeRequest = { buy: 1, price: 0.35, parameters: { amount: 0.35, basis: 'stake', contract_type: 'CALL', currency: 'USD', duration: 1, duration_unit: 'm', symbol: 'R_100' } }; ws.send(JSON.stringify(tradeRequest)); };

ws.onopen = () => { console.log('✅ Connected'); sendTelegramMessage('✅ BAYNEX connected and ready.'); authorize(); };

ws.onmessage = (msg) => { const data = JSON.parse(msg.data);

if (data.msg_type === 'authorize') { sendTelegramMessage('✅ Authorized on Deriv'); getBalance(); }

if (data.msg_type === 'balance') { const newBalance = data.balance.balance; if (lastBalance !== 0) { const change = newBalance - lastBalance; currentProfit += change; if (change > 0) { wins++; sendTelegramMessage(✅ Win! Profit: $${change.toFixed(2)} | Total: $${currentProfit.toFixed(2)}); } else if (change < 0) { losses++; sendTelegramMessage(❌ Loss: $${change.toFixed(2)} | Total: $${currentProfit.toFixed(2)}); }

if (currentProfit >= profitTarget) {
    sendTelegramMessage(`🎯 Goal Achieved! Profit: $${currentProfit.toFixed(2)}`);
    ws.close();
    return;
  }
}

lastBalance = newBalance;

if (!isTrading) {
  isTrading = true;
  placeTrade();
}

}

if (data.msg_type === 'buy') { sendTelegramMessage(✅ Buy Confirmed: ${data.buy.contract_id}); } };

ws.onclose = () => { console.log('❌ Disconnected'); sendTelegramMessage('❌ Disconnected. Restarting...'); };

ws.onerror = (err) => { console.error('WebSocket error:', err.message); sendTelegramMessage(⚠️ Error: ${err.message}); };

