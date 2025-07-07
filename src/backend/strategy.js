function decideTrade(lastTicks) {
  if (!lastTicks || lastTicks.length < 5) return null;

  const latest = lastTicks[lastTicks.length - 1];
  const previous = lastTicks[lastTicks.length - 5];

  return latest > previous ? 'CALL' : 'PUT';
}

module.exports = { decideTrade };
