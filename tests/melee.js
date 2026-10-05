'use strict';
// 混戰程度：每小時取樣，統計「同一區域同時有多支敵對部隊進出」的情形
// 區域 = 15 格內；多方混戰 = 區域內有 ≥3 條進攻行軍、來自 ≥3 位不同玩家，且分屬 ≥2 個不同陣營（同盟/無盟個人各算一方）
const { load } = require('./load');
const S = load();
const days = +(process.argv[2] || 8);
const seed = +(process.argv[3] || 31);
const G = S.Game.newGame({ seed, userName: '測試主公' });
const P = G.players;
const side = p => (p.alliance >= 0 ? 'a' + p.alliance : 'p' + p.id);
let mutualN = 0, samples = 0, peakMarches = 0, sumMarches = 0, melee = 0, big = 0, peak = null;
const perDay = [];
for (let d = 1; d <= days; d++) {
  let dm = 0, dmax = 0, dn = 0;
  for (let k = 0; k < 1440; k++) {
    S.Game.tick(); if (G.over) break;
    if (k % 60 !== 0) continue;
    const ownerOf = m => { const t = S.Game.tileOwner(m.to); return t; };
    const att = G.marches.filter(m => m.type === 'attack' && P[m.pid] && ownerOf(m) >= 0 && ownerOf(m) !== m.pid); // 只算打玩家土地/城池（PvP）
    samples++; dn++;
    sumMarches += att.length; dm += att.length; dmax = Math.max(dmax, att.length);
    peakMarches = Math.max(peakMarches, att.length);
    // 以目標格分群（網格 15×15）
    const cell = {};
    for (const m of att) { const x = S.World.X(m.to), y = S.World.Y(m.to); const key = ((x / 15) | 0) + ',' + ((y / 15) | 0); (cell[key] = cell[key] || []).push(m); }
    let found = false, foundBig = false;
    for (const key in cell) {
      const arr = cell[key];
      const who = new Set(arr.map(m => m.pid));
      const sides = new Set(arr.map(m => side(P[m.pid])));
      // 互打：區域內有 A 方打 B 方、同時 B 方（或其他方）也在打 A 方
      const pairs = new Set(arr.map(m => side(P[m.pid]) + '>' + side(P[ownerOf(m)])));
      const mutual = [...pairs].some(pr => { const [a, b] = pr.split('>'); return pairs.has(b + '>' + a); });
      if (arr.length >= 3 && who.size >= 3 && sides.size >= 2) { found = true; if (mutual) mutualN++; if (!peak || arr.length > peak.n) peak = { n: arr.length, who: who.size, sides: sides.size, day: d }; }
      if (arr.length >= 6 && who.size >= 5 && sides.size >= 3) foundBig = true;
    }
    if (found) melee++;
    if (foundBig) big++;
  }
  perDay.push('d' + d + ' 平均PvP進攻行軍 ' + (dm / dn).toFixed(1) + ' 峰值 ' + dmax);
}
console.log(perDay.join(' | '));
console.log('互打(A打B同時B打A)的取樣', mutualN, '/', melee);
console.log('取樣', samples, '| 平均同時PvP進攻行軍', (sumMarches / samples).toFixed(1), '峰值', peakMarches);
console.log('出現多方混戰(≥3條線、≥3人、≥2方)的取樣比例', (melee / samples * 100).toFixed(0) + '%', '| 大混戰(≥6條線、≥5人、≥3方)', (big / samples * 100).toFixed(0) + '%', '| 最大一處', JSON.stringify(peak));
