// 横屏物理弹球 + 梗技能特效战斗引擎
// 核心特性：
// 1. 角色 2固定核心被动 + 1自选普通主动 + 1自选究极技(主动或被动) + 开局5选3通用词条 = 最多5个主动按钮
// 2. 独立固定步长与逻辑随机数；镜像等级和劣势补偿，实际胜率由独立模拟报告给出
// 3. 状态约束统一管理选词条、暂停、前摇、时停、闪避与结算

class BattleEngine {
  constructor(canvas, options = {}) {
    this.options = options;
    this.store = options.store || window.gameStore;
    this.random = options.random || Math.random;
    this.headless = !!options.headless;
    this.state = "idle";
    this.frameId = null;
    this.generation = 0;
    this.accumulator = 0;
    this.playbackSpeed = window.GAME_CONFIG.speed.default;
    this.queuedCasts = [];
    this.hudTags = new Map();
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.width = canvas.width;   // 960
    this.height = canvas.height; // 540

    // 竞技场内框（留出顶部血条与底部技能栏空间）
    this.arena = {
      x: 32,
      y: 82,
      w: this.width - 64,
      h: this.height - 194
    };

    this.running = false;
    this.paused = false;
    this.lastTime = 0;
    this.mode = options.mode || this.store.state.matchMode || "quick";
    this.maxMatchDuration = window.GAME_CONFIG.modes[this.mode].duration;
    this.elapsed = 0;
    this.matchTimeLeft = this.maxMatchDuration;
    this.currentPhase = "early";
    this.phaseAnnounced = false;
    this.lastPhase = "early";
    this.hitstopTimer = 0;
    this.shakeTimer = 0;
    this.shakeIntensity = 0;
    this.spinArenaTimer = 0;
    this.timeStopTimer = 0;
    this.timeStopOwner = null;
    this.pendingUltimate = null;
    this.ultimateDodgeWindow = 0;
    this.dodgeFlashTimer = 0;
    this.arenaPulse = 0;
    this.scenario = null;
    this.scenarioPauseTimer = null;
    this.trails = [];
    this.particleBursts = [];
    this.announcerTimer = 0;
    this.ultImpactEffects = [];
    this.skillVfxList = [];
    this.p1 = null;
    this.p2 = null;
    this.projectiles = [];
    this.floatingTexts = [];
    this.ringEffects = [];
    this.summons = [];
    this.clones = [];
    this.phantoms = [];
    this.manualPerfectCount = 0;

    // QTE 抓时机弹窗计时
    this.qteTimer = 0;
    this.qteCooldown = 3.5;

    // 预加载外部可选替换贴图 (assets/images/*.png)
    this.customImages = {};
    if (!this.headless) Object.values(window.MEME_DATA.heroes).forEach((h) => {
      const img = new Image();
      img.src = h.imagePath;
      img.onload = () => { this.customImages[h.id] = img; };
    });
  }

  setSpeed(value) {
    const requested = Number(value);
    const speed = this.isRecordingActive() ? 1 : requested;
    if (!window.GAME_CONFIG.speed.choices.includes(requested)) return;
    this.playbackSpeed = speed;
    this.accumulator = 0;
    this.lastTime = performance.now();
    if (!this.headless) {
      const picker = document.getElementById("battle-speed");
      if (picker) picker.value = String(speed);
    }
  }

  static validateScenario(definition) {
    const recording = !Array.isArray(definition) && definition?.recording === true;
    const timeline = recording ? definition.timeline : definition;
    if (!Array.isArray(timeline) || timeline.length === 0) return "剧本必须是非空数组或完整的长剧情对象";
    if (recording) {
      if (typeof definition.title !== "string" || !definition.title.trim()) return "长剧情需要 title";
      if (!Number.isInteger(definition.duration) || definition.duration < 90 || definition.duration > 180) return "长剧情 duration 必须是 90–180 的整数秒数";
      if (typeof definition.p1HeroId !== "string" || typeof definition.p2HeroId !== "string" || !Object.hasOwn(window.MEME_DATA.heroes, definition.p1HeroId) || !Object.hasOwn(window.MEME_DATA.heroes, definition.p2HeroId)) return "长剧情需要有效的 p1HeroId 和 p2HeroId";
      const last = timeline[timeline.length - 1];
      if (!last || last.action !== "finish" || last.at !== definition.duration) return "长剧情最后一条必须是 duration 秒的 finish";
    }
    let finishCount = 0;
    let pauseDuration = 0;
    for (const [index, cue] of timeline.entries()) {
      const prefix = `第 ${index + 1} 条：`;
      if (!cue || !Number.isFinite(cue.at) || cue.at < 0) return `${prefix}at 必须是非负秒数`;
      if (recording && cue.at > definition.duration) return `${prefix}不能晚于剧情终点`;
      if (cue.color !== undefined && typeof cue.color !== "string") return `${prefix}color 必须是颜色字符串`;
      switch (cue.action) {
        case "hp":
        case "shield":
          if (!Number.isFinite(cue.value) || cue.value < 0) return `${prefix}value 必须是非负数`;
          if (recording && cue.action === "hp" && cue.value === 0) return `${prefix}长剧情请用最后的 finish 收尾，不提前击倒`;
        case "ult":
          if (cue.target !== "p1" && cue.target !== "p2") return `${prefix}target 只能是 p1 或 p2`;
          break;
        case "stun":
          if (cue.target !== "p1" && cue.target !== "p2") return `${prefix}target 只能是 p1 或 p2`;
          if (!Number.isFinite(cue.duration) || cue.duration < 0) return `${prefix}眩晕 duration 必须是非负秒数，0 表示解除`;
          break;
        case "pause":
          if (!Number.isFinite(cue.duration) || cue.duration <= 0 || cue.duration > 2147483.647) return `${prefix}duration 必须是有效的正数秒数`;
          pauseDuration += cue.duration;
          break;
        case "speed":
          if (!window.GAME_CONFIG.speed.choices.includes(cue.value)) return `${prefix}速度只能是 0.5、1、1.5 或 2`;
          if (recording && cue.value !== 1) return `${prefix}长剧情固定 1× 播放`;
          break;
        case "text":
        case "caption":
          if (typeof cue.content !== "string" || !cue.content.trim()) return `${prefix}content 必须是非空文字`;
          if (cue.action === "caption" && (!Number.isFinite(cue.duration) || cue.duration <= 0)) return `${prefix}字幕 duration 必须是正数`;
          if (cue.chapter !== undefined && typeof cue.chapter !== "string") return `${prefix}chapter 必须是文字`;
          break;
        case "guard":
          if (!recording) return `${prefix}guard 只用于长剧情对象`;
          if (cue.target !== "p1" && cue.target !== "p2") return `${prefix}target 只能是 p1 或 p2`;
          if (!Number.isFinite(cue.value) || cue.value < 0 || cue.value > 1) return `${prefix}guard value 必须在 0 到 1 之间`;
          break;
        case "response":
          if (!recording) return `${prefix}response 只用于长剧情对象`;
          if (!["both", "parry", "counter", "off"].includes(cue.value)) return `${prefix}response value 只能是 both/parry/counter/off`;
          break;
        case "finish":
          if (!recording || cue.at !== definition.duration) return `${prefix}finish 只用于长剧情终点`;
          if (cue.target !== "p1" && cue.target !== "p2") return `${prefix}target 只能是 p1 或 p2`;
          finishCount++;
          break;
        case "q":
        case "w":
        case "e":
        case "r":
          break;
        default:
          return `${prefix}未知 action`;
      }
    }
    if (recording && finishCount !== 1) return "长剧情必须且只能有一个 finish";
    if (recording && definition.duration + pauseDuration + 3.35 > 180) return "长剧情、暂停与终结演出合计不能超过 180 秒";
    return null;
  }

  loadScenario(definition) {
    if (BattleEngine.validateScenario(definition)) return false;
    const initialSpeed = this.scenario?.initialSpeed ?? this.playbackSpeed;
    this.clearScenario();
    const recording = !Array.isArray(definition);
    this.scenario = {
      recording, title: recording ? definition.title : "", duration: recording ? definition.duration : null,
      p1HeroId: recording ? definition.p1HeroId : null, p2HeroId: recording ? definition.p2HeroId : null,
      timeline: (recording ? definition.timeline : definition).map((cue) => ({ ...cue })).sort((a, b) => a.at - b.at),
      cursor: 0, initialSpeed, started: false, finished: false, caption: null, chapter: "", hpFloors: { p1: 0, p2: 0 }, response: "both"
    };
    if (!this.headless) this.onScenarioChange?.();
    return true;
  }

  clearScenario() {
    const initialSpeed = this.scenario?.initialSpeed;
    this.scenario = null;
    if (this.scenarioPauseTimer !== null) this.setPaused(false);
    if (initialSpeed !== undefined) this.setSpeed(initialSpeed);
    if (!this.headless) this.onScenarioChange?.();
  }

  isRecordingActive() {
    return this.running && !!this.scenario?.recording && this.scenario.started && !this.scenario.finished && !this.finale;
  }

  recordingHpFloor(fighter) {
    if (!this.isRecordingActive()) return 0;
    const key = fighter === this.p1 ? "p1" : fighter === this.p2 ? "p2" : null;
    return key ? Math.max(1, Math.ceil(fighter.maxHp * this.scenario.hpFloors[key])) : 0;
  }

  applyRecordingGuards() {
    if (!this.isRecordingActive()) return;
    this.p1.hp = Math.max(this.p1.hp, this.recordingHpFloor(this.p1));
    this.p2.hp = Math.max(this.p2.hp, this.recordingHpFloor(this.p2));
  }

  scenarioResponseEnabled(kind) {
    return this.isRecordingActive() && !this.paused && ["both", kind].includes(this.scenario.response);
  }

  updateScenarioResponses(headless = this.headless) {
    let id;
    if (this.pendingUltimate) {
      if (!this.scenarioResponseEnabled("counter") || !this.canRespondUltimate() ||
          this.pendingUltimate.remaining > this.getCombatConfig().ultimate.counterWindow * 0.75 + 1e-9) return;
      id = "ultimate-counter-btn";
    } else {
      // 留出可见的反应时间，再走与玩家相同的按钮事件。
      if (!this.scenarioResponseEnabled("parry") || this.qteTimer <= 0 || this.qteTimer > 0.93 || !this.canAct(this.p1)) return;
      id = "qte-counter-btn";
    }
    if (!headless) return this.onScenarioInput?.(id);
    return id === "qte-counter-btn" ? this.triggerManualQTE() : this.triggerUltimateCounter();
  }

  updateScenario(headless = this.headless) {
    const scenario = this.scenario;
    if (!scenario || (scenario.recording && !scenario.started)) return;
    const previousCursor = scenario.cursor;
    let changed = false;
    if (scenario.caption && scenario.caption.until <= this.elapsed + 1e-9) {
      scenario.caption = null;
      changed = true;
    }
    while (this.running && !this.paused && !this.finale && scenario.cursor < scenario.timeline.length) {
      const cue = scenario.timeline[scenario.cursor];
      if (cue.at > this.elapsed + 1e-9 || !this.executeScenarioCue(cue, headless)) break;
      scenario.cursor++;
      if (this.checkFinished()) break;
    }
    if (!headless && (changed || scenario.cursor !== previousCursor)) this.onScenarioChange?.();
  }

  executeScenarioCue(cue, headless) {
    const { p1, p2, arena } = this;
    const target = this[cue.target];
    if (!this.running || this.paused || this.finale || !p1 || !p2) return false;
    if (["q", "w", "e", "r"].includes(cue.action) && !this.isRecordingActive() && !this.canAct(p1)) return false;
    if (cue.action === "q") {
      p1.hp = 1;
      if (this.isRecordingActive()) this.scenario.hpFloors.p1 = 0;
      p1.immortalTimer = Math.max(p1.immortalTimer, 3.5);
      p1.activeSlots.forEach((slot) => { if (!slot.isUlt) slot.cdLeft = 0; });
      p1.ultimateEnergy = this.getCombatConfig().ultimate.maxEnergy;
      this.spawnText("绝境爆发！技能就绪!!", p1.x, p1.y - 50, "#ffe600", 24);
    } else if (cue.action === "w") {
      p2.hp = 1;
      if (this.isRecordingActive()) this.scenario.hpFloors.p2 = 0;
      this.spawnText("对手破防！仅剩1滴血!!", p2.x, p2.y - 50, "#ff2a54", 24);
    } else if (cue.action === "e") {
      const cx = arena.x + arena.w / 2;
      const cy = arena.y + arena.h / 2;
      const gap = (p1.radius + p2.radius) * 0.45;
      p1.x = cx - gap;
      p1.y = cy;
      p2.x = cx + gap;
      p2.y = cy;
      this.spawnText("贴脸大乱斗!!", cx, cy - 60, "#00eaff", 24);
    } else if (cue.action === "r") {
      for (let i = 0; i < 4; i++) {
        this.summons.push({
          owner: p1, x: arena.x - 110 - i * 90,
          y: arena.y + arena.h * (i + 0.5) / 4,
          vx: 720, w: 110, h: 54, dmg: 140, hitDone: false
        });
      }
      this.spawnText("🚛 百吨王车队进场!!", arena.x + arena.w / 2, arena.y + arena.h / 2, "#ffe600", 26);
    } else if (cue.action === "hp") {
      if (!target) return false;
      target.hp = Math.min(target.maxHp, cue.value <= 1 ? target.maxHp * cue.value : cue.value);
      if (this.isRecordingActive()) this.scenario.hpFloors[cue.target] = Math.min(this.scenario.hpFloors[cue.target], target.hp / target.maxHp);
    } else if (cue.action === "ult") {
      if (!target) return false;
      target.ultimateEnergy = this.getCombatConfig().ultimate.maxEnergy;
    } else if (cue.action === "speed") {
      this.setSpeed(cue.value);
    } else if (cue.action === "text") {
      this.spawnText(cue.content, arena.x + arena.w / 2, arena.y + arena.h / 2, cue.color || "#ffe600", 26);
    } else if (cue.action === "caption") {
      if (!this.scenario) return false;
      this.scenario.caption = { content: cue.content, color: cue.color || "", until: this.elapsed + cue.duration };
      if (cue.chapter !== undefined) this.scenario.chapter = cue.chapter;
    } else if (cue.action === "guard") {
      if (!this.isRecordingActive() || !target) return false;
      this.scenario.hpFloors[cue.target] = cue.value;
      target.hp = Math.max(target.hp, this.recordingHpFloor(target));
    } else if (cue.action === "response") {
      if (!this.isRecordingActive()) return false;
      this.scenario.response = cue.value;
    } else if (cue.action === "finish") {
      if (!this.isRecordingActive() || !target) return false;
      this.scenario.finished = true;
      const attacker = target === p1 ? p2 : p1;
      target.hp = 0;
      attacker.hp = Math.max(1, attacker.hp);
      this.lastLethalHit = { attacker, defender: target, label: "终结一击", comeback: attacker.hp / attacker.maxHp <= 0.25, attrition: false };
    } else if (cue.action === "pause") {
      if (!headless) {
        this.setPaused(true);
        const generation = this.generation;
        const timer = setTimeout(() => {
          if (generation !== this.generation || this.scenarioPauseTimer !== timer || !this.running) return;
          this.scenarioPauseTimer = null;
          this.setPaused(false);
        }, cue.duration * 1000);
        this.scenarioPauseTimer = timer;
      }
    } else if (cue.action === "shield") {
      if (!target) return false;
      target.shield = Math.min(target.maxShield, cue.value <= 1 ? target.maxShield * cue.value : cue.value);
    } else if (cue.action === "stun") {
      if (!target) return false;
      target.stunTimer = cue.duration;
    } else {
      return false;
    }
    if (!headless) this.updateTopHudUI();
    return true;
  }

  stop(nextState = "idle") {
    this.running = false;
    this.finale = null;
    this.finalePlayed = false;
    this.lastLethalHit = null;
    if (this.scenario) {
      this.scenario.started = false;
      this.scenario.finished = false;
      this.scenario.caption = null;
      this.scenario.chapter = "";
    }
    if (!this.headless) {
      document.getElementById('mvp-overlay')?.classList.add('hidden');
      document.getElementById('btn-skip-finale')?.classList.add('hidden');
    }
    this.paused = false;
    clearTimeout(this.scenarioPauseTimer);
    this.scenarioPauseTimer = null;
    this.state = nextState;
    this.generation++;
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.frameId = null;
    this.accumulator = 0;
    this.queuedCasts = [];
    this.pendingUltimate = null;
    this.ultimateDodgeWindow = 0;
    this.hitstopTimer = this.shakeTimer = this.spinArenaTimer = this.timeStopTimer = 0;
    this.timeStopOwner = null;
    this.qteTimer = 0;
    this.projectiles = [];
    this.summons = [];
    this.clones = [];
    this.phantoms = [];
    for (const f of [this.p1, this.p2]) if (f) {
      f.morphState = null;
      f.morphScale.current = f.morphScale.target = 1;
      f.phantomTimer = 0;
    }
    this.ringEffects = [];
    this.trails = [];
    this.particleBursts = [];
    this.floatingTexts = [];
    this.ultImpactEffects = [];
    this.skillVfxList = [];
    this.showUltimateCutin(false);
    this.syncUltimateControls();
    this.dodgeFlashTimer = 0;
    if (!this.headless) {
      document.getElementById("qte-counter-btn")?.classList.add("hidden");
      document.getElementById("result-overlay")?.classList.add("hidden");
      window.memeAudio.stopVoices();
      this.onScenarioChange?.();
    }
  }

  setPaused(paused) {
    if (!this.running || this.finale) return;
    clearTimeout(this.scenarioPauseTimer);
    this.scenarioPauseTimer = null;
    this.paused = !!paused;
    this.state = paused ? "paused" : (this.pendingUltimate ? (this.pendingUltimate.phase === "cutin" ? "cutin" : "climax") : "battle");
    this.syncUltimateControls();
    this.accumulator = 0;
    this.lastTime = performance.now();
    if (!this.headless) {
      const button = document.getElementById("btn-pause");
      if (button) button.textContent = paused ? "继续" : "暂停";
      if (paused) window.memeAudio.stopVoices();
      this.onScenarioChange?.();
    }
  }

