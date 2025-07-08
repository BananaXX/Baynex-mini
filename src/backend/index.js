const WebSocket = require('ws');
const axios = require('axios');
require('dotenv').config();

const API_TOKEN = process.env.DERIV_API_TOKEN;
const APP_ID = process.env.DERIV_APP_ID;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${APP_ID}`);

let isAuthorized = false;
let accountBalance = 0;
let lastTelegramTime = 0;
let dailyProfit = 0;
let dailyLoss = 0;
let openTrades = 0;
let tradeCount = 0;

const MAX_TRADES_PER_SESSION = 50;
const DAILY_PROFIT_TARGET = 10;
const DAILY_LOSS_LIMIT = 10;
const TRADE_COOLDOWN_MS = 30000;

let lastTradeTime = 0;

const sendTelegram = async (message) => {
  const now = Date.now();
  if (now - lastTelegramTime < 2500) return;  // Limit to 1 message every 2.5 sec
  lastTelegramTime = now;

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message
    });
  } catch (error) {
    console.error('Telegram Error:', error.response ? error.response.status : error.message);
  }
};

ws.onopen = () => {
  sendTelegram('✅ BAYNEX.A.X System Online');
  ws.send(JSON.stringify({ authorize: API_TOKEN }));
};

ws.onmessage = async (event) => {
  const data = JSON.parse(event.data);

  if (data.msg_type === 'authorize') {
    isAuthorized = true;
    sendTelegram('✅ Authorized on Deriv');
    ws.send(JSON.stringify({ balance: 1, subscribe: 1 }));
  }

  if (data.msg_type === 'balance') {
    const newBalance = data.balance.balance / 10000;
    if (newBalance !== accountBalance) {
      accountBalance = newBalance;
      sendTelegram(`💰 Balance: $${accountBalance.toFixed(2)}`);
    }
  }

  if (data.msg_type === 'buy') {
    if (data.buy && data.buy.contract_id) {
      sendTelegram(`✅ Trade Confirmed: ${data.buy.contract_id}`);
      openTrades += 1;
      tradeCount += 1;
    }
  }

  if (data.msg_type === 'profit_table') {
    const profit = data.profit_table.profit / 10000;
    if (profit > 0) {
      dailyProfit += profit;
      sendTelegram(`✅ Trade Won: +$${profit.toFixed(2)} | Daily Profit: $${dailyProfit.toFixed(2)}`);
    } else {
      dailyLoss += Math.abs(profit);
      sendTelegram(`❌ Trade Lost: -$${Math.abs(profit).toFixed(2)} | Daily Loss: $${dailyLoss.toFixed(2)}`);
    }
    openTrades = Math.max(0, openTrades - 1);
  }

  if (data.error) {
    sendTelegram(`❌ Error: ${data.error.message}`);
  }

  // Auto-trade logic
  if (isAuthorized && openTrades === 0 && Date.now() - lastTradeTime > TRADE_COOLDOWN_MS) {
    if (tradeCount >= MAX_TRADES_PER_SESSION) {
      sendTelegram('⛔ Max trades reached. Stopping.');
      return;
    }
    if (dailyProfit >= DAILY_PROFIT_TARGET) {
      sendTelegram(`🎯 Daily Target Hit: $${dailyProfit.toFixed(2)}. Stopping.`);
      return;
    }
    if (dailyLoss >= DAILY_LOSS_LIMIT) {
      sendTelegram(`⚠️ Loss Limit Hit: $${dailyLoss.toFixed(2)}. Stopping.`);
      return;
    }

    const proposal = {
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
    ws.send(JSON.stringify(proposal));
    lastTradeTime = Date.now();
  }
};

ws.onerror = (err) => {
  console.error('WebSocket Error:', err.message);
  sendTelegram('❌ Disconnected from Deriv');
};

ws.onclose = () => {
  sendTelegram('❌ Disconnected from Deriv');
};

console.log('✅ BAYNEX Backend Running');
