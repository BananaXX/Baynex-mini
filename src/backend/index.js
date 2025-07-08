// File: src/backend/index.js const express = require('express'); const WebSocket = require('ws'); const axios = require('axios'); require('dotenv').config();

const app = express(); const PORT = process.env.PORT || 10000;

const API_TOKEN = process.env.DERIV_API_TOKEN; const APP_ID = process.env.DERIV_APP_ID; const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

let balance = 0; let profit = 0; let consecutiveLosses = 0; let lastTradeTime = 0;

const DAILY_PROFIT_TARGET = 5; // $5 target const DAILY_LOSS_LIMIT = -10;  // $10 max loss const COOLDOWN_MS = 60000; // 1 minute cooldown

const ws = new WebSocket(wss://ws.binaryws.com/websockets/v3?app_id=${APP_ID});

const sendTelegram = async (msg) => { const url = https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage; try { await axios.post(url, { chat_id: TELEGRAM_CHAT_ID, text: msg, }); } catch (err) { console.error('Telegram Error:', err.response ? err.response.status : err.message); } };

ws.onopen = () => { sendTelegram('✅ BAYNEX Online & Connected'); ws.send(JSON.stringify({ authorize: API_TOKEN })); };

ws.onmessage = (msg) => { const data = JSON.parse(msg.data);

if (data.msg_type === 'authorize') { ws.send(JSON.stringify({ balance: 1, subscribe: 1 })); sendTelegram('✅ Authorized. Monitoring Balance.'); }

if (data.msg_type === 'balance') { balance = parseFloat(data.balance.balance / 10000).toFixed(2); sendTelegram(💰 Balance: $${balance});

const now = Date.now();
if (now - lastTradeTime > COOLDOWN_MS && profit < DAILY_PROFIT_TARGET && profit > DAILY_LOSS_LIMIT && consecutiveLosses < 3) {
  placeTrade();
}

}

if (data.msg_type === 'buy') { const contractId = data.buy?.contract_id || 'unknown'; sendTelegram(✅ Trade Placed: Contract ID ${contractId}); }

if (data.msg_type === 'proposal_open_contract') { const payout = parseFloat(data.proposal_open_contract.profit);

profit += payout;
lastTradeTime = Date.now();

if (payout > 0) {
  consecutiveLosses = 0;
  sendTelegram(`✅ Trade Won: +$${payout.toFixed(2)} | Total: $${profit.toFixed(2)}`);
} else {
  consecutiveLosses++;
  sendTelegram(`❌ Trade Lost: $${payout.toFixed(2)} | Total: $${profit.toFixed(2)} | Losses: ${consecutiveLosses}`);
}

if (profit >= DAILY_PROFIT_TARGET) {
  sendTelegram('🎯 Daily Profit Target Achieved. Stopping trades.');
} else if (profit <= DAILY_LOSS_LIMIT || consecutiveLosses >= 3) {
  sendTelegram('🛑 Trading Stopped: Loss Limit or Consecutive Losses hit.');
}

} };

ws.onerror = (err) => { console.error('WebSocket error:', err.message); sendTelegram('❌ WebSocket Error. Check connection.'); };

app.listen(PORT, () => { console.log(✅ BAYNEX Backend Running on port ${PORT}); });

