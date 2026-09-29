// 戰法庫
// type: active(主動) / passive(被動) / command(指揮) / pursuit(追擊)
// fx 效果種類：
//   dmg  {t:'phys'|'int', rate, tgt}             造成兵刃/謀略傷害
//   heal {rate, tgt}                             治療
//   buff {stat, v|pct, tgt, dur}                 屬性提升；debuff 同理（對敵）
//   st   {st, tgt, dur, p, v}                    狀態：stun 震懾 / confuse 混亂 / silence 計窮 / disarm 繳械 / taunt 嘲諷
//                                               first 先攻 / double 連擊 / evade 規避 / insight 洞察 / burn 灼燒 / fear 恐慌
//                                               regen 休整 / dmgDealt 增傷 / dmgTaken 受傷 / counter 反擊
//   range {v}                                    攻擊距離
// tgt: self, a1, a2, aAll, aLow, e1, e2, e3, e23, eAll
'use strict';

var SKILLS = (function () {
  const L = [
    // ==== 武將自帶戰法（S 級）====
    { id: 'tianxiawushuang', name: '天下無雙', type: 'passive', q: 'S', fx: [{ k: 'buff', stat: 'atk', v: 45, tgt: 'self', dur: 99 }, { k: 'range', v: 2 }, { k: 'st', st: 'insight', tgt: 'self', dur: 99 }, { k: 'st', st: 'double', tgt: 'self', dur: 99, v: 0.35 }], desc: '自身攻擊提高45，攻擊距離+2，進入洞察狀態，普通攻擊有35%機率連擊' },
    { id: 'longdan', name: '龍膽', type: 'passive', q: 'S', fx: [{ k: 'st', st: 'evade', v: 0.3, tgt: 'self', dur: 99 }, { k: 'buff', stat: 'atk', pct: 0.18, tgt: 'self', dur: 99 }, { k: 'st', st: 'insight', tgt: 'self', dur: 99 }, { k: 'st', st: 'double', v: 0.3, tgt: 'self', dur: 99 }], desc: '30%機率規避傷害，攻擊提高18%，洞察，普攻30%機率連擊' },
    { id: 'weizhenhuaxia', name: '威震華夏', type: 'active', q: 'S', chance: 0.35, prep: 1, fx: [{ k: 'dmg', t: 'phys', rate: 1.5, tgt: 'eAll' }, { k: 'st', st: 'stun', tgt: 'eAll', dur: 1, p: 0.35 }], desc: '準備1回合，對敵軍全體造成兵刃攻擊(傷害率150%)，並有35%機率使其震懾1回合' },
    { id: 'yanrenpaoxiao', name: '燕人咆哮', type: 'active', q: 'S', chance: 0.35, prep: 1, fx: [{ k: 'dmg', t: 'phys', rate: 1.9, tgt: 'eAll' }], desc: '準備1回合，對敵軍全體造成兵刃攻擊(傷害率190%)' },
    { id: 'weiwuzhishi', name: '魏武之世', type: 'command', q: 'S', fx: [{ k: 'st', st: 'dmgTaken', v: -0.2, tgt: 'aAll', dur: 3 }, { k: 'buff', stat: 'atk', pct: 0.12, tgt: 'aAll', dur: 99 }, { k: 'buff', stat: 'int', pct: 0.12, tgt: 'aAll', dur: 99 }], desc: '戰鬥前3回合，我軍全體受到傷害降低20%；全體攻擊、謀略提高12%' },
    { id: 'yingshilanggu', name: '鷹視狼顧', type: 'command', q: 'S', fx: [{ k: 'buff', stat: 'int', pct: 0.3, tgt: 'self', dur: 99 }, { k: 'debuff', stat: 'int', pct: 0.15, tgt: 'eAll', dur: 4 }, { k: 'st', st: 'dmgDealt', v: 0.15, tgt: 'self', dur: 99 }], desc: '自身謀略提高30%，傷害提高15%；戰鬥前4回合敵軍全體謀略降低15%' },
    { id: 'jiuchiroulin', name: '酒池肉林', type: 'command', q: 'S', fx: [{ k: 'st', st: 'regen', v: 0.9, tgt: 'self', dur: 99 }, { k: 'debuff', stat: 'atk', pct: 0.12, tgt: 'eAll', dur: 99 }, { k: 'st', st: 'dmgTaken', v: -0.1, tgt: 'self', dur: 99 }], desc: '每回合恢復自身兵力(治療率90%)，敵軍全體攻擊降低12%，自身受到傷害降低10%' },
    { id: 'huoshaolianying', name: '火燒連營', type: 'active', q: 'S', chance: 0.35, prep: 0, fx: [{ k: 'dmg', t: 'int', rate: 1.05, tgt: 'eAll' }, { k: 'st', st: 'burn', tgt: 'eAll', dur: 2, v: 0.6 }], desc: '對敵軍全體造成謀略攻擊(傷害率105%)，並施加灼燒2回合' },
    { id: 'shenhuoji', name: '神火計', type: 'active', q: 'S', chance: 0.4, prep: 1, fx: [{ k: 'dmg', t: 'int', rate: 1.8, tgt: 'e2' }, { k: 'st', st: 'burn', tgt: 'e2', dur: 2, v: 0.8 }], desc: '準備1回合，對敵軍兩人造成謀略攻擊(傷害率180%)並灼燒2回合' },
    { id: 'caochuanjiejian', name: '草船借箭', type: 'command', q: 'S', fx: [{ k: 'st', st: 'dmgTaken', v: -0.28, tgt: 'aAll', dur: 3 }, { k: 'st', st: 'evade', v: 0.15, tgt: 'aAll', dur: 3 }, { k: 'buff', stat: 'int', pct: 0.1, tgt: 'aAll', dur: 99 }], desc: '前3回合我軍全體受到傷害降低28%並有15%機率規避；我軍謀略提高10%' },
    { id: 'rendezaishi', name: '仁德載世', type: 'active', q: 'S', chance: 0.5, prep: 0, fx: [{ k: 'heal', rate: 1.25, tgt: 'a2' }, { k: 'buff', stat: 'def', pct: 0.1, tgt: 'aAll', dur: 2 }], desc: '治療我軍兩人(治療率125%)，並使我軍全體防禦提高10%，持續2回合' },
    { id: 'zuoduandongnan', name: '坐斷東南', type: 'command', q: 'S', fx: [{ k: 'buff', stat: 'def', pct: 0.2, tgt: 'aAll', dur: 99 }, { k: 'buff', stat: 'int', pct: 0.15, tgt: 'aAll', dur: 99 }, { k: 'st', st: 'silence', tgt: 'e1', dur: 2 }], desc: '我軍全體防禦提高20%、謀略提高15%；戰鬥開始使敵軍單體計窮2回合' },
    { id: 'huangtiantaiping', name: '黃天泰平', type: 'active', q: 'S', chance: 0.4, prep: 1, fx: [{ k: 'dmg', t: 'int', rate: 1.3, tgt: 'eAll' }, { k: 'st', st: 'fear', tgt: 'eAll', dur: 2, v: 0.5, p: 0.5 }], desc: '準備1回合，對敵軍全體造成謀略攻擊(傷害率130%)，50%機率使其恐慌2回合' },
    { id: 'biyue', name: '閉月', type: 'active', q: 'S', chance: 0.45, prep: 0, fx: [{ k: 'st', st: 'confuse', tgt: 'e2', dur: 2 }, { k: 'dmg', t: 'int', rate: 0.8, tgt: 'e2' }], desc: '使敵軍兩人陷入混亂2回合，並造成謀略攻擊(傷害率80%)' },
    { id: 'baiyidujiang', name: '白衣渡江', type: 'active', q: 'S', chance: 0.35, prep: 1, fx: [{ k: 'dmg', t: 'int', rate: 1.6, tgt: 'eAll' }, { k: 'st', st: 'silence', tgt: 'eAll', dur: 1, p: 0.3 }], desc: '準備1回合，對敵軍全體造成謀略攻擊(傷害率160%)，30%機率計窮1回合' },
    { id: 'xiliangtieji', name: '西涼鐵騎', type: 'active', q: 'S', chance: 0.4, prep: 0, fx: [{ k: 'dmg', t: 'phys', rate: 1.45, tgt: 'e2' }, { k: 'debuff', stat: 'def', pct: 0.2, tgt: 'e2', dur: 2 }], troops: ['騎'], desc: '對敵軍兩人造成兵刃攻擊(傷害率145%)，並使其防禦降低20%，持續2回合' },
    { id: 'baibuchuanyang', name: '百步穿楊', type: 'active', q: 'S', chance: 0.35, prep: 0, fx: [{ k: 'dmg', t: 'phys', rate: 2.8, tgt: 'e1' }], desc: '對敵軍單體造成兵刃攻擊(傷害率280%)' },
    { id: 'lianhuanji', name: '連環計', type: 'active', q: 'S', chance: 0.4, prep: 1, fx: [{ k: 'dmg', t: 'int', rate: 1.0, tgt: 'eAll' }, { k: 'st', st: 'dmgTaken', v: 0.2, tgt: 'eAll', dur: 2 }], desc: '準備1回合，對敵軍全體造成謀略攻擊(傷害率100%)，並使其受到傷害提高20%，持續2回合' },
    { id: 'bashidanjing', name: '拔矢啖睛', type: 'passive', q: 'S', fx: [{ k: 'st', st: 'counter', v: 0.9, tgt: 'self', dur: 99 }, { k: 'st', st: 'regen', v: 0.4, tgt: 'self', dur: 99 }, { k: 'st', st: 'taunt', tgt: 'self', dur: 3 }], desc: '受到普通攻擊時反擊(傷害率90%)，每回合恢復兵力；前3回合嘲諷敵軍' },
    { id: 'luoyixuezhan', name: '裸衣血戰', type: 'passive', q: 'S', fx: [{ k: 'buff', stat: 'atk', pct: 0.45, tgt: 'self', dur: 99 }, { k: 'st', st: 'dmgTaken', v: 0.12, tgt: 'self', dur: 99 }, { k: 'st', st: 'double', v: 0.25, tgt: 'self', dur: 99 }], desc: '攻擊提高45%，受到傷害提高12%，普通攻擊25%機率連擊' },
    { id: 'guzhielai', name: '古之惡來', type: 'passive', q: 'S', fx: [{ k: 'st', st: 'taunt', tgt: 'self', dur: 99 }, { k: 'st', st: 'dmgTaken', v: -0.25, tgt: 'self', dur: 99 }, { k: 'st', st: 'counter', v: 0.7, tgt: 'self', dur: 99 }], desc: '持續嘲諷敵軍，自身受到傷害降低25%，受到普攻時反擊(傷害率70%)' },
    { id: 'weizhenxiaoyao', name: '威震逍遙', type: 'pursuit', q: 'S', chance: 0.4, fx: [{ k: 'dmg', t: 'phys', rate: 1.9, tgt: 'e1' }, { k: 'st', st: 'stun', tgt: 'e1', dur: 1, p: 0.5 }], desc: '普通攻擊後40%機率追擊(傷害率190%)，50%機率震懾1回合' },
    { id: 'jiangdongxiaobawang', name: '江東小霸王', type: 'active', q: 'S', chance: 0.4, prep: 0, fx: [{ k: 'dmg', t: 'phys', rate: 1.5, tgt: 'e2' }, { k: 'st', st: 'first', tgt: 'self', dur: 2 }], desc: '對敵軍兩人造成兵刃攻擊(傷害率150%)，自身獲得先攻2回合' },
    { id: 'jinfanbailing', name: '錦帆百翎', type: 'pursuit', q: 'S', chance: 0.45, fx: [{ k: 'dmg', t: 'phys', rate: 1.35, tgt: 'e2' }], desc: '普通攻擊後45%機率對敵軍兩人追擊(傷害率135%)' },
    { id: 'shenshe', name: '神射', type: 'pursuit', q: 'S', chance: 0.4, fx: [{ k: 'dmg', t: 'phys', rate: 2.3, tgt: 'e1' }], desc: '普通攻擊後40%機率追擊(傷害率230%)' },
    { id: 'xianzhenying', name: '陷陣營', type: 'command', q: 'S', fx: [{ k: 'st', st: 'dmgTaken', v: -0.15, tgt: 'aAll', dur: 99 }, { k: 'buff', stat: 'atk', pct: 0.15, tgt: 'aAll', dur: 99 }], troops: ['步'], desc: '我軍全體受到傷害降低15%，攻擊提高15%' },
    { id: 'baimayicong', name: '白馬義從', type: 'command', q: 'S', fx: [{ k: 'st', st: 'first', tgt: 'aAll', dur: 2 }, { k: 'buff', stat: 'spd', v: 30, tgt: 'aAll', dur: 99 }, { k: 'st', st: 'dmgDealt', v: 0.12, tgt: 'aAll', dur: 3 }], troops: ['騎'], desc: '前2回合我軍全體先攻；速度+30；前3回合傷害提高12%' },
    { id: 'qimendunjia', name: '奇門遁甲', type: 'active', q: 'S', chance: 0.45, prep: 0, fx: [{ k: 'st', st: 'evade', v: 0.5, tgt: 'a2', dur: 1 }, { k: 'dmg', t: 'int', rate: 1.1, tgt: 'e1' }, { k: 'st', st: 'insight', tgt: 'aAll', dur: 1 }], desc: '我軍兩人獲得50%規避1回合，全體洞察1回合，並對敵單體造成謀略攻擊(110%)' },
    { id: 'qingnang', name: '青囊', type: 'active', q: 'S', chance: 0.6, prep: 0, fx: [{ k: 'heal', rate: 1.1, tgt: 'a2' }], desc: '治療我軍兩人(治療率110%)' },
    { id: 'hujia', name: '胡笳餘音', type: 'active', q: 'S', chance: 0.45, prep: 0, fx: [{ k: 'heal', rate: 0.8, tgt: 'aAll' }, { k: 'dmg', t: 'int', rate: 0.7, tgt: 'e2' }], desc: '治療我軍全體(治療率80%)，並對敵軍兩人造成謀略攻擊(70%)' },
    { id: 'wangzuozhicai', name: '王佐之才', type: 'active', q: 'S', chance: 0.5, prep: 0, fx: [{ k: 'heal', rate: 1.0, tgt: 'aLow' }, { k: 'buff', stat: 'int', pct: 0.2, tgt: 'aAll', dur: 2 }], desc: '治療兵力最低的友軍(治療率100%)，並使我軍謀略提高20%，持續2回合' },
    { id: 'luanwu', name: '亂武', type: 'active', q: 'S', chance: 0.35, prep: 0, fx: [{ k: 'dmg', t: 'int', rate: 1.05, tgt: 'eAll' }, { k: 'st', st: 'confuse', tgt: 'eAll', dur: 1, p: 0.3 }], desc: '對敵軍全體造成謀略攻擊(105%)，30%機率使其混亂1回合' },
    { id: 'shimianmaifu', name: '十面埋伏', type: 'active', q: 'S', chance: 0.4, prep: 1, fx: [{ k: 'dmg', t: 'int', rate: 1.35, tgt: 'eAll' }, { k: 'st', st: 'silence', tgt: 'eAll', dur: 2, p: 0.35 }], desc: '準備1回合，對敵軍全體造成謀略攻擊(135%)，35%機率計窮2回合' },
    { id: 'guose', name: '國色', type: 'active', q: 'S', chance: 0.45, prep: 0, fx: [{ k: 'st', st: 'disarm', tgt: 'e2', dur: 1 }, { k: 'heal', rate: 0.8, tgt: 'a2' }], desc: '使敵軍兩人繳械1回合，並治療我軍兩人(80%)' },
    { id: 'tianxiang', name: '天香', type: 'active', q: 'S', chance: 0.45, prep: 0, fx: [{ k: 'dmg', t: 'int', rate: 1.2, tgt: 'e2' }, { k: 'st', st: 'confuse', tgt: 'e1', dur: 1 }], desc: '對敵軍兩人造成謀略攻擊(120%)，並使敵單體混亂1回合' },
    { id: 'gongyaoji', name: '弓腰姬', type: 'passive', q: 'S', fx: [{ k: 'st', st: 'double', v: 1, tgt: 'self', dur: 99 }, { k: 'buff', stat: 'atk', pct: 0.1, tgt: 'self', dur: 99 }], troops: ['弓'], desc: '普通攻擊必定連擊，攻擊提高10%' },
    { id: 'wenwushuangquan', name: '文武雙全', type: 'active', q: 'S', chance: 0.4, prep: 0, fx: [{ k: 'dmg', t: 'phys', rate: 1.2, tgt: 'e1' }, { k: 'dmg', t: 'int', rate: 1.2, tgt: 'e1' }], desc: '對敵單體造成兵刃攻擊(120%)與謀略攻擊(120%)' },
    { id: 'bingwuchangshi', name: '兵無常勢', type: 'command', q: 'S', fx: [{ k: 'st', st: 'dmgDealt', v: 0.18, tgt: 'aAll', dur: 99 }, { k: 'debuff', stat: 'spd', v: 25, tgt: 'eAll', dur: 99 }], desc: '我軍全體造成傷害提高18%，敵軍全體速度降低25' },
    { id: 'zouma', name: '走馬薦諸葛', type: 'active', q: 'A', chance: 0.45, prep: 0, fx: [{ k: 'buff', stat: 'int', pct: 0.25, tgt: 'a2', dur: 2 }, { k: 'dmg', t: 'int', rate: 1.0, tgt: 'e1' }], desc: '我軍兩人謀略提高25%，持續2回合，並對敵造成謀略攻擊(100%)' },
    { id: 'ziwuguqimou', name: '子午谷奇謀', type: 'active', q: 'A', chance: 0.35, prep: 0, fx: [{ k: 'dmg', t: 'phys', rate: 1.8, tgt: 'e1' }, { k: 'st', st: 'first', tgt: 'self', dur: 1 }], desc: '對敵單體造成兵刃攻擊(180%)，並先攻1回合' },
    { id: 'qixie', name: '奇械巧工', type: 'command', q: 'A', fx: [{ k: 'buff', stat: 'def', pct: 0.25, tgt: 'aAll', dur: 99 }, { k: 'st', st: 'dmgTaken', v: -0.1, tgt: 'aAll', dur: 99 }], desc: '我軍全體防禦提高25%，受到傷害降低10%' },
    { id: 'hebeiwangzu', name: '河北望族', type: 'command', q: 'A', fx: [{ k: 'st', st: 'dmgDealt', v: 0.12, tgt: 'aAll', dur: 99 }, { k: 'buff', stat: 'atk', v: 20, tgt: 'aAll', dur: 99 }], troops: ['弓'], desc: '我軍全體傷害提高12%，攻擊+20' },
    { id: 'kurouji', name: '苦肉計', type: 'active', q: 'A', chance: 0.4, prep: 0, fx: [{ k: 'dmg', t: 'int', rate: 1.4, tgt: 'e2' }, { k: 'st', st: 'burn', tgt: 'e2', dur: 2, v: 0.5 }], desc: '對敵軍兩人造成謀略攻擊(140%)並灼燒2回合' },
    { id: 'fenshenjiuzhu', name: '奮身救主', type: 'passive', q: 'A', fx: [{ k: 'st', st: 'taunt', tgt: 'self', dur: 99 }, { k: 'buff', stat: 'def', pct: 0.35, tgt: 'self', dur: 99 }, { k: 'st', st: 'regen', v: 0.35, tgt: 'self', dur: 99 }], desc: '持續嘲諷，防禦提高35%，每回合恢復兵力' },
    { id: 'tashangce', name: '榻上策', type: 'command', q: 'A', fx: [{ k: 'buff', stat: 'int', pct: 0.2, tgt: 'aAll', dur: 99 }, { k: 'st', st: 'dmgTaken', v: -0.12, tgt: 'aAll', dur: 2 }], desc: '我軍全體謀略提高20%；前2回合受到傷害降低12%' },
    { id: 'jiuzhong', name: '剛烈不屈', type: 'passive', q: 'A', fx: [{ k: 'buff', stat: 'def', pct: 0.3, tgt: 'self', dur: 99 }, { k: 'st', st: 'counter', v: 0.8, tgt: 'self', dur: 99 }], desc: '防禦提高30%，受到普攻時反擊(80%)' },
    { id: 'tiebiwangu', name: '鐵壁固守', type: 'command', q: 'A', fx: [{ k: 'st', st: 'dmgTaken', v: -0.18, tgt: 'aAll', dur: 4 }], desc: '前4回合我軍全體受到傷害降低18%' },
    { id: 'nanmanwang', name: '南蠻渠魁', type: 'passive', q: 'A', fx: [{ k: 'st', st: 'regen', v: 0.6, tgt: 'self', dur: 99 }, { k: 'buff', stat: 'atk', pct: 0.2, tgt: 'self', dur: 99 }], desc: '每回合恢復兵力(60%)，攻擊提高20%' },
    { id: 'huoshen', name: '火神英風', type: 'active', q: 'A', chance: 0.4, prep: 0, fx: [{ k: 'dmg', t: 'phys', rate: 1.2, tgt: 'e23' }, { k: 'st', st: 'burn', tgt: 'e23', dur: 1, v: 0.5 }], desc: '對敵軍2-3人造成兵刃攻擊(120%)並灼燒1回合' },
    { id: 'jinguoyingxiong', name: '巾幗英雄', type: 'pursuit', q: 'A', chance: 0.5, fx: [{ k: 'dmg', t: 'phys', rate: 1.4, tgt: 'e1' }, { k: 'debuff', stat: 'atk', pct: 0.15, tgt: 'e1', dur: 2 }], desc: '普攻後50%機率追擊(140%)並降低目標攻擊15%' },
    { id: 'shibubenxin', name: '暗箭難防', type: 'pursuit', q: 'A', chance: 0.4, fx: [{ k: 'dmg', t: 'phys', rate: 1.7, tgt: 'e1' }, { k: 'st', st: 'disarm', tgt: 'e1', dur: 1, p: 0.4 }], desc: '普攻後40%機率追擊(170%)，40%機率繳械1回合' },
    { id: 'huangjinlishi', name: '黃巾力士', type: 'passive', q: 'A', fx: [{ k: 'buff', stat: 'atk', pct: 0.2, tgt: 'self', dur: 99 }, { k: 'buff', stat: 'def', pct: 0.2, tgt: 'self', dur: 99 }], desc: '攻擊、防禦提高20%' },
    { id: 'hanshiweiwang', name: '漢室威望', type: 'command', q: 'A', fx: [{ k: 'buff', stat: 'atk', pct: 0.1, tgt: 'aAll', dur: 99 }, { k: 'buff', stat: 'def', pct: 0.1, tgt: 'aAll', dur: 99 }, { k: 'buff', stat: 'int', pct: 0.1, tgt: 'aAll', dur: 99 }], desc: '我軍全體攻擊、防禦、謀略提高10%' },
    { id: 'shisanhuan', name: '雷霆萬鈞', type: 'active', q: 'A', chance: 0.35, prep: 1, fx: [{ k: 'dmg', t: 'int', rate: 1.2, tgt: 'eAll' }, { k: 'st', st: 'stun', tgt: 'e1', dur: 1, p: 0.5 }], desc: '準備1回合，對敵軍全體造成謀略攻擊(120%)，50%機率震懾單體1回合' },
    { id: 'poqianjun', name: '橫掃千軍', type: 'active', q: 'A', chance: 0.35, prep: 0, fx: [{ k: 'dmg', t: 'phys', rate: 1.0, tgt: 'eAll' }], desc: '對敵軍全體造成兵刃攻擊(100%)' },
    { id: 'huchi', name: '虎痴', type: 'passive', q: 'A', fx: [{ k: 'buff', stat: 'atk', pct: 0.25, tgt: 'self', dur: 99 }, { k: 'st', st: 'insight', tgt: 'self', dur: 99 }], desc: '攻擊提高25%，洞察(免疫控制)' },
    { id: 'shoucheng', name: '坐守孤城', type: 'command', q: 'A', fx: [{ k: 'st', st: 'dmgTaken', v: -0.3, tgt: 'self', dur: 99 }, { k: 'st', st: 'taunt', tgt: 'self', dur: 2 }], desc: '自身受到傷害降低30%，前2回合嘲諷' },

    // ==== 通用戰法（可學習）====
    { id: 'tuji', name: '突擊', type: 'pursuit', q: 'B', chance: 0.35, fx: [{ k: 'dmg', t: 'phys', rate: 1.8, tgt: 'e1' }], desc: '普攻後35%機率追擊(180%)' },
    { id: 'chongfeng', name: '衝鋒', type: 'pursuit', q: 'B', chance: 0.45, fx: [{ k: 'dmg', t: 'phys', rate: 1.3, tgt: 'e1' }], troops: ['騎'], desc: '普攻後45%機率追擊(130%)' },
    { id: 'huogong', name: '火攻', type: 'active', q: 'B', chance: 0.4, prep: 0, fx: [{ k: 'dmg', t: 'int', rate: 1.3, tgt: 'e1' }, { k: 'st', st: 'burn', tgt: 'e1', dur: 2, v: 0.5 }], desc: '對敵單體造成謀略攻擊(130%)並灼燒2回合' },
    { id: 'luanji', name: '亂擊', type: 'active', q: 'B', chance: 0.35, prep: 0, fx: [{ k: 'dmg', t: 'phys', rate: 1.0, tgt: 'e23' }], desc: '對敵軍2-3人造成兵刃攻擊(100%)' },
    { id: 'jijiu', name: '急救', type: 'active', q: 'B', chance: 0.45, prep: 0, fx: [{ k: 'heal', rate: 1.0, tgt: 'self' }], desc: '治療自身(治療率100%)' },
    { id: 'jianshou', name: '堅守', type: 'command', q: 'B', fx: [{ k: 'st', st: 'dmgTaken', v: -0.22, tgt: 'self', dur: 99 }], desc: '自身受到傷害降低22%' },
    { id: 'yuanhu', name: '援護', type: 'active', q: 'B', chance: 0.4, prep: 0, fx: [{ k: 'st', st: 'taunt', tgt: 'self', dur: 2 }, { k: 'buff', stat: 'def', pct: 0.2, tgt: 'self', dur: 2 }], desc: '嘲諷敵軍並提高自身防禦20%，持續2回合' },
    { id: 'fenzhan', name: '奮戰', type: 'passive', q: 'B', fx: [{ k: 'buff', stat: 'atk', pct: 0.18, tgt: 'self', dur: 99 }], desc: '自身攻擊提高18%' },
    { id: 'guwu', name: '鼓舞', type: 'command', q: 'B', fx: [{ k: 'buff', stat: 'atk', pct: 0.1, tgt: 'aAll', dur: 99 }], desc: '我軍全體攻擊提高10%' },
    { id: 'mouzhi', name: '運籌帷幄', type: 'command', q: 'B', fx: [{ k: 'buff', stat: 'int', pct: 0.12, tgt: 'aAll', dur: 99 }], desc: '我軍全體謀略提高12%' },
    { id: 'shensu', name: '神速', type: 'passive', q: 'B', fx: [{ k: 'buff', stat: 'spd', v: 40, tgt: 'self', dur: 99 }], desc: '自身速度+40' },
    { id: 'lianji', name: '連擊', type: 'passive', q: 'A', fx: [{ k: 'st', st: 'double', v: 1, tgt: 'self', dur: 99 }], desc: '普通攻擊必定連擊' },
    { id: 'zanbiqifeng', name: '暫避其鋒', type: 'command', q: 'A', fx: [{ k: 'debuff', stat: 'atk', pct: 0.2, tgt: 'eAll', dur: 2 }, { k: 'debuff', stat: 'int', pct: 0.2, tgt: 'eAll', dur: 2 }], desc: '前2回合敵軍全體攻擊、謀略降低20%' },
    { id: 'tiaoxin', name: '挑釁', type: 'active', q: 'B', chance: 0.5, prep: 0, fx: [{ k: 'st', st: 'taunt', tgt: 'self', dur: 1 }], desc: '嘲諷敵軍1回合' },
    { id: 'zhenshe', name: '震懾', type: 'active', q: 'A', chance: 0.3, prep: 0, fx: [{ k: 'st', st: 'stun', tgt: 'e1', dur: 1 }], desc: '使敵單體震懾1回合' },
    { id: 'jiqiong', name: '計窮', type: 'active', q: 'B', chance: 0.35, prep: 0, fx: [{ k: 'st', st: 'silence', tgt: 'e2', dur: 1 }], desc: '使敵軍兩人計窮1回合' },
    { id: 'jiaoxie', name: '繳械', type: 'active', q: 'B', chance: 0.35, prep: 0, fx: [{ k: 'st', st: 'disarm', tgt: 'e2', dur: 1 }], desc: '使敵軍兩人繳械1回合' },
    { id: 'kongluan', name: '恐慌', type: 'active', q: 'B', chance: 0.45, prep: 0, fx: [{ k: 'st', st: 'fear', tgt: 'e2', dur: 2, v: 0.7 }], desc: '使敵軍兩人恐慌2回合(每回合謀略傷害70%)' },
    { id: 'xiuzheng', name: '休整', type: 'command', q: 'B', fx: [{ k: 'st', st: 'regen', v: 0.5, tgt: 'self', dur: 99 }], desc: '每回合恢復自身兵力(50%)' },
    { id: 'dongcha', name: '洞察', type: 'passive', q: 'B', fx: [{ k: 'st', st: 'insight', tgt: 'self', dur: 99 }], desc: '免疫震懾、混亂、計窮、繳械' },
    { id: 'xiangong', name: '先攻', type: 'passive', q: 'B', fx: [{ k: 'st', st: 'first', tgt: 'self', dur: 99 }], desc: '戰鬥中始終先攻' },
    { id: 'pozhencuijian', name: '破陣摧堅', type: 'active', q: 'A', chance: 0.4, prep: 1, fx: [{ k: 'dmg', t: 'phys', rate: 1.35, tgt: 'eAll' }, { k: 'debuff', stat: 'def', pct: 0.25, tgt: 'eAll', dur: 2 }], desc: '準備1回合，對敵軍全體造成兵刃攻擊(135%)並使其防禦降低25%' },
    { id: 'guagu', name: '刮骨療毒', type: 'active', q: 'A', chance: 0.4, prep: 0, fx: [{ k: 'heal', rate: 1.6, tgt: 'aLow' }], desc: '治療兵力最低的友軍(治療率160%)' },
    { id: 'jijianfang', name: '箭陣', type: 'active', q: 'B', chance: 0.35, prep: 0, fx: [{ k: 'dmg', t: 'phys', rate: 1.2, tgt: 'e2' }], troops: ['弓'], desc: '對敵軍兩人造成兵刃攻擊(120%)' },
    { id: 'jushou', name: '拒守', type: 'passive', q: 'B', fx: [{ k: 'buff', stat: 'def', pct: 0.22, tgt: 'self', dur: 99 }], troops: ['步'], desc: '自身防禦提高22%' },
    { id: 'jiqu', name: '疾驅', type: 'passive', q: 'B', fx: [{ k: 'buff', stat: 'spd', v: 25, tgt: 'self', dur: 99 }, { k: 'buff', stat: 'atk', pct: 0.08, tgt: 'self', dur: 99 }], troops: ['騎'], desc: '速度+25，攻擊提高8%' },
    { id: 'naojiu', name: '搦戰', type: 'active', q: 'B', chance: 0.3, prep: 0, fx: [{ k: 'dmg', t: 'phys', rate: 1.6, tgt: 'e1' }], desc: '對敵單體造成兵刃攻擊(160%)' },
    { id: 'ansha', name: '謀定後動', type: 'active', q: 'B', chance: 0.3, prep: 1, fx: [{ k: 'dmg', t: 'int', rate: 2.0, tgt: 'e1' }], desc: '準備1回合，對敵單體造成謀略攻擊(200%)' },
  ];
  const M = {};
  for (const s of L) M[s.id] = s;
  M._list = L;
  return M;
})();

// 戰法品質數值（AI 評估用）
var SKILL_VALUE = { S: 3, A: 2, B: 1 };

// 初始即擁有、可學習的通用戰法
var BASIC_SKILLS = ['tuji', 'huogong', 'jijiu', 'jianshou', 'fenzhan', 'guwu'];