  canAct(fighter) {
    return this.running && !this.paused && this.state === "battle" && !this.pendingUltimate && !["teleport", "blitz", "dash_trail"].includes(fighter.morphState?.type) && fighter.hp > 0 && !(this.timeStopTimer > 0 && this.timeStopOwner !== fighter) && !(fighter.stunTimer > 0);
  }

  checkFinished() {
    if (this.isRecordingActive()) {
      this.applyRecordingGuards();
      return false;
    }
    if (this.running && (this.matchTimeLeft <= 0 || this.p1.hp <= 0 || this.p2.hp <= 0)) {
      this.finishMatch();
      return true;
    }
    return !this.running;
  }

  hasPerk(fighter, perkId) {
    return !!fighter && fighter.perks.some((perk) => perk.id === perkId);
  }

  hasArchetype(fighter, archetype) {
    return !!fighter && fighter.perks.some((perk) => perk.archetype === archetype);
  }

  getCombatConfig() { return window.GAME_CONFIG.combat; }

  addUltimateEnergy(fighter, amount) {
    const ult = this.getCombatConfig().ultimate;
    fighter.ultimateEnergy = Math.max(0, Math.min(ult.maxEnergy, fighter.ultimateEnergy + amount));
    return fighter.ultimateEnergy;
  }

  isUltimateSlot(slot) { return !!slot && slot.isUlt === true; }

  ultimateRatio(type, level) {
    const ult = this.getCombatConfig().ultimate;
    const passive = type === "passive";
    const base = passive ? ult.passiveCoreRatio : ult.activeCoreRatio;
    const growth = passive ? ult.passiveCoreLevelGrowth : ult.activeCoreLevelGrowth;
    const cap = passive ? ult.passiveCoreRatioCap : ult.activeCoreRatioCap;
    return Math.min(cap, base * (1 + (Math.max(1, level) - 1) * growth));
  }

  beginUltimateSequence(caster, target, name = caster.ultSkill.name) {
    const ult = this.getCombatConfig().ultimate;
    caster.ultimateEnergy = 0;
    caster.ultimateSecondaryBudget = target.maxHp * ult.secondaryBudgetRatio;
    caster.ultimateSequence += 1;
    caster.ultimateSequenceState = { id: caster.ultimateSequence, remaining: caster.ultimateSecondaryBudget, secondaryDamage: target.maxHp * ult.secondaryDamageRatio };
    this.createUltimateReport(caster, caster.ultimateSequenceState, name);
  }

  getPhase(elapsed) {
    if (elapsed < this.maxMatchDuration * 0.2) return "early";
    if (elapsed < this.maxMatchDuration * 0.6) return "mid";
    if (elapsed < this.maxMatchDuration * 0.9) return "late";
    return "overtime";
  }

  getPhaseLabel(phase) {
    return {
      early: "前期 · 试探构筑",
      mid: "中期 · 流派成型",
      late: "后期 · 神装爆发",
      overtime: "加时 · 规则崩坏"
    }[phase] || phase;
  }

  updatePhase(headless) {
    const elapsed = this.maxMatchDuration - this.matchTimeLeft;
    const nextPhase = this.getPhase(elapsed);
    if (nextPhase === this.currentPhase) return;

    this.lastPhase = this.currentPhase;
    this.currentPhase = nextPhase;
    this.phaseAnnounced = true;
    this.arenaPulse = 1;

    if (!headless) {
      this.spawnText(`⏱️ ${this.getPhaseLabel(nextPhase)}`, this.width / 2, this.arena.y + 78, "#ffe600", 23);
      this.triggerShake(12, 0.24);
      this.announcerTimer = 1.8;
    }

    [this.p1, this.p2].forEach((fighter) => {
      if (!fighter) return;
      const before = { maxHp: fighter.maxHp, baseSpd: fighter.baseSpd, radius: fighter.radius };
      if (nextPhase === "mid") {
        fighter.baseSpd *= 1.08;
        fighter.maxHp = Math.round(fighter.maxHp * 1.12);
        fighter.hp = Math.min(fighter.maxHp, fighter.hp + Math.round(fighter.maxHp * 0.16));
      } else if (nextPhase === "late") {
        fighter.baseSpd *= 1.12;
        fighter.maxHp = Math.round(fighter.maxHp * 1.18);
        fighter.hp = Math.min(fighter.maxHp, fighter.hp + Math.round(fighter.maxHp * 0.22));
      } else if (nextPhase === "overtime") {
        fighter.baseSpd *= 1.18;
        fighter.maxHp = Math.round(fighter.maxHp * 1.25);
        fighter.hp = Math.min(fighter.maxHp, fighter.hp + Math.round(fighter.maxHp * 0.3));
      }
      this.recordGrowth(fighter, this.getPhaseLabel(nextPhase), before);
    });
  }

  updateBuilds(fighter, enemy, dt, headless) {
    fighter.growthTimer += dt;
    fighter.regenTimer += dt;

    const phaseRegen = this.currentPhase === "early" ? 1 : this.currentPhase === "mid" ? 1.6 : 2.4;
    if (this.hasPerk(fighter, "pk_vmp_1") && fighter.regenTimer >= 1) {
      fighter.regenTimer = 0;
      const heal = Math.round(fighter.maxHp * 0.035 * phaseRegen);
      this.applyHeal(fighter, heal, "狂徒每秒回血", headless);
    }

    if (this.hasPerk(fighter, "pk_col_4") && fighter.growthTimer >= 3) {
      fighter.growthTimer = 0;
      this.growFighter(fighter, 0.035, 35, headless, "泰坦吞噬生长");
    }

    if (this.hasPerk(fighter, "pk_asn_3") && this.elapsed < 20) {
      fighter.earlyBurst = 1.55;
    } else {
      fighter.earlyBurst = 1;
    }


    if (this.hasPerk(fighter, "pk_col_3")) {
      const auraRadius = fighter.radius * 1.35;
      const distance = Math.hypot(fighter.x - enemy.x, fighter.y - enemy.y);
      if (distance < auraRadius && this.random() < dt * 1.5) {
        this.applyDamage(fighter, enemy, Math.round(45 * Math.max(1, fighter.radius / 42)), "日炎灼烧", false, headless);
      }
    }

    if (fighter.dodgeTimer > 0) fighter.dodgeTimer -= dt;
    if (fighter.dodgeTimer <= 0) fighter.isDodging = false;
  }

  growFighter(fighter, ratio, flatHp, headless, label) {
    const before = { maxHp: fighter.maxHp, baseSpd: fighter.baseSpd, radius: fighter.radius };
    fighter.maxHp += flatHp;
    fighter.hp = Math.min(fighter.maxHp, fighter.hp + flatHp);
    fighter.radius = Math.min(this.arena.h * 0.42, fighter.radius * (1 + ratio));
    fighter.scaleAnim = 1.28;
    this.recordGrowth(fighter, label, before);
    if (!headless) {
      this.spawnText(`🟢 ${label} +${flatHp}HP`, fighter.x, fighter.y - fighter.radius - 20, "#00ff88", 18);
      this.particleBursts.push({ x: fighter.x, y: fighter.y, color: "#00ff88", count: 18, life: 0.55 });
    }
  }

  startUltimateCutin(caster, target, slot) {
    const ult = this.getCombatConfig().ultimate;
    if (!caster || !target || target.hp <= 0 || !this.canAct(caster) || !this.isUltimateSlot(slot) || slot.isRepeat || caster.ultimateEnergy < ult.maxEnergy) return false;
    this.beginUltimateSequence(caster, target, slot.name);
    const hero = window.MEME_DATA.heroes[caster.heroId];
    const source = slot.sourceType === "heroUlt"
      ? hero.ultSkills.find((skill) => skill.id === caster.ultSkill.id)
      : window.MEME_DATA.perks.find((perk) => perk.id === slot.perkId);
    const title = source && source.cutinTitle ? source.cutinTitle : `【究极奥义】${slot.name}!!`;
    const sub = source?.cutinSub || "特写结束后观察战场落点，临近命中时回避或拆招";
    const bg = source && source.cutinBg ? source.cutinBg : "linear-gradient(135deg, #111, #ffe600, #ff0055)";
    const chant = source && source.cutinChant ? source.cutinChant : `隐藏着神人力量的星阵啊 · 显现 ${caster.name} 的究极真身！`;
    const badge = source && source.cutinBadge ? source.cutinBadge : `${caster.emoji} ${caster.name} · 封印解除`;
    const sealText = source && source.cutinSealText ? source.cutinSealText : `${caster.heroId.toUpperCase()} // CARDCAPTOR SEAL RELEASE`;
    const props = source && Array.isArray(source.cutinProps) ? source.cutinProps : [caster.emoji, "✨", "⚡", "💥", "🌟", "🔥"];
    const stages = source && Array.isArray(source.cutinStages) ? source.cutinStages : ["✦ 第一幕：魔法星阵唤醒 ✦", "✦ 第二幕：真身变身觉醒 ✦", "✦ 第三幕：锁定目标 · 破空轰击衔接 ✦"];
    this.pendingUltimate = { caster, target, slot, hero, title, sub, bg, chant, badge, sealText, props, stages, stageIndex: 0,
      phase: "cutin", total: ult.cutinDuration, remaining: ult.cutinDuration, dodged: false, countered: false, responseUsed: false,
      slowRemaining: 0, slowStarted: false, attack: null };
    this.qteTimer = 0;
    if (!this.headless) document.getElementById("qte-counter-btn")?.classList.add("hidden");
    this.syncUltimateControls();
    this.ultimateDodgeWindow = 0;
    this.state = "cutin";
    if (!this.headless) { this.triggerShake(slot.isUlt ? 8 : 5, 0.18); window.memeAudio.playUltCutinAlarm(caster.heroId, slot.shout || slot.name); }
    this.showUltimateCutin(true);
    return true;
  }

  showUltimateCutin(visible) {
    if (this.headless || typeof document === "undefined") return;
    const overlay = document.getElementById("ultimate-cutin-overlay");
    if (!overlay) return;
    if (!visible) {
      overlay.classList.add("hidden");
      overlay.classList.remove("departing");
      return;
    }
    const pending = this.pendingUltimate;
    overlay.classList.remove("departing");
    this.syncUltimateControls();
    overlay.dataset.hero = pending.caster.heroId;
    overlay.dataset.stage = "1";
    overlay.style.setProperty("--cutin-bg", pending.bg);
    overlay.style.setProperty("--hero-color", pending.caster.color || "#ff5500");
    overlay.style.setProperty("--hero-accent", pending.caster.accent || "#ffe600");

    const titleEl = document.getElementById("cutin-title");
    const subEl = document.getElementById("cutin-subtitle");
    const casterEl = document.getElementById("cutin-caster");
    const chantEl = document.getElementById("cutin-chant");
    const badgeEl = document.getElementById("cutin-badge");
    const sealEl = document.getElementById("cutin-seal-text");
    const stageTagEl = document.getElementById("cutin-stage-tag");
    const portraitEl = document.getElementById("cutin-portrait");
    const emojiFallbackEl = document.getElementById("cutin-emoji-fallback");
    const propsEl = document.getElementById("cutin-props");
    const progressEl = document.getElementById("cutin-progress-fill");

    if (titleEl) titleEl.textContent = pending.title;
    if (subEl) subEl.textContent = pending.sub;
    if (casterEl) casterEl.textContent = `${pending.caster.emoji} ${pending.caster.name} 发动究极技能`;
    if (chantEl) chantEl.textContent = `「${pending.chant}」`;
    if (badgeEl) badgeEl.textContent = pending.badge;
    if (sealEl) sealEl.textContent = pending.sealText;
    if (stageTagEl) stageTagEl.textContent = pending.stages[0];
    if (progressEl) progressEl.style.width = "100%";

    ["cutin-step-1", "cutin-step-2", "cutin-step-3"].forEach((id, idx) => {
      const stepEl = document.getElementById(id);
      if (stepEl) stepEl.classList.toggle("active", idx === 0);
    });

    if (portraitEl && pending.hero && pending.hero.imagePath) {
      portraitEl.src = pending.hero.imagePath;
      portraitEl.classList.remove("hidden");
      if (emojiFallbackEl) emojiFallbackEl.classList.add("hidden");
    } else if (emojiFallbackEl) {
      emojiFallbackEl.textContent = pending.caster.emoji;
      emojiFallbackEl.classList.remove("hidden");
      if (portraitEl) portraitEl.classList.add("hidden");
    }

    if (propsEl) {
      const positions = [
        "left:6%;top:14%;animation-delay:0s;",
        "right:7%;top:16%;animation-delay:-0.2s;",
        "left:8%;bottom:16%;animation-delay:-0.4s;",
        "right:8%;bottom:18%;animation-delay:-0.15s;",
        "left:22%;top:8%;animation-delay:-0.3s;",
        "right:22%;bottom:10%;animation-delay:-0.5s;"
      ];
      propsEl.innerHTML = pending.props
        .slice(0, 6)
        .map((icon, i) => `<span class="cutin-prop-item" style="${positions[i % positions.length]}">${icon}</span>`)
        .join("");
    }

    overlay.classList.remove("hidden");
  }

  updateUltimateCutin(dt, headless = this.headless) {
    if (!this.pendingUltimate || !this.running || this.paused || this.finale) return 0;
    const ult = this.getCombatConfig().ultimate;
    let realLeft = dt / this.playbackSpeed, advanced = 0;
    while (realLeft > 1e-9 && this.pendingUltimate) {
      const p = this.pendingUltimate;
      if (p.caster.hp <= 0 || p.target.hp <= 0) { this.clearUltimate(); break; }
      if (p.phase === "arena" && !p.slowStarted && p.remaining <= ult.dodgeWindow + 1e-9 && p.slot.effectKind !== "pk_col_2") {
        p.slowStarted = true;
        p.slowRemaining = ult.slowDuration;
      }
      const slowing = p.slowRemaining > 1e-9;
      const rate = this.playbackSpeed * (slowing ? ult.slowScale : 1);
      let boundary = p.phase === "arena" && !p.slowStarted && p.slot.effectKind !== "pk_col_2" ? Math.max(0, p.remaining - ult.dodgeWindow) : p.remaining;
      const counterAt = ult.counterWindow * 0.75;
      if (p.phase === "arena" && p.target.isPlayer && !p.responseUsed && p.slot.effectKind !== "pk_col_2" &&
          this.scenarioResponseEnabled("counter") && p.remaining > counterAt + 1e-9) {
        boundary = Math.min(boundary, p.remaining - counterAt);
      }
      const slice = Math.min(realLeft, boundary / rate, slowing ? p.slowRemaining : Infinity);
      const step = slice * rate;
      p.remaining = Math.max(0, p.remaining - step);
      if (slowing) p.slowRemaining = Math.max(0, p.slowRemaining - slice);
      realLeft -= slice; advanced += step;
      if (p.phase === "cutin") {
        const stage = Math.min(2, Math.floor((1 - p.remaining / p.total) * 3));
        if (stage !== p.stageIndex && !headless) window.memeAudio.playCutinPhaseCue?.(stage, p.caster.heroId);
        p.stageIndex = stage;
        if (!headless) {
          const overlay = document.getElementById("ultimate-cutin-overlay");
          if (overlay) overlay.dataset.stage = String(stage + 1);
          const timer = document.getElementById("cutin-timer");
          if (timer) timer.textContent = `${p.remaining.toFixed(2)}s`;
          const tag = document.getElementById("cutin-stage-tag");
          if (tag) tag.textContent = p.stages[stage];
          const bar = document.getElementById("cutin-progress-fill");
          if (bar) bar.style.width = `${p.remaining / p.total * 100}%`;
          for (let i = 0; i < 3; i++) document.getElementById(`cutin-step-${i + 1}`)?.classList.toggle("active", i === stage);
        }
        if (p.remaining <= 1e-9) this.beginArenaUltimate(headless);
      } else {
        const progress = 1 - p.remaining / p.total;
        if (!headless && p.total - p.remaining >= 0.1) this.showUltimateCutin(false);
        p.attack.x = p.attack.fromX + (p.attack.toX - p.attack.fromX) * progress;
        p.attack.y = p.attack.fromY + (p.attack.toY - p.attack.fromY) * progress;
        p.caster.morphScale.current += (p.caster.morphScale.target - p.caster.morphScale.current) * (1 - Math.exp(-8 * step));
        if (p.caster.heroId === "hajimi") {
          p.caster.x = p.attack.x; p.caster.y = p.attack.y;
          this.clampFighter(p.caster);
        }
        if (p.dodged) {
          this.updateMorph(p.target, p.caster, step, headless);
          p.target.x += p.target.vx * step * 2; p.target.y += p.target.vy * step * 2;
          this.clampFighter(p.target);
        }
        this.ultimateDodgeWindow = p.slot.effectKind !== "pk_col_2" && p.remaining <= ult.dodgeWindow + 1e-9 ? p.remaining : 0;
        this.syncUltimateControls();
        this.updateScenarioResponses(headless);
        if (p.remaining <= 1e-9) {
          const auto = !p.target.isPlayer || (this.options.autoBattle ?? this.store.state.autoBattle);
          if (auto && !p.responseUsed && p.slot.effectKind !== "pk_col_2") {
            const chance = Math.min(0.6, 0.08 + p.target.stance / p.target.maxStance * 0.12 + (this.hasPerk(p.target, "pk_sifu_4") ? 0.25 : 0) + (this.hasPerk(p.target, "pk_sifu_3") ? (72 - p.target.age) * 0.001 : 0));
            if (this.random() < chance) this.acceptUltimateDodge(p, headless);
          }
          this.resolveUltimateCutin(headless);
        }
      }
      this.syncUltimateControls();
    }
    return advanced;
  }

