// WebAudio 零外部依赖高能鬼畜音效合成器 v2.0
// 新增：LOL心之钢清脆金属“铛！！”声、全明星大乱斗必杀技 Cut-in 警报声、《师父Sifu》闪避寸拳音、9999断头台秒杀音

class MemeAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.voiceEnabled = true;
    this.lastSpeakTime = 0;
    this.audioCache = {};
    this.activeVoice = null;
    this.lastVoiceAt = 0;
    this.localVoices = new Set([
      "dayun", "dayun-ult",
      "hajimi", "hajimi-hiss", "hajimi-dead",
      "laoda", "laoda-skill", "laoda-ult",
      "kunge", "kunge-skill", "kunge-hit", "kunge-shot"
    ]);
    this.voiceBank = {
      dayun:  { skill: "dayun",       ult: "dayun-ult",   hit: "dayun" },
      hajimi: { skill: "hajimi",      ult: "hajimi-hiss", hit: "hajimi-hiss", dead: "hajimi-dead" },
      laoda:  { skill: "laoda-skill", ult: "laoda-ult",   crit: "laoda-skill" },
      kunge:  { skill: "kunge-skill", ult: "kunge",       hit: "kunge-hit",   shot: "kunge-shot" }
    };
    this.masterGain = null;
    this.volume = 0.65;
    this.applySettings(window.gameStore.state.settings);
  }

  applySettings(settings) {
    this.enabled = !settings.muted;
    this.voiceEnabled = !!settings.voice;
    this.volume = settings.volume;
    if (this.masterGain) this.masterGain.gain.setTargetAtTime(this.enabled ? this.volume : 0, this.ctx.currentTime, 0.02);
    Object.values(this.audioCache).forEach((audio) => { audio.volume = this.enabled ? this.volume : 0; });
    if (!this.enabled || !this.voiceEnabled) this.stopVoices();
  }

  stopVoices() {
    window.speechSynthesis?.cancel();
    Object.values(this.audioCache).forEach((audio) => audio.pause());
    this.activeVoice = null;
  }

  ensureCtx() {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.volume;
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  resolveVoiceKey(heroOrKey, eventType = "skill") {
    if (this.localVoices.has(heroOrKey)) return heroOrKey;
    const bank = this.voiceBank[heroOrKey];
    if (bank && bank[eventType] && this.localVoices.has(bank[eventType])) return bank[eventType];
    if (bank && bank.skill && this.localVoices.has(bank.skill)) return bank.skill;
    return heroOrKey;
  }

  tryPlayMp3(heroOrKey, urgent = false, eventType = "skill") {
    const fileKey = this.resolveVoiceKey(heroOrKey, eventType);
    if (!this.localVoices.has(fileKey)) return false;
    if (!this.enabled || !this.voiceEnabled) return true;
    const now = Date.now();
    // One voice at a time; repeated hits must not restart the same sentence.
    if (this.activeVoice && !this.activeVoice.paused && !this.activeVoice.ended) {
      if (!urgent || this.activeVoice === this.audioCache[fileKey]) return true;
    }
    if (!urgent && now - this.lastVoiceAt < 1800) return true;
    try {
      if (!this.audioCache[fileKey]) {
        const audio = new Audio(`assets/sounds/${fileKey}.mp3`);
        audio.volume = this.volume;
        audio.onerror = () => { audio.failed = true; };
        this.audioCache[fileKey] = audio;
      }
      const el = this.audioCache[fileKey];
      if (el.failed) return false;
      this.stopVoices();
      this.activeVoice = el;
      this.lastVoiceAt = now;
      el.currentTime = 0;
      el.play().catch(() => {});
      return true;
    } catch (e) { return false; }
  }

  speakMemeShout(text, heroId = "dayun", isUrgent = false) {
    if (!this.enabled || !this.voiceEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    const now = Date.now();
    if (!isUrgent && window.speechSynthesis.speaking) return;
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
      utter.volume = this.volume;

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

    noise.connect(filter).connect(gain).connect(this.masterGain);
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
      osc.connect(gain).connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.5);
    });
    this.playNoiseBurst(0.09, 0.32, 2400);
  }

  // 百变星阵变身 + 角色特色旋律 + 原声配音 Cut-in 音效
  playUltCutinAlarm(heroId, shoutText) {
    const playedMp3 = this.tryPlayMp3(heroId, true, "ult");
    if (!playedMp3 && shoutText) {
      this.speakMemeShout(shoutText, heroId, true);
    } else if (playedMp3 && shoutText) {
      // 本地梗原声同时叠加轻度角色变身台词增强仪式感
      this.speakMemeShout(shoutText, heroId, false);
    }
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. 魔法少女封印解除星光竖琴琶音（Cardcaptor Chime Arpeggio）
    const chimeNotes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98, 2093.0];
    chimeNotes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i % 2 === 0 ? "sine" : "triangle";
      const t0 = now + i * 0.042;
      osc.frequency.setValueAtTime(freq, t0);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.06, t0 + 0.24);
      gain.gain.setValueAtTime(0.18, t0);
      gain.gain.exponentialRampToValueAtTime(0.002, t0 + 0.26);
      osc.connect(gain).connect(this.masterGain);
      osc.start(t0);
      osc.stop(t0 + 0.28);
    });

    // 2. 角色专属变身主题音效
    if (heroId === "dayun") {
      // 大运重卡双音气喇叭轰鸣
      [146.8, 185.0, 293.6].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now + 0.12);
        osc.frequency.linearRampToValueAtTime(freq * 0.98, now + 0.65);
        gain.gain.setValueAtTime(0.22, now + 0.12);
        gain.gain.exponentialRampToValueAtTime(0.004, now + 0.68);
        osc.connect(gain).connect(this.masterGain);
        osc.start(now + 0.12);
        osc.stop(now + 0.7);
      });
    } else if (heroId === "hajimi") {
      // 哈基米急促红温电音脉冲
      [740, 987.7, 1174.6, 1480].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        const t0 = now + 0.15 + idx * 0.055;
        osc.frequency.setValueAtTime(freq, t0);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.25, t0 + 0.09);
        gain.gain.setValueAtTime(0.16, t0);
        gain.gain.exponentialRampToValueAtTime(0.003, t0 + 0.1);
        osc.connect(gain).connect(this.masterGain);
        osc.start(t0);
        osc.stop(t0 + 0.11);
      });
    } else if (heroId === "laoda") {
      // 曼巴直升机螺旋桨切风 + 紫金号角
      for (let i = 0; i < 6; i++) {
        this.playNoiseBurst(0.06, 0.22, 420 + i * 90);
      }
      [392.0, 587.3, 784.0].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        const t0 = now + 0.14 + idx * 0.07;
        osc.frequency.setValueAtTime(freq, t0);
        gain.gain.setValueAtTime(0.2, t0);
        gain.gain.exponentialRampToValueAtTime(0.004, t0 + 0.32);
        osc.connect(gain).connect(this.masterGain);
        osc.start(t0);
        osc.stop(t0 + 0.34);
      });
    } else {
      // 练习生舞台聚光灯Funk合成器滑音
      [440, 554.37, 659.25, 880].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        const t0 = now + 0.12 + idx * 0.06;
        osc.frequency.setValueAtTime(freq, t0);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t0 + 0.18);
        gain.gain.setValueAtTime(0.22, t0);
        gain.gain.exponentialRampToValueAtTime(0.004, t0 + 0.2);
        osc.connect(gain).connect(this.masterGain);
        osc.start(t0);
        osc.stop(t0 + 0.22);
      });
    }
    this.playNoiseBurst(0.24, 0.32, 1350);
  }

  // 变身三幕阶段切换提示音（stage 2: 真身觉醒闪光, stage 3: 锁定俯冲蓄力）
  playCutinPhaseCue(stageIndex = 1, heroId = "dayun") {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (stageIndex === 1) {
      // 第二幕：百变卡框破封闪耀和弦
      [659.25, 987.77, 1318.5, 1975.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        const t0 = now + i * 0.025;
        osc.frequency.setValueAtTime(freq, t0);
        gain.gain.setValueAtTime(0.16, t0);
        gain.gain.exponentialRampToValueAtTime(0.003, t0 + 0.22);
        osc.connect(gain).connect(this.masterGain);
        osc.start(t0);
        osc.stop(t0 + 0.24);
      });
    } else if (stageIndex === 2) {
      // 第三幕：红圈锁定与极速俯冲衔接升频音
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(1240, now + 0.28);
      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.004, now + 0.3);
      osc.connect(gain).connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.32);
      this.playNoiseBurst(0.14, 0.25, 1900);
    }
  }

  // 变身结束瞬移破空轰击（大招丝滑落地衔接音）
  playUltImpactLaunch(heroId = "dayun") {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = "sawtooth";
    sub.frequency.setValueAtTime(420, now);
    sub.frequency.exponentialRampToValueAtTime(42, now + 0.36);
    subGain.gain.setValueAtTime(0.42, now);
    subGain.gain.exponentialRampToValueAtTime(0.004, now + 0.38);
    sub.connect(subGain).connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 0.4);
    this.playNoiseBurst(0.32, 0.44, heroId === "dayun" ? 650 : 1200);
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
    osc.connect(gain).connect(this.masterGain);
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
    osc.connect(gain).connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.46);
    this.playNoiseBurst(0.38, 0.48, 700);
  }

  playFinaleClip(key, interrupt = true) {
    if (interrupt) this.stopVoices();
    if (!this.enabled || !this.voiceEnabled) return;
    const path = 'assets/sounds/' + key + '.mp3';
    const audio = this.audioCache[path] || (this.audioCache[path] = new Audio(path));
    audio.volume = this.volume;
    audio.currentTime = 0;
    this.activeVoice = audio;
    audio.play().catch(() => {});
  }

  playCast(kind) {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(kind === "heal" ? 440 : 600, now);
    osc.frequency.exponentialRampToValueAtTime(kind === "heal" ? 880 : 220, now + 0.12);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain).connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  playImpact(critical = false) {
    const now = performance.now();
    if (now - (this.lastImpactAt ?? -Infinity) < 90) return;
    this.lastImpactAt = now;
    this.playClash(critical);
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
    osc.connect(gain).connect(this.masterGain);
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
    osc.connect(gain).connect(this.masterGain);
    osc.start(now);
    osc.stop(now + (isCrit ? 0.26 : 0.15));

    this.playNoiseBurst(isCrit ? 0.22 : 0.1, isCrit ? 0.36 : 0.2);
  }

  playHeroEventVoice(heroId, eventType = "hit", shoutText = "", urgent = false) {
    const played = this.tryPlayMp3(heroId, urgent, eventType);
    if (!played && shoutText) {
      this.speakMemeShout(shoutText, heroId, urgent);
    }
    return played;
  }

  playSkillSFX(heroId, isUlt = false, shoutText = "") {
    const hasLocalVoice = this.tryPlayMp3(heroId, isUlt, isUlt ? "ult" : "skill");
    if (!hasLocalVoice && shoutText) {
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
        osc.connect(gain).connect(this.masterGain);
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
      osc.connect(gain).connect(this.masterGain);
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
        osc.connect(gain).connect(this.masterGain);
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
      osc.connect(gain).connect(this.masterGain);
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
      osc.connect(gain).connect(this.masterGain);
      osc.start(now + idx * 0.055);
      osc.stop(now + idx * 0.055 + 0.26);
    });
  }
}

window.memeAudio = new MemeAudio();
