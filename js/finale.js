// Real-time game presentation; never advances combat or awards rewards.
window.FINALE_THEMES = {
  hajimi: { title: '应激之王', line: '哈！本场禁止摸猫。', color: '#ffbf69', motif: '///', scene: 'CAT TERRITORY', mvp: 'finish/hajimi-mvp' },
  kunge: { title: '练习生毕业', line: '这一球，练了两年半。', color: '#8be9fd', motif: '◉', scene: 'CENTER STAGE', mvp: 'kunge' },
  laoda: { title: '曼巴时刻', line: '最后一球，交给我。', color: '#d6b1ff', motif: '24', scene: 'MAMBA COURT', mvp: 'laoda' },
  dayun: { title: '百吨王到站', line: '前方到站：胜者领奖台。', color: '#ffb347', motif: '»', scene: 'HIGHWAY KING', mvp: 'finish/dayun-mvp' }
};

class BattleFinale {
  constructor(engine) {
    this.engine = engine;
    this.time = 0;
    this.cues = new Set();
    this.winner = engine.outcome.winner === 'draw' ? null : engine[engine.outcome.winner];
    this.loser = this.winner === engine.p1 ? engine.p2 : engine.p1;
    this.kind = engine.outcome.finishKind;
    this.label = { ko: 'K.O.', comeback: '极限反杀', attrition: '力尽倒下', timeout: '时间到', draw: '双双倒下' }[this.kind];
    const fallen = [engine.p1, engine.p2].find(f => f.hp <= 0);
    this.deathKey = fallen ? 'finish/' + fallen.heroId + '-' + (this.kind === 'attrition' ? 'slow' : 'death') : null;
    // 阶段1 (0 ~ 2.0s): 2秒慢动作致命一击与败者击飞倒地演出
    // 阶段2 (2.0s ~ 3.35s): 胜者直接在战场内用 1.35 秒丝滑放大并滑向统一结算页立绘位，无缝展开MVP+伤害对比+战后奖励一体化结算页
    this.slowMoDuration = engine.outcome.timedOut ? 0.9 : 2.0;
    this.zoomDuration = this.winner ? 1.35 : 0.45;
    this.totalDuration = this.slowMoDuration + this.zoomDuration;
    this.origin = { x: this.loser.x, y: this.loser.y };
    this.winnerStart = this.winner ? { x: this.winner.x, y: this.winner.y, r: this.winner.radius } : null;
    this.direction = this.winner && this.loser.x < this.winner.x ? -1 : 1;
    window.memeAudio.stopVoices();
    engine.updateTopHudUI();
    engine.spinArenaTimer = 0;
    engine.timeStopTimer = 0;
    if (!engine.outcome.timedOut) window.memeAudio.playImpact(true);
    document.getElementById('btn-skip-finale')?.classList.remove('hidden');
  }

  cue(key, at, action) {
    if (this.time >= at && !this.cues.has(key)) { this.cues.add(key); action(); }
  }

  tick(dt) {
    this.time += dt; // Presentation runs in real seconds, independent of battle speed.
    const e = this.engine;
    e.shakeTimer = Math.max(0, e.shakeTimer - dt);
    if (this.time > 0.12) e.updateParticles(dt * (this.time < this.slowMoDuration ? 0.25 : 0.6));
    for (const p of e.projectiles) {
      p.x += p.vx * dt * 0.22;
      p.y += p.vy * dt * 0.22;
      p.life -= dt;
    }
    e.projectiles = e.projectiles.filter(p => p.life > 0);
    const dead = [e.p1, e.p2].filter(f => f.hp <= 0);
    const slow = this.kind === 'attrition';
    const progress = Math.max(0, Math.min(1, (this.time - 0.12) / (slow ? 1.9 : 1.65)));
    for (const f of dead) {
      const direction = f === this.loser ? this.direction : -this.direction;
      f.finaleAngle = direction * Math.PI * 0.48 * progress * progress;
      f.finaleX = direction * (slow ? 16 : 86) * progress;
      f.finaleY = (slow ? 26 * progress : -42 * Math.sin(progress * Math.PI) + 28 * progress);
      f.finaleAlpha = Math.max(0, 1 - 0.65 * progress);
    }

    // 0.45s 播放败者倒地语音，1.75s 落地碰撞声
    this.cue('death', 0.45, () => {
      if (dead.length) window.memeAudio.playFinaleClip(`finish/${dead[0].heroId}-${slow ? 'slow' : 'death'}`, false);
    });
    this.cue('land', 1.75, () => { if (dead.length) window.memeAudio.playImpact(false); });
    this.cue('announce', 1.85, () => window.memeAudio.playFinaleClip(`finish/${this.kind}`, false));

    // 2.0s 慢动作结束后，胜者在战场上用 1.35 秒丝滑变大并滑向一体化结算页左侧 MVP 立绘位
    if (this.winner && this.winnerStart && this.time >= this.slowMoDuration) {
      const rawT = Math.max(0, Math.min(1, (this.time - this.slowMoDuration) / this.zoomDuration));
      // 平滑 S 型缓动 (easeInOutCubic)，让变大与位移过程清晰、舒展、丝滑
      const ease = rawT < 0.5 ? 4 * rawT * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 3) / 2;
      const targetX = e.width * 0.23;
      const targetY = e.height * 0.48;
      // 基础结算放大 3.2 倍；若局内体型变大 (radius > 32)，结算同步叠加成长倍率，甚至可撑爆屏幕！
      const growthMult = Math.max(1, this.winnerStart.r / 32);
      const targetScale = 3.2 * Math.pow(growthMult, 0.35);
      this.winner.finaleX = (targetX - this.winnerStart.x) * ease;
      this.winner.finaleY = (targetY - this.winnerStart.y) * ease;
      this.winner.finaleScale = 1 + (targetScale - 1) * ease;
      this.winner.finaleAngle = 0;
      this.winner.finaleAlpha = 1;
      for (const f of dead) {
        f.finaleAlpha = Math.max(0, 0.35 * (1 - rawT));
      }
    }

