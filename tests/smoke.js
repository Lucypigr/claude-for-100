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

// 隊伍配置：儲存 → 換隊（體力不足時換上另一組）
{
  const G2 = S.Game.newGame({ seed: 4242, userName: '配置測試' });
  const u = G2.players[G2.userId];
  const add = n => S.Game.addHero(u, S.HERO_BY_NAME[n].id);
  u.heroes.length = 0; u.teams.forEach(t => { t.slots = [0, 0, 0]; });
  const a = ['趙雲', '黃月英', '甄姬'].map(add), b = ['關羽', '荀彧', '華佗'].map(add);
  u.b.command = Math.max(u.b.command || 1, 10);
  a.forEach((h, s) => S.Game.setSlot(u, 0, s, h.uid));
  const r1 = S.Game.savePreset(u, 0, 'A組');
  if (!r1.ok) throw new Error('save preset A: ' + r1.msg);
  // 用 B 組換入並存起來
  const rb = S.Game.applyPreset(u, 0, 0); if (!rb.ok) throw new Error('apply: ' + rb.msg);
  u.teams[0].slots.forEach(uid => { const h = S.Game.heroByUid(u, uid); if (h) h.team = -1; }); u.teams[0].slots = [0, 0, 0];
  b.forEach((h, s) => { const r = S.Game.setSlot(u, 0, s, h.uid); if (!r.ok) throw new Error('slot B: ' + r.msg); });
  if (!S.Game.savePreset(u, 0, 'B組').ok) throw new Error('save preset B');
  // 讓目前 B 組體力見底，A 組滿體力 → 換隊應換回 A
  b.forEach(h => { h.sta = 0; h.staT = S.Game.G.time; });
  const sw = S.Game.swapTired(u, 0);
  if (!sw.ok || sw.name !== 'A組') throw new Error('swapTired ' + JSON.stringify(sw));
  if (u.teams[0].slots.join() !== a.map(h => h.uid).join()) throw new Error('slots after swap');
  console.log('team presets + swapTired OK; wantedList', S.Game.wantedList().length);
}

// 天氣：決定性、行軍時間與屯田
{
  S.Weather.setSeed(999);
  const a = S.Weather.key('并州', 24 * 1440), b = S.Weather.key('并州', 24 * 1440);
  if (a !== b) throw new Error('weather not deterministic');
  const seen = new Set(); for (let t = 0; t < 30 * 1440; t += 360) for (const st of ['并州', '揚州', '涼州']) seen.add(S.Weather.key(st, t));
  if (seen.size < 5) throw new Error('weather too uniform ' + [...seen]);
  const snowT = (() => { for (let t = 24 * 1440; t < 30 * 1440; t += 360) if (S.Weather.key('并州', t) === 'snow') return t; return -1; })();
  if (snowT < 0) throw new Error('no snow in northern winter');
  const G3 = S.Game.newGame({ seed: 5150, userName: '天氣測試' });
  const u3 = G3.players[G3.userId];
  const tile = u3.lands[0] !== undefined ? u3.lands[0] : u3.cityTile;
  G3.time = snowT;
  const wxSt = S.World.states[S.Game.T.state[tile]].name;
  console.log('weather OK', S.Weather.at(wxSt, G3.time).name);
}
// 黃巾軍與榮譽兌換
{
  const G4 = S.Game.newGame({ seed: 777, userName: '黃巾測試' });
  const u4 = G4.players[G4.userId];
  G4.time = 1440 * 3;
  for (let k = 0; k < 400 && !(G4.yellow && Object.keys(G4.yellow.camps).length); k++) S.Game.tick();
  const n = G4.yellow ? Object.keys(G4.yellow.camps).length : 0;
  if (n < 1) throw new Error('no yellow camps spawned');
  const t0 = +Object.keys(G4.yellow.camps)[0];
  if (S.Game.effLvl(t0) !== Math.min(9, S.Game.T.lvl[t0] + 2)) throw new Error('camp level');
  u4.honor = 100;
  if (S.Game.exchangeHonor(u4, S.HERO_BY_NAME['呂布'].id).ok) throw new Error('should be too expensive');
  u4.honor = 5000;
  const before = u4.heroes.length, r = S.Game.exchangeHonor(u4, S.HERO_BY_NAME['呂布'].id);
  if (!r.ok || u4.heroes.length !== before + 1 || Math.round(u4.honor) !== 0) throw new Error('exchange failed ' + JSON.stringify(r));
  console.log('yellow camps + honor exchange OK (' + n + ' camps)');
}

// 卡池：百連保底 5 位五星、至尊卡池五抽全五星
{
  const G5 = S.Game.newGame({ seed: 61, userName: '抽卡測試' });
  const u5 = G5.players[G5.userId];
  u5.gold = 5000000;
  for (let k = 0; k < 40; k++) {
    const r = S.Game.drawPack(u5, 'gold100');
    if (!r.ok || r.heroes.length !== 100) throw new Error('gold100 draw');
    const n5 = r.heroes.filter(h => S.Game.tpl(h).star === 5).length;
    if (n5 < 5) throw new Error('pity broken ' + n5);
  }
  const e = S.Game.drawPack(u5, 'elite5');
  if (!e.ok || e.heroes.length !== 5 || e.heroes.some(h => S.Game.tpl(h).star !== 5)) throw new Error('elite5 not all 5 star');
  u5.gold = 9999;
  if (S.Game.drawPack(u5, 'elite5').ok) throw new Error('elite5 should need 10000');
  console.log('gacha pity + elite pool OK');
}
