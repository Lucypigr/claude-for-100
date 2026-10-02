'use strict';
const { load } = require('./load');
const { Game, CFG } = load();

function ok(v, m) { if (!v) throw new Error(m); }
function eq(a, b, m) { if (a !== b) throw new Error((m || 'not equal') + ': ' + a + ' vs ' + b); }

Game.newGame({ seed: 20261002, userName: '創盟測試', aiCount: 60 });
const p = Game.P[Game.G.userId];

ok(p.copper >= CFG.ALLIANCE_CREATE_COST.copper, '新開局銅幣不足以建立同盟');
const before = p.copper;
const result = Game.createAlliance(p, '測試盟');

ok(result.ok, '新開局建立同盟失敗: ' + (result.msg || 'unknown'));
eq(p.copper, before - CFG.ALLIANCE_CREATE_COST.copper, '建立同盟扣款錯誤');
eq(p.alliance, result.alliance.id, '玩家未加入自己建立的同盟');
ok(result.alliance.members.includes(p.id), '同盟成員名單缺少盟主');

console.log('Alliance creation OK: fresh game can create alliance and pay configured cost');
