const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

function environment(saved) {
  const elements = new Map();
  const node = (id = '') => {
    const classes = new Set();
    return { id, innerHTML: '', textContent: '', disabled: false, dataset: {}, style: { setProperty() {} },
      classList: { add: (...xs) => xs.forEach(x => classes.add(x)), remove: (...xs) => xs.forEach(x => classes.delete(x)), contains: x => classes.has(x), toggle(x, force) { const on = force ?? !classes.has(x); on ? classes.add(x) : classes.delete(x); return on; } },
      addEventListener() {}, appendChild() {}, setAttribute() {} };
  };
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const match of html.matchAll(/<[^>]*\bid="([^"]+)"[^>]*>/g)) {
    const el = node(match[1]);
    if (match[0].includes('hidden')) el.classList.add('hidden');
    elements.set(match[1], el);
  }
  const storage = new Map(saved ? [['MEME_BRAWL_SAVE_V2', JSON.stringify(saved)]] : []);
  const frames = new Set();
  let nextFrame = 0;
  const context = vm.createContext({ console, performance, setTimeout, clearTimeout, CustomEvent: class {}, Image: class {},
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    document: { getElementById: id => elements.get(id) || null, createElement: () => node() },
    requestAnimationFrame: () => { frames.add(++nextFrame); return nextFrame; },
    cancelAnimationFrame: id => frames.delete(id), dispatchEvent() {},
    memeAudio: new Proxy({}, { get: () => () => {} })
  });
  context.window = context;
  for (const file of ['config', 'data', 'effects', 'finale-audio', 'finale', 'battle', 'simulation', 'scenarios', 'stories/delivery', 'stories/bait', 'stories/billing', 'stories/audition', 'stories/lag']) vm.runInContext(fs.readFileSync(path.join(root, `js/${file}.js`), 'utf8'), context, { filename: `${file}.js` });
  const engine = (headless = true) => {
    const e = new context.BattleEngine({ width: 960, height: 540, getContext: () => null }, { headless, random: context.GameRandom.seeded(42) });
    e.startMatch('dayun', [], { p2HeroId: 'dayun', p2Perks: [] });
    return e;
  };
  return { context, storage, elements, frames, engine, perk: id => context.MEME_DATA.perks.find(p => p.id === id) };
}
const plain = value => JSON.parse(JSON.stringify(value));