    if (this.time >= this.totalDuration) this.complete();
  }

  draw(ctx) {
    const e = this.engine;
    ctx.save();
    const inZoom = this.time >= this.slowMoDuration;
    const zoomP = inZoom ? Math.min(1, (this.time - this.slowMoDuration) / this.zoomDuration) : 0;
    const darkAlpha = inZoom ? 0.32 + zoomP * 0.5 : Math.min(0.32, this.time * 0.16);
    ctx.fillStyle = `rgba(5, 7, 16, ${darkAlpha})`;
    ctx.fillRect(0, 0, e.width, e.height);

    // 电影感上下黑边（在慢动作阶段完整显示，丝滑放大阶段缓缓收起）
    const barH = inZoom ? Math.round(38 * (1 - zoomP)) : 38;
    if (barH > 0) {
      ctx.fillStyle = '#05060a';
      ctx.fillRect(0, 0, e.width, barH);
      ctx.fillRect(0, e.height - barH, e.width, barH);
    }

    // 丝滑放大阶段：主题色聚光灯跟随正在变大的胜者角色
    if (this.winner && inZoom) {
      const wx = this.winner.x + (this.winner.finaleX || 0);
      const wy = this.winner.y + (this.winner.finaleY || 0);
      const grad = ctx.createRadialGradient(wx, wy, 15, wx, wy, 160 + zoomP * 180);
      grad.addColorStop(0, `${this.winner.color || '#ffe600'}66`);
      grad.addColorStop(0.6, `${this.winner.accent || '#ff0055'}22`);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, e.width, e.height);
    }

    ctx.textAlign = 'center';
    if (!inZoom) {
      ctx.fillStyle = '#fff';
      ctx.font = '900 18px sans-serif';
      ctx.fillText(this.kind === 'attrition' ? '最后一口气 · 慢动作回放' : e.outcome.timedOut ? '比赛时间到' : '致 命 一 击  ·  2.0s 慢 动 作 特 写', e.width / 2, 26);
      if (this.time > 0.25) {
        const pop = 1 + Math.max(0, 1 - (this.time - 0.25) / 0.35) * 0.45;
        ctx.save();
        ctx.translate(e.width / 2, e.height * 0.36);
        ctx.scale(pop, pop);
        ctx.shadowColor = this.kind === 'comeback' ? '#ff3969' : '#ffc400';
        ctx.shadowBlur = 28;
        ctx.fillStyle = '#fff2a8';
        ctx.font = 'italic 1000 72px sans-serif';
        ctx.fillText(this.label, 0, 0);
        ctx.restore();
      }
    } else {
      const textAlpha = Math.max(0, 1 - zoomP * 0.4);
      ctx.globalAlpha = textAlpha;
      ctx.translate(e.width * 0.64, e.height * 0.28);
      ctx.shadowColor = this.kind === 'comeback' ? '#ff3969' : '#ffc400';
      ctx.shadowBlur = 24;
      ctx.fillStyle = '#fff2a8';
      ctx.font = 'italic 1000 60px sans-serif';
      ctx.fillText(this.label, 0, 0);
      ctx.shadowBlur = 0;
      ctx.font = '800 18px sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText(this.winner ? `${this.winner.name} · 正在进入 MVP 结算` : '势均力敌', 0, 36);
    }
    ctx.restore();
  }

  complete(skip = false) {
    const e = this.engine;
    if (e.finale !== this) return;
    if (skip) window.memeAudio.stopVoices();
    document.getElementById('mvp-overlay')?.classList.add('hidden');
    document.getElementById('btn-skip-finale')?.classList.add('hidden');
    e.finale = null;
    e.finalePlayed = true;
    e.finishMatch();
  }
}
window.BattleFinale = BattleFinale;
