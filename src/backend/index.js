// src/backend/index.js

const WebSocket = require('ws');
const axios = require('axios');
require('dotenv').config();

const API_TOKEN = process.env.DERIV_API_TOKEN;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

let ws = null;
let isAuthorized = false;
let reconnectInterval = 10000;
let lastTradeTime = 0;
const tradeCooldown = 5000; 

let balance = 0;
let winCount = 0;
let lossCount = 0;
let profit = 0;
let goal = 2; // Example: Target $2 profit for the day
let sessionPnL = 0;
let activeStrategy = 'Momentum'; 

const sendTelegramMessage = async (message) => {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
    });
  } catch (error) {
    console.error('Telegram Error:', error.message);
  }
};

const connectWebSocket = () => {
  ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');

  ws.on('open', () => {
    ws.send(JSON.stringify({ authorize: API_TOKEN }));
  });

  ws.on('message', async (data) => {
    const response = JSON.parse(data);

    if (response.msg_type === 'authorize') {
      isAuthorized = true;
      await sendTelegramMessage('✅ Authorized on Deriv');
      subscribeToTicks();
      getBalance();
    }

    if (response.msg_type === 'balance') {
      balance = response.balance.balance;
      await sendTelegramMessage(`💰 Balance: $${balance.toFixed(2)}`);
    }

    if (response.msg_type === 'buy') {
      await sendTelegramMessage(`✅ Buy Confirmed: ${response.buy.contract_id}`);
    }

    if (response.msg_type === 'profit_table') {
      const profitVal = response.profit_table.profit;
      sessionPnL += profitVal;
      profit += profitVal;
      if (profitVal > 0) {
        winCount++;
        await sendTelegramMessage(`✅ Win: +$${profitVal.toFixed(2)}`);
      } else {
        lossCount++;
        await sendTelegramMessage(`❌ Loss: $${profitVal.toFixed(2)}`);
      }
      checkGoal();
    }

    if (response.msg_type === 'error') {
      await sendTelegramMessage(`❌ Error: ${response.error.message}`);
    }
  });

  ws.on('close', async () => {
    isAuthorized = false;
    await sendTelegramMessage('❌ Disconnected from Deriv');
    setTimeout(connectWebSocket, reconnectInterval);
  });

  ws.on('error', async (error) => {
    await sendTelegramMessage(`❌ WebSocket error: ${error.message}`);
    ws.close();
  });
};

const subscribeToTicks = () => {
  if (ws && isAuthorized) {
    ws.send(JSON.stringify({ ticks: 'R_100' }));
  }
};

const placeTrade = () => {
  if (!ws || !isAuthorized) return;

  const now = Date.now();
  if (now - lastTradeTime < tradeCooldown) return;

  const tradeAmount = 0.35;
  const buyRequest = {
    buy: 1,
    price: tradeAmount,
    parameters: {
      amount: tradeAmount,
      basis: 'stake',
      contract_type: 'CALL',
      currency: 'USD',
      duration: 1,
      duration_unit: 't',
      symbol: 'R_100',
    },
  };

  ws.send(JSON.stringify(buyRequest));
  lastTradeTime = now;
  sendTelegramMessage(`🚀 Trade Sent: ${activeStrategy} - $${tradeAmount}`);
};

const getBalance = () => {
  if (ws && isAuthorized) {
    ws.send(JSON.stringify({ balance: 1, subscribe: 1 }));
  }
};

const getProfitTable = () => {
  if (ws && isAuthorized) {
    ws.send(JSON.stringify({
      profit_table: 1,
      description: 1,
      limit: 1
    }));
  }
};

const checkGoal = async () => {
  if (sessionPnL >= goal) {
    await sendTelegramMessage(`🎯 Goal Achieved! Profit: $${sessionPnL.toFixed(2)} ✅`);
  }
};

connectWebSocket();

setInterval(() => {
  placeTrade();
  getProfitTable();
}, 30000);

setInterval(() => {
  getBalance();
}, 60000);
