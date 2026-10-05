'use strict';
// 黃巾軍與天氣：無頭模擬 N 天，輸出營寨出現/被擊破數、榮譽點分布、各天氣出現次數
const { load } = require('./load');
const S = load();
const days = +(process.argv[2] || 8);
const G = S.Game.newGame({ seed: +(process.argv[3] || 31), userName: '測試主公' });
const P = G.players;
const seen = new Set();
const wcount = {};
for (let d = 1; d <= days; d++) {
  for (let k = 0; k < 1440; k++) {
    S.Game.tick(); if (G.over) break;
    if (G.yellow) for (const t in G.yellow.camps) seen.add(t + '@' + G.yellow.camps[t].since);
    if (k % 360 === 0) for (const st of S.World.states) { const w = S.Weather.at(st.name, G.time).name; wcount[w] = (wcount[w] || 0) + 1; }
  }
  if (d % 2 === 0 || d === days) {
    const ai = P.filter(p => p.ai);
    const killed = P.reduce((s, p) => s + (p.stats.yellow || 0), 0);
    const hon = ai.map(p => p.honor || 0).sort((a, b) => b - a);
    console.log('day', d, '營寨出現', seen.size, '現存', G.yellow ? Object.keys(G.yellow.camps).length : 0, '被擊破', killed,
      '| AI 榮譽點 最高', Math.round(hon[0]), '中位', Math.round(hon[hon.length >> 1]), '| 玩家', Math.round(P[0].honor || 0));
  }
}
console.log('天氣次數（每 6 小時、每州取樣）', JSON.stringify(wcount));
