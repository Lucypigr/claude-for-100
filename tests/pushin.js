'use strict';
// 乘勝追擊檢查：AI 攻擊其他玩家土地後，是否持續推進到對方主城
const { load } = require('./load');
const S = load();
const days = +(process.argv[2] || 12);
const G = S.Game.newGame({ seed: +(process.argv[3] || 31), userName: '測試主公' });
const seen = new Set(); let pvpLand = 0, pvpMain = 0;
for (let d = 0; d < days; d++) for (let k = 0; k < 1440; k++) {
  S.Game.tick(); if (G.over) break;
  if (k % 5 !== 0) continue;
  for (const m of G.marches) {
    if (m.type !== 'attack' || seen.has(m.id)) continue;
    seen.add(m.id);
    const o = S.Game.T.owner[m.to];
    if (o < 0 || o === m.pid) continue;
    if (S.Game.P[o].cityTile === m.to) pvpMain++; else pvpLand++;
  }
}
console.log('攻擊他人土地', pvpLand, '次；攻擊他人主城', pvpMain, '次');
