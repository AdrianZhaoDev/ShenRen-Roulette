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
  for (const file of ['config', 'data', 'effects', 'finale-audio', 'finale', 'battle', 'simulation']) vm.runInContext(fs.readFileSync(path.join(root, `js/${file}.js`), 'utf8'), context, { filename: `${file}.js` });
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
  assert.ok(e.p1.activeSlots.every(slot => slot.cdLeft === 0));
  assert.equal(run('w'), true);
  assert.equal(e.p2.hp, 1);
  assert.equal(run('e'), true);
  assert.ok(Math.hypot(e.p1.x - e.p2.x, e.p1.y - e.p2.y) < e.p1.radius + e.p2.radius);
  assert.equal(run('r'), true);
  assert.equal(e.truckHazards.length, 4);
  for (const truck of e.truckHazards) {
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
  assert.equal(e.truckHazards.length, 0);
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
  const { engine, frames, elements } = environment();
  const e = engine(false);
  e.castActiveSlot(e.p1, e.p2, 1, false, false); // 未就绪，不应消耗。
  e.p1.activeSlots[1].cdLeft = 0;
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
  const { engine } = environment();
  const e = engine();
  e.p1.activeSlots[1].cdLeft = 0;
  assert.equal(e.castActiveSlot(e.p1, e.p2, 1, false, true), true);
  e.p2.activeSlots[0].cdLeft = 0;
  const hp = e.p1.hp;
  assert.equal(e.castActiveSlot(e.p2, e.p1, 0, false, true), false);
  assert.equal(e.p2.activeSlots[0].cdLeft, 0);
  assert.equal(e.p1.hp, hp);
});

test('成功闪避后下一次大招重新显示按钮，暂停不能闪避', () => {
  const { engine, elements } = environment();
  const e = engine(false);
  e.p2.ultSkill = e.p1.ultSkill;
  const slot = e.p1.activeSlots[1];
  e.startUltimateCutin(e.p2, e.p1, slot);
  e.updateUltimateCutin(1, false);
  e.setPaused(true);
  assert.equal(e.triggerUltimateDodge(), false);
  e.setPaused(false);
  assert.equal(e.triggerUltimateDodge(), true);
  e.resolveUltimateCutin(false);
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