  beginArenaUltimate(headless) {
    const p = this.pendingUltimate;
    const ult = this.getCombatConfig().ultimate;
    p.phase = "arena"; p.total = p.remaining = ult.arenaDuration;
    this.state = "climax";
    const aerial = p.caster.heroId === "laoda" || p.caster.heroId === "kunge";
    p.attack = { fromX: aerial ? p.target.x - 180 : p.caster.x, fromY: aerial ? this.arena.y - 90 : p.caster.y,
      toX: p.target.x, toY: p.target.y, radius: Math.max(65, p.target.radius + 24) };
    p.attack.x = p.attack.fromX; p.attack.y = p.attack.fromY;
    p.caster.morphScale.target = 1.8;
    p.caster.morphState = null;
    if (!headless) document.getElementById("ultimate-cutin-overlay")?.classList.add("departing");
    if (!headless) window.memeAudio.playUltImpactLaunch?.(p.caster.heroId);
  }

  clearUltimate(resolving = false) {
    if (this.pendingUltimate && !resolving) {
      this.recordUltimateHit(this.pendingUltimate.caster, { ultimateCore: true }, { reasons: ['施法中断'] });
    }
    if (this.pendingUltimate) this.pendingUltimate.caster.morphScale.target = 1;
    this.pendingUltimate = null;
    this.ultimateDodgeWindow = 0;
    this.showUltimateCutin(false);
    this.syncUltimateControls();
  }

  resolveUltimateCutin(headless = this.headless) {
    const p = this.pendingUltimate;
    if (!p || p.phase !== "arena" || p.remaining > 1e-9 || this.paused || !this.running) return false;
    const { caster, target, slot, attack } = p;
    this.clearUltimate(true);
    this.state = "battle";
    if (!headless) {
      this.motionBurst({ x: attack.toX, y: attack.toY, accent: caster.accent }, false);
      this.skillVfxList.push({ kind: "climax_crater", x: attack.toX, y: attack.toY, color: caster.accent, life: 0.9, maxLife: 0.9 });
      this.triggerShake(p.dodged ? 8 : 26, 0.4);
    }
    if (p.dodged) {
      target.dodgeTimer = this.getCombatConfig().ultimate.dodgeInvulnerability;
      this.recordUltimateHit(caster, { ultimateCore: true }, { reasons: ['已被回避'] });
      return true;
    }
    if (slot.effectKind !== "pk_col_2") {
      const coreDamage = target.maxHp * this.ultimateRatio("active", slot.level);
      this.applyDamage(caster, target, coreDamage * (p.countered ? 0.5 : 1), slot.name, false, headless, { ultimateCore: true, responseResolved: true, counterReduction: p.countered ? coreDamage * 0.5 : 0 });
      if (!headless) this.spawnText(p.countered ? "CLASH · 极限拆招" : "CRITICAL CLIMAX!!", attack.toX, attack.toY - 85, p.countered ? "#00f0ff" : "#ffe600", 27);
    }
    if (p.countered) {
      const angle = Math.atan2(caster.y - target.y, caster.x - target.x);
      caster.vx = Math.cos(angle) * 700; caster.vy = Math.sin(angle) * 700;
      this.applyDamage(target, caster, target.maxHp * this.ultimateRatio("active", slot.level) * this.getCombatConfig().ultimate.counterReflectRatio, "拆招反震", false, headless, { ultimateCore: true, secondary: true, responseResolved: true });
      this.hitstopTimer = 0.12;
      this.dodgeFlashTimer = 0.12;
      if (!headless) window.memeAudio.playClash(true);
    } else this.executeUltimateEffect(caster, target, slot, headless);
    if (slot.effectKind === 'pk_col_2') this.recordUltimateHit(caster, { ultimateCore: true }, { reasons: ['成长究极：回血与体型成长，无核心伤害'] });
    return true;
  }

  executeUltimateEffect(caster, target, slot, headless) {
    const kind = slot.effectKind;
    const ult = this.getCombatConfig().ultimate;
    if (kind === "ult_truck_stampede") {
      for (let i = 0; i < ult.secondaryCount; i++) this.summons.push({ owner: caster, x: this.arena.x - 80 - i * 108, y: this.arena.y + 85 + ((i * 155) % (this.arena.h - 125)), vx: 780, w: 122, h: 58, dmg: caster.ultimateSequenceState.secondaryDamage, ultimateSecondary: true, ultimateSequence: caster.ultimateSequenceState, hitDone: false });
    } else if (kind === "ult_cat_frenzy" || kind === "ult_heli_crash" || kind === "ult_basketball_rain") {
      for (let i = 0; i < ult.secondaryCount; i++) {
        this.spawnSummon(caster, target, caster.ultimateSequenceState.secondaryDamage, slot.name, 0, caster.ultimateSequenceState);
        const summon = this.summons[this.summons.length - 1];
        summon.x -= (i + 1) * summon.vx * 0.12;
        summon.y -= (i + 1) * summon.vy * 0.12;
      }
      if (kind === "ult_cat_frenzy") {
        caster.frenzyTimer = Math.max(caster.frenzyTimer || 0, 3.5);
        if (!headless) this.spawnText("😾 哈——！！千爪破防！", target.x, target.y - 68, "#ffe600", 25);
      }
      if (!headless && kind === "ult_heli_crash") this.spawnText("🚁 孩子们！Mamba Out!", target.x, target.y - 68, "#ffe600", 25);
      if (!headless && kind === "ult_basketball_rain") this.spawnText("🏀 鸡你太美·万凰陨石！", target.x, target.y - 68, "#00d4ff", 25);
    } else if (kind === "pk_col_2") {
      this.growFighter(caster, 0.25, 0, headless, "蒙多巨大化"); this.applyHeal(caster, 220, "蒙多狂暴回血", headless);
    } else if (kind === "pk_mag_2") {
      this.spawnProjectiles(caster, target, ult.mageSecondaryCount, target.maxHp * ult.secondaryDamageRatio, 540, caster.accent, 14, "default", true);
    } else if (kind === "pk_sifu_5") {
      this.timeStopTimer = 2.0; this.timeStopOwner = caster; caster.activeSlots.forEach((activeSlot) => { if (!activeSlot.isUlt) activeSlot.cdLeft = Math.min(activeSlot.cdLeft, 0.4); });
    }
  }

  syncUltimateControls() {
    if (this.headless || typeof document === "undefined") return;
    const p = this.pendingUltimate;
    const visible = !!(p && p.phase === "arena" && p.target.isPlayer && !p.responseUsed && this.ultimateDodgeWindow > 0 && !this.paused);
    document.getElementById("ultimate-response")?.classList.toggle("hidden", !visible);
    for (const id of ["ultimate-dodge-btn", "ultimate-counter-btn", "ultimate-dodge-fallback", "ultimate-counter-fallback"]) {
      const button = document.getElementById(id);
      if (!button) continue;
      button.classList.toggle("hidden", !visible);
      button.disabled = !visible;
    }
    const hint = document.getElementById("ultimate-response-hint");
    if (hint && visible) hint.textContent = p.remaining <= this.getCombatConfig().ultimate.counterWindow + 1e-9 ? "现在拆招 · F / 空格" : "现在回避 · D；拆招还需更晚";
  }

  canRespondUltimate() {
    const p = this.pendingUltimate;
    return !!(this.running && !this.paused && !this.finale && p?.phase === "arena" && p.target.isPlayer && p.target.hp > 0 && p.caster.hp > 0 && !p.responseUsed && this.ultimateDodgeWindow > 0);
  }

  acceptUltimateDodge(p, headless) {
    p.dodged = p.responseUsed = true;
    p.target.isDodging = true;
    p.target.dodgeTimer = this.getCombatConfig().ultimate.dodgeInvulnerability;
    this.startEvadeMotion(p.target, p.caster);
    this.addUltimateEnergy(p.target, this.getCombatConfig().ultimate.gainOnPerfectDodge);
    window.BattleEffects.onDodge(this, p.target, p.caster, headless);
    if (!headless) {
      window.memeAudio.playSifuDodge();
      this.spawnText("PERFECT EVASION!!", p.target.x, p.target.y - p.target.radius - 40, "#00ff88", 25);
    }
  }

  triggerUltimateDodge() {
    if (!this.canRespondUltimate()) return false;
    this.acceptUltimateDodge(this.pendingUltimate, this.headless);
    this.syncUltimateControls();
    return true;
  }

  triggerUltimateCounter() {
    if (!this.canRespondUltimate()) return false;
    const p = this.pendingUltimate;
    p.responseUsed = true;
    p.countered = p.remaining <= this.getCombatConfig().ultimate.counterWindow + 1e-9;
    if (!p.countered && !this.headless) this.spawnText("拆招过早", p.target.x, p.target.y - 60, "#ff2a54", 22);
    this.syncUltimateControls();
    return p.countered;
  }

  // 构建参战实体
  createFighter(heroId, isPlayer, pickedPerks, mirrorLevelAvg = 1) {
    const store = this.store;
    const heroCfg = window.MEME_DATA.heroes[heroId];

    // 普通主动技
    let normalSkill = heroCfg.normalSkills[0];
    let normalLv = 1;
    if (isPlayer) {
      const eqId = store.state.equippedNormal[heroId];
      normalSkill = heroCfg.normalSkills.find((s) => s.id === eqId) || heroCfg.normalSkills[0];
      normalLv = store.state.skillLevels[normalSkill.id] || 1;
    } else {
      normalSkill = heroCfg.normalSkills[Math.floor(this.random() * heroCfg.normalSkills.length)];
      normalLv = Math.max(1, Math.round(mirrorLevelAvg));
    }

    // 究极技（可能是主动，也可能是被动）
    let ultSkill = heroCfg.ultSkills[0];
    let ultLv = 1;
    if (isPlayer) {
      const eqUltId = store.state.equippedUlt[heroId];
      ultSkill = heroCfg.ultSkills.find((u) => u.id === eqUltId) || heroCfg.ultSkills[0];
      ultLv = store.state.skillLevels[ultSkill.id] || 1;
    } else {
      ultSkill = heroCfg.ultSkills[Math.floor(this.random() * heroCfg.ultSkills.length)];
      ultLv = Math.max(1, Math.round(mirrorLevelAvg));
    }

    // 组装主动技能槽位（最多 5 个：1普通主动 + [0或1主动究极] + [0~3主动词条]）
    const activeSlots = [];
    activeSlots.push({
      slotId: "normal_active",
      name: normalSkill.name,
      isUlt: false,
      level: normalLv,
      cooldown: normalSkill.cooldown,
      cdLeft: 0.8 + this.random() * 0.6,
      baseDamage: normalSkill.baseDamage,
      shout: normalSkill.shout,
      skillId: normalSkill.id,
      effectKind: normalSkill.effectKind,
      animationType: normalSkill.animationType,
      sourceType: "heroSkill"
    });

    if (ultSkill.type === "active") {
      activeSlots.push({ slotId: "ult_active", name: ultSkill.name, isUlt: true, level: ultLv, cooldown: 0, cdLeft: 0, shout: ultSkill.shout, effectKind: ultSkill.effectKind, animationType: ultSkill.animationType, sourceType: "heroUlt" });
    }

    pickedPerks.forEach((pk, idx) => {
      if (pk.type === "active") {
        activeSlots.push({ slotId: `perk_active_${idx}`, perkId: pk.id, name: pk.name, isUlt: pk.ultimate === true, level: 1, cooldown: pk.ultimate ? 0 : (pk.cooldown || 4.5), cdLeft: pk.ultimate ? 0 : 1.4 + idx * 0.7, baseDamage: pk.baseDamage || 90, heal: pk.heal || 0, shout: pk.shout, effectKind: pk.id, animationType: pk.animationType, sourceType: "perk" });
      }
    });

    // 初始位置与老式 DVD 弹球速度
    const startX = isPlayer ? this.arena.x + 115 : this.arena.x + this.arena.w - 115;
    const startY = this.arena.y + this.arena.h * (0.35 + this.random() * 0.3);
    const angle = (this.random() * 0.5 + 0.2) * Math.PI * (isPlayer ? 1 : -1);
    const hasSpeedPerk = pickedPerks.some((p) => p.id === "pk_asn_3" || p.id === "pk_mag_1");
    const baseSpd = (300 + this.random() * 25) * (hasSpeedPerk ? 1.14 : 1.0);

    return {
      isPlayer,
      heroId,
      name: heroCfg.name,
      emoji: heroCfg.emoji,
      color: heroCfg.color,
      accent: heroCfg.accent,
      x: startX,
      y: startY,
      vx: Math.cos(angle) * baseSpd,
      vy: Math.sin(angle) * baseSpd,
      baseSpd,
      radius: this.getCombatConfig().fighter.baseRadius,
      maxHp: this.getCombatConfig().fighter.defaultMaxHp,
      hp: this.getCombatConfig().fighter.defaultMaxHp,
      maxShield: this.getCombatConfig().fighter.maxShield,
      shield: 0,
      corePassives: heroCfg.corePassives,
      ultSkill,
      ultLv,
      perks: pickedPerks,
      buildTags: [...new Set(pickedPerks.map((perk) => perk.archetype).filter(Boolean))],
      activeSlots,
      ultimateEnergy: this.getCombatConfig().ultimate.initialEnergy,
      ultimateSequence: 0,
      ultimateSequenceState: null,
      growthTimer: 0,
      regenTimer: 0,
      ageTimer: 0,
      age: 20,
      earlyBurst: 1,
      stance: 100,
      maxStance: 100,
      dodgeTimer: 0,
      isDodging: false,
      dodgeCount: 0,
      stunTimer: 0,
      slowTimer: 0,
      frenzyTimer: 0,
      nextWallHit: false,
      damageGrowthStage: 0,
      orbitTimer: 0,
      damageDealt: 0,
      damageTaken: 0,
      nineLivesUsed: false,
      pddImmortalUsed: false,
      immortalTimer: 0,
      hitCounter: 0,
      castCount: 0,
      morphState: null,
      morphScale: { current: 1, target: 1, speed: 8 },
      phantomTimer: 0,
      phantomColor: heroCfg.accent,
      phantomClock: 0,
      scaleAnim: 1.0
    };
  }

  startMatch(p1HeroId, p1Perks, matchOptions = {}) {
    this.stop();
    const recording = this.scenario?.recording ? this.scenario : null;
    this.mode = recording ? "classic" : this.options.mode || this.store.state.matchMode || "quick";
    if (recording) {
      p1HeroId = recording.p1HeroId;
      p1Perks = [];
    }
    const rules = window.GAME_CONFIG.modes[this.mode];
    this.maxMatchDuration = rules.duration;
    this.elapsed = 0;
    this.outcome = null;
    this.state = "battle";
    const store = this.store;
    const allHeroIds = Object.keys(window.MEME_DATA.heroes);
    const p2HeroId = recording ? recording.p2HeroId : matchOptions.p2HeroId || allHeroIds[Math.floor(this.random() * allHeroIds.length)];

    // AI 随机抽3个词条
    const p2Perks = recording ? [] : matchOptions.p2Perks || window.GameRandom.shuffle(window.MEME_DATA.perks, this.random).slice(0, 3);

    // 计算玩家当前角色的技能平均等级，给 AI 镜像匹配相近强度，使双方技能等级相近，实际表现由模拟器检测
    const eqN = store.state.equippedNormal[p1HeroId];
    const eqU = store.state.equippedUlt[p1HeroId];
    const p1AvgLv = ((store.state.skillLevels[eqN] || 1) + (store.state.skillLevels[eqU] || 1)) / 2;

    this.p1 = this.createFighter(p1HeroId, true, p1Perks, p1AvgLv);
    this.p2 = this.createFighter(p2HeroId, false, p2Perks, p1AvgLv);

    // 双方技能等级越高，等比例提升双方最大生命值，确保长局构筑有时间成型
    const hpScale = 1 + (p1AvgLv - 1) * 0.32;
    this.p1.maxHp = Math.round(rules.initialHp * hpScale * (this.hasPerk(this.p1, "pk_asn_3") ? 0.85 : 1));
    this.p1.hp = this.p1.maxHp;
    this.p2.maxHp = Math.round(rules.initialHp * hpScale * (this.hasPerk(this.p2, "pk_asn_3") ? 0.85 : 1));
    this.p2.hp = this.p2.maxHp;
    this.p1.maxShield = Math.round(this.getCombatConfig().fighter.maxShield * hpScale);
    this.p2.maxShield = Math.round(this.getCombatConfig().fighter.maxShield * hpScale);
    this.p1.shield = 0;
    this.p2.shield = 0;
    this.initCombatInsights();

    this.projectiles = [];
    this.floatingTexts = [];
    this.ringEffects = [];
    this.summons = [];
    this.trails = [];
    this.particleBursts = [];
    this.ultImpactEffects = [];
    this.pendingUltimate = null;
    this.ultimateDodgeWindow = 0;
    this.currentPhase = "early";
    this.lastPhase = "early";
    this.phaseAnnounced = false;
    this.arenaPulse = 0;
    this.matchTimeLeft = this.maxMatchDuration;
    this.manualPerfectCount = 0;
    this.spinArenaTimer = 0;
    this.timeStopTimer = 0;
    this.qteTimer = 0;
    this.qteCooldown = 2.8;
    this.running = true;
    this.paused = false;
    this.hudTags.clear();
    if (this.scenario) {
      this.scenario.cursor = 0;
      this.scenario.started = true;
      this.scenario.finished = false;
      this.scenario.caption = null;
      this.scenario.chapter = "";
      this.scenario.hpFloors = { p1: 0, p2: 0 };
      this.scenario.response = "both";
      this.setSpeed(recording ? 1 : this.scenario.initialSpeed);
      if (!this.headless) this.onScenarioChange?.();
    }

    if (!this.headless) {
      document.getElementById("draft-overlay")?.classList.add("hidden");
      const pauseButton = document.getElementById("btn-pause");
      if (pauseButton) pauseButton.textContent = "暂停";
      this.renderSkillBarUI();
      this.updateTopHudUI();
      this.spawnText("⚡ 神人乱斗开始!!", this.width / 2, this.arena.y + 100, "#ffe600", 30);
      this.lastTime = performance.now();
      const generation = this.generation;
      this.frameId = requestAnimationFrame((t) => this.loop(t, generation));
    }
    this.updateScenario(this.headless);
  }

