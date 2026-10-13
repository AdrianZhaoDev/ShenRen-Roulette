// 构筑事件：二次伤害不再触发反伤和反击，避免无限递归。
window.BattleEffects = {
  onCast(engine, caster, target, slot, headless) {
    if (slot.isUlt) return;
    if (caster.heroId === "kunge" && caster.castCount % 3 === 0) {
      engine.applyDamage(caster, target, 75, "🐔羽毛爆裂", true, headless, { secondary: true });
      if (!headless) {
        window.memeAudio?.playHeroEventVoice?.("kunge", "skill", "鸡你太美", false);
        engine.spawnSkillVfx?.({ kind: "feather_burst", x: caster.x, y: caster.y, toX: target.x, toY: target.y, color: "#ffffff", accent: "#00d4ff", life: 0.75, maxLife: 0.75 });
      }
    }
    if (engine.hasPerk(caster, "pk_mag_1")) engine.spawnProjectiles(caster, target, 2, 30, 460, "#00f0ff", 10);
    if (engine.hasPerk(caster, "pk_mag_3")) engine.spawnProjectiles(caster, target, 3, 45, 510, "#b829ff", 11);
    if (engine.hasPerk(caster, "pk_mag_4") && engine.random() < 0.5) {
      const index = caster.activeSlots.findIndex((active) => active.slotId === slot.slotId);
      if (index >= 0) engine.queuedCasts.push({ caster, target, index, remaining: 0.3 });
    }
  },
  onDodge(engine, fighter, enemy, headless) {
    fighter.dodgeCount++;
    if (engine.hasPerk(fighter, "pk_sifu_3")) fighter.age = Math.max(18, fighter.age - 5);
    if (engine.hasPerk(fighter, "pk_sifu_1")) {
      fighter.activeSlots.forEach((slot) => { slot.cdLeft = 0; });
      engine.applyHeal(fighter, 180, "师父寸拳回气", headless);
      engine.applyDamage(fighter, enemy, 320, "🥋寸拳反击", true, headless, { secondary: true });
    }
  },
  onHit(engine, attacker, defender, damage, isCrit, headless, options) {
    if (engine.hasPerk(defender, "pk_sifu_3")) defender.age = Math.min(72, defender.age + 1);
    if (defender.heroId === "dayun") {
      const stage = Math.floor(Math.max(0, 1 - defender.hp / defender.maxHp) / 0.15);
      if (stage > defender.damageGrowthStage) {
        engine.growFighter(defender, Math.pow(1.08, stage - defender.damageGrowthStage) - 1, 0, headless, "强制转生成长");
        defender.damageGrowthStage = stage;
      }
    }
    if (attacker.heroId === "laoda" && isCrit) {
      defender.stance = Math.max(0, defender.stance - 15);
      if (!headless) {
        engine.spawnText("孩子们！What can I say!", attacker.x, attacker.y - attacker.radius - 20, "#ffe600", 22);
        window.memeAudio?.playHeroEventVoice?.("laoda", "crit", "孩子们", false);
      }
    }
    if (defender.hp <= 0 || options.secondary) return;
    if (engine.hasPerk(defender, "pk_col_5")) engine.applyDamage(defender, attacker, Math.round(damage * 0.28 * Math.min(3, defender.radius / 32)), "反甲反震", false, headless, { secondary: true });
    if (options.heavyHit) {
      engine.spawnProjectiles(defender, attacker, 1, 45, 430, "#ff8800", 12, "basketball");
      if (!headless) {
        window.memeAudio?.playHeroEventVoice?.("kunge", "hit", "你干嘛哎哟", false);
        engine.spawnText("你干嘛~哎哟!!", defender.x, defender.y - defender.radius - 28, "#00d4ff", 22);
      }
    }
  }
};
