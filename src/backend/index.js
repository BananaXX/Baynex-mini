const WebSocket = require('ws');
const axios = require('axios');
require('dotenv').config();

const API_TOKEN = process.env.API_TOKEN;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

let balance = 0;
let winCount = 0;
let lossCount = 0;
let targetProfit = 2;
let dailyProfit = 0;

const ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');

ws.on('open', () => {
  sendTelegramMessage('✅ Connected to Deriv');
  ws.send(JSON.stringify({ authorize: API_TOKEN }));
});

ws.on('message', (data) => {
  const response = JSON.parse(data);

  if (response.msg_type === 'authorize') {
    sendTelegramMessage('✅ Authorized on Deriv');
    requestBalance();
  }

  if (response.msg_type === 'balance') {
    balance = response.balance.balance;
    sendTelegramMessage(`💰 Balance: ${balance}`);
    placeTrade();
  }

  if (response.msg_type === 'buy') {
    sendTelegramMessage(`✅ Buy Confirmed: ${response.buy.contract_id}`);
  }

  if (response.msg_type === 'proposal_open_contract') {
    const profit = response.proposal_open_contract.profit;
    const isSold = response.proposal_open_contract.is_sold;

    if (isSold) {
      dailyProfit += profit;

      if (profit > 0) {
        winCount++;
        sendTelegramMessage(`✅ Trade Won: +${profit}`);
      } else {
        lossCount++;
        sendTelegramMessage(`❌ Trade Lost: ${profit}`);
      }

      sendTelegramMessage(`📊 Wins: ${winCount} | Losses: ${lossCount} | Daily: ${dailyProfit}`);

      if (dailyProfit >= targetProfit) {
        sendTelegramMessage('🎯 Daily target reached. Stopping trades.');
        ws.close();
        return;
      } else {
        setTimeout(placeTrade, 10000);
      }
    }
  }
});

function requestBalance() {
  ws.send(JSON.stringify({ balance: 1, subscribe: 1 }));
}

function placeTrade() {
  const proposal = {
    buy: 1,
    price: 1,
    parameters: {
      amount: 1,
      basis: 'stake',
      contract_type: 'CALL',
      currency: 'USD',
      duration: 1,
      duration_unit: 't',
      symbol: 'R_50'
    }
  };

  ws.send(JSON.stringify(proposal));
}

async function sendTelegramMessage(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message
    });
  } catch (error) {
    console.error('Telegram Error:', error);
  }
}

ws.on('error', (err) => {
  sendTelegramMessage(`❌ Error: ${err.message}`);
});

ws.on('close', () => {
  sendTelegramMessage('🛑 Disconnected from Deriv');
});
