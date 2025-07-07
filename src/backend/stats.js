let stats = {
  wins: 0,
  losses: 0,
  profit: 0,
  lastReset: new Date().toDateString()
};

function recordWin(profit) {
  stats.wins += 1;
  stats.profit += profit;
}

function recordLoss(loss) {
  stats.losses += 1;
  stats.profit -= loss;
}

function resetDaily() {
  const today = new Date().toDateString();
  if (stats.lastReset !== today) {
    stats.wins = 0;
    stats.losses = 0;
    stats.profit = 0;
    stats.lastReset = today;
  }
}

function getStats() {
  resetDaily();
  return stats;
}

module.exports = { recordWin, recordLoss, getStats };