  loop(now, generation = this.generation) {
    if (!this.running || generation !== this.generation) return;
    const rawDt = Math.min(0.25, Math.max(0, (now - this.lastTime) / 1000));
    this.lastTime = now;

    if (this.finale) {
      const finale = this.finale;
      finale.tick(rawDt);
      this.draw();
      if (this.finale) this.finale.draw(this.ctx);
      if (this.running) this.frameId = requestAnimationFrame((t) => this.loop(t, generation));
      return;
    }
    if (!this.paused) {
      this.accumulator += rawDt * this.playbackSpeed;
      const step = window.GAME_CONFIG.fixedStep;
      while (this.accumulator >= step && this.running && !this.paused && !this.finale) {
        this.accumulator -= step;
        this.update(step, false);
      }
    }
    this.draw();

    if (this.running) {
      this.frameId = requestAnimationFrame((t) => this.loop(t, generation));
    }
  }

  // 核心每帧更新（支持最多300秒长局与前/中/后期构筑演进）
  update(dt, headless = this.headless) {
    if (!this.running || this.paused || this.finale) return;
    if (this.pendingUltimate) {
      const advanced = this.updateUltimateCutin(dt, headless);
      this.elapsed += advanced;
      this.matchTimeLeft = Math.max(0, this.maxMatchDuration - this.elapsed);
      this.updatePhase(headless);
      this.updateScenario(headless);
      if (!headless) { this.updateParticles(advanced); this.updateTopHudUI(); }
      this.checkFinished();
      return;
    }
    this.elapsed += dt;
    this.matchTimeLeft = Math.max(0, this.maxMatchDuration - this.elapsed);
    if (this.checkFinished()) return;
    this.updatePhase(headless);
    this.updateScenario(headless);
    if (!this.running || this.paused || this.finale) return;
    this.dodgeFlashTimer = Math.max(0, this.dodgeFlashTimer - dt);
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      if (!headless) this.updateTopHudUI();
      return;
    }
    if (this.shakeTimer > 0) this.shakeTimer -= dt;
    if (this.spinArenaTimer > 0) this.spinArenaTimer -= dt;
    if (this.timeStopTimer > 0) this.timeStopTimer -= dt;
    if (this.arenaPulse > 0) this.arenaPulse -= dt;
    if (this.announcerTimer > 0) this.announcerTimer -= dt;


    if (!headless || this.isRecordingActive()) {
      const dist = Math.hypot(this.p1.x - this.p2.x, this.p1.y - this.p2.y);
      const qteBtn = headless ? null : document.getElementById("qte-counter-btn");
      if (this.qteTimer > 0) {
        this.qteTimer -= dt;
        if (this.qteTimer <= 0 && qteBtn) qteBtn.classList.add("hidden");
      } else {
        this.qteCooldown -= dt;
        if (this.qteCooldown <= 0 && dist < 175) {
          this.qteTimer = 1.35;
          this.qteCooldown = 4.2;
          if (qteBtn) qteBtn.classList.remove("hidden");
        }
      }
    }
    this.updateScenarioResponses(headless);

    for (const job of this.queuedCasts) job.remaining -= dt;
    const due = this.queuedCasts.filter((job) => job.remaining <= 0);
    for (const job of due) {
      if (!this.canAct(job.caster)) continue;
      this.queuedCasts.splice(this.queuedCasts.indexOf(job), 1);
      this.castActiveSlot(job.caster, job.target, job.index, false, headless, true);
      if (this.pendingUltimate || this.checkFinished()) return;
    }
    this.updateFighter(this.p1, this.p2, dt, headless);
    if (this.pendingUltimate || this.checkFinished()) return;
    this.updateFighter(this.p2, this.p1, dt, headless);
    if (this.pendingUltimate || this.checkFinished()) return;
    this.handleFighterCollision(headless);
    this.updateProjectiles(dt, headless);
    this.updateSummons(dt, headless);
    this.updateClones(dt, headless);
    if (this.currentPhase === "overtime") {
      // 最后一阶段抑制无限续航，双方按最大血量承受相同持续压力。
      for (const fighter of [this.p1, this.p2]) fighter.hp = Math.max(0, fighter.hp - fighter.maxHp * 0.02 * dt);
    }
    if (this.checkFinished()) return;

