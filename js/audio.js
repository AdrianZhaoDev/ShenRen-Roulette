// WebAudio 零外部依赖高能鬼畜音效合成器 v2.0
// 新增：LOL心之钢清脆金属“铛！！”声、全明星大乱斗必杀技 Cut-in 警报声、《师父Sifu》闪避寸拳音、9999断头台秒杀音

class MemeAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.voiceEnabled = true;
    this.lastSpeakTime = 0;
    this.audioCache = {};
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

  tryPlayMp3(fileKey) {
    if (!this.enabled) return;
    try {
      if (!this.audioCache[fileKey]) {
        const audio = new Audio(`assets/sounds/${fileKey}.mp3`);
        audio.volume = 0.75;
        this.audioCache[fileKey] = audio;
      }
      const el = this.audioCache[fileKey];
      el.currentTime = 0;
      el.play().catch(() => {});
    } catch (e) {}
  }

  speakMemeShout(text, heroId = "dayun", isUrgent = false) {
    if (!this.enabled || !this.voiceEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    const now = Date.now();
    if (!isUrgent && now - this.lastSpeakTime < 650) return;
    this.lastSpeakTime = now;

    try {
      const cleanText = String(text).replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, "");
      if (!cleanText) return;

      if (isUrgent) {
        window.speechSynthesis.cancel();
      }

      const utter = new SpeechSynthesisUtterance(cleanText);
      utter.lang = "zh-CN";
      utter.volume = 1.0;

      if (heroId === "dayun") {
        utter.pitch = 0.55;
        utter.rate = 1.45;
      } else if (heroId === "hajimi") {
        utter.pitch = 1.85;
        utter.rate = 1.75;
      } else if (heroId === "laoda") {
        utter.pitch = 0.8;
        utter.rate = 1.55;
      } else if (heroId === "kunge") {
        utter.pitch = 1.55;
        utter.rate = 1.65;
      } else {
        utter.pitch = 1.2;
        utter.rate = 1.5;
      }

      window.speechSynthesis.speak(utter);
    } catch (e) {}
  }

  playNoiseBurst(duration = 0.16, gainLevel = 0.28, bandpassFreq = 950) {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = bandpassFreq;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainLevel, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + duration);

    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start();
  }

  // LOL 心之钢标志性重金属敲击“铛——！！”音效
  playHeartsteelClang() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    // 金属泛音叠加
    [587.3, 880, 1480, 2217].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx % 2 === 0 ? "triangle" : "sine";
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.96, now + 0.48);
      gain.gain.setValueAtTime(0.26 / (idx + 1), now);
      gain.gain.exponentialRampToValueAtTime(0.002, now + 0.48);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    });
    this.playNoiseBurst(0.09, 0.32, 2400);
  }

  // 全明星大乱斗必杀技 Cut-in 戏剧性闪光警报音效
  playUltCutinAlarm(heroId, shoutText) {
    if (shoutText) {
      this.speakMemeShout(shoutText, heroId, true);
    }
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    // 格斗游戏必杀超闪音效（高频急促升调+重低音轰鸣）
    [440, 660, 880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now + i * 0.045);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.35, now + i * 0.045 + 0.16);
      gain.gain.setValueAtTime(0.28, now + i * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.004, now + i * 0.045 + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.045);
      osc.stop(now + i * 0.045 + 0.19);
    });
    this.playNoiseBurst(0.28, 0.38, 1200);
  }

  // 《师父 Sifu》极限闪避 / 太极化解残影音效
  playSifuDodge() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(980, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.16);
    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.004, now + 0.16);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);
    this.playNoiseBurst(0.12, 0.25, 1800);
  }

  // 9999 断头台秒杀音效
  playExecute9999() {
    this.speakMemeShout("九千九百九十九！断头台秒杀！", "laoda", true);
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.45);
    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.45);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.46);
    this.playNoiseBurst(0.38, 0.48, 700);
  }

  playWallBounce() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(175 + Math.random() * 65, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.085);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  playClash(isCrit = false) {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isCrit ? "sawtooth" : "square";
    osc.frequency.setValueAtTime(isCrit ? 520 : 300, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + (isCrit ? 0.25 : 0.14));
    gain.gain.setValueAtTime(isCrit ? 0.42 : 0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + (isCrit ? 0.25 : 0.14));
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + (isCrit ? 0.26 : 0.15));

    this.playNoiseBurst(isCrit ? 0.22 : 0.1, isCrit ? 0.36 : 0.2);
  }

  playSkillSFX(heroId, isUlt = false, shoutText = "") {
    this.tryPlayMp3(heroId);
    if (shoutText) {
      this.speakMemeShout(shoutText, heroId, isUlt);
    }

    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (isUlt) {
      this.playNoiseBurst(0.35, 0.42);
    }

    if (heroId === "dayun") {
      [310, 392, isUlt ? 155 : 310].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(isUlt ? 0.32 : 0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + (isUlt ? 0.5 : 0.25));
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + (isUlt ? 0.52 : 0.26));
      });
    } else if (heroId === "hajimi") {
      this.playNoiseBurst(0.24, 0.32);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(960, now);
      osc.frequency.linearRampToValueAtTime(1620, now + 0.09);
      osc.frequency.exponentialRampToValueAtTime(310, now + 0.28);
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.28);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.29);
    } else if (heroId === "laoda") {
      for (let i = 0; i < (isUlt ? 5 : 3); i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        const t0 = now + i * 0.055;
        osc.frequency.setValueAtTime(240 + i * 70, t0);
        osc.frequency.exponentialRampToValueAtTime(65, t0 + 0.05);
        gain.gain.setValueAtTime(0.28, t0);
        gain.gain.exponentialRampToValueAtTime(0.005, t0 + 0.05);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.055);
      }
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(isUlt ? 740 : 480, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + (isUlt ? 0.42 : 0.2));
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + (isUlt ? 0.42 : 0.2));
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + (isUlt ? 0.43 : 0.21));
    }
  }

  playGachaBurst(hasUR = false) {
    if (hasUR) {
      this.speakMemeShout("金色传说！逆天出货啦！", "hajimi", true);
      this.playNoiseBurst(0.3, 0.35);
    }
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = hasUR ? [523, 659, 784, 1046, 1318, 1567] : [440, 554, 659, 880];
    notes.forEach((n, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = hasUR ? "sawtooth" : "triangle";
      osc.frequency.setValueAtTime(n, now + idx * 0.055);
      gain.gain.setValueAtTime(0.26, now + idx * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.003, now + idx * 0.055 + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + idx * 0.055);
      osc.stop(now + idx * 0.055 + 0.26);
    });
  }
}

window.memeAudio = new MemeAudio();
