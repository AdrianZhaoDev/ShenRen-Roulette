// WebAudio 零外部依赖高能鬼畜音效合成器（同时支持优先播放 assets/sounds/*.mp3）
class MemeAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  ensureCtx() {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // 墙壁反弹砰砰声
  playWallBounce() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(160 + Math.random() * 60, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.08);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.085);
  }

  // 两球肉搏碰撞重击声
  playClash(isCrit = false) {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isCrit ? "sawtooth" : "square";
    osc.frequency.setValueAtTime(isCrit ? 480 : 280, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + (isCrit ? 0.22 : 0.12));
    gain.gain.setValueAtTime(isCrit ? 0.35 : 0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + (isCrit ? 0.22 : 0.12));
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + (isCrit ? 0.23 : 0.13));
  }

  // 释放技能/大招炸裂音效（大运喇叭、哈气、直升机、篮球音）
  playSkillSFX(heroId, isUlt = false) {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (heroId === "dayun") {
      // 泥头车双音气喇叭
      [310, 392].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(isUlt ? 0.28 : 0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + (isUlt ? 0.45 : 0.22));
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + (isUlt ? 0.46 : 0.23));
      });
    } else if (heroId === "hajimi") {
      // 哈气高频嘶嘶滑动音
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(920, now);
      osc.frequency.linearRampToValueAtTime(1480, now + 0.09);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.25);
      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.26);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.27);
    } else {
      // 通用高能激光/重肘轰鸣
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(isUlt ? 660 : 420, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + (isUlt ? 0.38 : 0.18));
      gain.gain.setValueAtTime(0.26, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + (isUlt ? 0.39 : 0.19));
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + (isUlt ? 0.4 : 0.2));
    }
  }

  // 抽卡出货/金光炸麦音效
  playGachaBurst(hasUR = false) {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = hasUR ? [523, 659, 784, 1046, 1318] : [440, 554, 659, 880];
    notes.forEach((n, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = hasUR ? "sawtooth" : "triangle";
      osc.frequency.setValueAtTime(n, now + idx * 0.055);
      gain.gain.setValueAtTime(0.22, now + idx * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.003, now + idx * 0.055 + 0.24);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + idx * 0.055);
      osc.stop(now + idx * 0.055 + 0.25);
    });
  }
}

window.memeAudio = new MemeAudio();
