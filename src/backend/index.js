const WebSocket = require('ws');
const axios = require('axios');

const APP_ID = process.env.DERIV_APP_ID;
const API_TOKEN = process.env.DERIV_API_TOKEN;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const PROFIT_TARGET = parseFloat(process.env.PROFIT_TARGET) || 1;
const LOSS_LIMIT = parseFloat(process.env.LOSS_LIMIT) || -1;

let balance = 0;
let winCount = 0;
let lossCount = 0;
let totalPnL = 0;

const ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${APP_ID}`);

const sendTelegramMessage = async (message) => {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(url, { chat_id: TELEGRAM_CHAT_ID, text: message });
  } catch (error) {
    console.error('Telegram send error:', error.message);
  }
};

ws.on('open', () => {
  ws.send(JSON.stringify({ authorize: API_TOKEN }));
});

ws.on('message', (data) => {
  const response = JSON.parse(data);

  if (response.msg_type === 'authorize') {
    ws.send(JSON.stringify({ balance: 1, subscribe: 1 }));
    placeTrade();
  }

  if (response.msg_type === 'balance') {
    balance = response.balance;
  }

  if (response.msg_type === 'buy') {
    sendTelegramMessage(`✅ Buy Confirmed: ${response.buy.contract_id}`);
  }

  if (response.msg_type === 'proposal_open_contract') {
    const { profit, is_sold } = response.proposal_open_contract;
    if (is_sold) {
      totalPnL += profit;
      if (profit > 0) {
        winCount++;
        sendTelegramMessage(`✅ Win! Profit: $${profit.toFixed(2)}`);
      } else {
        lossCount++;
        sendTelegramMessage(`❌ Loss! Profit: $${profit.toFixed(2)}`);
      }
      sendTelegramMessage(`📊 Balance: $${balance} | Wins: ${winCount} | Losses: ${lossCount} | PnL: $${totalPnL.toFixed(2)}`);

      if (totalPnL >= PROFIT_TARGET) {
        sendTelegramMessage(`🎯 Goal Reached: +$${totalPnL.toFixed(2)}. Stopping.`);
        ws.close();
      } else if (totalPnL <= LOSS_LIMIT) {
        sendTelegramMessage(`🛑 Loss Limit Hit: $${totalPnL.toFixed(2)}. Stopping.`);
        ws.close();
      } else {
        setTimeout(placeTrade, 1000);
      }
    }
  }
});

const placeTrade = () => {
  const tradeRequest = {
    buy: 1,
    price: 1,
    parameters: {
      amount: 1,
      basis: 'stake',
      contract_type: 'CALL',
      currency: 'USD',
      duration: 1,
      duration_unit: 't',
      symbol: 'R_100'
    }
  };
  ws.send(JSON.stringify(tradeRequest));
};
