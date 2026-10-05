'use strict';
// 劫掠客：無頭模擬 N 天，輸出劫掠客人數、同盟、受害、通緝與討伐、前線據點
const { load } = require('./load');
const S = load();
const days = +(process.argv[2] || 12);
const seed = +(process.argv[3] || 31);
const G = S.Game.newGame({ seed, userName: '測試主公' });
const P = G.players;
const rid = P.filter(p => p.ai && p.prof.persona === 'raider');
console.log('AI', P.filter(p => p.ai).length, '劫掠客', rid.length, '(' + (rid.length / P.filter(p => p.ai).length * 100).toFixed(1) + '%)',
  '類型', JSON.stringify(rid.reduce((o, p) => (o[p.prof.type] = (o[p.prof.type] || 0) + 1, o), {})));
if (rid.length < 3) throw new Error('raider quota too small');
for (let d = 1; d <= days; d++) {
  for (let k = 0; k < 1440; k++) { S.Game.tick(); if (G.over) break; }
  if (d % 3 === 0 || d === days) {
    const al = G.alliances.filter(a => !a.dead && a.raid);
    const ms = rid.map(p => p.aiMem && p.aiMem.raid).filter(Boolean);
    const lands = rid.reduce((s, p) => s + p.landCount, 0) / rid.length;
    const flagged = rid.filter(p => p.title === '劫掠客').length;
    const hunts = (G.hunts || []);
    const forts = P.filter(p => p.ai).reduce((s, p) => s + p.forts.filter(id => !S.World.cities[id].dead).length, 0);
    console.log('day', d, '劫掠同盟', al.map(a => a.name + '(' + a.members.length + ',城' + a.cities.length + ')').join(' ') || '-',
      '| 受害者', ms.reduce((s, r) => s + Object.keys(r.vic).length, 0), '攻陷', ms.reduce((s, r) => s + r.caps, 0), '佔關', ms.reduce((s, r) => s + r.passes, 0),
      '| 被通緝', flagged, '討伐令', hunts.length, '(進行中' + hunts.filter(h => !h.over).length + ')', '| 劫掠客平均領地', lands.toFixed(0), '| 前線據點數', forts);
  }
}
const sys = G.chat.world.filter(m => m.sys && /通緝|討伐/.test(m.text)).slice(-6).map(m => m.text);
console.log(sys.join('\n'));
const talk = G.chat.world.filter(m => !m.sys && /劫掠客/.test(m.text)).slice(-5).map(m => m.name + ': ' + m.text);
console.log(talk.join('\n'));
