// 只读取战斗数值；结算记录绑定每次究极序列，避免迟到弹幕串到下一次大招。
(() => {
  const number = value => Math.round(value || 0).toLocaleString('zh-CN');
  const percent = value => `${Math.round(value * 100)}%`;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const write = (id, value) => {
    const node = document.getElementById(id);
    if (node && node.textContent !== value) node.textContent = value;
  };

  Object.assign(window.BattleEngine.prototype, {
    initCombatInsights() {
      for (const fighter of [this.p1, this.p2]) {
        fighter.openingStats = { maxHp: fighter.maxHp, baseSpd: fighter.baseSpd, radius: fighter.radius };
        fighter.growthHistory = [];
        fighter.ultimateReports = [];
      }
      if (!this.headless) document.getElementById('fighter-details')?.close?.();
    },

    recordGrowth(fighter, label, before) {
      if (!fighter.growthHistory) return;
      const changes = [];
      if (fighter.maxHp !== before.maxHp) changes.push(`生命上限 +${number(fighter.maxHp - before.maxHp)}`);
      if (fighter.baseSpd !== before.baseSpd) changes.push(`基础移速 +${percent(fighter.baseSpd / before.baseSpd - 1)}`);
      if (fighter.radius > before.radius + 0.001) changes.push(`体型 +${percent(fighter.radius / before.radius - 1)}`);
      if (!changes.length) return;
      fighter.growthHistory.unshift({ at: this.elapsed, text: `${label}：${changes.join('，')}` });
      fighter.growthHistory.length = Math.min(8, fighter.growthHistory.length);
    },

    protectionText(fighter) {
      const messages = [];
      const floor = this.recordingHpFloor(fighter);
      if (floor) messages.push(`剧情锁血 ≥${floor === 1 ? '1 HP' : `${percent(floor / fighter.maxHp)}（${number(floor)}）`}`);
      if (fighter.immortalTimer > 0) messages.push(`免死保护 ${fighter.immortalTimer.toFixed(1)}秒`);
      return messages.join(' · ');
    },

    fighterStats(fighter) {
      const opening = fighter.openingStats || fighter;
      const phase = this.getCombatConfig().phaseDamageMultiplier[this.currentPhase] || 1;
      const age = this.hasPerk(fighter, 'pk_sifu_3') ? 1 + (fighter.age - 20) * 0.006 : 1;
      const normal = fighter.activeSlots.find(slot => slot.slotId === 'normal_active');
      return {
        normal, phase, age, burst: fighter.earlyBurst || 1,
        damageMultiplier: phase * age * (fighter.earlyBurst || 1),
        normalLevelMultiplier: 1 + ((normal?.level || 1) - 1) * this.getCombatConfig().skillDamageGrowth,
        reduction: this.hasPerk(fighter, 'pk_col_5') ? 0.2 : 0,
        hpGain: fighter.maxHp - opening.maxHp,
        speedGain: fighter.baseSpd / opening.baseSpd - 1,
        size: fighter.radius / this.getCombatConfig().fighter.baseRadius,
        sizeGain: fighter.radius / opening.radius - 1,
        crit: (fighter.heroId === 'laoda' ? 0.43 : 0.18) + (this.hasPerk(fighter, 'pk_asn_4') ? 0.3 : 0)
      };
    },

    createUltimateReport(caster, sequence, name) {
      const report = { id: sequence.id, name, hp: 0, shield: 0, reduced: 0, blocked: 0, recovered: 0,
        hits: 0, reasons: [], updatedAt: this.elapsed, resolved: false };
      sequence.report = report;
      caster.ultimateReports ||= [];
      caster.ultimateReports.unshift(report);
      caster.ultimateReports.length = Math.min(3, caster.ultimateReports.length);
      return report;
    },

    recordUltimateHit(attacker, options, details) {
      const sequence = options.ultimateSecondary ? options.ultimateSequence
        : options.ultimateCore && !options.secondary ? attacker.ultimateSequenceState : null;
      const report = sequence?.report;
      if (!report) return;
      for (const key of ['hp', 'shield', 'reduced', 'blocked', 'recovered']) report[key] += details[key] || 0;
      if (details.hit) report.hits++;
      for (const reason of details.reasons || []) if (!report.reasons.includes(reason)) report.reasons.push(reason);
      report.resolved = true;
      report.updatedAt = this.elapsed;
    },

    ultimateReceipt(report) {
      if (!report) return '尚未释放大招';
      if (!report.resolved) return `${report.name} · 蓄力中`;
      return `${report.name} · 扣血 ${number(report.hp)} · 护盾吸收 ${number(report.shield)}`
        + (report.reduced ? ` · 减伤 ${number(report.reduced)}` : '')
        + (report.blocked ? ` · 保护拦截 ${number(report.blocked)}` : '')
        + (report.recovered ? ` · 随后回血 ${number(report.recovered)}` : '')
        + (report.reasons.length ? ` · ${report.reasons.join(' / ')}` : '');
    },

    updateCombatInsights() {
      for (const key of ['p1', 'p2']) {
        const f = this[key]; const s = this.fighterStats(f);
        const protection = this.protectionText(f);
        write(`hud-${key}-protection`, protection);
        document.getElementById(`hud-${key}-protection`)?.classList.toggle('hidden', !protection);
        write(`growth-${key}-stats`, `普技 Lv.${s.normal?.level || 1} · 究极 Lv.${f.ultLv} · 普通伤害 ×${s.damageMultiplier.toFixed(2)} · 减伤 ${percent(s.reduction)} · 体型 ${percent(s.size)}`);
        write(`growth-${key}-event`, `生命上限 +${number(s.hpGain)} · 基础移速 ${number(f.baseSpd)}（+${percent(s.speedGain)}）`);
        const report = f.ultimateReports?.[0];
        write(`ult-receipt-${key}`, `${key === 'p1' ? '我方' : '对手'} ${this.ultimateReceipt(report)}`);
        document.getElementById(`ult-receipt-${key}`)?.classList.toggle('receipt-recent', !!report?.resolved && this.elapsed - report.updatedAt < 2.5);
      }
    },

    renderFighterDetails(fighter) {
      const s = this.fighterStats(fighter); const opening = fighter.openingStats || fighter;
      const row = (name, value, source) => `<tr><th scope="row">${escape(name)}</th><td>${escape(value)}</td><td>${escape(source)}</td></tr>`;
      const ult = this.getCombatConfig().ultimate;
      const protection = this.protectionText(fighter);
      const ratio = this.ultimateRatio(fighter.ultSkill.type, fighter.ultLv);
      const perks = [...fighter.corePassives, ...fighter.perks];
      write('fighter-details-title', `${fighter.isPlayer ? '我方' : '对手'} · ${fighter.name}`);
      document.getElementById('fighter-details-content').innerHTML = `
        ${protection ? `<p class="details-protection">${escape(protection)}。达到保护下限后，伤害会被拦截。</p>` : ''}
        <div class="details-resources">
          <div><small>生命</small><strong>${number(fighter.hp)} / ${number(fighter.maxHp)}</strong></div>
          <div><small>护盾</small><strong>${number(fighter.shield)} / ${number(fighter.maxShield)}</strong></div>
          <div><small>究极能量</small><strong>${number(fighter.ultimateEnergy)} / ${ult.maxEnergy}</strong></div>
        </div>
        <p>${fighter.ultSkill.type === 'passive' ? '被动究极：满能量自动触发' : '主动究极：满能量可释放'}；施放普通技能 +${ult.gainOnCast}，角色碰撞 +${ult.gainOnCollision}，完美回避 +${ult.gainOnPerfectDodge}。普通技能使用冷却，无魔法值消耗。</p>
        <h3>本局属性 · 与开局比较</h3>
        <div class="details-table-wrap"><table><thead><tr><th>属性</th><th>当前</th><th>来源 / 变化</th></tr></thead><tbody>
          ${row('生命上限', number(fighter.maxHp), `开局 ${number(opening.maxHp)} → 本局 +${number(s.hpGain)}；阶段和成长词条`)}
          ${row('普通伤害倍率', `×${s.damageMultiplier.toFixed(2)}`, `阶段 ×${s.phase.toFixed(2)} · 早期爆发 ×${s.burst.toFixed(2)} · 年龄 ×${s.age.toFixed(2)}`)}
          ${row('常驻减伤', percent(s.reduction), s.reduction ? '反甲词条；与条件减伤乘算' : '未装备减伤词条')}
          ${row('条件减伤', fighter.heroId === 'kunge' ? '重击减伤 35%' : '无', fighter.heroId === 'kunge' ? '前序减伤后单次伤害 >120 时生效' : '该角色无重击减伤')}
          ${row('基础移速', number(fighter.baseSpd), `开局 ${number(opening.baseSpd)} → +${percent(s.speedGain)}；不含减速、撞墙加速及击退`)}
          ${row('体型', percent(s.size), `开局 ${percent(opening.radius / 32)} → 本局 +${percent(s.sizeGain)}；体型不等于通用伤害倍率`)}
          ${row('普通伤害暴击率', percent(s.crit), '角色基础 + 刺客词条；究极比例伤害不暴击')}
          ${this.hasArchetype(fighter, 'sifu') ? row('架势', `${number(fighter.stance)} / ${fighter.maxStance}`, '耗尽时眩晕并重置') : ''}
          ${this.hasPerk(fighter, 'pk_sifu_3') ? row('年龄', `${fighter.age}岁`, '受击增长，闪避返老还童') : ''}
        </tbody></table></div>
        <p class="details-note">普通伤害倍率不含技能等级、暴击、随机浮动、手动时机及血量差补偿。究极核心按目标最大生命计算，再经过减伤、护盾及保护。</p>
        <h3>技能等级 · 开战时装备</h3>
        <ul class="details-skills">${fighter.activeSlots.map(slot => `<li><strong>${escape(slot.name)} · Lv.${slot.level}</strong><span>${slot.isUlt ? (slot.effectKind === 'pk_col_2' ? '成长究极：回血与体型成长，无核心伤害' : `核心比例 ${percent(this.ultimateRatio('active', slot.level))}，减伤前`) : `等级倍率 ×${(1 + (slot.level - 1) * this.getCombatConfig().skillDamageGrowth).toFixed(2)} · 冷却 ${Math.max(0, slot.cdLeft).toFixed(1)} / ${slot.cooldown}秒`}</span></li>`).join('')}
        ${fighter.ultSkill.type === 'passive' ? `<li><strong>${escape(fighter.ultSkill.name)} · Lv.${fighter.ultLv}</strong><span>被动究极 · 核心比例 ${percent(ratio)}，减伤前</span></li>` : ''}</ul>
        <h3>最近成长</h3><ul class="details-history">${fighter.growthHistory?.length ? fighter.growthHistory.map(item => `<li>${Math.floor(item.at)}秒 · ${escape(item.text)}</li>`).join('') : '<li>本局暂未发生属性成长。</li>'}</ul>
        <h3>最近三次大招 · 各段累计</h3><ul class="details-history">${fighter.ultimateReports?.length ? fighter.ultimateReports.map(report => `<li>${escape(this.ultimateReceipt(report))}${report.resolved ? ` · 命中 ${report.hits} 段` : ''}</li>`).join('') : '<li>尚未释放大招。</li>'}</ul>
        <p class="details-note">扣血统计实际命中时扣除的生命，护盾单列；触发回血另列，溢出伤害不计入扣血。多段命中持续累计，拆招反震不计入施法者的大招。</p>
        <h3>被动与词条来源</h3><ul class="details-skills">${perks.map(perk => `<li><strong>${escape(perk.name)}</strong><span>${escape(perk.desc || '')}</span></li>`).join('')}</ul>`;
    },

    bindCombatInsights() {
      const dialog = document.getElementById('fighter-details');
      // 只调整显示比例：把原竞技场映射到上下 HUD 之间，物理坐标保持不变。
      const screen = document.getElementById('screen-battle');
      const fitArena = () => {
        if (!screen.clientHeight) return;
        const top = document.getElementById('battle-hud-top');
        const bottom = document.getElementById('battle-hud-bottom');
        const fieldTop = top.offsetTop + top.offsetHeight + 10;
        const fieldHeight = Math.max(40, bottom.offsetTop - fieldTop - 10);
        const scale = Math.min((screen.clientWidth - 32) / this.arena.w, fieldHeight / this.arena.h);
        Object.assign(this.canvas.style, {
          width: `${this.width * scale}px`, height: `${this.height * scale}px`,
          left: `${(screen.clientWidth - this.width * scale) / 2}px`, top: `${fieldTop - this.arena.y * scale}px`
        });
        screen.style.setProperty('--combat-bottom', `${screen.clientHeight - bottom.offsetTop}px`);
        for (const id of ['qte-counter-btn', 'ultimate-response']) {
          document.getElementById(id).style.top = `${fieldTop + fieldHeight * 0.62}px`;
        }
      };
      this.insightsResizeObserver = new ResizeObserver(fitArena);
      for (const node of [screen, document.getElementById('battle-hud-top'), document.getElementById('battle-hud-bottom')]) this.insightsResizeObserver.observe(node);
      let previous = null;
      for (const key of ['p1', 'p2']) document.getElementById(`growth-${key}`).addEventListener('click', () => {
        if (!this[key] || !this.running || this.finale) return;
        previous = { fighter: this.p1, resume: !this.paused };
        this.setPaused(true);
        this.renderFighterDetails(this[key]);
        write('fighter-details-pause', '查看属性期间战斗已暂停；关闭后恢复打开前的状态。');
        dialog.showModal();
      });
      document.getElementById('close-fighter-details').addEventListener('click', () => dialog.close());
      dialog.addEventListener('close', () => {
        if (previous?.fighter === this.p1 && previous.resume && this.running && !this.finale) this.setPaused(false);
        previous = null;
      });
    }
  });
})();
