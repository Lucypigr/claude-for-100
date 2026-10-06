'use strict';
// 集結檢查：同盟攻城（關口/城池）時，進攻行軍的出發點（部隊駐紮的據點）離目標多遠
const { load } = require('./load');
const S = load();
const days = +(process.argv[2] || 12);
const G = S.Game.newGame({ seed: +(process.argv[3] || 31), userName: '測試主公' });
const seen = new Set(), dists = [];
for (let d = 0; d < days; d++) for (let k = 0; k < 1440; k++) {
  S.Game.tick(); if (G.over) break;
  if (k % 10 !== 0) continue;
  for (const m of G.marches) {
    if (m.type !== 'attack' || seen.has(m.id)) continue;
    seen.add(m.id);
    const c = S.World.cities[S.Game.T.city[m.to]];
    if (!c || S.World.isPlayerCity(c) || c.dead) continue;           // 只看打 NPC 城池/關口
    const ctr = c.tiles[(c.tiles.length / 2) | 0];
    dists.push({ type: c.type, d: S.World.dist(m.from, ctr) });
  }
}
const near = dists.filter(x => x.d <= 14).length;
dists.sort((a, b) => a.d - b.d);
const med = dists.length ? dists[dists.length >> 1].d : 0;
console.log('攻城/關口出征', dists.length, '次；從目標 14 格內出發', near, '次（' + (dists.length ? Math.round(near / dists.length * 100) : 0) + '%）；出發距離中位數', med, '格；最遠', dists.length ? dists[dists.length - 1].d : 0);
