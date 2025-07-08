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
let openContracts = 0;
let dailyPnL = 0;
let lastTradeTime = 0;
const cooldownTime = 5000; // 5 seconds cooldown

const profitTarget = 10; // Daily target in USD
const stopLossLimit = -5; // Daily stop loss in USD

const telegramQueue = [];
let telegramBusy = false;

function sendTelegram(message) {
  telegramQueue.push(message);
  processTelegramQueue();
}

async function processTelegramQueue() {
  if (telegramBusy || telegramQueue.length === 0) return;
  telegramBusy = true;
  const message = telegramQueue.shift();
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(url, { chat_id: TELEGRAM_CHAT_ID, text: message });
  } catch (error) {
    console.error('Telegram Error:', error.message);
  } finally {
    telegramBusy = false;
    setTimeout(processTelegramQueue, 1100); // Flood control delay
  }
}

function placeTrade() {
  if (openContracts >= 100) {
    sendTelegram('❌ Max contracts open. Waiting...');
    return;
  }
  if (Date.now() - lastTradeTime < cooldownTime) return;
  if (dailyPnL >= profitTarget) {
    sendTelegram('✅ Daily profit target reached. Stopping.');
    return;
  }
  if (dailyPnL <= stopLossLimit) {
    sendTelegram('❌ Daily stop loss hit. Stopping.');
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
      symbol: 'R_100',
    }
  };

  ws.send(JSON.stringify(proposal));
  sendTelegram('🚀 Trade Sent: Momentum - $0.35');
  lastTradeTime = Date.now();
}

ws.onopen = () => {
  sendTelegram('🟢 BAYNEX Phase 3.5 Online');
  ws.send(JSON.stringify({ authorize: API_TOKEN }));
};

ws.onmessage = (msg) => {
  const data = JSON.parse(msg.data);

  if (data.error) {
    sendTelegram(`❌ Error: ${data.error.message}`);
    return;
  }

  if (data.msg_type === 'authorize') {
    isAuthorized = true;
    sendTelegram('✅ Authorized on Deriv');
    ws.send(JSON.stringify({ balance: 1, subscribe: 1 }));
  }

  if (data.msg_type === 'balance') {
    const newBalance = parseFloat(data.balance.balance);
    const profitLoss = newBalance - accountBalance;
    if (accountBalance > 0 && profitLoss !== 0) dailyPnL += profitLoss;
    accountBalance = newBalance;
    sendTelegram(`💰 Balance: $${accountBalance.toFixed(2)}`);
    placeTrade();
  }

  if (data.msg_type === 'buy') {
    if (data.buy && data.buy.contract_id) {
      openContracts++;
      sendTelegram(`✅ Trade Confirmed: ${data.buy.contract_id}`);
    }
  }

  if (data.msg_type === 'proposal_open_contract') {
    if (data.proposal_open_contract.is_sold) {
      openContracts = Math.max(0, openContracts - 1);
      const sellProfit = parseFloat(data.proposal_open_contract.profit);
      dailyPnL += sellProfit;
      sendTelegram(`✅ Contract Sold. PnL: $${sellProfit.toFixed(2)} | Daily: $${dailyPnL.toFixed(2)}`);
    }
  }
};

ws.onerror = (err) => {
  console.error('WebSocket error:', err.message);
  sendTelegram('❌ Connection error');
};

ws.onclose = () => {
  sendTelegram('❌ Connection closed.');
};
