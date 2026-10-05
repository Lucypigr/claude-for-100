'use strict';
const { load } = require('./load');
const S = load();
const t0 = Date.now();
// 檢查資料完整性
for (const h of S.HEROES) for (const k of ['skill', 'inherit']) if (!S.SKILLS[h[k]]) throw new Error('missing ' + k + ' ' + h[k] + ' for ' + h.name);
for (const s of S.SKILLS._list) for (const f of s.fx.concat(s.rfx || [])) if (f.k !== 'range' && !/^(self|a1|a2|aAll|aLow|e1|e2|e3|e23|eAll)$/.test(f.tgt)) throw new Error('bad target ' + s.name);
const G = S.Game.newGame({ seed: 12345, userName: '測試主公' });
console.log('newGame ms', Date.now() - t0, 'players', G.players.length, 'cities', S.World.cities.length, 'passes', S.World.passes.length);
const st = S.World.states.map(s => s.name + ':' + s.tiles + '/c' + s.cities.length).join(' ');
console.log(st);

// 推薦戰法資料：每位武將都有 2 個合法推薦
for (const h of S.HEROES) {
  const r = S.RECOMMEND[h.name];
  if (!r || r.skills.length < 2 || !r.why) throw new Error('recommend missing for ' + h.name);
  for (const id of r.skills) { const sk = S.SKILLS[id]; if (!sk || (sk.troops && !sk.troops.includes(h.troop))) throw new Error('bad recommend ' + h.name + ' ' + id); }
}
// 一鍵分解
{
  const u = S.Game.P[0];
  u.heroes.length = 0;
  const add = n => S.Game.addHero(u, S.HERO_BY_NAME[n].id);
  add('陳武'); add('陳武'); add('陳武'); add('吳懿'); add('卞喜'); add('典韋'); add('典韋'); add('呂布'); add('呂布');
  const keepIn = u.heroes[5]; keepIn.team = 0; // 一張典韋在隊中 → 另一張被分解
  const lowPlan = S.Game.bulkConvertPlan(u, 'low');
  if (lowPlan.list.length !== 5) throw new Error('low plan ' + lowPlan.list.length);
  const keepPlan = S.Game.bulkConvertPlan(u, 'keep1');
  if (keepPlan.list.length !== 3 || keepPlan.list.some(h => h.team >= 0)) throw new Error('keep plan ' + keepPlan.list.length);
  const skp0 = u.skp;
  const r = S.Game.bulkConvert(u, 'keep1');
  if (!r.ok || u.skp !== skp0 + r.pts || u.heroes.length !== 6) throw new Error('bulk convert');
  console.log('recommend + bulk convert OK');
}
