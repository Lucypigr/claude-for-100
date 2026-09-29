'use strict';
const { load } = require('./load');
const S = load();
const t0 = Date.now();
// 檢查資料完整性
for (const h of S.HEROES) if (!S.SKILLS[h.skill]) throw new Error('missing skill ' + h.skill + ' for ' + h.name);
const G = S.Game.newGame({ seed: 12345, userName: '測試主公' });
console.log('newGame ms', Date.now() - t0, 'players', G.players.length, 'cities', S.World.cities.length, 'passes', S.World.passes.length);
const st = S.World.states.map(s => s.name + ':' + s.tiles + '/c' + s.cities.length).join(' ');
console.log(st);