    if (!headless) {
      this.updateParticles(dt);
      this.updateTopHudUI();
      this.updateSkillCooldownUI();
    }
  }

  updateFighter(f, enemy, dt, headless) {
    if (f.hp <= 0) return;
    f.stunTimer = Math.max(0, f.stunTimer - dt);
    f.slowTimer = Math.max(0, f.slowTimer - dt);
    f.frenzyTimer = Math.max(0, f.frenzyTimer - dt);
    if (f.immortalTimer > 0) f.immortalTimer -= dt;
    if (f.wallBoostTimer > 0) f.wallBoostTimer -= dt;
    const isFrozen = (this.timeStopTimer > 0 && this.timeStopOwner !== f) || f.stunTimer > 0;
    if (isFrozen) return;
    f.scaleAnim += (1.0 - f.scaleAnim) * 10 * dt;
    const motionOwnsPosition = this.updateMorph(f, enemy, dt, headless);
    this.updateBuilds(f, enemy, dt, headless);

    // 被动究极与主动槽共用满能量触发门槛。
    if (f.ultSkill && f.ultSkill.type === "passive" && f.ultimateEnergy >= this.getCombatConfig().ultimate.maxEnergy) {
      this.triggerPassiveUlt(f, enemy, headless);
    }

    // 时停冻结判定
    if (!motionOwnsPosition) {
      // 滚筒洗衣机向心旋转力
      if (this.spinArenaTimer > 0) {
        const cx = this.arena.x + this.arena.w / 2;
        const cy = this.arena.y + this.arena.h / 2;
        f.vx += (cx - f.x) * 2.8 * dt;
        f.vy += (cy - f.y) * 2.8 * dt;
      }

      const spdMult = (f.wallBoostTimer > 0 ? 1.25 : 1.0) * (f.hp / f.maxHp < 0.4 ? 1.15 : 1.0) * (f.slowTimer > 0 ? 0.65 : 1) * (f.morphState?.type === "evade" ? 2 : 1);
      f.x += f.vx * spdMult * dt * window.GAME_CONFIG.speed.movement;
      f.y += f.vy * spdMult * dt * window.GAME_CONFIG.speed.movement;

      // 保持基础动量
      const curSpd = Math.hypot(f.vx, f.vy) || 1;
      const targetSpd = f.baseSpd;
      f.vx = (f.vx / curSpd) * (curSpd * 0.96 + targetSpd * 0.04);
      f.vy = (f.vy / curSpd) * (curSpd * 0.96 + targetSpd * 0.04);

      // 墙壁 DVD 反弹
      let bounced = false;
      const r = f.radius;
      if (f.x - r < this.arena.x) { f.x = this.arena.x + r; f.vx = Math.abs(f.vx); bounced = true; }
      if (f.x + r > this.arena.x + this.arena.w) { f.x = this.arena.x + this.arena.w - r; f.vx = -Math.abs(f.vx); bounced = true; }
      if (f.y - r < this.arena.y) { f.y = this.arena.y + r; f.vy = Math.abs(f.vy); bounced = true; }
      if (f.y + r > this.arena.y + this.arena.h) { f.y = this.arena.y + this.arena.h - r; f.vy = -Math.abs(f.vy); bounced = true; }

      if (bounced) {
        // 轻微随机偏转防止死循环轨迹
        const jitter = (this.random() - 0.5) * 0.18;
        const ca = Math.cos(jitter), sa = Math.sin(jitter);
        const nvx = f.vx * ca - f.vy * sa;
        const nvy = f.vx * sa + f.vy * ca;
        f.vx = nvx;
        f.vy = nvy;

        if (!headless) window.memeAudio.playWallBounce();

        // 大运被动：百吨惯性
        if (f.heroId === "dayun") {
          f.wallBoostTimer = 1.6;
          f.nextWallHit = true;
        }
        // 弹簧肉垫词条：摸墙回血
        if (this.hasPerk(f, "pk_vmp_4")) {
          this.applyHeal(f, 45, "弹簧肉垫+45", headless);
        }
      }
    }

    // 主动技能冷却、法术急速与自动施放
    const autoEnabled = this.isRecordingActive() || (f.isPlayer ? (this.options.autoBattle ?? this.store.state.autoBattle) : true);
    f.activeSlots.forEach((slot, idx) => {
      const ageHaste = this.hasPerk(f, "pk_sifu_3") ? 1 + (72 - f.age) * 0.003 : 1;
      const haste = (this.hasPerk(f, "pk_mag_1") ? 1.65 : 1.0) * ageHaste * (f.frenzyTimer > 0 ? 1.25 : 1);
      const behindBoost = f.hp < enemy.hp * 0.78 ? 1.22 : 1.0;
      if (!slot.isUlt) slot.cdLeft = Math.max(0, slot.cdLeft - dt * behindBoost * haste);
      if ((slot.isUlt ? f.ultimateEnergy >= this.getCombatConfig().ultimate.maxEnergy : slot.cdLeft <= 0) && autoEnabled && !isFrozen) {
        if (this.random() < 1 - Math.exp(-5 * dt)) this.castActiveSlot(f, enemy, idx, false, headless);
      }
    });
    if (f.ultSkill.id === "kg_u2" && !isFrozen) {
      f.orbitTimer += dt;
      if (f.orbitTimer >= 0.5 && Math.hypot(f.x - enemy.x, f.y - enemy.y) < f.radius + enemy.radius + 36) {
        f.orbitTimer = 0;
        const growth = 1 + (f.ultLv - 1) * this.getCombatConfig().passiveSkillDamageGrowth;
        this.applyDamage(f, enemy, this.getCombatConfig().passiveOrbitDamage * growth, "护体篮球", false, headless);
      }
    }
  }

  // 两球肉搏碰撞结算
  handleFighterCollision(headless) {
    const a = this.p1;
    const b = this.p2;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    const minDist = a.radius + b.radius;

    if (dist < minDist && dist > 0.001) {
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = minDist - dist;
      a.x -= nx * (overlap * 0.5 + 2);
      a.y -= ny * (overlap * 0.5 + 2);
      b.x += nx * (overlap * 0.5 + 2);
      b.y += ny * (overlap * 0.5 + 2);

      // 交换并弹开速度
      const bounceSpd = 310;
      a.vx = -nx * bounceSpd + (this.random() - 0.5) * 90;
      a.vy = -ny * bounceSpd + (this.random() - 0.5) * 90;
      b.vx = nx * bounceSpd + (this.random() - 0.5) * 90;
      b.vy = ny * bounceSpd + (this.random() - 0.5) * 90;

      const collision = this.getCombatConfig().collision;
      const dmgAtoB = (collision.baseDamage + (a.heroId === "dayun" && a.nextWallHit ? collision.dayunWallHit : 0) + (a.heroId === "laoda" ? collision.laodaElbow : 0)) * Math.max(1, a.radius / this.getCombatConfig().fighter.baseRadius);
      const dmgBtoA = (collision.baseDamage + (b.heroId === "dayun" && b.nextWallHit ? collision.dayunWallHit : 0) + (b.heroId === "laoda" ? collision.laodaElbow : 0)) * Math.max(1, b.radius / this.getCombatConfig().fighter.baseRadius);
      for (const fighter of [a, b]) {
        if (fighter.heroId === "dayun" && fighter.nextWallHit) this.growFighter(fighter, 0.02, 0, headless, "百吨惯性");
        fighter.nextWallHit = false;
      }

      this.applyDamage(a, b, dmgAtoB, "肉搏冲撞!", false, headless);
      this.applyDamage(b, a, dmgBtoA, "肉搏冲撞!", false, headless);

      // 哈基米核心被动：应激哈气反震
      if (a.heroId === "hajimi" && this.random() < 0.35) {
        this.applyDamage(a, b, 60, "😾应激哈气!!", true, headless);
        if (!headless) {
          window.memeAudio?.playHeroEventVoice?.("hajimi", "hit", "哈气", false);
          this.spawnSkillVfx({ kind: "cat_hiss_wave", x: a.x, y: a.y, toX: b.x, toY: b.y, color: "#ff9500", accent: "#00f0ff", life: 0.42, maxLife: 0.42 });
        }
      }
      if (b.heroId === "hajimi" && this.random() < 0.35) {
        this.applyDamage(b, a, 60, "😾应激哈气!!", true, headless);
        if (!headless) {
          window.memeAudio?.playHeroEventVoice?.("hajimi", "hit", "哈气", false);
          this.spawnSkillVfx({ kind: "cat_hiss_wave", x: b.x, y: b.y, toX: a.x, toY: a.y, color: "#ff9500", accent: "#00f0ff", life: 0.42, maxLife: 0.42 });
        }
      }

      // 心之钢：肉搏碰撞触发金属叮声与永久成长
      [a, b].forEach((fighter) => {
        if (this.hasPerk(fighter, "pk_col_1")) {
          this.growFighter(fighter, 0.05, 65, headless, "心之钢叠层");
          if (!headless) window.memeAudio.playHeartsteelClang();
        }
      });

      a.stance = Math.max(0, a.stance - collision.stanceLoss);
      b.stance = Math.max(0, b.stance - collision.stanceLoss);
      this.addUltimateEnergy(a, this.getCombatConfig().ultimate.gainOnCollision);
      this.addUltimateEnergy(b, this.getCombatConfig().ultimate.gainOnCollision);

      this.hitstopTimer = 0.035;
      if (!headless) {
        // applyDamage emits the impact sound at contact.
        this.triggerShake(8, 0.14);
      }
    }
  }

  // 释放底部 1~5 号主动技能（isManual = true 代表玩家手点，检测贴脸时机给予精准暴击加成）
  castActiveSlot(caster, target, slotIndex, isManual = false, headless = this.headless, isRepeat = false) {
    if (!caster || !target || !this.canAct(caster) || target.hp <= 0) return false;
    const originalSlot = caster.activeSlots[slotIndex];
    if (!originalSlot) return false;
    if (originalSlot.isUlt) return this.startUltimateCutin(caster, target, { ...originalSlot, isRepeat });
    if (!isRepeat && originalSlot.cdLeft > 0) return false;
    const slot = { ...originalSlot, isRepeat };
    if (!isRepeat) {
      originalSlot.cdLeft = slot.cooldown;
      caster.castCount++;
      this.addUltimateEnergy(caster, this.getCombatConfig().ultimate.gainOnCast);
    }
    caster.scaleAnim = 1.38;

    // 技能等级加成（角色技能升级：伤害与特效规模成长）

    // 贴脸时机判定：玩家手动点击时，若两球距离 < 210px，触发完美命中
    const dist = Math.hypot(caster.x - target.x, caster.y - target.y);
    let timingBonus = 1.0;
    if (isManual && dist < 210) {
      timingBonus = 1.38;
      this.manualPerfectCount++;
      if (!headless) {
        this.spawnText("🎯 贴脸神时机 x1.4!!", caster.x, caster.y - 58, "#00ff88", 24);
      }
    }

    const lvMult = 1 + (slot.level - 1) * this.getCombatConfig().skillDamageGrowth;
    const rawDmg = Math.round((slot.baseDamage ?? 95) * lvMult * timingBonus);
    if (!isRepeat) window.BattleEffects.onCast(this, caster, target, slot, headless);

    if (!headless) {
      if (!isRepeat) {
        window.memeAudio.playCast(slot.heal > 0 ? "heal" : "release");
        if (slot.sourceType === "heroSkill") {
          if (slot.skillId === "kg_s2") {
            window.memeAudio.playHeroEventVoice("kunge", "shot", slot.shout || slot.name, false);
          } else if (slot.skillId === "kg_s3") {
            window.memeAudio.playHeroEventVoice("kunge", "hit", slot.shout || slot.name, false);
          } else if (slot.skillId === "hj_s3") {
            window.memeAudio.playHeroEventVoice("hajimi", "hit", slot.shout || slot.name, false);
          } else {
            window.memeAudio.playSkillSFX(caster.heroId, false, slot.shout || slot.name);
          }
        }
      }
      this.spawnText(slot.shout || slot.name, caster.x, caster.y - 36, slot.isUlt ? "#ffe600" : "#00f0ff", slot.isUlt ? 26 : 20);
      this.triggerShake(slot.isUlt ? 16 : 9, slot.isUlt ? 0.28 : 0.15);
    }
    if (this.startSkillMotion(caster, target, slot, rawDmg, headless)) return true;

    // 按技能特效类型执行
    const kind = slot.effectKind;
    if (slot.heal && slot.heal > 0) {
      this.applyHeal(caster, slot.heal, "吨吨吨回血!!", headless);
      if (kind === "pk_vmp_5") caster.shield = Math.min(caster.maxShield, caster.shield + 80);
      return true;
    }

    if (kind === "pk_mag_5") {
      this.spinArenaTimer = 3;
      this.spawnProjectiles(caster, target, 6, Math.round(rawDmg / 3), 450, caster.accent, 13);
      return true;
    }
    if (kind === "pk_sifu_2") {
      if (dist < caster.radius + target.radius + 150) {
        const fullStance = target.stance >= target.maxStance;
        target.stance = Math.max(0, target.stance - target.maxStance * 0.5);
        if (fullStance) target.stunTimer = 0.6;
        this.applyDamage(caster, target, rawDmg, slot.name, fullStance, headless);
      }
      return true;
    }

    if (kind === "dash_ram") {
      // 突进肘击/漂移冲撞/铁山靠
      const angle = Math.atan2(target.y - caster.y, target.x - caster.x);
      caster.vx = Math.cos(angle) * 560;
      caster.vy = Math.sin(angle) * 560;
      if (!headless) {
        if (caster.heroId === "kunge") caster.actionAnimTimer = 0.65;
        this.spawnSkillVfx({
          kind: caster.heroId === "dayun" ? "drift_tracks" : caster.heroId === "kunge" ? "shoulder_bump" : "mamba_elbow",
          x: caster.x,
          y: caster.y,
          toX: target.x,
          toY: target.y,
          color: caster.color,
          accent: caster.accent,
          life: 0.48,
          maxLife: 0.48
        });
      }
      // 冲刺直接造成一次范围判定或发射高速近身冲击
      if (dist < 250 || isManual) {
        this.applyDamage(caster, target, rawDmg, slot.name, isManual && dist < 210, headless);
        if (caster.heroId === "kunge") target.stance = Math.max(0, target.stance - 35);
      } else {
        this.spawnProjectiles(caster, target, 1, rawDmg, 520, caster.accent, 22, caster.heroId === "kunge" ? "basketball" : "default");
      }
    } else {
      // 通用弹幕 / 声波 / 冰红茶 / 远光灯
      if (kind === "heal_splash") {
        this.applyHeal(caster, 130, "🍹冰红茶+130", headless);
        if (!headless) {
          this.spawnSkillVfx({ kind: "icetea_splash", x: caster.x, y: caster.y, toX: target.x, toY: target.y, color: "#ff9500", accent: "#ffe600", life: 0.55, maxLife: 0.55 });
        }
      }
      if (!headless) {
        this.ringEffects.push({ x: caster.x, y: caster.y, r: 30, maxR: 170 * Math.min(1.5, lvMult), color: caster.color, alpha: 1 });
        if (kind === "beam_flash") {
          this.spawnSkillVfx({ kind: "highbeam_cone", x: caster.x, y: caster.y, toX: target.x, toY: target.y, color: "#ffe600", accent: "#ffffff", life: 0.42, maxLife: 0.42 });
        } else if (kind === "sonic_ring") {
          this.spawnSkillVfx({
            kind: caster.heroId === "kunge" ? "kun_sonic" : "cat_hiss_wave",
            x: caster.x,
            y: caster.y,
            toX: target.x,
            toY: target.y,
            color: caster.color,
            accent: caster.accent,
            life: 0.55,
            maxLife: 0.55
          });
        }
      }
      const pCount = Math.min(5, 1 + Math.floor(slot.level / 2));
      if (kind === "beam_flash") target.stance = Math.max(0, target.stance - 20);
      if (kind === "sonic_ring") {
        target.shield = Math.max(0, target.shield - 80);
        this.applyDamage(caster, target, rawDmg, slot.name, isManual && dist < 210, headless);
        const angle = Math.atan2(target.y - caster.y, target.x - caster.x);
        target.vx = Math.cos(angle) * 450;
        target.vy = Math.sin(angle) * 450;
        return true;
      }
      const visualKind = slot.skillId === "ld_s2" ? "icetea" : caster.heroId === "kunge" ? "basketball" : "default";
      this.spawnProjectiles(caster, target, pCount, Math.round(rawDmg / Math.sqrt(pCount)), 470, caster.accent, 16, visualKind);
      if (dist < 185) {
        this.applyDamage(caster, target, Math.round(rawDmg * 0.65), slot.name, isManual, headless);
      }
    }

    return true;
  }

  // 触发被动型究极技（共享能量满后一次爆发）
  triggerPassiveUlt(caster, target, headless) {
    const ult = this.getCombatConfig().ultimate;
    if (!this.canAct(caster) || target.hp <= 0 || caster.ultSkill.type !== "passive" || caster.ultimateEnergy < ult.maxEnergy) return false;
    this.beginUltimateSequence(caster, target);
    this.applyDamage(caster, target, target.maxHp * this.ultimateRatio("passive", caster.ultLv), caster.ultSkill.name, false, headless, { ultimateCore: true });
    if (!headless) {
      this.ringEffects.push({ x: caster.x, y: caster.y, r: 25, maxR: 185, color: "#ffe600", alpha: 1 });
      this.spawnText(`⚡${caster.ultSkill.name}`, caster.x, caster.y - 45, "#ffe600", 20);
      window.memeAudio.playSkillSFX(caster.heroId, false, caster.ultSkill.shout || caster.ultSkill.name);
      if (caster.ultSkill.id === "hj_u2") this.spawnSkillVfx({ kind: "laser_pointer", x: caster.x, y: caster.y, toX: target.x, toY: target.y, color: "#ff2a54", accent: "#00f0ff", life: 0.65, maxLife: 0.65 });
      if (caster.ultSkill.id === "ld_u2") this.spawnSkillVfx({ kind: "mamba_elbow", x: caster.x, y: caster.y, toX: target.x, toY: target.y, color: "#b829ff", accent: "#ffe600", life: 0.5, maxLife: 0.5 });
    }
    if (caster.ultSkill.id === "dy_u2") { this.applyHeal(caster, 90, "泥头装甲+90", headless); this.growFighter(caster, 0.04, 0, headless, "不死泥头装甲"); }
    if (caster.ultSkill.id === "kg_u2") {
      this.spawnProjectiles(caster, target, ult.passiveSecondaryCount, target.maxHp * ult.secondaryDamageRatio, 450, "#ffe600", 16, "basketball", true);
    } else {
      this.spawnProjectiles(caster, target, ult.passiveSecondaryCount, target.maxHp * ult.secondaryDamageRatio, 450, "#ffe600", 16, caster.heroId === "laoda" ? "basketball" : "default", true);
    }
    return true;
  }

  // 玩家点击屏幕中央【⚡抓时机！极限弹反】按钮
  triggerManualQTE() {
    if (!this.running || this.paused) return false;
    if (this.pendingUltimate) return this.triggerUltimateCounter();
    if (this.qteTimer <= 0) return;
    if (!this.canAct(this.p1)) return false;
    this.qteTimer = 0;
    const qteBtn = this.headless ? null : document.getElementById("qte-counter-btn");
    if (qteBtn) qteBtn.classList.add("hidden");

    this.manualPerfectCount++;
    this.hitstopTimer = 0.06;
    if (!this.headless) {
      window.memeAudio.playClash(true);
      window.memeAudio.speakMemeShout("极限弹反哈气！", this.p1.heroId, true);
      this.triggerShake(18, 0.25);
      this.ringEffects.push({ x: this.p1.x, y: this.p1.y, r: 20, maxR: 230, color: "#00ff88", alpha: 1 });
      this.spawnText("⚡ 完美弹反哈气!! 暴击+回血!", this.p1.x, this.p1.y - 60, "#00ff88", 26);
    }

    this.applyHeal(this.p1, 95, "完美防反+95", this.headless);
    this.applyDamage(this.p1, this.p2, 145, "💥极限反震!!", true, this.headless);
    this.addUltimateEnergy(this.p1, this.getCombatConfig().ultimate.gainOnPerfectDodge);
    window.BattleEffects.onDodge(this, this.p1, this.p2, this.headless);
    return true;
  }

  spawnSkillVfx(vfx) {
    if (this.headless) return;
    this.skillVfxList.push({ ...vfx, life: vfx.life || 0.5, maxLife: vfx.maxLife || vfx.life || 0.5 });
    if (this.skillVfxList.length > 24) this.skillVfxList.shift();
  }

  spawnProjectiles(caster, target, count, dmg, speed, color, radius, visualKind = "default", ultimateSecondary = false) {
    const baseAngle = Math.atan2(target.y - caster.y, target.x - caster.x);
    for (let i = 0; i < count; i++) {
      const spread = (i - (count - 1) / 2) * 0.24 + (this.random() - 0.5) * 0.16;
      const ang = baseAngle + spread;
      this.projectiles.push({ owner: caster, x: caster.x, y: caster.y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, r: radius, dmg: ultimateSecondary ? caster.ultimateSequenceState.secondaryDamage : dmg, color, visualKind, ultimateSecondary, ultimateSequence: ultimateSecondary ? caster.ultimateSequenceState : null, bouncesLeft: 1, life: 2.2 });
    }
  }

  updateProjectiles(dt, headless) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      const oldX = p.x, oldY = p.y;
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // 弹幕碰墙反弹1次
      if (p.x < this.arena.x || p.x > this.arena.x + this.arena.w) {
        if (p.bouncesLeft > 0) { p.vx *= -1; p.bouncesLeft--; } else p.life = 0;
      }
      if (p.y < this.arena.y || p.y > this.arena.y + this.arena.h) {
        if (p.bouncesLeft > 0) { p.vy *= -1; p.bouncesLeft--; } else p.life = 0;
      }
      if (p.life <= 0) {
        this.projectiles.splice(i, 1);
        continue;
      }

      for (let c = this.clones.length - 1; c >= 0; c--) {
        const clone = this.clones[c];
        if (clone.owner !== p.owner && this.segmentHits(oldX, oldY, p.x, p.y, clone, p.r)) {
          this.motionBurst({ ...clone, accent: clone.owner.accent }, headless);
          this.clones.splice(c, 1);
          p.life = 0;
          break;
        }
      }
      if (p.life <= 0) { this.projectiles.splice(i, 1); continue; }
      const target = p.owner.isPlayer ? this.p2 : this.p1;
      if (Math.hypot(p.x - target.x, p.y - target.y) < p.r + target.radius) {
        const damage = this.applyDamage(p.owner, target, p.dmg, "弹幕命中!", false, headless, { ultimateSecondary: p.ultimateSecondary, ultimateSequence: p.ultimateSequence });
        if (damage > 0 && p.slow) target.slowTimer = p.slow;
        p.life = 0;
      }

      if (p.life <= 0) this.projectiles.splice(i, 1);
    }
  }

  segmentHits(x1, y1, x2, y2, target, radius) {
    const dx = x2 - x1, dy = y2 - y1;
    const t = Math.max(0, Math.min(1, ((target.x - x1) * dx + (target.y - y1) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(x1 + dx * t - target.x, y1 + dy * t - target.y) <= radius + target.radius;
  }

  clampFighter(f) {
    f.x = Math.max(this.arena.x + f.radius, Math.min(this.arena.x + this.arena.w - f.radius, f.x));
    f.y = Math.max(this.arena.y + f.radius, Math.min(this.arena.y + this.arena.h - f.radius, f.y));
  }

  reducedEffects() {
    return this.options.reducedEffects || this.store.state.settings.effects === "reduced";
  }

  motionBurst(f, headless) {
    if (headless) return;
    const reduced = this.reducedEffects();
    this.particleBursts.push({ x: f.x, y: f.y, color: f.accent || f.color, count: reduced ? 4 : 18, life: 0.4 });
    this.ringEffects.push({ x: f.x, y: f.y, r: 12, maxR: 110, color: f.accent || f.color, alpha: 1 });
  }

  startEvadeMotion(f, attacker) {
    f.morphScale.target = 0.65;
    f.morphState = { type: "evade", elapsed: 0, duration: 0.55 };
    f.phantomTimer = 0.55;
    const angle = Math.atan2(f.y - attacker.y, f.x - attacker.x);
    f.vx = Math.cos(angle) * f.baseSpd;
    f.vy = Math.sin(angle) * f.baseSpd;
  }

  startSkillMotion(f, target, slot, damage, headless) {
    const type = slot.animationType;
    if (!type) return false;
    const angle = Math.atan2(target.y - f.y, target.x - f.x);
    if (type === "scale") {
      f.morphScale.target = 1.65;
      f.morphState = { type, elapsed: 0, duration: 0.65 };
      this.motionBurst(f, headless);
      return false;
    }
    if (type === "dash_trail") {
      f.phantomTimer = 0.5;
      f.vx = Math.cos(angle) * 760;
      f.vy = Math.sin(angle) * 760;
      f.morphState = { type, elapsed: 0, duration: 0.5, target, damage, label: slot.name, hit: false };
      return true;
    }
    if (type === "teleport") {
      f.morphState = { type, elapsed: 0, duration: 0.12, target, damage, label: slot.name, execute: slot.effectKind === "pk_asn_2" };
      f.phantomTimer = 0.4;
      this.motionBurst(f, headless);
      return true;
    }
    if (type === "blitz") {
      const left = this.arena.x + f.radius, right = this.arena.x + this.arena.w - f.radius;
      const first = f.x < target.x ? right : left;
      f.morphState = { type, elapsed: 0, duration: 0.4, target, damage, label: slot.name, leg: 0,
        blitzPath: [{ x: f.x, y: f.y }, { x: first, y: target.y }, { x: first === left ? right : left, y: target.y }, { x: first, y: target.y }], hits: [false, false, false] };
      f.phantomTimer = 0.5;
      return true;
    }
    if (type === "clones") {
      this.clones = [];
      for (const side of [-1, 1]) {
        const heading = angle + side * 25 * Math.PI / 180;
        this.clones.push({ owner: f, target, x: f.x, y: f.y, vx: Math.cos(heading) * 800, vy: Math.sin(heading) * 800, radius: f.radius, life: 0.8, elapsed: 0, damage: damage / 3, label: slot.name });
      }
      this.spawnProjectiles(f, target, 1, damage / 3, 560, f.accent, 16, "basketball");
      return true;
    }
    if (type === "summon") {
      this.spawnSummon(f, target, damage, slot.name, slot.skillId === "hj_s2" ? 2 : 0);
      return true;
    }
    return false;
  }

  spawnSummon(owner, target, damage, label, slow = 0, sequence = null) {
    const angle = Math.atan2(target.y - owner.y, target.x - owner.x);
    this.summons.push({ owner, kind: owner.heroId, x: owner.x, y: owner.y, vx: Math.cos(angle) * 650, vy: Math.sin(angle) * 650,
      w: owner.heroId === "dayun" ? 110 : 64, h: 54, dmg: damage, label, slow, life: 2.4, hitDone: false,
      ultimateSecondary: !!sequence, ultimateSequence: sequence });
  }

  updateMorph(f, enemy, dt, headless) {
    const m = f.morphState;
    let ownsPosition = false;
    if (m) {
      const previous = m.elapsed;
      m.elapsed = Math.min(m.duration, m.elapsed + dt);
      if (m.type === "teleport") {
        ownsPosition = true;
        if (m.elapsed >= m.duration) {
          const direction = m.target.vx >= 0 ? -1 : 1;
          f.x = m.target.x + direction * (m.target.radius + f.radius + 4);
          f.y = m.target.y;
          this.clampFighter(f);
          if (m.target.hp > 0) this.applyDamage(f, m.target, m.damage + (m.execute && m.target.hp < m.target.maxHp * 0.35 ? 120 : 0), m.label, true, headless);
          this.motionBurst(f, headless);
          if (!headless) {
            window.memeAudio.playCast("release");
            this.spawnSkillVfx({ kind: "blink_cross", x: f.x, y: f.y, color: f.accent, life: 0.25, maxLife: 0.25 });
          }
        }
      } else if (m.type === "blitz") {
        ownsPosition = true;
        const legDuration = m.duration / 3;
        for (let leg = Math.min(2, Math.floor(previous / legDuration)); leg < 3; leg++) {
          if (m.elapsed < leg * legDuration) break;
          const a = m.blitzPath[leg], b = m.blitzPath[leg + 1];
          const t = Math.min(1, (m.elapsed - leg * legDuration) / legDuration);
          const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
          if (!m.hits[leg] && this.segmentHits(f.x, f.y, x, y, m.target, f.radius)) {
            m.hits[leg] = true;
            this.applyDamage(f, m.target, m.damage / 3, m.label, false, headless, { secondary: true });
            this.hitstopTimer = Math.max(this.hitstopTimer, 0.025);
            this.motionBurst(m.target, headless);
          }
          f.x = x; f.y = y;
          if (!headless) this.spawnSkillVfx({ kind: "blitz_line", x: a.x, y: a.y, toX: x, toY: y, color: f.accent, life: 0.18, maxLife: 0.18 });
          if (t < 1) break;
        }
      } else if (m.type === "dash_trail") {
        ownsPosition = true;
        const x = f.x + f.vx * dt, y = f.y + f.vy * dt;
        if (!m.hit && this.segmentHits(f.x, f.y, x, y, m.target, f.radius)) {
          m.hit = true;
          this.applyDamage(f, m.target, m.damage, m.label, false, headless);
          this.motionBurst(m.target, headless);
        }
        f.x = x; f.y = y;
        this.clampFighter(f);
      }
      if (m.elapsed >= m.duration) {
        f.morphState = null;
        f.morphScale.target = 1;
        if (ownsPosition) {
          const speed = Math.hypot(f.vx, f.vy) || 1;
          f.vx = f.vx / speed * f.baseSpd; f.vy = f.vy / speed * f.baseSpd;
        }
      }
    }
    f.morphScale.current += (f.morphScale.target - f.morphScale.current) * (1 - Math.exp(-f.morphScale.speed * dt));
    f.phantomTimer = Math.max(0, f.phantomTimer - dt);
    if (!headless) {
      for (let i = this.phantoms.length - 1; i >= 0; i--) if (this.phantoms[i].owner === f) {
        this.phantoms[i].life -= dt;
        if (this.phantoms[i].life <= 0) this.phantoms.splice(i, 1);
      }
      if (f.phantomTimer > 0) {
        f.phantomClock += dt;
        if (f.phantomClock >= 0.03) {
          f.phantomClock %= 0.03;
          const limit = this.reducedEffects() ? 3 : 6;
          if (this.phantoms.length >= limit) this.phantoms.shift();
          this.phantoms.push({ owner: f, x: f.x, y: f.y, radius: f.radius * f.morphScale.current, angle: m?.type === "evade" ? m.elapsed * 10 : 0, life: 0.18 });
        }
      }
    }
    return ownsPosition;
  }

  updateClones(dt, headless) {
    for (let i = this.clones.length - 1; i >= 0; i--) {
      const c = this.clones[i];
      if (this.timeStopTimer > 0 && this.timeStopOwner !== c.owner) continue;
      c.life -= dt; c.elapsed += dt;
      if (c.life <= 0 || c.owner.hp <= 0) {
        this.motionBurst({ ...c, accent: c.owner.accent }, headless);
        this.clones.splice(i, 1);
        continue;
      }
      if (c.elapsed > 0.12) {
        const angle = Math.atan2(c.target.y - c.y, c.target.x - c.x);
        c.vx = Math.cos(angle) * 800; c.vy = Math.sin(angle) * 800;
      }
      const x = c.x + c.vx * dt, y = c.y + c.vy * dt;
      if (this.segmentHits(c.x, c.y, x, y, c.target, c.radius)) {
        this.applyDamage(c.owner, c.target, c.damage, c.label, false, headless, { secondary: true });
        c.life = 0;
      }
      c.x = x; c.y = y;
      if (c.life <= 0 || c.owner.hp <= 0) {
        this.motionBurst({ ...c, accent: c.owner.accent }, headless);
        this.clones.splice(i, 1);
      }
    }
  }

  drawClones(ctx) {
    for (let i = 0; i < this.phantoms.length + this.clones.length; i++) {
      const c = i < this.phantoms.length ? this.phantoms[i] : this.clones[i - this.phantoms.length];
      ctx.save();
      ctx.globalAlpha = c.life <= 0.18 ? c.life / 0.18 * 0.6 : 0.65;
      ctx.translate(c.x, c.y); ctx.rotate(c.angle || 0);
      ctx.shadowColor = c.owner.phantomColor; ctx.shadowBlur = 12;
      const img = this.customImages[c.owner.heroId];
      if (img) ctx.drawImage(img, -c.radius, -c.radius, c.radius * 2, c.radius * 2);
      else { ctx.font = `${c.radius * 1.7}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(c.owner.emoji, 0, 0); }
      ctx.restore();
    }
  }

  updateSummons(dt, headless) {
    for (let i = this.summons.length - 1; i >= 0; i--) {
      const t = this.summons[i];
      if (this.timeStopTimer > 0 && this.timeStopOwner !== t.owner) continue;
      const target = t.owner.isPlayer ? this.p2 : this.p1;
      const oldX = t.x, oldY = t.y;
      t.x += t.vx * dt;
      t.y += (t.vy || 0) * dt;
      t.life = (t.life ?? 3) - dt;
      if (t.life > 0 && !t.hitDone && target.hp > 0 && this.segmentHits(oldX, oldY, t.x, t.y, target, Math.max(t.w, t.h) / 2)) {
        t.hitDone = true;
        const damage = this.applyDamage(t.owner, target, t.dmg, t.label || "召唤突袭", false, headless, { ultimateSecondary: t.ultimateSecondary, ultimateSequence: t.ultimateSequence, secondary: true });
        if (damage > 0 && t.slow) target.slowTimer = t.slow;
      }
      if (t.life <= 0 || t.owner.hp <= 0 || t.x > this.width + 150 || t.x < -400) this.summons.splice(i, 1);
    }
  }

  // 伤害结算与流派机制：秒杀、吸血护盾、架势、前中后期成长
  applyDamage(attacker, defender, amount, label, forceCrit = false, headless = this.headless, options = {}) {
    this.applyRecordingGuards();
    if (!this.running || this.paused || this.finale || attacker.hp <= 0 || defender.hp <= 0 || !Number.isFinite(amount) || amount <= 0) return 0;
    if (defender.isDodging && defender.dodgeTimer > 0) {
      this.recordUltimateHit(attacker, options, { reasons: ['已被回避'] });
      return 0;
    }
    const ageDodge = this.hasPerk(defender, "pk_sifu_3") ? (72 - defender.age) * 0.001 : 0;
    if (!options.responseResolved && !options.secondary && this.random() < (this.hasPerk(defender, "pk_sifu_4") ? 0.25 : 0) + ageDodge) {
      defender.isDodging = true;
      defender.dodgeTimer = 0.18;
      if (!headless) window.memeAudio.playSifuDodge();
      if (this.hasPerk(defender, "pk_sifu_4")) this.applyDamage(defender, attacker, 85, "太极偏斜反击", true, headless, { secondary: true });
      window.BattleEffects.onDodge(this, defender, attacker, headless);
      this.recordUltimateHit(attacker, options, { reasons: ['已被回避'] });
      return 0;
    }
    const ultimateCore = options.ultimateCore === true;
    const ratioDamage = ultimateCore || options.ultimateSecondary === true;
    const balanceMult = attacker.hp < defender.hp * 0.72 ? 1.24 : attacker.hp > defender.hp * 1.35 ? 0.86 : 1;
    const critChance = (attacker.heroId === "laoda" ? 0.43 : 0.18) + (this.hasPerk(attacker, "pk_asn_4") ? 0.3 : 0);
    const focused = this.timeStopTimer > 0 && this.timeStopOwner === attacker;
    const isCrit = ratioDamage ? false : (forceCrit || focused || this.random() < critChance);
    const critMult = this.hasPerk(attacker, "pk_asn_4") ? 2.1 : 1.45;
    const phaseMult = this.getCombatConfig().phaseDamageMultiplier[this.currentPhase];
    const ageDamage = this.hasPerk(attacker, "pk_sifu_3") ? 1 + (attacker.age - 20) * 0.006 : 1;
    let damage = ratioDamage ? Math.round(amount) : Math.round(amount * balanceMult * (isCrit ? critMult : 1) * (0.9 + this.random() * 0.2) * (attacker.earlyBurst || 1) * ageDamage * phaseMult);
    if (options.ultimateSecondary) {
      const sequence = options.ultimateSequence;
      if (!sequence || sequence.remaining <= 0) return 0;
      damage = Math.min(damage, sequence.remaining);
      sequence.remaining -= damage;
      if (sequence === attacker.ultimateSequenceState) attacker.ultimateSecondaryBudget = sequence.remaining;
    }
    const beforeReduction = damage;
    if (this.hasPerk(defender, "pk_col_5")) damage = Math.round(damage * 0.8);
    const heavyHit = defender.heroId === "kunge" && damage > 120;
    if (heavyHit) damage = Math.round(damage * 0.65);
    const shieldDamage = Math.min(defender.shield, damage);
    defender.shield -= shieldDamage;
    let hpDamage = damage - shieldDamage;
    const remainingHp = defender.hp - hpDamage;
    const lowHp = remainingHp > 0 && remainingHp <= defender.maxHp * 0.35;
    const lottery = !options.secondary && !ratioDamage && this.hasPerk(attacker, "pk_asn_1") && this.random() < (lowHp ? 0.15 : 0.06);
    const collector = !ratioDamage && this.hasPerk(attacker, "pk_asn_5") && remainingHp > 0 && remainingHp <= defender.maxHp * 0.12;
    const executed = lottery || collector;
    if (executed) hpDamage = Math.max(hpDamage, defender.hp);
    const before = defender.hp;
    let hitHpLoss = 0;
    let hitRecovery = 0;
    const hitReasons = [];
    if (options.counterReduction) hitReasons.push('拆招减伤');
    if (beforeReduction > damage) hitReasons.push('防御减伤');
    // 处决仍须经过免死和锁血，无法绕过这两个防御规则。
    if (before - hpDamage <= 0 && this.hasPerk(defender, "pk_vmp_3") && !defender.pddImmortalUsed) {
      defender.pddImmortalUsed = true;
      defender.immortalTimer = 3;
      defender.hp = 1;
      hitHpLoss = Math.max(0, before - 1);
      this.applyHeal(defender, Math.round(defender.maxHp * 0.5), "拼夕夕免死回血", headless);
      hitRecovery += defender.hp - 1;
      hitReasons.push('免死触发');
      if (!options.secondary) this.applyDamage(defender, attacker, 180, "免死反震", true, headless, { secondary: true });
    } else {
      defender.hp = Math.max(this.recordingHpFloor(defender), defender.immortalTimer > 0 ? 1 : 0, before - hpDamage);
      hitHpLoss = Math.max(0, before - defender.hp);
      if (hitHpLoss < Math.min(before, hpDamage)) {
        if (this.recordingHpFloor(defender) > 0) hitReasons.push('剧情锁血');
        if (defender.immortalTimer > 0) hitReasons.push('免死保护');
      }
    }
    if (defender.hp / defender.maxHp <= 0.25 && before / defender.maxHp < attacker.hp / attacker.maxHp - 0.15) defender.lastDisadvantageAt = this.elapsed;
    if (defender.hp <= 0) this.lastLethalHit = {
      attacker, defender, label: label || '',
      comeback: Number.isFinite(attacker.lastDisadvantageAt) && this.elapsed - attacker.lastDisadvantageAt <= 8,
      attrition: /灼烧|流血|中毒|持续|日炎|耗尽/.test(label || '')
    };
    const actualHpDamage = Math.max(0, before - defender.hp);
    const actualDamage = actualHpDamage + shieldDamage;
    defender.damageTaken += actualDamage;
    attacker.damageDealt += actualDamage;
    defender.scaleAnim = 0.78;
    if (this.hasArchetype(defender, "sifu")) {
      defender.stance = Math.max(0, defender.stance - Math.round(actualDamage * 0.08));
      if (defender.stance <= 0) {
        defender.stance = defender.maxStance;
        defender.stunTimer = 0.6;
        if (!headless) this.spawnText("架势崩坏！", defender.x, defender.y - defender.radius - 20, "#ffe600", 20);
      }
    }
    if (this.hasPerk(attacker, "pk_vmp_2")) this.applyHeal(attacker, Math.round(actualDamage * 0.38), "饮血剑吸血", headless);
    if (defender.heroId === "hajimi" && defender.hp > 0 && defender.hp < defender.maxHp * 0.3 && !defender.nineLivesUsed) {
      defender.nineLivesUsed = true;
      defender.frenzyTimer = 4;
      const beforeRecovery = defender.hp;
      this.applyHeal(defender, 220, "九命猫薄荷", headless);
      hitRecovery += defender.hp - beforeRecovery;
      hitReasons.push('九命回血');
    }
    this.recordUltimateHit(attacker, options, { hp: hitHpLoss, shield: shieldDamage,
      reduced: beforeReduction - damage + (options.counterReduction || 0),
      blocked: Math.max(0, Math.min(before, hpDamage) - hitHpLoss), recovered: hitRecovery, hit: true, reasons: hitReasons });
    window.BattleEffects.onHit(this, attacker, defender, actualDamage, isCrit, headless, { ...options, heavyHit });
    if (!headless) {
      if (actualDamage > 0) window.memeAudio.playImpact(isCrit);
      if (executed && defender.hp <= 0) window.memeAudio.playExecute9999();
      this.spawnText(`${label || "命中"} -${actualDamage}${isCrit ? " 暴击" : ""}`, defender.x, defender.y - 25, isCrit ? "#ffe600" : "#ff2a54", isCrit ? 22 : 17);
      if (!this.reducedEffects()) this.particleBursts.push({ x: defender.x, y: defender.y, color: defender.color, count: isCrit ? 14 : 6, life: 0.38 });
    }
    return actualDamage;
  }

  applyHeal(fighter, amount, label, headless = this.headless) {
    if (!this.running || fighter.hp <= 0 || amount <= 0) return;
    const before = fighter.hp;
    fighter.hp = Math.min(fighter.maxHp, fighter.hp + amount);
    const overflow = Math.max(0, before + amount - fighter.maxHp);
    if (overflow > 0) fighter.shield = Math.min(fighter.maxShield, fighter.shield + overflow);
    if (!headless) {
      this.spawnText(`${label} +${amount}${overflow > 0 ? ` 🛡️+${overflow}` : ""}`, fighter.x, fighter.y - fighter.radius - 32, "#00ff88", 18);
    }
  }

  spawnText(text, x, y, color = "#fff", size = 18) {
    this.floatingTexts.push({ text, x, y, vy: -65, alpha: 1.0, color, size });
    if (this.floatingTexts.length > 28) this.floatingTexts.shift();
  }

  triggerShake(intensity = 10, duration = 0.2) {
    if (this.headless || this.reducedEffects()) return;
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeTimer = Math.max(this.shakeTimer, duration);
  }

  updateParticles(dt) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.alpha -= dt * 1.15;
      if (ft.alpha <= 0) this.floatingTexts.splice(i, 1);
    }
    for (let i = this.ringEffects.length - 1; i >= 0; i--) {
      const re = this.ringEffects[i];
      re.r += (re.maxR - re.r) * 9 * dt;
      re.alpha -= dt * 2.4;
      if (re.alpha <= 0) this.ringEffects.splice(i, 1);
    }
    for (let i = this.particleBursts.length - 1; i >= 0; i--) {
      const burst = this.particleBursts[i];
      burst.life -= dt;
      if (!burst.particles) {
        burst.particles = Array.from({ length: burst.count }, () => ({
          x: burst.x,
          y: burst.y,
          vx: (Math.random() - 0.5) * 260,
          vy: (Math.random() - 0.5) * 260,
          r: 2 + Math.random() * 5
        }));
      }
      burst.particles.forEach((particle) => {
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vy += 180 * dt;
      });
      if (burst.life <= 0) this.particleBursts.splice(i, 1);
    }
    if (this.p1 && this.p2 && !this.finale) {
      [this.p1, this.p2].forEach((fighter) => {
        this.trails.push({ x: fighter.x, y: fighter.y, r: Math.min(80, fighter.radius * 0.45), color: fighter.color, alpha: 0.34 });
      });
    }
    for (let i = this.trails.length - 1; i >= 0; i--) {
      this.trails[i].alpha -= dt * 2.8;
      this.trails[i].r *= 0.985;
      if (this.trails[i].alpha <= 0) this.trails.splice(i, 1);
    }
    for (let i = this.ultImpactEffects.length - 1; i >= 0; i--) {
      this.ultImpactEffects[i].life -= dt;
      if (this.ultImpactEffects[i].life <= 0) this.ultImpactEffects[i].life = 0, this.ultImpactEffects.splice(i, 1);
    }
    for (let i = this.skillVfxList.length - 1; i >= 0; i--) {
      this.skillVfxList[i].life -= dt;
      if (this.skillVfxList[i].life <= 0) this.skillVfxList.splice(i, 1);
    }
    [this.p1, this.p2].forEach((f) => {
      if (f && f.actionAnimTimer > 0) f.actionAnimTimer = Math.max(0, f.actionAnimTimer - dt);
    });
  }

  // 绘制高能抽象战斗画面
  draw() {
    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, this.width, this.height);

    // 震屏偏移
    if (this.shakeTimer > 0) {
      const sx = (Math.random() - 0.5) * this.shakeIntensity * 2;
      const sy = (Math.random() - 0.5) * this.shakeIntensity * 2;
      ctx.translate(sx, sy);
    }

    // 阶段越后，背景能量与边框颜色越激进
    const phaseColor = this.currentPhase === "early" ? "#0b0d17" : this.currentPhase === "mid" ? "#081c25" : this.currentPhase === "late" ? "#260c26" : "#350700";
    ctx.fillStyle = this.timeStopTimer > 0 ? "#1f0030" : phaseColor;
    ctx.fillRect(0, 0, this.width, this.height);
    if (this.currentPhase === "overtime") {
      ctx.fillStyle = `rgba(255, 42, 84, ${0.06 + Math.sin(performance.now() * 0.01) * 0.03})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // 竞技场边框与网格
    ctx.save();
    if (this.spinArenaTimer > 0) {
      const cx = this.arena.x + this.arena.w / 2;
      const cy = this.arena.y + this.arena.h / 2;
      ctx.translate(cx, cy);
      ctx.rotate(Math.sin(performance.now() * 0.015) * 0.08);
      ctx.translate(-cx, -cy);
    }

    ctx.strokeStyle = this.spinArenaTimer > 0 ? "#ffe600" : this.currentPhase === "late" ? "#b829ff" : this.currentPhase === "overtime" ? "#ff2a54" : "#2f375e";
    ctx.lineWidth = this.currentPhase === "overtime" ? 7 : 4;
    ctx.strokeRect(this.arena.x, this.arena.y, this.arena.w, this.arena.h);

    // 场地内十字准星装饰
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let gx = this.arena.x + 60; gx < this.arena.x + this.arena.w; gx += 60) {
      ctx.beginPath();
      ctx.moveTo(gx, this.arena.y);
      ctx.lineTo(gx, this.arena.y + this.arena.h);
      ctx.stroke();
    }
    for (let gy = this.arena.y + 60; gy < this.arena.y + this.arena.h; gy += 60) {
      ctx.beginPath();
      ctx.moveTo(this.arena.x, gy);
      ctx.lineTo(this.arena.x + this.arena.w, gy);
      ctx.stroke();
    }

    this.drawDangerZones(ctx);
    this.drawClones(ctx);
    // 角色残影拖尾
    this.trails.forEach((trail) => {
      ctx.save();
      ctx.globalAlpha = trail.alpha;
      ctx.fillStyle = trail.color;
      ctx.beginPath();
      ctx.arc(trail.x, trail.y, trail.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 环形冲击波
    this.ringEffects.forEach((re) => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, re.alpha);
      ctx.strokeStyle = re.color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(re.x, re.y, re.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });

    // 爆炸粒子
    this.particleBursts.forEach((burst) => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, burst.life);
      ctx.fillStyle = burst.color;
      (burst.particles || []).forEach((particle) => {
        ctx.fillRect(particle.x, particle.y, particle.r, particle.r);
      });
      ctx.restore();
    });

    // 变身破封 -> 战场技能轰击的高能视觉衔接特效
    this.ultImpactEffects.forEach((fx) => {
      const p = 1 - Math.max(0, fx.life) / fx.maxLife;
      const alpha = Math.max(0, fx.life / fx.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;

      // 1. 破封残影魔法星阵在目标脚下极速扩张
      ctx.save();
      ctx.translate(fx.toX, fx.toY);
      ctx.rotate(p * Math.PI * 1.6);
      ctx.strokeStyle = fx.accent;
      ctx.lineWidth = 4;
      ctx.setLineDash([12, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, 36 + p * 175, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 22 + p * 115, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 2. 施法者 -> 轰击落点 贯穿能量光束
      ctx.save();
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = Math.max(4, 34 * (1 - p));
      ctx.lineCap = "round";
      ctx.shadowColor = fx.accent;
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.moveTo(fx.fromX, fx.fromY);
      ctx.lineTo(fx.toX, fx.toY);
      ctx.stroke();
      ctx.restore();

      // 3. 角色专属终极轰击视觉演出
      if (fx.heroId === "hajimi") {
        // 耄耋红温：交叉五道巨型烈焰猫爪撕裂全场
        ctx.save();
        ctx.translate(fx.toX, fx.toY);
        ctx.strokeStyle = "#ffe600";
        ctx.shadowColor = "#ff2a54";
        ctx.shadowBlur = 18;
        ctx.lineWidth = 6;
        for (let k = -2; k <= 2; k++) {
          const offset = k * 22;
          ctx.beginPath();
          ctx.moveTo(-95 + offset * 0.4, -85 + offset);
          ctx.lineTo(95 + offset * 0.4, 85 + offset);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(95 + offset * 0.4, -85 + offset);
          ctx.lineTo(-95 + offset * 0.4, 85 + offset);
          ctx.stroke();
        }
        ctx.restore();
      } else if (fx.heroId === "laoda") {
        // 牢大：紫金天降光柱 + 螺旋桨风暴切线
        ctx.save();
        const grad = ctx.createLinearGradient(fx.toX, this.arena.y, fx.toX, fx.toY + 60);
        grad.addColorStop(0, "rgba(255, 230, 0, 0.95)");
        grad.addColorStop(0.5, "rgba(184, 41, 255, 0.75)");
        grad.addColorStop(1, "rgba(184, 41, 255, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(fx.toX - 55 * (1 - p * 0.4), this.arena.y, 110 * (1 - p * 0.4), fx.toY - this.arena.y + 60);
        ctx.restore();
      } else if (fx.heroId === "kunge") {
        // 坤哥：中分舞台聚光灯 + 万凰羽毛爆散
        ctx.save();
        ctx.translate(fx.toX, fx.toY);
        for (let k = 0; k < 8; k++) {
          const ang = (k * Math.PI) / 4 + p * 2.2;
          const rad = 28 + p * 135;
          ctx.font = "24px sans-serif";
          ctx.fillText(k % 2 === 0 ? "🏀" : "🪶", Math.cos(ang) * rad, Math.sin(ang) * rad);
        }
        ctx.restore();
      } else if (fx.heroId === "dayun") {
        // 大运：全屏双道炽白远光灯探照 + 地面刹车烈焰轨迹
        ctx.save();
        ctx.fillStyle = "rgba(255, 230, 0, 0.28)";
        ctx.beginPath();
        ctx.moveTo(this.arena.x, fx.toY - 90);
        ctx.lineTo(this.arena.x + this.arena.w, fx.toY - 25);
        ctx.lineTo(this.arena.x + this.arena.w, fx.toY + 25);
        ctx.lineTo(this.arena.x, fx.toY + 90);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // 4. 破封残影立绘瞬移冲刺残像
      const customImg = this.customImages[fx.heroId];
      if (customImg && p < 0.65) {
        ctx.save();
        const ix = fx.fromX + (fx.toX - fx.fromX) * Math.min(1, p * 1.8);
        const iy = fx.fromY + (fx.toY - fx.fromY) * Math.min(1, p * 1.8);
        ctx.translate(ix, iy);
        ctx.globalAlpha = (0.65 - p) * 1.1;
        const scale = 110 / Math.max(customImg.naturalWidth || 100, customImg.naturalHeight || 100);
        const w = (customImg.naturalWidth || 100) * scale;
        const h = (customImg.naturalHeight || 100) * scale;
        ctx.drawImage(customImg, -w / 2, -h / 2, w, h);
        ctx.restore();
      }

      ctx.restore();
    });

    // 角色专属主动/被动技能视觉特效层
    this.skillVfxList.forEach((vfx) => {
      const p = 1 - Math.max(0, vfx.life) / (vfx.maxLife || 0.5);
      const alpha = Math.max(0, vfx.life / (vfx.maxLife || 0.5));
      ctx.save();
      ctx.globalAlpha = alpha;
      const ang = Math.atan2((vfx.toY || vfx.y) - vfx.y, (vfx.toX || vfx.x + 1) - vfx.x);
      if (vfx.kind === "climax_crater") {
        ctx.strokeStyle = vfx.color; ctx.lineWidth = 6 * alpha;
        ctx.beginPath(); ctx.ellipse(vfx.x, vfx.y, 90 + p * 65, 25 + p * 18, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath();
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.moveTo(vfx.x, vfx.y); ctx.lineTo(vfx.x + Math.cos(a) * 95, vfx.y + Math.sin(a) * 38); }
        ctx.stroke();
      } else if (vfx.kind === "blink_cross" || vfx.kind === "blitz_line") {
        ctx.strokeStyle = vfx.color; ctx.lineWidth = 5 * alpha;
        ctx.shadowColor = vfx.color; ctx.shadowBlur = 12;
        ctx.beginPath();
        if (vfx.kind === "blink_cross") {
          ctx.moveTo(vfx.x - 65, vfx.y); ctx.lineTo(vfx.x + 65, vfx.y);
          ctx.moveTo(vfx.x, vfx.y - 65); ctx.lineTo(vfx.x, vfx.y + 65);
        } else { ctx.moveTo(vfx.x, vfx.y); ctx.lineTo(vfx.toX, vfx.toY); }
        ctx.stroke();
      } else if (vfx.kind === "highbeam_cone") {
        // 大运远光灯双道强光锥
        ctx.translate(vfx.x, vfx.y);
        ctx.rotate(ang);
        const grad = ctx.createLinearGradient(0, 0, 320, 0);
        grad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
        grad.addColorStop(0.45, "rgba(255, 230, 0, 0.55)");
        grad.addColorStop(1, "rgba(255, 230, 0, 0)");
        ctx.fillStyle = grad;
        [-18, 18].forEach((offsetY) => {
          ctx.beginPath();
          ctx.moveTo(10, offsetY);
          ctx.lineTo(320, offsetY - 48);
          ctx.lineTo(320, offsetY + 48);
          ctx.closePath();
          ctx.fill();
        });
      } else if (vfx.kind === "drift_tracks") {
        // 氮气漂移双轮胎焦黑火焰轨迹
        ctx.strokeStyle = "#ff5500";
        ctx.shadowColor = "#ffe600";
        ctx.shadowBlur = 12;
        ctx.lineWidth = 5;
        ctx.setLineDash([14, 6]);
        [-12, 12].forEach((offset) => {
          const nx = -Math.sin(ang) * offset;
          const ny = Math.cos(ang) * offset;
          ctx.beginPath();
          ctx.moveTo(vfx.x + nx, vfx.y + ny);
          ctx.lineTo(vfx.x + (vfx.toX - vfx.x) * 0.65 + nx, vfx.y + (vfx.toY - vfx.y) * 0.65 + ny);
          ctx.stroke();
        });
        ctx.setLineDash([]);
      } else if (vfx.kind === "cat_hiss_wave") {
        // 应激哈气锯齿声波环
        ctx.translate(vfx.x, vfx.y);
        ctx.strokeStyle = "#ff5500";
        ctx.lineWidth = 4;
        ctx.beginPath();
        const spikes = 16;
        const baseR = 32 + p * 120;
        for (let i = 0; i <= spikes; i++) {
          const a = (i / spikes) * Math.PI * 2 + p * 3;
          const r = baseR + (i % 2 === 0 ? 12 : -8);
          if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.stroke();
      } else if (vfx.kind === "laser_pointer") {
        // 赛博逗猫棒红外线瞄准锁定
        ctx.strokeStyle = "rgba(255, 0, 68, 0.85)";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(vfx.x, vfx.y);
        ctx.lineTo(vfx.toX, vfx.toY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#ff0044";
        ctx.shadowColor = "#ff0044";
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(vfx.toX, vfx.toY, 8 + Math.sin(p * 20) * 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (vfx.kind === "mamba_elbow") {
        // 紫金曼巴重肘残影冲击波
        ctx.translate(vfx.x + Math.cos(ang) * (30 + p * 60), vfx.y + Math.sin(ang) * (30 + p * 60));
        ctx.rotate(ang);
        ctx.strokeStyle = "#ffe600";
        ctx.shadowColor = "#b829ff";
        ctx.shadowBlur = 18;
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(-22, -38);
        ctx.lineTo(28, 0);
        ctx.lineTo(-22, 38);
        ctx.stroke();
      } else if (vfx.kind === "icetea_splash") {
        // 热带冰红茶高糖水花飞溅
        ctx.translate(vfx.x, vfx.y);
        for (let i = 0; i < 6; i++) {
          const a = ang + (i - 2.5) * 0.32;
          const d = 24 + p * 95;
          ctx.font = "20px sans-serif";
          ctx.fillText(i % 2 === 0 ? "🍹" : "🍋", Math.cos(a) * d, Math.sin(a) * d);
        }
      } else if (vfx.kind === "shoulder_bump") {
        // 夺命铁山靠中分背带裤残影波
        ctx.translate(vfx.x + Math.cos(ang) * (25 + p * 45), vfx.y + Math.sin(ang) * (25 + p * 45));
        ctx.strokeStyle = "#00d4ff";
        ctx.shadowColor = "#ff2a54";
        ctx.shadowBlur = 16;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(0, 0, 28 + p * 45, ang - 1.1, ang + 1.1);
        ctx.stroke();
      } else if (vfx.kind === "kun_sonic") {
        // 只因你太美魔音音符扩散
        ctx.translate(vfx.x, vfx.y);
        const notes = ["🎵", "🐔", "🎶", "🏀"];
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + p * 2.5;
          const d = 30 + p * 110;
          ctx.font = "20px sans-serif";
          ctx.fillText(notes[i % notes.length], Math.cos(a) * d, Math.sin(a) * d);
        }
      } else if (vfx.kind === "feather_burst") {
        // 两年半内功满层：全屏白羽+篮球爆散
        ctx.translate(vfx.x, vfx.y);
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + p * 1.8;
          const d = 18 + p * 135;
          ctx.save();
          ctx.translate(Math.cos(a) * d, Math.sin(a) * d);
          ctx.rotate(a + p * 4);
          ctx.fillStyle = i % 3 === 0 ? "#00d4ff" : "#ffffff";
          ctx.beginPath();
          ctx.ellipse(0, 0, 11, 4.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
      ctx.restore();
    });

    // 百吨王卡车冲撞特效（带真实车头贴图与双远光灯束）
    this.summons.forEach((t) => {
      ctx.save();
      ctx.translate(t.x, t.y);
      if (t.kind && t.kind !== "dayun") {
        ctx.strokeStyle = t.owner.accent; ctx.fillStyle = t.owner.accent;
        ctx.shadowColor = t.owner.accent; ctx.shadowBlur = 12;
        ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 16, t.w / 2, 12, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.font = "42px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(t.kind === "laoda" ? "🚁" : t.kind === "hajimi" ? "🐈" : "🏀", 0, -4);
        ctx.font = "bold 12px sans-serif";
        ctx.fillText(t.kind === "laoda" ? "悬浮护航" : t.kind === "hajimi" ? "猫猫护卫" : "防守中锋", 0, 36);
        ctx.restore();
        return;
      }
      // 车尾烈焰拖尾与车前远光灯锥
      const beam = ctx.createLinearGradient(t.w / 2, 0, t.w / 2 + 130, 0);
      beam.addColorStop(0, "rgba(255, 255, 220, 0.85)");
      beam.addColorStop(1, "rgba(255, 230, 0, 0)");
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(t.w / 2, -t.h * 0.38);
      ctx.lineTo(t.w / 2 + 130, -t.h * 0.9);
      ctx.lineTo(t.w / 2 + 130, t.h * 0.9);
      ctx.lineTo(t.w / 2, t.h * 0.38);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#b81d13";
      ctx.strokeStyle = "#ffe600";
      ctx.lineWidth = 3;
      ctx.fillRect(-t.w / 2, -t.h / 2, t.w, t.h);
      ctx.strokeRect(-t.w / 2, -t.h / 2, t.w, t.h);
      const dayunImg = this.customImages.dayun;
      if (dayunImg && dayunImg.naturalWidth) {
        ctx.drawImage(dayunImg, -t.w / 2 + 4, -t.h / 2 + 4, 48, t.h - 8);
      }
      ctx.fillStyle = "#ffe600";
      ctx.font = "900 18px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("大运·重卡", 18, 6);
      ctx.restore();
    });

    // 弹幕投射物（按角色梗元素定制绘制：篮球、燃烧轮胎、猫砂盆、冰红茶、猫爪、螺旋桨）
    this.projectiles.forEach((p) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      const rot = this.elapsed * 9 + (p.x + p.y) * 0.02;
      if (p.visualKind === "basketball") {
        ctx.rotate(rot);
        ctx.fillStyle = "#ff7700";
        ctx.shadowColor = "#ff5500";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, 0, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#1a0d00";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-p.r, 0);
        ctx.lineTo(p.r, 0);
        ctx.moveTo(0, -p.r);
        ctx.lineTo(0, p.r);
        ctx.stroke();
      } else if (p.visualKind === "tire") {
        ctx.rotate(rot * 1.4);
        ctx.fillStyle = "#222";
        ctx.strokeStyle = "#ff5500";
        ctx.shadowColor = "#ff3b30";
        ctx.shadowBlur = 14;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#ffe600";
        ctx.beginPath();
        ctx.arc(0, 0, p.r * 0.42, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.visualKind === "litter") {
        ctx.rotate(rot);
        ctx.fillStyle = "#00f0ff";
        ctx.strokeStyle = "#ff9500";
        ctx.shadowColor = "#00f0ff";
        ctx.shadowBlur = 12;
        ctx.lineWidth = 3;
        ctx.fillRect(-p.r, -p.r * 0.7, p.r * 2, p.r * 1.4);
        ctx.strokeRect(-p.r, -p.r * 0.7, p.r * 2, p.r * 1.4);
      } else if (p.visualKind === "icetea") {
        ctx.rotate(rot * 0.8);
        ctx.fillStyle = "#ff9500";
        ctx.strokeStyle = "#ffe600";
        ctx.shadowColor = "#ffe600";
        ctx.shadowBlur = 12;
        ctx.lineWidth = 2.5;
        ctx.fillRect(-p.r * 0.65, -p.r, p.r * 1.3, p.r * 2);
        ctx.strokeRect(-p.r * 0.65, -p.r, p.r * 1.3, p.r * 2);
      } else if (p.visualKind === "heli_orb") {
        ctx.rotate(rot * 2.2);
        ctx.strokeStyle = "#ffe600";
        ctx.shadowColor = "#b829ff";
        ctx.shadowBlur = 14;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-p.r * 1.2, 0);
        ctx.lineTo(p.r * 1.2, 0);
        ctx.moveTo(0, -p.r * 1.2);
        ctx.lineTo(0, p.r * 1.2);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, 0, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
    // 角色球体绘制
    if (this.p1) this.drawFighter(ctx, this.p1);
    if (this.p2) this.drawFighter(ctx, this.p2);
    this.drawArenaUltimate(ctx);

    ctx.restore();
    this.drawSlowMoFx(ctx);

    // 暴击与鬼畜弹幕飘字
    this.floatingTexts.forEach((ft) => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.font = `900 ${ft.size}px "PingFang SC", "Microsoft YaHei", sans-serif`;
      ctx.textAlign = "center";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 4;
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });

    ctx.restore();
  }

  drawDangerZones(ctx) {
    const p = this.pendingUltimate;
    if (p?.phase !== "arena" || p.slot.effectKind === "pk_col_2") return;
    const a = p.attack, ratio = p.remaining / p.total;
    ctx.save();
    ctx.fillStyle = "rgba(255,42,84,0.16)";
    ctx.strokeStyle = "#ff2a54"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(a.toX, a.toY, a.radius, a.radius * 0.48, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#ffe600"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(a.toX, a.toY, a.radius * (1 + ratio), a.radius * (0.48 + ratio * 0.35), 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#000"; ctx.lineWidth = 4;
    ctx.textAlign = "center"; ctx.font = "900 18px sans-serif";
    const label = `IMPACT ${p.remaining.toFixed(2)}s`;
    ctx.strokeText(label, a.toX, a.toY + a.radius * 0.5 + 25); ctx.fillText(label, a.toX, a.toY + a.radius * 0.5 + 25);
    ctx.restore();
  }

  drawArenaUltimate(ctx) {
    const p = this.pendingUltimate;
    if (p?.phase !== "arena" || p.slot.effectKind === "pk_col_2") return;
    const a = p.attack;
    ctx.save();
    ctx.strokeStyle = p.caster.accent; ctx.lineWidth = 16;
    ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.moveTo(a.fromX, a.fromY); ctx.lineTo(a.x, a.y); ctx.stroke();
    ctx.globalAlpha = 1; ctx.translate(a.x, a.y);
    ctx.shadowColor = p.caster.accent; ctx.shadowBlur = 20;
    const kind = p.slot.effectKind;
    if (kind === "ult_basketball_rain") {
      ctx.fillStyle = "#ff9500"; ctx.strokeStyle = "#251102"; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(0, 0, 60, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-60, 0); ctx.lineTo(60, 0); ctx.moveTo(0, -60); ctx.lineTo(0, 60); ctx.stroke();
    } else if (kind === "ult_heli_crash") {
      ctx.rotate(Math.PI / 7); ctx.fillStyle = "#943bdb"; ctx.strokeStyle = "#ffe600"; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.ellipse(0, 0, 74, 35, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-102, -48); ctx.lineTo(102, -48); ctx.moveTo(0, -48); ctx.lineTo(0, -25); ctx.moveTo(-74, 0); ctx.lineTo(-130, -20); ctx.stroke();
    } else if (kind === "ult_cat_frenzy" || kind === "ult_truck_stampede") {
      const img = this.customImages[p.caster.heroId];
      if (img) ctx.drawImage(img, -75, -65, 150, 130);
      else { ctx.font = "100px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(p.caster.emoji, 0, 0); }
      if (kind === "ult_truck_stampede") {
        ctx.strokeStyle = "#ffe600"; ctx.lineWidth = 6;
        const direction = a.toX >= a.fromX ? 1 : -1;
        ctx.beginPath(); ctx.moveTo(50 * direction, -20); ctx.lineTo(130 * direction, -45); ctx.moveTo(50 * direction, 20); ctx.lineTo(130 * direction, 45); ctx.stroke();
      }
    } else {
      ctx.fillStyle = p.caster.accent; ctx.beginPath(); ctx.arc(0, 0, 55, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  drawSlowMoFx(ctx) {
    const p = this.pendingUltimate;
    ctx.save();
    if (p?.slowRemaining > 0) {
      ctx.strokeStyle = "#ff2a54"; ctx.lineWidth = 10;
      ctx.strokeRect(this.arena.x, this.arena.y, this.arena.w, this.arena.h);
      ctx.fillStyle = "#ffe600"; ctx.font = "900 18px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("IMPACT WINDOW", this.width / 2, this.arena.y + 24);
    }
    if (this.dodgeFlashTimer > 0 && !this.reducedEffects()) {
      ctx.fillStyle = `rgba(255,255,255,${this.dodgeFlashTimer * 3})`; ctx.fillRect(0, 0, this.width, this.height);
    }
    ctx.restore();
  }

  drawFighter(ctx, f) {
    ctx.save();
    ctx.translate(f.x + (f.finaleX || 0), f.y + (f.finaleY || 0));
    ctx.rotate((f.finaleAngle || 0) + (f.morphState?.type === "evade" ? f.morphState.elapsed * 10 : 0));
    ctx.globalAlpha = (f.finaleAlpha ?? 1) * (f.morphState?.type === "teleport" ? Math.max(0, 1 - f.morphState.elapsed / 0.12) : 1);
    const fScale = (f.scaleAnim || 1) * (f.finaleScale || 1) * f.morphScale.current;
    ctx.scale(fScale, fScale);

    const auraScale = Math.min(2.8, Math.max(1, f.radius / 42));
    // The image silhouette carries the colored glow.

    // 蒙多/巨像流越成长，屏幕外圈也能看见能量环，表现“已经大到装不下”
    if (f.radius > 75) {
      ctx.strokeStyle = "#00ff88";
      ctx.lineWidth = Math.min(12, 3 + auraScale);
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, f.radius * 1.28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 护盾环
    if (f.shield > 0) {
      ctx.strokeStyle = "#00f0ff";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, f.radius + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, f.shield / f.maxShield));
      ctx.stroke();
    }

    // 坤哥被动大招：3颗环绕真实纹路篮球
    if (f.ultSkill && f.ultSkill.id === "kg_u2") {
      const t = this.elapsed * 6;
      for (let i = 0; i < 3; i++) {
        const ang = t + (i * Math.PI * 2) / 3;
        const ox = Math.cos(ang) * (f.radius + 22);
        const oy = Math.sin(ang) * (f.radius + 22);
        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(t * 1.5);
        ctx.fillStyle = "#ff7700";
        ctx.strokeStyle = "#1a0d00";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-11, 0);
        ctx.lineTo(11, 0);
        ctx.moveTo(0, -11);
        ctx.lineTo(0, 11);
        ctx.stroke();
        ctx.restore();
      }
    }

    // 哈基米九命猫薄荷 / 红温暴走烈焰脉冲环
    if (f.frenzyTimer > 0) {
      ctx.save();
      ctx.strokeStyle = "#ff2a54";
      ctx.shadowColor = "#ff5500";
      ctx.shadowBlur = 18;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, f.radius + 14 + Math.sin(this.elapsed * 22) * 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 《师父》闪避残影
    if (f.isDodging) {
      ctx.strokeStyle = "#ffe600";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(0, 0, f.radius + 18, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.shadowColor = f.frenzyTimer > 0 ? "#ff2a54" : f.color;
    ctx.shadowBlur = 18 + auraScale * 4;
    const customImg = this.customImages[f.heroId];
    if (customImg) {
      ctx.save();
      // Keep the original image silhouette without circular clipping.
      const imageScale = (f.radius * 2 - 6) / Math.max(customImg.naturalWidth, customImg.naturalHeight);
      const imageWidth = customImg.naturalWidth * imageScale;
      const imageHeight = customImg.naturalHeight * imageScale;
      ctx.drawImage(customImg, -imageWidth / 2, -imageHeight / 2, imageWidth, imageHeight);
      ctx.restore();
    } else {
      ctx.shadowBlur = 0;
      ctx.font = `${Math.max(30, Math.min(120, f.radius * 0.86))}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(f.emoji, 0, -2);
    }
    if (!this.finale || f.finaleScale === undefined || f.finaleScale < 1.35) {
      ctx.fillStyle = f.isPlayer ? "#00ff88" : "#ffe600";
      ctx.font = "900 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(f.isPlayer ? `【我】${f.name}` : `【敌】${f.name}`, 0, -f.radius - 10);
    }
    ctx.restore();
  }

  // 渲染底部最多 5 个主动技能按钮
  renderSkillBarUI() {
    const bar = document.getElementById("active-skill-bar");
    if (!bar || !this.p1) return;
    bar.innerHTML = "";

    this.p1.activeSlots.forEach((slot, idx) => {
      const btn = document.createElement("button");
      btn.className = `battle-skill-btn ${slot.isUlt ? "ult" : ""}`;
      btn.dataset.idx = idx;
      btn.innerHTML = `
        <div class="cd-mask ${slot.isUlt ? "hidden" : ""}" id="cd-mask-${idx}" style="height: 0%"></div>
        <span class="sk-name">[${idx + 1}] ${slot.name}</span>
        <span class="sk-sub">${slot.isUlt ? `⚡究极 ${Math.floor(this.p1.ultimateEnergy)}%` : "Lv." + slot.level}</span>
      `;
      btn.addEventListener("click", () => {
        if (!this.running) return;
        this.castActiveSlot(this.p1, this.p2, idx, true, false);
      });
      bar.appendChild(btn);
    });
  }

  updateSkillCooldownUI() {
    if (!this.p1) return;
    this.p1.activeSlots.forEach((slot, idx) => {
      const mask = document.getElementById(`cd-mask-${idx}`);
      if (slot.isUlt) return;
      const btn = mask ? mask.parentElement : null;
      if (!mask || !btn) return;
      mask.style.height = `${Math.min(100, Math.max(0, (slot.cdLeft / slot.cooldown) * 100))}%`;
      btn.classList.toggle("ready", slot.cdLeft <= 0);
    });
  }

  updateTopHudUI() {
    if (!this.p1 || !this.p2) return;
    this.updateCombatInsights();
    document.getElementById("hud-p1-name").textContent = this.p1.name;
    document.getElementById("hud-p2-name").textContent = this.p2.name;

    const p1Pct = Math.max(0, (this.p1.hp / this.p1.maxHp) * 100);
    const p2Pct = Math.max(0, (this.p2.hp / this.p2.maxHp) * 100);
    document.getElementById("hud-p1-hp").style.width = `${p1Pct}%`;
    document.getElementById("hud-p1-hp-delay").style.width = `${p1Pct}%`;
    document.getElementById("hud-p1-hp-txt").textContent = `${Math.ceil(this.p1.hp)} / ${this.p1.maxHp}${this.p1.shield > 0 ? ` 🛡${Math.ceil(this.p1.shield)}` : ""}`;
    document.getElementById("hud-p2-hp").style.width = `${p2Pct}%`;
    const updateEnergy = (fighter, fillId, textId) => {
      const pct = Math.max(0, Math.min(100, fighter.ultimateEnergy));
      const fill = document.getElementById(fillId); const text = document.getElementById(textId);
      if (fill) fill.style.width = `${pct}%`;
      if (text) text.textContent = pct >= 100 ? (fighter.ultSkill.type === 'passive' ? '已满 · 自动触发' : '已满 · 可释放') : `${Math.floor(pct)}%`;
    };
    updateEnergy(this.p1, "hud-p1-ult", "hud-p1-ult-txt");
    updateEnergy(this.p2, "hud-p2-ult", "hud-p2-ult-txt");
    document.getElementById("hud-p2-hp-delay").style.width = `${p2Pct}%`;
    document.getElementById("hud-p2-hp-txt").textContent = `${Math.ceil(this.p2.hp)} / ${this.p2.maxHp}${this.p2.shield > 0 ? ` 🛡${Math.ceil(this.p2.shield)}` : ""}`;
    document.getElementById("hud-timer").textContent = Math.max(0, Math.ceil(this.matchTimeLeft));
    const phaseEl = document.getElementById("hud-phase");
    if (phaseEl) phaseEl.textContent = this.getPhaseLabel(this.currentPhase);

    const renderPassives = (f, elId) => {
      const el = document.getElementById(elId);
      if (!el) return;
      const chips = [];
      f.corePassives.forEach((cp) => chips.push(`<span class="mini-passive-chip">固:${cp.name}</span>`));
      if (f.ultSkill && f.ultSkill.type === "passive") chips.push(`<span class="mini-passive-chip" style="color:#ffe600">大:${f.ultSkill.name}</span>`);
      f.perks.filter((p) => p.type === "passive").forEach((pk) => {
        const color = window.MEME_DATA.archetypes[pk.archetype]?.color || "#cbd2f6";
        chips.push(`<span class="mini-passive-chip" style="color:${color}">${pk.name}</span>`);
      });
      chips.push(`<span class="stance-strip" title="架势 ${Math.ceil(f.stance)}/${f.maxStance}"><i style="width:${(f.stance / f.maxStance) * 100}%"></i></span>`);
      const markup = chips.join("");
      if (this.hudTags.get(elId) !== markup) {
        el.innerHTML = markup;
        this.hudTags.set(elId, markup);
      }
    };
    renderPassives(this.p1, "hud-p1-passives");
    renderPassives(this.p2, "hud-p2-passives");
  }

  finishMatch() {
    if (this.isRecordingActive()) {
      this.applyRecordingGuards();
      return this.outcome;
    }
    if (!this.running) return this.outcome;
    if (this.finale) return this.outcome;
    const timedOut = this.matchTimeLeft <= 0;
    const score = (fighter) => fighter.hp / fighter.maxHp + (fighter.shield / fighter.maxShield) * 0.15;
    let winner;
    if (this.p1.hp <= 0 && this.p2.hp <= 0) winner = "draw";
    else if (this.p1.hp <= 0) winner = "p2";
    else if (this.p2.hp <= 0) winner = "p1";
    else winner = Math.abs(score(this.p1) - score(this.p2)) < 0.000001 ? "draw" : score(this.p1) > score(this.p2) ? "p1" : "p2";
    const finishKind = timedOut ? 'timeout' : winner === 'draw' ? 'draw' : this.lastLethalHit?.comeback ? 'comeback' : this.lastLethalHit?.attrition ? 'attrition' : 'ko';
    this.outcome = { winner, timedOut, duration: this.elapsed, phase: this.currentPhase, finishKind };
    for (const f of [this.p1, this.p2]) {
      f.morphState = null;
      f.morphScale.current = f.morphScale.target = 1;
      f.phantomTimer = 0;
    }
    if (!this.headless && !this.finalePlayed) {
      this.state = 'finishing';
      this.queuedCasts = [];
      this.clearUltimate();
      this.clones = []; this.summons = []; this.phantoms = [];
      document.getElementById('qte-counter-btn')?.classList.add('hidden');
      this.finale = new window.BattleFinale(this);
      return this.outcome;
    }
    this.running = false;
    this.state = "result";
    this.generation++;
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.frameId = null;
    this.queuedCasts = [];
    this.clearUltimate();
    this.clones = []; this.summons = []; this.phantoms = [];
    if (this.headless) return this.outcome;
    document.getElementById("qte-counter-btn")?.classList.add("hidden");
    const reward = window.GAME_CONFIG.rewards;
    const state = this.store.state;
    state.tickets += reward.tickets;
    state.pityCoins += reward.pityCoins;
    state.exp += reward.exp;
    while (state.exp >= reward.expPerLevel) {
      state.exp -= reward.expPerLevel;
      state.level++;
    }
    this.store.save();
    window.appUI?.refreshTopBar();
    const hero = winner === 'draw' ? null : this[winner];
    const loser = hero === this.p1 ? this.p2 : this.p1;
    const theme = hero ? window.FINALE_THEMES[hero.heroId] : null;
    if (hero && theme?.mvp) {
      window.memeAudio?.playFinaleClip?.(theme.mvp, false);
    }
    const result = document.getElementById('result-overlay');
    result.dataset.hero = hero?.heroId || 'draw';
    result.style.setProperty('--mvp-color', theme?.color || '#ffe600');
    const motifEl = document.getElementById('res-motif');
    if (motifEl) motifEl.textContent = theme?.motif || 'VS';

    const p1Dmg = Math.round(this.p1.damageDealt || 0);
    const p2Dmg = Math.round(this.p2.damageDealt || 0);
    const maxDmg = Math.max(1, p1Dmg, p2Dmg);
    const p1Pct = Math.round((p1Dmg / maxDmg) * 100);
    const p2Pct = Math.round((p2Dmg / maxDmg) * 100);
    const heroDealt = Math.round((hero || this.p1).damageDealt || 0);
    const heroTaken = Math.round((hero || this.p1).damageTaken || 0);
    const dps = Math.round(heroDealt / Math.max(1, this.elapsed || 1));
    const growthRatio = hero ? Math.max(1, (hero.radius || 32) / 32) : 1;
    const sizeTag = growthRatio > 1.05 ? ` · 体型 ${Math.round(growthRatio * 100)}%` : '';
    result.style.setProperty('--mvp-growth', growthRatio.toFixed(3));
    document.getElementById('result-mvp').innerHTML = hero
      ? `<div class="mvp-stage-card"><div class="mvp-stage-portrait"><img src="${window.MEME_DATA.heroes[hero.heroId].imagePath}" alt="${hero.name}"></div><div class="mvp-stage-caption"><small>${theme.scene} · 本场 MVP (${hero.isPlayer ? '我方' : '对手'}${sizeTag})</small><h3>${theme.title}</h3><div class="mvp-hero-tag">${hero.emoji} ${hero.name}</div><p>「${theme.line}」</p></div></div>`
      : `<div class="mvp-stage-card draw-card"><h3>势均力敌 · 双方致敬</h3><p>双双战至最后一刻，不分伯仲！</p></div>`;
    const dmgDashEl = document.getElementById('result-dmg-dashboard');
    if (dmgDashEl) {
      dmgDashEl.innerHTML = `
        <div class="mvp-stat-cards">
          <div class="mvp-stat-box highlight">
            <span class="stat-lbl">💥 MVP 造成伤害</span>
            <strong class="stat-num">${heroDealt.toLocaleString()}</strong>
          </div>
          <div class="mvp-stat-box">
            <span class="stat-lbl">🛡️ MVP 承受伤害</span>
            <strong class="stat-num">${heroTaken.toLocaleString()}</strong>
          </div>
          <div class="mvp-stat-box">
            <span class="stat-lbl">⚡ 秒均输出 (DPS)</span>
            <strong class="stat-num">${dps}/s</strong>
          </div>
        </div>
        <div class="res-dmg-compare">
          <div class="res-dmg-row">
            <span class="res-dmg-who">${this.p1.emoji} 我方 ${this.p1.name}</span>
            <div class="res-dmg-track"><div class="res-dmg-fill p1" style="--target-w:${p1Pct}%"></div></div>
            <strong class="res-dmg-val">${p1Dmg.toLocaleString()}</strong>
          </div>
          <div class="res-dmg-row">
            <span class="res-dmg-who">${this.p2.emoji} 对手 ${this.p2.name}</span>
            <div class="res-dmg-track"><div class="res-dmg-fill p2" style="--target-w:${p2Pct}%"></div></div>
            <strong class="res-dmg-val">${p2Dmg.toLocaleString()}</strong>
          </div>
        </div>
      `;
    }

    document.getElementById("res-Stamp").textContent = winner === "draw" ? "势均力敌" : ({ ko: "重击 KO", comeback: "极限反杀", attrition: "力尽倒下", timeout: "时间到" })[finishKind];
    document.getElementById("res-title").textContent = winner === "draw" ? "🤝 平局 DRAW" : winner === "p1" ? "🏆 胜利 VICTORY" : "💀 败北 DEFEAT";
    document.getElementById("res-title").style.color = winner === "p2" ? "#ff2a54" : "#ffe600";
    document.getElementById("res-subtitle").textContent = `${window.GAME_CONFIG.modes[this.mode].name} · ${this.elapsed.toFixed(1)}秒 · ${timedOut ? "超时按生命比例与护盾结算" : "击倒结算"} · 手动抓时机${this.manualPerfectCount}次`;
    document.getElementById("result-rewards").innerHTML = `<span class="rw-pill">🎟️ 抽卡券 <strong>+${reward.tickets}</strong></span><span class="rw-pill">💎 保底币 <strong>+${reward.pityCoins}</strong></span><span class="rw-pill">⬆️ 经验 <strong>+${reward.exp}</strong></span>`;
    document.getElementById("result-overlay").classList.remove("hidden");
    return this.outcome;
  }

  runHeadlessSimulation(matches = 200, options = {}) {
    return window.BattleSimulation.run({ ...options, matches, store: this.store, mode: options.mode || this.mode });
  }
}

window.BattleEngine = BattleEngine;
