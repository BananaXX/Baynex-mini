// ✅ BAYNEX.A.X BACKEND (Fixed Version) // File: /src/backend/index.js

const WebSocket = require('ws'); const axios = require('axios'); require('dotenv').config();

const API_TOKEN = process.env.DERIV_API_TOKEN; const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');

let isTrading = false; let tradeCooldown = false; let winCount = 0; let lossCount = 0; let lastTradeProfit = 0;

const sendTelegramMessage = async (message) => { const url = https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage; try { await axios.post(url, { chat_id: TELEGRAM_CHAT_ID, text: message, }); } catch (error) { console.error('Telegram Error:', error.message); } };

const authorize = () => { ws.send(JSON.stringify({ authorize: API_TOKEN })); };

const placeTrade = () => { if (isTrading || tradeCooldown) return;

isTrading = true; tradeCooldown = true;

const tradeRequest = { buy: 1, price: 1, parameters: { amount: 1, basis: 'stake', contract_type: 'CALL', currency: 'USD', duration: 1, duration_unit: 't', symbol: 'R_100' } };

ws.send(JSON.stringify(tradeRequest)); sendTelegramMessage('✅ Trade Placed');

setTimeout(() => { tradeCooldown = false; }, 60000); // 1 minute cooldown };

ws.onopen = () => { console.log('✅ Connected'); sendTelegramMessage('✅ BAYNEX Connected'); authorize(); };

ws.onmessage = (msg) => { const data = JSON.parse(msg.data);

if (data.msg_type === 'authorize') { sendTelegramMessage('✅ Authorized on Deriv'); placeTrade(); }

if (data.msg_type === 'buy') { const contractId = data.buy.purchase_id; sendTelegramMessage(📊 Trade ID: ${contractId}); }

if (data.msg_type === 'proposal_open_contract') { const isSold = data.proposal_open_contract.is_sold; const profit = data.proposal_open_contract.profit;

if (isSold) {
  lastTradeProfit = profit;
  if (profit > 0) {
    winCount++;
    sendTelegramMessage(`✅ Win! Profit: $${profit}`);
  } else {
    lossCount++;
    sendTelegramMessage(`❌ Loss. Amount: $${profit}`);
  }

  isTrading = false;
  sendTelegramMessage(`Wins: ${winCount} | Losses: ${lossCount}`);
}

} };

ws.onerror = (err) => { console.error('WebSocket error:', err.message); sendTelegramMessage('⚠️ WebSocket error'); };

ws.onclose = () => { console.log('❌ Disconnected'); sendTelegramMessage('❌ Disconnected. Reconnecting...'); setTimeout(() => { authorize(); }, 5000); };