function directorHarness() {
  const env = environment();
  env.context.addEventListener = () => {};
  vm.runInContext(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8'), env.context);
  const controller = {
    engine: env.engine(), store: env.context.gameStore,
    notice(message) { this.lastNotice = message; }, refreshTopBar() {}
  };
  const run = vm.runInContext('AppController.prototype.runDirectorScript', env.context);
  return { ...env, controller, run: key => run.call(controller, key) };
}

test('导演剧情刷新技能、设置残血、强制碰撞及横屏四路车队', () => {
  const { controller, run } = directorHarness();
  const e = controller.engine;
  assert.equal(run('q'), true);
  assert.equal(e.p1.hp, 1);
  assert.ok(e.p1.immortalTimer >= 3.5);
  assert.ok(e.p1.activeSlots.every(slot => slot.isUlt || slot.cdLeft === 0));
  assert.equal(e.p1.ultimateEnergy, e.getCombatConfig().ultimate.maxEnergy);
  assert.equal(run('w'), true);
  assert.equal(e.p2.hp, 1);
  assert.equal(run('e'), true);
  assert.ok(Math.hypot(e.p1.x - e.p2.x, e.p1.y - e.p2.y) < e.p1.radius + e.p2.radius);
  assert.equal(run('r'), true);
  assert.equal(e.summons.length, 4);
  for (const truck of e.summons) {
    assert.ok(truck.y - truck.h / 2 >= e.arena.y);
    assert.ok(truck.y + truck.h / 2 <= e.arena.y + e.arena.h);
  }
});

test('导演剧情在暂停和结束时不改对局，调试资源仍可保存', () => {
  const { controller, run, storage } = directorHarness();
  const e = controller.engine;
  const hp = e.p1.hp;
  e.setPaused(true);
  assert.equal(run('q'), false);
  assert.equal(e.p1.hp, hp);
  e.stop();
  assert.equal(run('r'), false);
  assert.equal(e.summons.length, 0);
  const tickets = controller.store.state.tickets;
  const coins = controller.store.state.pityCoins;
  assert.equal(run('t'), true);
  const saved = JSON.parse(storage.get('MEME_BRAWL_SAVE_V2'));
  assert.equal(saved.tickets, tickets + 50);
  assert.equal(saved.pityCoins, coins + 500);
});

test('卡池概率总和为100且所有档位都有可抽项目', () => {
  const { context: c } = environment();
  assert.equal(c.GAME_CONFIG.gacha.reduce((sum, b) => sum + b.weight, 0), 100);
  for (const b of c.GAME_CONFIG.gacha) assert.ok(c.gameStore.getAllPoolItems().some(i => i.rarity === b.rarity && (!b.poolType || i.poolType === b.poolType)));
});

test('重复卡选择跨刷新保存，确认结算不可重放', () => {
  const { context: c } = environment();
  vm.runInContext('Math.random = () => 0.1', c);
  c.gameStore.state.tickets -= 10;
  const pulls = c.gameStore.rollMixedPool(10);
  pulls.forEach(p => { p.chosenAction = 'convert'; });
  c.gameStore.save();
  vm.runInContext('window.reloaded = new GameStore()', c);
  assert.equal(c.reloaded.state.pendingPulls.length, 10);
  assert.equal(c.reloaded.state.tickets, 30);
  const before = c.reloaded.state.pityCoins;
  const result = c.reloaded.applyDupeDecisions(c.reloaded.state.pendingPulls);
  assert.equal(c.reloaded.state.pityCoins, before + result.gainedCoins);
  c.reloaded.applyDupeDecisions(pulls);
  assert.equal(c.reloaded.state.pityCoins, before + result.gainedCoins);
  assert.equal(c.reloaded.state.pendingPulls.length, 0);
});

test('十连低稀有度序列会触发SSR以上保底', () => {
  const { context: c } = environment();
  vm.runInContext('Math.random = () => 0.99', c);
  const pulls = c.gameStore.rollMixedPool(10);
  assert.equal(pulls.slice(0, 9).every(p => p.item.rarity === 'R'), true);
  assert.ok(['SSR', 'UR'].includes(pulls[9].item.rarity));
});

test('旧存档补齐配装、设置并修复非法数值', () => {
  const { context: c } = environment({ equippedNormal: { dayun: 'missing' }, tickets: -10, skillLevels: { dy_s1: -1 } });
  assert.equal(c.gameStore.state.equippedNormal.dayun, 'dy_s1');
  assert.equal(c.gameStore.state.equippedNormal.hajimi, 'hj_s1');
  assert.equal(c.gameStore.state.tickets, 0);
  assert.equal(c.gameStore.state.skillLevels.dy_s1, 1);
  assert.equal(c.gameStore.state.settings.volume, 0.65);
});

test('重开仅保留一个动画请求，清除旧大招和计时', () => {
  const { engine, frames, elements, context } = environment();
  const e = engine(false);
  e.castActiveSlot(e.p1, e.p2, 1, false, false); // 能量未满，不应消耗。
  e.p1.ultimateEnergy = context.GAME_CONFIG.combat.ultimate.maxEnergy;
  e.castActiveSlot(e.p1, e.p2, 1, false, false);
  e.startMatch('hajimi', []);
  assert.equal(frames.size, 1);
  assert.equal(e.pendingUltimate, null);
  assert.equal(elements.get('ultimate-cutin-overlay').classList.contains('hidden'), true);
  e.stop('draft');
  const elapsed = e.elapsed;
  e.update(1, false);
  assert.equal(e.elapsed, elapsed);
  assert.equal(frames.size, 0);
});

test('暂停和时停均禁止施法且不消耗冷却', () => {
  const { engine } = environment();
  const e = engine();
  e.p1.activeSlots[0].cdLeft = 0;
  e.setPaused(true);
  assert.equal(e.castActiveSlot(e.p1, e.p2, 0, true, true), false);
  assert.equal(e.p1.activeSlots[0].cdLeft, 0);
  e.setPaused(false);
  e.timeStopTimer = 1; e.timeStopOwner = e.p2;
  assert.equal(e.castActiveSlot(e.p1, e.p2, 0, true, true), false);
});

test('已有大招前摇时不能绕过前摇释放另一技能', () => {
  const { engine, context } = environment();
  const e = engine();
  e.p1.ultimateEnergy = context.GAME_CONFIG.combat.ultimate.maxEnergy;
  assert.equal(e.castActiveSlot(e.p1, e.p2, 1, false, true), true);
  e.p2.activeSlots[0].cdLeft = 0;
  const hp = e.p1.hp;
  assert.equal(e.castActiveSlot(e.p2, e.p1, 0, false, true), false);
  assert.equal(e.p2.activeSlots[0].cdLeft, 0);
  assert.equal(e.p1.hp, hp);
});

test('成功闪避后下一次大招重新显示按钮，暂停不能闪避', () => {
  const { engine, elements, context } = environment();
  const e = engine(false);
  e.p2.ultSkill = e.p1.ultSkill;
  e.p2.ultimateEnergy = context.GAME_CONFIG.combat.ultimate.maxEnergy;
  const slot = e.p1.activeSlots[1];
  e.startUltimateCutin(e.p2, e.p1, slot);
  e.updateUltimateCutin(1, false);
  e.setPaused(true);
  assert.equal(e.triggerUltimateDodge(), false);
  e.setPaused(false);
  assert.equal(e.triggerUltimateDodge(), true);
  e.resolveUltimateCutin(false);
  e.p2.ultimateEnergy = context.GAME_CONFIG.combat.ultimate.maxEnergy;
  e.startUltimateCutin(e.p2, e.p1, slot);
  assert.equal(elements.get('ultimate-dodge-btn').classList.contains('hidden'), false);
});

test('闪避保护期间不会受到普通伤害', () => {
  const { engine } = environment();
  const e = engine(); e.p1.isDodging = true; e.p1.dodgeTimer = 1;
  const hp = e.p1.hp;
  assert.equal(e.applyDamage(e.p2, e.p1, 100, '', false, true), 0);
  assert.equal(e.p1.hp, hp);
});

test('收集者处决不能穿透锁血，免死首次触发恢复半血', () => {
  const { engine, perk } = environment();
  const e = engine(); e.p2.perks = [perk('pk_asn_5')];
  e.p1.hp = 1; e.p1.immortalTimer = 3;
  e.applyDamage(e.p2, e.p1, 10, '', false, true);
  assert.equal(e.p1.hp, 1);
  e.p1.immortalTimer = 0; e.p1.perks = [perk('pk_vmp_3')];
  e.applyDamage(e.p2, e.p1, 100, '', false, true);
  assert.ok(e.p1.hp >= e.p1.maxHp * 0.5);
  assert.equal(e.p1.pddImmortalUsed, true);
});

test('同一个弹反窗口只能结算一次', () => {
  const { engine } = environment(); const e = engine(false); e.qteTimer = 1;
  e.triggerManualQTE(); const hp = e.p2.hp;
  e.triggerManualQTE();
  assert.equal(e.p2.hp, hp); assert.equal(e.manualPerfectCount, 1);
});

test('反甲双向触发可终止，死亡角色不能被普通治疗复活', () => {
  const { engine, perk } = environment(); const e = engine();
  e.p1.perks = e.p2.perks = [perk('pk_col_5')];
  e.random = () => 0.9;
  const hp = e.p1.hp; e.applyDamage(e.p1, e.p2, 100, '', false, true);
  assert.ok(e.p1.hp < hp && e.p2.hp < hp);
  e.p2.hp = 0; e.applyHeal(e.p2, 100, '', true); assert.equal(e.p2.hp, 0);
});

test('卢登追加弹幕，镜像重放不递归复制、不再次扣冷却', () => {
  const { engine, perk } = environment(); const e = engine();
  e.p1.perks = [perk('pk_mag_3'), perk('pk_mag_4')]; e.random = () => 0.2;
  e.p1.activeSlots[0].cdLeft = 0; e.castActiveSlot(e.p1, e.p2, 0, false, true);
  assert.equal(e.projectiles.length, 4); assert.equal(e.queuedCasts.length, 1);
  const count = e.p1.castCount;
  e.castActiveSlot(e.p1, e.p2, 0, false, true, true);
  assert.equal(e.queuedCasts.length, 1); assert.equal(e.p1.castCount, count);
});

test('洗衣机旋转、快乐水护盾和扫堂腿架势生效', () => {
  const { engine, perk } = environment(); const e = engine();
  for (const id of ['pk_mag_5', 'pk_vmp_5', 'pk_sifu_2']) {
    e.startMatch('dayun', [perk(id)], { p2HeroId: 'dayun', p2Perks: [] });
    e.p1.x = 250; e.p2.x = 300; e.p1.y = e.p2.y = 200;
    e.p1.hp = 1000; e.p1.activeSlots[2].cdLeft = 0;
    e.castActiveSlot(e.p1, e.p2, 2, true, true);
    if (id === 'pk_mag_5') assert.equal(e.spinArenaTimer, 3);
    if (id === 'pk_vmp_5') { assert.equal(e.p1.hp, 1195); assert.equal(e.p1.shield, 80); }
    if (id === 'pk_sifu_2') { assert.equal(e.p2.stance, 50); assert.ok(e.p2.stunTimer > 0); }
  }
});

test('年龄随受击和完美操作变化，生命成长不改变超时判定公平性', () => {
  const { engine, perk, context: c } = environment(); const e = engine();
  e.p1.perks = [perk('pk_sifu_3')]; e.random = () => 0.9;
  e.applyDamage(e.p2, e.p1, 20, '', false, true); assert.equal(e.p1.age, 21);
  c.BattleEffects.onDodge(e, e.p1, e.p2, true); assert.equal(e.p1.age, 18);
  e.p1.hp = 1000; e.p1.maxHp = 10000;
  e.p2.hp = 900; e.p2.maxHp = 1000;
  e.matchTimeLeft = 0; assert.equal(e.finishMatch().winner, 'p2');
});

test('结算只能奖励一次，经验条对应真实经验', () => {
  const { engine, context: c, elements } = environment(); const e = engine(false);
  e.p2.hp = 0; const tickets = c.gameStore.state.tickets;
  e.finishMatch(); e.finishMatch();
  assert.equal(c.gameStore.state.tickets, tickets);
  e.finale.complete(true); e.finishMatch();
  assert.equal(c.gameStore.state.tickets, tickets + c.GAME_CONFIG.rewards.tickets);
  assert.equal(c.gameStore.state.level, 2); assert.equal(c.gameStore.state.exp, 0);
  assert.ok(elements.get('result-rewards').innerHTML.includes('+80'));
});

test('渲染开关不会改变同种子同输入的战斗逻辑与时序', () => {
  const { engine } = environment(); const rendered = engine(false), headless = engine();
  for (let i = 0; i < 600 && rendered.running && headless.running; i++) {
    rendered.update(1 / 60, false); headless.update(1 / 60, true);
  }
  const digest = e => ({ hp1: e.p1.hp, hp2: e.p2.hp, x1: e.p1.x, x2: e.p2.x, elapsed: e.elapsed, pending: e.pendingUltimate?.remaining, phase: e.currentPhase });
  assert.deepEqual(plain(digest(rendered)), plain(digest(headless)));
});

test('模拟使用独立状态，关闭自动不影响模拟，同种子可复现', async () => {
  const { engine, context: c } = environment(); const e = engine(); e.setPaused(true);
  const fighter = e.p1; const before = JSON.stringify(c.gameStore.state);
  const first = await e.runHeadlessSimulation(20, { seed: 12, yieldControl: false });
  assert.equal(e.p1, fighter); assert.equal(e.running, true); assert.equal(e.paused, true);
  assert.equal(JSON.stringify(c.gameStore.state), before);
  c.gameStore.state.autoBattle = false;
  const second = await e.runHeadlessSimulation(20, { seed: 12, yieldControl: false });
  assert.deepEqual(plain(first), plain(second));
});

test('终结演出期间冻结战斗，超时无死亡演出，重开清理旧演出', () => {
  const { engine, elements } = environment(); const e = engine(false);
  e.p2.hp = 0; e.finishMatch(); const oldFinale = e.finale;
  const elapsed = e.elapsed; const hp = e.p1.hp;
  e.update(1); assert.equal(e.elapsed, elapsed); assert.equal(e.p1.hp, hp);
  assert.equal(e.canAct(e.p1), false);
  e.finale.tick(1); assert.ok(e.p2.finaleAngle > 0 || e.p2.finaleAngle < 0);
  e.startMatch('kunge', [], { p2HeroId: 'hajimi', p2Perks: [] });
  assert.equal(e.finale, null); assert.equal(e.p1.finaleAngle, undefined);
  oldFinale.complete(); assert.equal(e.state, 'battle');
  e.matchTimeLeft = 0; e.finishMatch(); assert.equal(e.outcome.finishKind, 'timeout');
  e.finale.tick(1); assert.equal(e.p1.finaleAngle, undefined);
  e.finale.complete(true); assert.ok(!elements.get('result-overlay').classList.contains('hidden'));
});

test('持续伤害收尾为耗死，有近期劣势的残血击杀优先为反杀', () => {
  const { engine } = environment();
  for (const comeback of [false, true]) {
    const e = engine(); e.random = () => 0.99;
    e.p2.hp = 2; e.p2.shield = 0;
    if (comeback) { e.p1.hp = 1; e.p1.lastDisadvantageAt = e.elapsed; }
    e.applyDamage(e.p1, e.p2, 100, '日炎灼烧'); e.checkFinished();
    assert.equal(e.outcome.finishKind, comeback ? 'comeback' : 'attrition');
  }
});

test('双方倒下为平局，无MVP且结算可安全跳过', () => {
  const { engine, elements } = environment();const e = engine(false);
  e.p1.hp = e.p2.hp = 0; e.finishMatch();
  assert.equal(e.outcome.finishKind, 'draw'); assert.equal(e.finale.winner, null);
  e.finale.complete(true); assert.ok(elements.get('result-mvp').innerHTML.includes('双方致敬'));
});

test('重复卡结算只信任存档中的卡片数据', () => {
  const { context: c } = environment();
  const realItem = c.gameStore.getAllPoolItems().find(item => item.poolType === 'perk');
  c.gameStore.state.pendingPulls = [{ uid: 'pending-1', isDupe: false, item: realItem, chosenAction: 'upgrade' }];
  const before = c.gameStore.state.pityCoins;
  const result = c.gameStore.applyDupeDecisions([{ uid: 'pending-1', isDupe: true, chosenAction: 'convert', item: { poolType: 'perk', pityValue: 999999 } }]);
  assert.equal(result.gainedCoins, 0);
  assert.equal(c.gameStore.state.pityCoins, before);
});

test('墙外且无反弹次数的弹幕不会命中边缘目标', () => {
  const { engine } = environment();
  const e = engine();
  e.p1.x = e.arena.x - 1;
  e.p2.x = e.arena.x + e.p2.radius;
  e.p1.y = e.p2.y = e.arena.y + 40;
  const hp = e.p2.hp;
  e.projectiles = [{ owner: e.p1, x: e.arena.x - 1, y: e.p2.y, vx: 0, vy: 0, r: 16, dmg: 100, bouncesLeft: 0, life: 1 }];
  e.updateProjectiles(0, true);
  assert.equal(e.p2.hp, hp);
  assert.equal(e.projectiles.length, 0);
});

test('究极能量门槛、三类充能行为与钳制', () => {
  const { engine, context } = environment();
  const e = engine();
  const ult = context.GAME_CONFIG.combat.ultimate;
  const slot = e.p1.activeSlots[1];
  const beforeCd = slot.cdLeft;
  assert.equal(e.castActiveSlot(e.p1, e.p2, 1, false, true), false);
  assert.equal(e.p1.ultimateEnergy, ult.initialEnergy);
  assert.equal(slot.cdLeft, beforeCd);
  e.p1.activeSlots[0].cdLeft = 0;
  e.castActiveSlot(e.p1, e.p2, 0, false, true);
  assert.equal(e.p1.ultimateEnergy, ult.gainOnCast);
  e.p1.x = 300; e.p2.x = 320; e.p1.y = e.p2.y = 220;
  e.handleFighterCollision(true);
  assert.equal(e.p1.ultimateEnergy, ult.gainOnCast + ult.gainOnCollision);
  e.addUltimateEnergy(e.p1, 1000);
  assert.equal(e.p1.ultimateEnergy, ult.maxEnergy);
});

test('主动究极核心按最大生命结算且满能量只启动一次', () => {
  const { engine, context } = environment();
  const e = engine();
  const ult = context.GAME_CONFIG.combat.ultimate;
  e.p1.maxHp = e.p1.hp = 6000;
  e.p2.maxHp = e.p2.hp = 6000;
  e.p1.ultimateEnergy = ult.maxEnergy;
  const slot = e.p1.activeSlots[1];
  assert.equal(e.castActiveSlot(e.p1, e.p2, 1, false, true), true);
  assert.equal(e.p1.ultimateEnergy, 0);
  assert.equal(e.p1.ultimateSequence, 1);
  assert.equal(e.castActiveSlot(e.p1, e.p2, 1, false, true), false);
  e.resolveUltimateCutin(true);
  assert.equal(e.p2.hp, 6000 - 2160);
  assert.ok(e.p1.ultimateSecondaryBudget <= 900);
});

test('被动究极不按时间触发，能量满时一次爆发且坤哥有核心伤害', () => {
  const { engine, context } = environment();
  const e = engine();
  const ult = context.GAME_CONFIG.combat.ultimate;
  e.p1.activeSlots = [];
  e.p1.ultSkill = context.MEME_DATA.heroes.dayun.ultSkills[1];
  e.p1.ultimateEnergy = 0;
  const hpBefore = e.p2.hp;
  e.updateFighter(e.p1, e.p2, 3.5, true);
  assert.equal(e.p1.ultimateEnergy, 0);
  assert.equal(e.p2.hp, hpBefore);
  e.p1.ultimateEnergy = ult.maxEnergy;
  e.p1.ultimateSecondaryBudget = e.p2.maxHp * ult.secondaryBudgetRatio;
  e.updateFighter(e.p1, e.p2, 1 / 60, true);
  assert.equal(e.p1.ultimateEnergy, 0);
  assert.equal(e.p2.hp, hpBefore - Math.round(e.p2.maxHp * ult.passiveCoreRatio));
  e.p1.ultSkill = context.MEME_DATA.heroes.kunge.ultSkills[1];
  e.p1.ultimateEnergy = ult.maxEnergy;
  const kgHp = e.p2.hp;
  e.triggerPassiveUlt(e.p1, e.p2, true);
  assert.ok(e.p2.hp < kgHp);
});

test('非法剧本不能替换当前剧本或污染战斗数值', () => {
  const { engine } = environment(); const e = engine();
  e.loadScenario([{ at: 1, action: 'hp', target: 'p1', value: 0.5 }]);
  const scenario = e.scenario; const hp = e.p1.hp;
  for (const invalid of [null, [], [null],
    [{ at: NaN, action: 'q' }], [{ at: -1, action: 'q' }],
    [{ at: 0, action: 'unknown' }], [{ at: 0, action: 'hp', value: 0.5 }],
    [{ at: 0, action: 'hp', target: 'p1', value: Infinity }],
    [{ at: 0, action: 'shield', target: 'p3', value: 1 }],
    [{ at: 0, action: 'stun', target: 'p2', duration: -1 }],
    [{ at: 0, action: 'pause', duration: 0 }], [{ at: 0, action: 'speed', value: 0 }],
    [{ at: 0, action: 'text', content: null }]]) {
    assert.equal(e.loadScenario(invalid), false);
    assert.equal(e.scenario, scenario);
    assert.equal(e.p1.hp, hp);
  }
});

test('时间轴按秒排序、同秒保持顺序且暂停不推进，加载后独立于编辑数据', () => {
  const { engine } = environment(); const e = engine();
  e.p1.stunTimer = e.p2.stunTimer = 5;
  const timeline = [
    { at: 1, action: 'hp', target: 'p1', value: 0.9 },
    { at: 0.25, action: 'hp', target: 'p1', value: 0.7 },
    { at: 0.25, action: 'hp', target: 'p1', value: 0.5 },
    { at: 0.25, action: 'shield', target: 'p1', value: 0.3 }
  ];
  e.loadScenario(timeline); timeline[0].value = 0.1;
  for (let i = 0; i < 14; i++) e.update(1 / 60);
  assert.equal(e.p1.hp, e.p1.maxHp);
  const elapsed = e.elapsed;
  e.setPaused(true); e.update(1);
  assert.equal(e.elapsed, elapsed);
  e.setPaused(false); e.update(1 / 60);
  assert.equal(e.p1.hp, e.p1.maxHp * 0.5);
  assert.equal(e.p1.shield, e.p1.maxShield * 0.3);
  for (let i = 0; i < 45; i++) e.update(1 / 60);
  assert.equal(e.p1.hp, e.p1.maxHp * 0.9);
});

test('导演节点等待可行动后再执行，不跳过后续剧情且究极能量就绪', () => {
  const { engine } = environment(); const e = engine();
  e.p1.stunTimer = 1; e.p2.stunTimer = 5;
  e.loadScenario([{ at: 0.1, action: 'q' }, { at: 0.1, action: 'hp', target: 'p2', value: 0.5 }]);
  e.update(0.1);
  assert.equal(e.scenario.cursor, 0);
  assert.equal(e.p2.hp, e.p2.maxHp);
  e.p1.stunTimer = 0; e.updateScenario();
  assert.equal(e.p1.hp, 1);
  assert.equal(e.p1.ultimateEnergy, e.getCombatConfig().ultimate.maxEnergy);
  assert.equal(e.p2.hp, e.p2.maxHp * 0.5);
  assert.equal(e.scenario.cursor, 2);
});

test('零秒击倒立即结算，不允许后续同秒剧情复活死亡角色', () => {
  const { engine } = environment(); const e = engine();
  e.loadScenario([{ at: 0, action: 'hp', target: 'p2', value: 0 }, { at: 0, action: 'hp', target: 'p2', value: 1 }]);
  e.startMatch('dayun', [], { p2HeroId: 'hajimi', p2Perks: [] });
  assert.equal(e.outcome.winner, 'p1');
  assert.equal(e.outcome.duration, 0);
  assert.equal(e.p2.hp, 0);
  assert.equal(e.scenario.cursor, 1);
  e.update(1); e.updateScenario();
  assert.equal(e.p2.hp, 0);
});

test('定时暂停阻止同秒后续节点，旧计时器不能解除重开或手动暂停', () => {
  const { engine, context } = environment(); const timers = new Map(); let nextTimer = 0;
  context.setTimeout = callback => { timers.set(++nextTimer, callback); return nextTimer; };
  context.clearTimeout = id => timers.delete(id);
  const e = engine(false);
  e.loadScenario([{ at: 0, action: 'pause', duration: 2 }, { at: 0, action: 'hp', target: 'p1', value: 0.5 }]);
  let progress;
  e.onScenarioChange = () => { progress = e.scenario.cursor; };
  e.updateScenario(false);
  assert.equal(e.state, 'paused');
  assert.equal(e.p1.hp, e.p1.maxHp);
  assert.equal(progress, 1);
  const oldResume = timers.get(e.scenarioPauseTimer);
  e.startMatch('dayun', [], { p2HeroId: 'hajimi', p2Perks: [] });
  const timer = e.scenarioPauseTimer; const resume = timers.get(timer);
  oldResume();
  assert.equal(e.paused, true);
  assert.equal(e.scenarioPauseTimer, timer);
  e.setPaused(true); resume();
  assert.equal(e.paused, true);
  assert.equal(timers.size, 0);
  e.setPaused(false); e.updateScenario(false);
  assert.equal(e.p1.hp, e.p1.maxHp * 0.5);
  assert.equal(progress, 2);
  e.stop();
});

test('重开重置时间轴与初始速度，清除剧本停止未来节点', () => {
  const { engine } = environment(); const e = engine();
  e.setSpeed(2);
  e.loadScenario([{ at: 0.1, action: 'speed', value: 0.5 }, { at: 2, action: 'hp', target: 'p1', value: 0.1 }]);
  e.p1.stunTimer = e.p2.stunTimer = 5;
  for (let i = 0; i < 6; i++) e.update(1 / 60);
  assert.equal(e.playbackSpeed, 0.5);
  e.startMatch('dayun', [], { p2HeroId: 'hajimi', p2Perks: [] });
  assert.equal(e.playbackSpeed, 2);
  assert.equal(e.scenario.cursor, 0);
  e.clearScenario();
  e.p1.stunTimer = e.p2.stunTimer = 5; e.update(2.1);
  assert.equal(e.p1.hp, e.p1.maxHp);
  assert.equal(e.scenario, null);
});

test('五个录屏剧情在自动关闭和短局偏好下仍按选角完整播放到指定终点', () => {
  const { engine, context } = environment();
  context.gameStore.state.autoBattle = false;
  context.gameStore.state.matchMode = 'quick';
  const saved = JSON.stringify(context.gameStore.state);
  for (const [key, duration, player, opponent] of [
    ['delivery', 120, 'dayun', 'hajimi'], ['bait', 100, 'hajimi', 'dayun'],
    ['billing', 140, 'laoda', 'dayun'], ['audition', 160, 'kunge', 'laoda'],
    ['lag', 110, 'hajimi', 'kunge']
  ]) {
    for (const seed of [42, 20261013]) {
      const e = engine(); e.random = context.GameRandom.seeded(seed); e.options.autoBattle = false;
      assert.equal(e.loadScenario(context.SCENARIO_PRESETS[key]), true, key);
      e.startMatch('dayun', [], { p2HeroId: 'dayun', p2Perks: [] });
      assert.equal(e.p1.heroId, player); assert.equal(e.p2.heroId, opponent);
      assert.equal(e.mode, 'classic');
      for (let frame = 0; frame < duration * 60 - 1; frame++) {
        e.update(1 / 60);
        assert.equal(e.running, true, `${key}提前结束于${e.elapsed}`);
        assert.ok(e.p1.hp >= 1 && e.p2.hp >= 1, `${key}剧情保活失效`);
      }
      e.update(1 / 60);
      assert.equal(e.outcome.winner, 'p1');
      assert.equal(e.outcome.timedOut, false);
      assert.ok(Math.abs(e.outcome.duration - duration) < 1e-6);
      assert.equal(e.p2.hp, 0);
      assert.equal(e.scenario.cursor, e.scenario.timeline.length);
      assert.equal(e.scenario.finished, true);
      assert.ok(e.scenario.caption.until > e.elapsed, `${key}终结字幕提前消失`);
      assert.ok(e.p1.castCount > 0, `${key}未自动释放普通技能`);
      assert.equal(JSON.stringify(context.gameStore.state), saved);
    }
  }
});

test('剧情保活覆盖致命伤害、反伤、处决和直接结算，清除后恢复正常死亡与原速度', () => {
  const { engine, perk } = environment(); const e = engine();
  e.setSpeed(2);
  e.loadScenario({ title: '保活边界', recording: true, duration: 90, p1HeroId: 'dayun', p2HeroId: 'dayun', timeline: [
    { at: 0, action: 'guard', target: 'p1', value: 0.25 },
    { at: 0, action: 'guard', target: 'p2', value: 0.3 },
    { at: 90, action: 'finish', target: 'p2' }
  ] });
  e.startMatch('hajimi', []); e.random = () => 0.9;
  e.setSpeed(0.5); assert.equal(e.playbackSpeed, 1);
  e.applyDamage(e.p2, e.p1, 1e9, '', false, true, { ultimateCore: true });
  assert.equal(e.p1.hp, Math.ceil(e.p1.maxHp * 0.25));
  e.p1.perks = e.p2.perks = [perk('pk_col_5')];
  e.p1.hp = e.p1.maxHp; e.p2.hp = e.p2.maxHp;
  e.applyDamage(e.p1, e.p2, 1e9, '', false, true);
  e.applyDamage(e.p2, e.p1, 1e9, '', false, true);
  assert.ok(e.p1.hp >= Math.ceil(e.p1.maxHp * 0.25));
  assert.ok(e.p2.hp >= Math.ceil(e.p2.maxHp * 0.3));
  e.p1.perks = []; e.p2.perks = [perk('pk_asn_5')];
  e.executeScenarioCue({ action: 'guard', target: 'p1', value: 0.05 }, true);
  e.p1.hp = 500;
  e.applyDamage(e.p2, e.p1, 50, '', false, true);
  assert.equal(e.p1.hp, Math.ceil(e.p1.maxHp * 0.05));
  e.executeScenarioCue({ action: 'q' }, true);
  assert.equal(e.p1.hp, 1);
  e.p1.immortalTimer = 0; e.p1.hp = 0;
  assert.equal(e.checkFinished(), false);
  assert.equal(e.p1.hp, 1);
  assert.equal(e.finishMatch(), null);
  assert.equal(e.running, true);
  e.clearScenario(); assert.equal(e.playbackSpeed, 2);
  e.applyDamage(e.p2, e.p1, 1e9, '', false, true, { ultimateCore: true });
  assert.equal(e.checkFinished(), true);
  assert.equal(e.outcome.winner, 'p2');
  e.startMatch('hajimi', []);
  assert.equal(e.p1.heroId, 'hajimi'); assert.equal(e.mode, 'quick');
});

test('长剧情校验拒绝坏角色、重复收尾、提前击倒、超时停顿且不替换已加载对象', () => {
  const { engine, context } = environment(); const e = engine();
  const valid = plain(context.SCENARIO_PRESETS.delivery);
  e.loadScenario(valid); const previous = e.scenario;
  const wrongActor = { ...valid, p1HeroId: '__proto__' };
  const tooShort = { ...valid, duration: 60 };
  const earlyDeath = { ...valid, timeline: [{ at: 0, action: 'hp', target: 'p1', value: 0 }, ...valid.timeline] };
  const duplicateFinish = { ...valid, timeline: [...valid.timeline, { at: valid.duration, action: 'finish', target: 'p2' }] };
  const lateCue = { ...valid, timeline: [{ at: valid.duration + 1, action: 'q' }, ...valid.timeline] };
  const badFreeze = { ...valid, timeline: [{ at: 0, action: 'pause', duration: 70 }, ...valid.timeline] };
  const badFloor = { ...valid, timeline: [{ at: 0, action: 'guard', target: 'p1', value: -1 }, ...valid.timeline] };
  const badCaption = { ...valid, timeline: [{ at: 0, action: 'caption', content: '字幕', duration: Infinity }, ...valid.timeline] };
  const badSpeed = { ...valid, timeline: [{ at: 0, action: 'speed', value: 2 }, ...valid.timeline] };
  for (const invalid of [wrongActor, tooShort, earlyDeath, duplicateFinish, lateCue, badFreeze, badFloor, badCaption, badSpeed]) {
    assert.equal(e.loadScenario(invalid), false);
    assert.equal(e.scenario, previous);
  }
});

test('持续字幕按对局时间到期并通知界面，暂停冻结字幕、重开和离场清除旧字幕', () => {
  const { engine } = environment(); const e = engine(false);
  e.loadScenario({ title: '字幕生命周期', recording: true, duration: 90, p1HeroId: 'dayun', p2HeroId: 'dayun', timeline: [
    { at: 0, action: 'caption', content: '第一幕', duration: 1, chapter: '起始' },
    { at: 2, action: 'caption', content: '第二幕', duration: 8, chapter: '推进' },
    { at: 90, action: 'finish', target: 'p2' }
  ] });
  let subtitleVisible = false;
  e.onScenarioChange = () => { subtitleVisible = !!e.scenario?.caption; };
  e.startMatch('hajimi', []);
  e.p1.stunTimer = e.p2.stunTimer = 10;
  e.update(0.8, false); assert.equal(subtitleVisible, true);
  e.setPaused(true); e.update(1, false);
  assert.equal(e.elapsed, 0.8); assert.equal(subtitleVisible, true);
  e.setPaused(false); e.update(0.2, false);
  assert.equal(e.scenario.caption, null); assert.equal(subtitleVisible, false);
  e.update(1, false); assert.equal(subtitleVisible, true);
  e.startMatch('hajimi', []);
  assert.equal(e.elapsed, 0); assert.equal(e.scenario.caption.until, 1);
  e.stop(); assert.equal(e.scenario.caption, null); assert.equal(subtitleVisible, false);
});

test('零时长眩晕指令解除等待，使演员能够正常施放技能', () => {
  const { engine } = environment(); const e = engine();
  e.p1.stunTimer = 23; e.p1.activeSlots[0].cdLeft = 0;
  assert.equal(e.castActiveSlot(e.p1, e.p2, 0, true, true), false);
  assert.equal(e.p1.activeSlots[0].cdLeft, 0);
  assert.equal(e.loadScenario([{ at: 0, action: 'stun', target: 'p1', duration: 0 }]), true);
  e.updateScenario();
  assert.equal(e.castActiveSlot(e.p1, e.p2, 0, true, true), true);
  assert.ok(e.p1.activeSlots[0].cdLeft > 0);
});
