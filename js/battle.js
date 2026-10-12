// 竖屏物理弹球 + 梗技能特效战斗引擎
// 核心特性：
// 1. 角色 2固定核心被动 + 1自选普通主动 + 1自选究极技(主动或被动) + 开局5选3通用词条 = 最多5个主动按钮
// 2. 纯自动胜率稳定在 40%~60%（随机弹跳角 + 镜像等级配平 + 劣势方怒气/暴击橡皮筋补偿）
// 3. 手动抓两球贴脸时机放技能 or 点击【⚡抓时机弹反】可大幅提高暴击率与胜率 (65%~80%)

class BattleEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.width = canvas.width;   // 540
    this.height = canvas.height; // 960

    // 竞技场内框（留出顶部血条与底部技能栏空间）
    this.arena = {
      x: 24,
      y: 122,
      w: 540 - 48,
      h: 645
    };

    this.running = false;
    this.paused = false;
    this.lastTime = 0;
    this.maxMatchDuration = 300.0;
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
    this.trails = [];
    this.particleBursts = [];
    this.announcerTimer = 0;

    this.p1 = null;
    this.p2 = null;
    this.projectiles = [];
    this.floatingTexts = [];
    this.ringEffects = [];
    this.truckHazards = [];
    this.manualPerfectCount = 0;

    // QTE 抓时机弹窗计时
    this.qteTimer = 0;
    this.qteCooldown = 3.5;

    // 预加载外部可选替换贴图 (assets/images/*.png)
    this.customImages = {};
    Object.values(window.MEME_DATA.heroes).forEach((h) => {
      const img = new Image();
      img.src = h.imagePath;
      img.onload = () => { this.customImages[h.id] = img; };
    });
  }

  hasPerk(fighter, perkId) {
    return !!fighter && fighter.perks.some((perk) => perk.id === perkId);
  }

  hasArchetype(fighter, archetype) {
    return !!fighter && fighter.perks.some((perk) => perk.archetype === archetype);
  }

  getPhase(elapsed) {
    if (elapsed < 60) return "early";
    if (elapsed < 180) return "mid";
    if (elapsed < 270) return "late";
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
    });
  }

  updateBuilds(fighter, enemy, dt, headless) {
    fighter.growthTimer += dt;
    fighter.regenTimer += dt;
    fighter.ageTimer += dt;

    const phaseRegen = this.currentPhase === "early" ? 1 : this.currentPhase === "mid" ? 1.6 : 2.4;
    if (this.hasPerk(fighter, "pk_vmp_1") && fighter.regenTimer >= 1) {
      fighter.regenTimer = 0;
      const heal = Math.round(fighter.maxHp * 0.035 * phaseRegen);
      this.applyHeal(fighter, heal, "狂徒每秒回血", headless);
      fighter.shield = Math.min(fighter.maxShield, fighter.shield + Math.round(heal * 0.35));
    }

    if (this.hasPerk(fighter, "pk_col_4") && fighter.growthTimer >= 3) {
      fighter.growthTimer = 0;
      this.growFighter(fighter, 0.035, 42, headless, "泰坦吞噬生长");
    }

    if (this.hasArchetype(fighter, "assassin") && this.currentPhase === "early") {
      fighter.earlyBurst = 1.55;
    } else {
      fighter.earlyBurst = 1;
    }

    if (this.hasArchetype(fighter, "sifu")) {
      fighter.age = Math.max(18, Math.min(72, fighter.age + (fighter.ageTimer > 3 ? 1 : 0)));
      if (fighter.ageTimer > 3) fighter.ageTimer = 0;
    }

    if (this.hasPerk(fighter, "pk_col_3")) {
      const auraRadius = fighter.radius * 1.35;
      const distance = Math.hypot(fighter.x - enemy.x, fighter.y - enemy.y);
      if (distance < auraRadius && Math.random() < dt * 1.5) {
        this.applyDamage(fighter, enemy, Math.round(45 * Math.max(1, fighter.radius / 42)), "日炎灼烧", false, headless);
      }
    }

    if (fighter.dodgeTimer > 0) fighter.dodgeTimer -= dt;
    if (fighter.dodgeTimer <= 0) fighter.isDodging = false;
  }

  growFighter(fighter, ratio, flatHp, headless, label) {
    fighter.maxHp += flatHp;
    fighter.hp = Math.min(fighter.maxHp, fighter.hp + flatHp);
    fighter.radius = Math.min(238, fighter.radius * (1 + ratio));
    fighter.scaleAnim = 1.28;
    if (!headless) {
      this.spawnText(`🟢 ${label} +${flatHp}HP`, fighter.x, fighter.y - fighter.radius - 20, "#00ff88", 18);
      this.particleBursts.push({ x: fighter.x, y: fighter.y, color: "#00ff88", count: 18, life: 0.55 });
    }
  }

  startUltimateCutin(caster, target, slot) {
    if (this.pendingUltimate) return false;
    const hero = window.MEME_DATA.heroes[caster.heroId];
    const source = slot.sourceType === "heroUlt"
      ? hero.ultSkills.find((skill) => skill.id === caster.ultSkill.id)
      : window.MEME_DATA.perks.find((perk) => perk.id === slot.perkId);
    const title = source && source.cutinTitle ? source.cutinTitle : `【究极奥义】${slot.name}!!`;
    const sub = source && source.cutinSub ? source.cutinSub : "高能前摇锁定！抓最后一瞬闪避可以大幅减伤！";
    const bg = source && source.cutinBg ? source.cutinBg : "linear-gradient(135deg, #111, #ffe600, #ff0055)";

    this.pendingUltimate = {
      caster,
      target,
      slot,
      title,
      sub,
      bg,
      total: 1.55,
      remaining: 1.55,
      dodgeWindow: 0.75,
      dodged: false
    };
    this.ultimateDodgeWindow = 0;
    this.hitstopTimer = 0.08;
    this.triggerShake(slot.isUlt ? 8 : 5, 0.18);
    window.memeAudio.playUltCutinAlarm(caster.heroId, slot.shout || slot.name);
    this.showUltimateCutin(true);
    return true;
  }

  showUltimateCutin(visible) {
    if (typeof document === "undefined") return;
    const overlay = document.getElementById("ultimate-cutin-overlay");
    if (!overlay) return;
    if (!visible) {
      overlay.classList.add("hidden");
      return;
    }
    const pending = this.pendingUltimate;
    overlay.style.setProperty("--cutin-bg", pending.bg);
    document.getElementById("cutin-title").textContent = pending.title;
    document.getElementById("cutin-subtitle").textContent = pending.sub;
    document.getElementById("cutin-caster").textContent = `${pending.caster.emoji} ${pending.caster.name} 发动究极技能`;
    overlay.classList.remove("hidden");
  }

  updateUltimateCutin(dt, headless) {
    if (!this.pendingUltimate) return false;
    const pending = this.pendingUltimate;
    pending.remaining -= dt;
    this.ultimateDodgeWindow = pending.remaining <= pending.dodgeWindow ? Math.max(0, pending.remaining) : 0;
    if (!headless && typeof document !== "undefined") {
      const timer = document.getElementById("cutin-timer");
      const dodge = document.getElementById("ultimate-dodge-btn");
      if (timer) timer.textContent = `${Math.max(0, pending.remaining).toFixed(2)}s`;
      if (dodge) dodge.classList.toggle("danger-window", this.ultimateDodgeWindow > 0);
    }
    if (pending.remaining <= 0) {
      this.resolveUltimateCutin(headless);
    }
    return true;
  }

  resolveUltimateCutin(headless) {
    const pending = this.pendingUltimate;
    if (!pending) return;
    this.pendingUltimate = null;
    this.ultimateDodgeWindow = 0;
    this.showUltimateCutin(false);
    const caster = pending.caster;
    const target = pending.target;
    const slot = pending.slot;
    const lvMult = 1 + (slot.level - 1) * 0.28;
    const damage = Math.round((slot.baseDamage || 220) * lvMult);

    if (pending.dodged) {
      if (!headless) {
        window.memeAudio.playSifuDodge();
        this.spawnText("🥋 完美闪避！究极技落空！", target.x, target.y - target.radius - 30, "#ffe600", 24);
        this.particleBursts.push({ x: target.x, y: target.y, color: "#ffe600", count: 38, life: 0.8 });
        this.triggerShake(14, 0.22);
      }
      target.isDodging = true;
      target.dodgeTimer = 0.55;
      target.dodgeCount++;
      if (this.hasPerk(target, "pk_sifu_1")) {
        target.activeSlots.forEach((activeSlot) => { activeSlot.cdLeft = 0; });
        this.applyHeal(target, 180, "师父寸拳回气", headless);
        this.applyDamage(target, caster, 320, "🥋见招拆招·寸拳处决", true, headless);
      }
      return;
    }

    if (!headless) {
      this.triggerShake(26, 0.42);
      this.particleBursts.push({ x: target.x, y: target.y, color: caster.accent, count: 60, life: 1.0 });
      this.spawnText(`💥 ${slot.name} 落地!!`, target.x, target.y - target.radius - 30, "#ff2a54", 28);
    }
    this.applyDamage(caster, target, damage, slot.name, true, headless);
    this.executeUltimateEffect(caster, target, slot, headless);
  }

  executeUltimateEffect(caster, target, slot, headless) {
    const kind = slot.effectKind;
    if (kind === "ult_truck_stampede") {
      const truckCount = 3 + Math.min(5, slot.level);
      for (let i = 0; i < truckCount; i++) {
        this.truckHazards.push({ owner: caster, x: this.arena.x - 80 - i * 108, y: this.arena.y + 85 + ((i * 155) % (this.arena.h - 125)), vx: 780, w: 122, h: 58, dmg: Math.round(slot.baseDamage * 0.45), hitDone: false });
      }
    } else if (kind === "ult_cat_frenzy" || kind === "ult_heli_crash" || kind === "ult_basketball_rain") {
      caster.x = (caster.x + target.x) * 0.5;
      caster.y = (caster.y + target.y) * 0.5;
      this.spawnProjectiles(caster, target, 7, Math.round(slot.baseDamage * 0.16), 500, caster.accent, 21);
      this.ringEffects.push({ x: target.x, y: target.y, r: 20, maxR: 260, color: caster.accent, alpha: 1 });
    } else if (kind === "pk_col_2") {
      this.growFighter(caster, 0.25, 220, headless, "蒙多巨大化");
      this.applyHeal(caster, 220, "蒙多狂暴回血", headless);
    } else if (kind === "pk_mag_2") {
      this.spawnProjectiles(caster, target, 12, Math.round(slot.baseDamage * 0.12), 540, caster.accent, 14);
    } else if (kind === "pk_sifu_5") {
      this.timeStopTimer = 2.0;
      this.timeStopOwner = caster;
      caster.activeSlots.forEach((activeSlot) => { activeSlot.cdLeft = Math.min(activeSlot.cdLeft, 0.4); });
    } else if (kind === "pk_ur1" || kind === "pk_mag_5") {
      this.spinArenaTimer = 3.0;
    }
  }

  triggerUltimateDodge() {
    if (!this.running || !this.pendingUltimate || this.ultimateDodgeWindow <= 0) return false;
    const pending = this.pendingUltimate;
    if (!pending.target.isPlayer) return false;
    pending.dodged = true;
    this.spawnText("⚡ 最后一瞬闪避成功!!", pending.target.x, pending.target.y - pending.target.radius - 40, "#00ff88", 25);
    if (typeof document !== "undefined") {
      const dodge = document.getElementById("ultimate-dodge-btn");
      if (dodge) dodge.classList.add("hidden");
    }
    return true;
  }

  // 构建参战实体
  // 构建参战实体
  createFighter(heroId, isPlayer, pickedPerks, mirrorLevelAvg = 1) {
    const store = window.gameStore;
    const heroCfg = window.MEME_DATA.heroes[heroId];

    // 普通主动技
    let normalSkill = heroCfg.normalSkills[0];
    let normalLv = 1;
    if (isPlayer) {
      const eqId = store.state.equippedNormal[heroId];
      normalSkill = heroCfg.normalSkills.find((s) => s.id === eqId) || heroCfg.normalSkills[0];
      normalLv = store.state.skillLevels[normalSkill.id] || 1;
    } else {
      normalSkill = heroCfg.normalSkills[Math.floor(Math.random() * heroCfg.normalSkills.length)];
      normalLv = Math.max(1, Math.round(mirrorLevelAvg + (Math.random() * 0.6 - 0.3)));
    }

    // 究极技（可能是主动，也可能是被动）
    let ultSkill = heroCfg.ultSkills[0];
    let ultLv = 1;
    if (isPlayer) {
      const eqUltId = store.state.equippedUlt[heroId];
      ultSkill = heroCfg.ultSkills.find((u) => u.id === eqUltId) || heroCfg.ultSkills[0];
      ultLv = store.state.skillLevels[ultSkill.id] || 1;
    } else {
      ultSkill = heroCfg.ultSkills[Math.floor(Math.random() * heroCfg.ultSkills.length)];
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
      cdLeft: 0.8 + Math.random() * 0.6,
      baseDamage: normalSkill.baseDamage,
      shout: normalSkill.shout,
      effectKind: normalSkill.effectKind,
      sourceType: "heroSkill"
    });

    if (ultSkill.type === "active") {
      activeSlots.push({
        slotId: "ult_active",
        name: ultSkill.name,
        isUlt: true,
        level: ultLv,
        cooldown: ultSkill.cooldown,
        cdLeft: 3.5 + Math.random() * 1.0,
        baseDamage: ultSkill.baseDamage,
        shout: ultSkill.shout,
        effectKind: ultSkill.effectKind,
        sourceType: "heroUlt"
      });
    }

    pickedPerks.forEach((pk, idx) => {
      if (pk.type === "active") {
        activeSlots.push({
          slotId: `perk_active_${idx}`,
          perkId: pk.id,
          name: pk.name,
          isUlt: pk.rarity === "UR",
          level: 1, // 词条升级只加局外刷出率，局内数值恒定以保平衡
          cooldown: pk.cooldown || 4.5,
          cdLeft: 1.4 + idx * 0.7,
          baseDamage: pk.baseDamage || 90,
          heal: pk.heal || 0,
          shout: pk.shout,
          effectKind: pk.id,
          sourceType: "perk"
        });
      }
    });

    // 初始位置与老式 DVD 弹球速度
    const startX = isPlayer ? this.arena.x + 115 : this.arena.x + this.arena.w - 115;
    const startY = this.arena.y + this.arena.h * (0.35 + Math.random() * 0.3);
    const angle = (Math.random() * 0.5 + 0.2) * Math.PI * (isPlayer ? 1 : -1);
    const hasSpeedPerk = pickedPerks.some((p) => p.id === "pk_asn_3" || p.id === "pk_mag_1");
    const baseSpd = (300 + Math.random() * 25) * (hasSpeedPerk ? 1.14 : 1.0);

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
      radius: 42,
      maxHp: 2200,
      hp: 2200,
      maxShield: 900,
      shield: 0,
      corePassives: heroCfg.corePassives,
      ultSkill,
      ultLv,
      perks: pickedPerks,
      buildTags: [...new Set(pickedPerks.map((perk) => perk.archetype).filter(Boolean))],
      activeSlots, // 1 ~ 5 个主动按钮
      passiveTimer: 0,
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
      damageDealt: 0,
      damageTaken: 0,
      nineLivesUsed: false,
      pddImmortalUsed: false,
      immortalTimer: 0,
      hitCounter: 0,
      castCount: 0,
      scaleAnim: 1.0
    };
  }

  startMatch(p1HeroId, p1Perks) {
    const store = window.gameStore;
    const allHeroIds = Object.keys(window.MEME_DATA.heroes);
    const p2HeroId = allHeroIds[Math.floor(Math.random() * allHeroIds.length)];

    // AI 随机抽3个词条
    const shuffledPerks = [...window.MEME_DATA.perks].sort(() => Math.random() - 0.5);
    const p2Perks = shuffledPerks.slice(0, 3);

    // 计算玩家当前角色的技能平均等级，给 AI 镜像匹配相近强度，保证神仙打架且纯自动 40~60% 胜率
    const eqN = store.state.equippedNormal[p1HeroId];
    const eqU = store.state.equippedUlt[p1HeroId];
    const p1AvgLv = ((store.state.skillLevels[eqN] || 1) + (store.state.skillLevels[eqU] || 1)) / 2;

    this.p1 = this.createFighter(p1HeroId, true, p1Perks, p1AvgLv);
    this.p2 = this.createFighter(p2HeroId, false, p2Perks, p1AvgLv);

    // 双方技能等级越高，等比例提升双方最大生命值，确保长局构筑有时间成型
    const hpScale = 1 + (p1AvgLv - 1) * 0.32;
    this.p1.maxHp = Math.round(2200 * hpScale);
    this.p1.hp = this.p1.maxHp;
    this.p2.maxHp = Math.round(2200 * hpScale);
    this.p2.hp = this.p2.maxHp;
    this.p1.maxShield = Math.round(900 * hpScale);
    this.p2.maxShield = Math.round(900 * hpScale);
    this.p1.shield = 0;
    this.p2.shield = 0;

    this.projectiles = [];
    this.floatingTexts = [];
    this.ringEffects = [];
    this.truckHazards = [];
    this.trails = [];
    this.particleBursts = [];
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

    this.renderSkillBarUI();
    this.updateTopHudUI();

    this.spawnText("⚡ 神人乱斗开始!!", this.width / 2, this.arena.y + 120, "#ffe600", 30);
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  loop(now) {
    if (!this.running) return;
    const rawDt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    if (!this.paused) {
      this.update(rawDt);
    }
    this.draw();

    if (this.running) {
      requestAnimationFrame((t) => this.loop(t));
    }
  }

  // 核心每帧更新（支持最多300秒长局与前/中/后期构筑演进）
  update(dt, headless = false) {
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }
    if (this.shakeTimer > 0) this.shakeTimer -= dt;
    if (this.spinArenaTimer > 0) this.spinArenaTimer -= dt;
    if (this.timeStopTimer > 0) this.timeStopTimer -= dt;
    if (this.arenaPulse > 0) this.arenaPulse -= dt;
    if (this.announcerTimer > 0) this.announcerTimer -= dt;

    if (this.pendingUltimate) {
      this.updateUltimateCutin(dt, headless);
      if (this.pendingUltimate) return;
    }

    this.matchTimeLeft -= dt;
    this.updatePhase(headless);
    if (this.matchTimeLeft <= 0 || this.p1.hp <= 0 || this.p2.hp <= 0) {
      if (!headless) this.finishMatch();
      return;
    }

    if (!headless) {
      const dist = Math.hypot(this.p1.x - this.p2.x, this.p1.y - this.p2.y);
      const qteBtn = document.getElementById("qte-counter-btn");
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

    this.updateFighter(this.p1, this.p2, dt, headless);
    this.updateFighter(this.p2, this.p1, dt, headless);
    this.handleFighterCollision(headless);
    this.updateProjectiles(dt, headless);
    this.updateHazards(dt, headless);

    if (!headless) {
      this.updateParticles(dt);
      this.updateTopHudUI();
      this.updateSkillCooldownUI();
    }
  }

  updateFighter(f, enemy, dt, headless) {
    if (f.immortalTimer > 0) f.immortalTimer -= dt;
    if (f.wallBoostTimer > 0) f.wallBoostTimer -= dt;
    f.scaleAnim += (1.0 - f.scaleAnim) * 10 * dt;
    this.updateBuilds(f, enemy, dt, headless);

    // 被动大招定时触发
    if (f.ultSkill && f.ultSkill.type === "passive") {
      f.passiveTimer += dt;
      if (f.passiveTimer >= 3.5) {
        f.passiveTimer = 0;
        this.triggerPassiveUlt(f, enemy, headless);
      }
    }

    // 时停冻结判定
    const isFrozen = this.timeStopTimer > 0 && this.timeStopOwner !== f;
    if (!isFrozen) {
      // 滚筒洗衣机向心旋转力
      if (this.spinArenaTimer > 0) {
        const cx = this.arena.x + this.arena.w / 2;
        const cy = this.arena.y + this.arena.h / 2;
        f.vx += (cx - f.x) * 2.8 * dt;
        f.vy += (cy - f.y) * 2.8 * dt;
      }

      const spdMult = (f.wallBoostTimer > 0 ? 1.25 : 1.0) * (f.hp / f.maxHp < 0.4 ? 1.15 : 1.0);
      f.x += f.vx * spdMult * dt;
      f.y += f.vy * spdMult * dt;

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
        const jitter = (Math.random() - 0.5) * 0.18;
        const ca = Math.cos(jitter), sa = Math.sin(jitter);
        const nvx = f.vx * ca - f.vy * sa;
        const nvy = f.vx * sa + f.vy * ca;
        f.vx = nvx;
        f.vy = nvy;

        if (!headless) window.memeAudio.playWallBounce();

        // 大运被动：百吨惯性
        if (f.heroId === "dayun") {
          f.wallBoostTimer = 1.6;
        }
        // 弹簧肉垫词条：摸墙回血
        if (this.hasPerk(f, "pk_vmp_4")) {
          this.applyHeal(f, 45, "弹簧肉垫+45", headless);
        }
      }
    }

    // 主动技能冷却、法术急速与自动施放
    const autoEnabled = f.isPlayer ? window.gameStore.state.autoBattle : true;
    f.activeSlots.forEach((slot, idx) => {
      const haste = this.hasPerk(f, "pk_mag_1") ? 1.65 : 1.0;
      const behindBoost = f.hp < enemy.hp * 0.78 ? 1.22 : 1.0;
      slot.cdLeft = Math.max(0, slot.cdLeft - dt * behindBoost * haste);

      if (slot.cdLeft <= 0 && autoEnabled && !isFrozen) {
        if (Math.random() < 0.08 || headless) {
          this.castActiveSlot(f, enemy, idx, false, headless);
        }
      }
    });
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
      const bounceSpd = 380;
      a.vx = -nx * bounceSpd + (Math.random() - 0.5) * 90;
      a.vy = -ny * bounceSpd + (Math.random() - 0.5) * 90;
      b.vx = nx * bounceSpd + (Math.random() - 0.5) * 90;
      b.vy = ny * bounceSpd + (Math.random() - 0.5) * 90;

      // 双方互相造成碰撞伤害 + 各自核心被动
      const dmgAtoB = 42 + (a.heroId === "dayun" && a.wallBoostTimer > 0 ? 45 : 0) + (a.heroId === "laoda" ? 48 : 0);
      const dmgBtoA = 42 + (b.heroId === "dayun" && b.wallBoostTimer > 0 ? 45 : 0) + (b.heroId === "laoda" ? 48 : 0);

      this.applyDamage(a, b, dmgAtoB, "肉搏冲撞!", false, headless);
      this.applyDamage(b, a, dmgBtoA, "肉搏冲撞!", false, headless);

      // 哈基米核心被动：应激哈气反震
      if (a.heroId === "hajimi" && Math.random() < 0.35) {
        this.applyDamage(a, b, 60, "😾应激哈气!!", true, headless);
      }
      if (b.heroId === "hajimi" && Math.random() < 0.35) {
        this.applyDamage(b, a, 60, "😾应激哈气!!", true, headless);
      }

      // 《师父》技术流：太极偏斜偶发化解碰撞并立即反击
      if (this.hasPerk(a, "pk_sifu_4") && Math.random() < 0.25) {
        a.isDodging = true;
        a.dodgeTimer = 0.18;
        if (!headless) window.memeAudio.playSifuDodge();
        this.applyDamage(a, b, 85, "借力打力·太极偏斜", true, headless);
      }
      if (this.hasPerk(b, "pk_sifu_4") && Math.random() < 0.25) {
        b.isDodging = true;
        b.dodgeTimer = 0.18;
        if (!headless) window.memeAudio.playSifuDodge();
        this.applyDamage(b, a, 85, "借力打力·太极偏斜", true, headless);
      }

      // 心之钢：肉搏碰撞触发金属叮声与永久成长
      [a, b].forEach((fighter) => {
        if (this.hasPerk(fighter, "pk_col_1")) {
          this.growFighter(fighter, 0.05, 65, headless, "心之钢叠层");
          if (!headless) window.memeAudio.playHeartsteelClang();
        }
      });

      // 架势条被碰撞削减，用于师父流破防反馈
      a.stance = Math.max(0, a.stance - 10);
      b.stance = Math.max(0, b.stance - 10);

      if (!headless) {
        window.memeAudio.playClash(false);
        this.triggerShake(8, 0.14);
        this.hitstopTimer = 0.035;
      }
    }
  }

  // 释放底部 1~5 号主动技能（isManual = true 代表玩家手点，检测贴脸时机给予精准暴击加成）
  castActiveSlot(caster, target, slotIndex, isManual = false, headless = false) {
    const slot = caster.activeSlots[slotIndex];
    if (!slot || slot.cdLeft > 0) return false;

    slot.cdLeft = slot.cooldown;
    caster.castCount++;
    caster.scaleAnim = 1.38;

    // UR大招先进入全屏Cut-in前摇，最后0.75秒开放极限闪避
    if (slot.isUlt && !headless && !this.pendingUltimate) {
      this.startUltimateCutin(caster, target, slot);
      return true;
    }

    // 无头模拟直接结算大招，不显示DOM演出
    if (slot.isUlt && headless) {
      const headlessLvMult = 1 + (slot.level - 1) * 0.28;
      this.applyDamage(caster, target, Math.round((slot.baseDamage || 220) * headlessLvMult), slot.name, true, true);
      this.executeUltimateEffect(caster, target, slot, true);
      return true;
    }

    // 技能等级加成（角色技能升级：伤害与特效规模成长）
    const lvMult = 1 + (slot.level - 1) * 0.28;

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

    const rawDmg = Math.round((slot.baseDamage || 95) * lvMult * timingBonus);

    if (!headless) {
      window.memeAudio.playSkillSFX(caster.heroId, slot.isUlt, slot.shout || slot.name);
      this.spawnText(slot.shout || slot.name, caster.x, caster.y - 36, slot.isUlt ? "#ffe600" : "#00f0ff", slot.isUlt ? 26 : 20);
      this.triggerShake(slot.isUlt ? 16 : 9, slot.isUlt ? 0.28 : 0.15);
    }

    // 坤哥核心被动：每满3次技能炸裂全屏羽毛
    if (caster.heroId === "kunge" && caster.castCount % 3 === 0) {
      this.applyDamage(caster, target, 75, "🐔两年半羽毛爆裂!!", true, headless);
    }

    // 按技能特效类型执行
    const kind = slot.effectKind;
    if (slot.heal && slot.heal > 0) {
      this.applyHeal(caster, slot.heal, "吨吨吨回血!!", headless);
      return true;
    }

    if (kind === "dash_ram") {
      // 突进肘击/漂移冲撞
      const angle = Math.atan2(target.y - caster.y, target.x - caster.x);
      caster.vx = Math.cos(angle) * 560;
      caster.vy = Math.sin(angle) * 560;
      // 冲刺直接造成一次范围判定或发射高速近身冲击
      if (dist < 250 || isManual) {
        this.applyDamage(caster, target, rawDmg, slot.name, isManual, headless);
      } else {
        this.spawnProjectiles(caster, target, 1, rawDmg, 520, caster.accent, 22);
      }
    } else if (kind === "ult_truck_stampede") {
      // 大运主动大招：召唤多辆百吨王横穿全屏（等级越高卡车越多）
      const truckCount = 2 + Math.min(3, slot.level);
      for (let i = 0; i < truckCount; i++) {
        this.truckHazards.push({
          owner: caster,
          x: this.arena.x - 60 - i * 110,
          y: this.arena.y + 90 + ((i * 165) % (this.arena.h - 140)),
          vx: 680,
          w: 110,
          h: 54,
          dmg: Math.round(rawDmg * 0.62),
          hitDone: false
        });
      }
      this.applyDamage(caster, target, Math.round(rawDmg * 0.55), "🚛百吨王轰鸣!!", true, headless);
    } else if (kind === "ult_cat_frenzy" || kind === "ult_heli_crash" || kind === "ult_basketball_rain") {
      // 瞬移狂抓 / 曼巴直升机 / 漫天篮球雨
      caster.x = (caster.x + target.x) * 0.5;
      caster.y = (caster.y + target.y) * 0.5;
      if (!headless) {
        this.ringEffects.push({ x: target.x, y: target.y, r: 20, maxR: 220 * Math.min(1.6, lvMult), color: caster.accent, alpha: 1 });
      }
      const burstCount = 3 + Math.min(4, slot.level);
      this.spawnProjectiles(caster, target, burstCount, Math.round(rawDmg * 0.35), 460, caster.accent, 18);
      this.applyDamage(caster, target, Math.round(rawDmg * 0.78), `💥${slot.name}!!`, true, headless);
    } else if (kind === "pk_ur1") {
      // 彩色词条：滚筒洗衣机领域
      this.spinArenaTimer = 3.0;
      this.applyDamage(caster, target, rawDmg, "🌀滚筒洗衣机!!", true, headless);
    } else if (kind === "pk_ur2") {
      // 彩色词条：砸瓦鲁多时停
      this.timeStopTimer = 1.8;
      this.timeStopOwner = caster;
      this.applyDamage(caster, target, rawDmg, "⏱️时间停止!!", true, headless);
    } else {
      // 通用弹幕 / 声波 / 冰红茶
      if (kind === "heal_splash") {
        this.applyHeal(caster, 105, "🍹冰红茶+105", headless);
      }
      if (!headless) {
        this.ringEffects.push({ x: caster.x, y: caster.y, r: 30, maxR: 170 * Math.min(1.5, lvMult), color: caster.color, alpha: 1 });
      }
      const pCount = Math.min(5, 1 + Math.floor(slot.level / 2));
      this.spawnProjectiles(caster, target, pCount, Math.round(rawDmg / Math.sqrt(pCount)), 470, caster.accent, 16);
      if (dist < 185) {
        this.applyDamage(caster, target, Math.round(rawDmg * 0.65), slot.name, isManual, headless);
      }
    }

    return true;
  }

  // 触发被动型究极技（无需按键，自动周期爆发）
  triggerPassiveUlt(caster, target, headless) {
    const lvMult = 1 + (caster.ultLv - 1) * 0.25;
    const dmg = Math.round(115 * lvMult);
    if (!headless) {
      this.ringEffects.push({ x: caster.x, y: caster.y, r: 25, maxR: 185, color: "#ffe600", alpha: 1 });
      this.spawnText(`⚡${caster.ultSkill.name}`, caster.x, caster.y - 45, "#ffe600", 20);
      window.memeAudio.playSkillSFX(caster.heroId, false, caster.ultSkill.shout || caster.ultSkill.name);
    }
    if (caster.ultSkill.id === "dy_u2") {
      this.applyHeal(caster, 65, "泥头装甲+65", headless);
    }
    this.spawnProjectiles(caster, target, 2, Math.round(dmg * 0.65), 450, "#ffe600", 16);
  }

  // 玩家点击屏幕中央【⚡抓时机！极限弹反】按钮
  triggerManualQTE() {
    if (!this.running) return;
    if (this.pendingUltimate) {
      this.triggerUltimateDodge();
      return;
    }
    if (this.qteTimer <= 0) return;
    const qteBtn = document.getElementById("qte-counter-btn");
    if (qteBtn) qteBtn.classList.add("hidden");

    this.manualPerfectCount++;
    window.memeAudio.playClash(true);
    window.memeAudio.speakMemeShout("极限弹反哈气！", this.p1.heroId, true);
    this.triggerShake(18, 0.25);
    this.hitstopTimer = 0.06;
    this.ringEffects.push({ x: this.p1.x, y: this.p1.y, r: 20, maxR: 230, color: "#00ff88", alpha: 1 });
    this.spawnText("⚡ 完美弹反哈气!! 暴击+回血!", this.p1.x, this.p1.y - 60, "#00ff88", 26);

    this.applyHeal(this.p1, 95, "完美防反+95", false);
    this.applyDamage(this.p1, this.p2, 145, "💥极限反震!!", true, false);
  }

  spawnProjectiles(caster, target, count, dmg, speed, color, radius) {
    const baseAngle = Math.atan2(target.y - caster.y, target.x - caster.x);
    for (let i = 0; i < count; i++) {
      // 带随机散射角，使得远距离自动乱放可能空技能，而贴脸手操必中！
      const spread = (i - (count - 1) / 2) * 0.24 + (Math.random() - 0.5) * 0.16;
      const ang = baseAngle + spread;
      this.projectiles.push({
        owner: caster,
        x: caster.x,
        y: caster.y,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        r: radius,
        dmg,
        color,
        bouncesLeft: 1,
        life: 2.2
      });
    }
  }

  updateProjectiles(dt, headless) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
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

      const target = p.owner.isPlayer ? this.p2 : this.p1;
      if (Math.hypot(p.x - target.x, p.y - target.y) < p.r + target.radius) {
        this.applyDamage(p.owner, target, p.dmg, "弹幕命中!", false, headless);
        p.life = 0;
      }

      if (p.life <= 0) this.projectiles.splice(i, 1);
    }
  }

  updateHazards(dt, headless) {
    for (let i = this.truckHazards.length - 1; i >= 0; i--) {
      const t = this.truckHazards[i];
      t.x += t.vx * dt;
      const target = t.owner.isPlayer ? this.p2 : this.p1;
      if (!t.hitDone && Math.abs(t.x - target.x) < t.w * 0.65 && Math.abs(t.y - target.y) < t.h * 0.85) {
        t.hitDone = true;
        this.applyDamage(t.owner, target, t.dmg, "🚛百吨碾压!!", true, headless);
      }
      if (t.x > this.width + 150) this.truckHazards.splice(i, 1);
    }
  }

  // 伤害结算与流派机制：秒杀、吸血护盾、架势、前中后期成长
  applyDamage(attacker, defender, amount, label, forceCrit = false, headless = false) {
    if (!this.running) return;

    let balanceMult = 1.0;
    if (attacker.hp < defender.hp * 0.72) {
      balanceMult = 1.24;
    } else if (attacker.hp > defender.hp * 1.35) {
      balanceMult = 0.86;
    }

    let critChance = forceCrit ? 1.0 : (attacker.heroId === "laoda" ? 0.28 : 0.18);
    if (this.hasPerk(attacker, "pk_asn_4")) critChance += 0.3;
    const isCrit = Math.random() < critChance;
    const critMult = this.hasPerk(attacker, "pk_asn_4") ? 2.1 : 1.45;
    let finalDmg = Math.round(amount * balanceMult * (isCrit ? critMult : 1.0) * (0.9 + Math.random() * 0.2) * (attacker.earlyBurst || 1));

    if (this.hasPerk(defender, "pk_col_5")) finalDmg = Math.round(finalDmg * 0.8);
    if (defender.heroId === "kunge" && finalDmg > 110) finalDmg = Math.round(finalDmg * 0.72);

    if (this.hasArchetype(defender, "sifu")) {
      defender.stance = Math.max(0, defender.stance - Math.round(finalDmg * 0.08));
      if (defender.stance <= 0) {
        defender.stance = defender.maxStance;
        finalDmg = Math.round(finalDmg * 1.3);
        if (!headless) this.spawnText("🥋 架势崩坏·处决窗口!!", defender.x, defender.y - defender.radius - 20, "#ffe600", 22);
      }
    }

    const shieldDamage = Math.min(defender.shield || 0, finalDmg);
    defender.shield = Math.max(0, (defender.shield || 0) - shieldDamage);
    defender.hp -= finalDmg - shieldDamage;
    defender.damageTaken += finalDmg;
    attacker.damageDealt += finalDmg;
    defender.scaleAnim = 0.78;

    const lowHp = defender.hp > 0 && defender.hp <= defender.maxHp * 0.35;
    const lotteryChance = lowHp ? 0.15 : 0.06;
    if (this.hasPerk(attacker, "pk_asn_1") && Math.random() < lotteryChance) {
      defender.hp = 0;
      if (!headless) {
        window.memeAudio.playExecute9999();
        this.spawnText("💀 9999断头台·逆天秒杀!!", defender.x, defender.y - defender.radius - 28, "#ff2a54", 28);
        this.triggerShake(30, 0.5);
      }
      return;
    }
    if (this.hasPerk(attacker, "pk_asn_5") && defender.hp > 0 && defender.hp <= defender.maxHp * 0.12) {
      defender.hp = 0;
      if (!headless) {
        window.memeAudio.playExecute9999();
        this.spawnText("🪙 收集者·金币处决!!", defender.x, defender.y - defender.radius - 28, "#ffe600", 25);
      }
      return;
    }

    if (this.hasPerk(attacker, "pk_vmp_2")) {
      const heal = Math.round(finalDmg * 0.38);
      this.applyHeal(attacker, heal, "饮血剑吸血", headless);
      if (attacker.hp >= attacker.maxHp) attacker.shield = Math.min(attacker.maxShield, attacker.shield + heal);
    }

    if (defender.hp <= 0 && this.hasPerk(defender, "pk_vmp_3") && !defender.pddImmortalUsed) {
      defender.pddImmortalUsed = true;
      defender.immortalTimer = 3.0;
      defender.hp = 1;
      if (!headless) this.spawnText("🛡️拼夕夕还差0.01刀免死!!", defender.x, defender.y - 50, "#ffe600", 24);
      this.applyDamage(defender, attacker, 180, "砍一刀反震!!", true, headless);
      return;
    }

    if (defender.immortalTimer > 0 && defender.hp <= 0) defender.hp = 1;

    if (defender.heroId === "hajimi" && defender.hp > 0 && defender.hp < defender.maxHp * 0.28 && !defender.nineLivesUsed) {
      defender.nineLivesUsed = true;
      this.applyHeal(defender, 220, "🌿九命猫薄荷+220!!", headless);
    }

    defender.hp = Math.max(0, defender.hp);
    if (!headless) {
      const txt = `${label ? label + " " : ""}-${finalDmg}${isCrit ? " 暴击!!" : ""}`;
      this.spawnText(txt, defender.x + (Math.random() - 0.5) * 40, defender.y - 28, isCrit ? "#ffe600" : "#ff2a54", isCrit ? 23 : 17);
      this.particleBursts.push({ x: defender.x, y: defender.y, color: isCrit ? "#ffe600" : defender.color, count: isCrit ? 18 : 8, life: 0.38 });
    }
  }

  applyHeal(fighter, amount, label, headless = false) {
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
    if (this.p1 && this.p2) {
      [this.p1, this.p2].forEach((fighter) => {
        this.trails.push({ x: fighter.x, y: fighter.y, r: Math.min(80, fighter.radius * 0.45), color: fighter.color, alpha: 0.34 });
      });
    }
    for (let i = this.trails.length - 1; i >= 0; i--) {
      this.trails[i].alpha -= dt * 2.8;
      this.trails[i].r *= 0.985;
      if (this.trails[i].alpha <= 0) this.trails.splice(i, 1);
    }
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

    // 百吨王卡车冲撞特效
    this.truckHazards.forEach((t) => {
      ctx.save();
      ctx.fillStyle = "#ff2a54";
      ctx.strokeStyle = "#ffe600";
      ctx.lineWidth = 3;
      ctx.fillRect(t.x - t.w / 2, t.y - t.h / 2, t.w, t.h);
      ctx.strokeRect(t.x - t.w / 2, t.y - t.h / 2, t.w, t.h);
      ctx.fillStyle = "#fff";
      ctx.font = "900 22px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("🚛百吨王", t.x, t.y + 8);
      ctx.restore();
    });

    // 弹幕投射物
    this.projectiles.forEach((p) => {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 角色球体绘制
    if (this.p1) this.drawFighter(ctx, this.p1);
    if (this.p2) this.drawFighter(ctx, this.p2);

    ctx.restore();

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

  drawFighter(ctx, f) {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(f.scaleAnim, f.scaleAnim);

    const auraScale = Math.min(2.8, Math.max(1, f.radius / 42));
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = f.color;
    ctx.beginPath();
    ctx.arc(0, 0, f.radius * 1.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

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

    // 坤哥被动大招：3颗环绕篮球
    if (f.ultSkill && f.ultSkill.id === "kg_u2") {
      const t = performance.now() * 0.006;
      for (let i = 0; i < 3; i++) {
        const ang = t + (i * Math.PI * 2) / 3;
        const ox = Math.cos(ang) * (f.radius + 22);
        const oy = Math.sin(ang) * (f.radius + 22);
        ctx.fillStyle = "#ff8800";
        ctx.beginPath();
        ctx.arc(ox, oy, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 《师父》闪避残影
    if (f.isDodging) {
      ctx.strokeStyle = "#ffe600";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(0, 0, f.radius + 18, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.shadowColor = f.color;
    ctx.shadowBlur = 18 + auraScale * 4;
    ctx.fillStyle = f.color;
    ctx.beginPath();
    ctx.arc(0, 0, f.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 4;
    ctx.strokeStyle = f.isPlayer ? "#00ff88" : "#ff2a54";
    ctx.stroke();

    const customImg = this.customImages[f.heroId];
    if (customImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, f.radius - 3, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(customImg, -f.radius, -f.radius, f.radius * 2, f.radius * 2);
      ctx.restore();
    } else {
      ctx.shadowBlur = 0;
      ctx.font = `${Math.max(30, Math.min(120, f.radius * 0.86))}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(f.emoji, 0, -2);
    }

    ctx.shadowBlur = 0;
    ctx.fillStyle = f.isPlayer ? "#00ff88" : "#ffe600";
    ctx.font = "900 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(f.isPlayer ? `【我】${f.name}` : `【敌】${f.name}`, 0, -f.radius - 10);
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
        <div class="cd-mask" id="cd-mask-${idx}" style="height: 0%"></div>
        <span class="sk-name">[${idx + 1}] ${slot.name}</span>
        <span class="sk-sub">${slot.isUlt ? "🌈大招" : "Lv." + slot.level}</span>
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
      const btn = mask ? mask.parentElement : null;
      if (!mask || !btn) return;
      const pct = Math.min(100, Math.max(0, (slot.cdLeft / slot.cooldown) * 100));
      mask.style.height = `${pct}%`;
      if (slot.cdLeft <= 0) {
        btn.classList.add("ready");
      } else {
        btn.classList.remove("ready");
      }
    });
  }

  updateTopHudUI() {
    if (!this.p1 || !this.p2) return;
    document.getElementById("hud-p1-name").textContent = this.p1.name;
    document.getElementById("hud-p2-name").textContent = this.p2.name;

    const p1Pct = Math.max(0, (this.p1.hp / this.p1.maxHp) * 100);
    const p2Pct = Math.max(0, (this.p2.hp / this.p2.maxHp) * 100);
    document.getElementById("hud-p1-hp").style.width = `${p1Pct}%`;
    document.getElementById("hud-p1-hp-delay").style.width = `${p1Pct}%`;
    document.getElementById("hud-p1-hp-txt").textContent = `${Math.ceil(this.p1.hp)} / ${this.p1.maxHp}${this.p1.shield > 0 ? ` 🛡${Math.ceil(this.p1.shield)}` : ""}`;
    document.getElementById("hud-p2-hp").style.width = `${p2Pct}%`;
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
      el.innerHTML = chips.join("");
    };
    renderPassives(this.p1, "hud-p1-passives");
    renderPassives(this.p2, "hud-p2-passives");
  }

  finishMatch() {
    this.running = false;
    const qteBtn = document.getElementById("qte-counter-btn");
    if (qteBtn) qteBtn.classList.add("hidden");

    const p1Win = this.p1.hp >= this.p2.hp;
    const store = window.gameStore;

    // 战后升级与狂送抽卡券
    store.state.level += 1;
    store.state.tickets += 20;
    store.state.pityCoins += 35;
    store.save();

    if (window.appUI) window.appUI.refreshTopBar();
    window.memeAudio.playGachaBurst(p1Win);

    const overlay = document.getElementById("result-overlay");
    document.getElementById("res-Stamp").textContent = p1Win ? "逆天绝杀 KO!!" : "惜败红温!!";
    document.getElementById("res-title").textContent = p1Win ? "🏆 胜利 VICTORY" : "💀 败北 DEFEAT";
    document.getElementById("res-title").style.color = p1Win ? "#ffe600" : "#ff2a54";
    document.getElementById("res-subtitle").textContent =
      this.manualPerfectCount > 0
        ? `本局${this.getPhaseLabel(this.currentPhase)}，手动抓时机成功 ${this.manualPerfectCount} 次！操作加成拉满！`
        : `本局推进至${this.getPhaseLabel(this.currentPhase)}，全程自动斗蛐蛐模式（究极技最后0.75秒可手动闪避！）`;

    overlay.classList.remove("hidden");
  }

  // 后台无画面极速模拟 N 局，检验纯自动胜率是否稳定在 40%~60%
  runHeadlessSimulation(matches = 200) {
    const heroIds = Object.keys(window.MEME_DATA.heroes);
    let p1Wins = 0;

    for (let m = 0; m < matches; m++) {
      const h1 = heroIds[m % heroIds.length];
      const h2 = heroIds[Math.floor(Math.random() * heroIds.length)];
      const shuffled1 = [...window.MEME_DATA.perks].sort(() => Math.random() - 0.5).slice(0, 3);
      const shuffled2 = [...window.MEME_DATA.perks].sort(() => Math.random() - 0.5).slice(0, 3);

      this.p1 = this.createFighter(h1, true, shuffled1, 1);
      this.p2 = this.createFighter(h2, false, shuffled2, 1);
      this.projectiles = [];
      this.truckHazards = [];
      this.trails = [];
      this.particleBursts = [];
      this.pendingUltimate = null;
      this.currentPhase = "early";
      this.lastPhase = "early";
      this.matchTimeLeft = this.maxMatchDuration;
      this.running = true;

      let steps = 0;
      while (this.matchTimeLeft > 0 && this.p1.hp > 0 && this.p2.hp > 0 && steps < this.maxMatchDuration / 0.05) {
        this.update(0.05, true);
        steps++;
      }
      if (this.p1.hp >= this.p2.hp) p1Wins++;
    }

    this.running = false;
    const winRate = ((p1Wins / matches) * 100).toFixed(1);
    return { matches, p1Wins, winRate };
  }
}

window.BattleEngine = BattleEngine;
