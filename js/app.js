// 全局 UI 控制器：大厅配装、全明星混池抽卡、重复卡智能分流、保底商店、开局3秒抽人+5秒词条5选3、录屏导演快捷键

class AppController {
  constructor() {
    this.store = window.gameStore;
    this.canvas = document.getElementById("battle-canvas");
    this.engine = new window.BattleEngine(this.canvas);
    this.engine.onScenarioChange = () => this.updateScenarioProgress();
    this.engine.onScenarioInput = (id) => this.clickScenarioButton(id);
    this.pendingPulls = this.store.state.pendingPulls;
    this.draftTimerId = null;
    this.draftGeneration = 0;
    this.simulating = false;

    this.bindEvents();
    this.engine.bindCombatInsights();
    this.refreshTopBar();
    this.renderLobby();
    this.renderGachaStage();
    this.refreshMode();
    this.applySettings();
    this.renderProbabilities();
  }

  switchScreen(screenId) {
    document.body.classList.toggle("in-battle", screenId === "screen-battle");
    if (screenId !== "screen-battle") {
      clearInterval(this.draftTimerId);
      this.draftGeneration++;
      this.engine.stop();
      document.getElementById("draft-overlay").classList.add("hidden");
    }
    document.querySelectorAll(".game-screen").forEach((s) => s.classList.remove("active"));
    const target = document.getElementById(screenId);
    if (target) target.classList.add("active");

    // 战斗页面隐藏大厅顶部栏以沉浸显示对战HUD
    const topBar = document.getElementById("top-bar");
    if (topBar) {
      topBar.style.display = screenId === "screen-battle" ? "none" : "flex";
    }

    if (screenId === "screen-lobby") this.renderLobby();
    if (screenId === "screen-shop") this.renderShop();
    if (screenId === "screen-codex") this.renderCodex();
  }

  refreshTopBar() {
    const st = this.store.state;
    document.getElementById("ui-level").textContent = `Lv.${st.level}`;
    document.getElementById("ui-tickets").textContent = st.tickets;
    document.getElementById("ui-pity").textContent = st.pityCoins;
    document.getElementById("ui-exp-fill").style.width = `${Math.min(100, st.exp / window.GAME_CONFIG.rewards.expPerLevel * 100)}%`;
    const redDot = document.getElementById("gacha-red-dot");
    if (redDot) {
      redDot.textContent = st.tickets >= 10 ? `可抽${Math.floor(st.tickets / 10)}十连!` : "狂送十连!";
    }
  }

  notice(message) {
    const el = document.getElementById("game-notice");
    el.textContent = message;
    el.classList.remove("hidden");
    clearTimeout(this.noticeTimer);
    this.noticeTimer = setTimeout(() => el.classList.add("hidden"), 4000);
  }

  toggleDirectorPanel(open) {
    const panel = document.getElementById("director-panel");
    const show = open ?? panel.classList.contains("hidden");
    panel.classList.toggle("hidden", !show);
    document.getElementById("btn-director").setAttribute("aria-expanded", String(show));
    if (!show && panel.contains(document.activeElement)) document.getElementById("btn-director").focus();
  }

  runDirectorScript(key) {
    if (key === "t") {
      this.store.state.tickets += 50;
      this.store.state.pityCoins += 500;
      this.store.save();
      this.refreshTopBar();
      this.notice("导演调试：已补充 50 张抽卡券和 500 保底币");
      return true;
    }
    if (!["q", "w", "e", "r"].includes(key)) return false;
    const engine = this.engine;
    if (!engine.canAct(engine.p1)) {
      this.notice(engine.running ? "请继续对局，并等待眩晕、时停或大招前摇结束后触发剧情" : "先开始一局对战，再触发固定剧情");
      return false;
    }
    return engine.executeScenarioCue({ action: key }, engine.headless);
  }

  parseScenario(source) {
    let timeline;
    try {
      timeline = JSON.parse(source);
    } catch {
      throw new Error("JSON 格式错误");
    }
    const error = window.BattleEngine.validateScenario(timeline);
    if (error) throw new Error(error);
    return timeline;
  }

  setScenarioStatus(message, error = false) {
    const status = document.getElementById("scenario-status");
    status.textContent = message;
    status.className = error ? "scenario-status-err" : "scenario-status-ok";
  }

  loadScenario(source) {
    const editor = document.getElementById("scenario-editor");
    try {
      const timeline = this.parseScenario(source ?? editor.value);
      if (source !== undefined) editor.value = JSON.stringify(timeline, null, 2);
      editor.setAttribute("aria-invalid", "false");
      this.setScenarioStatus("");
      if (timeline.recording) this.switchScreen("screen-lobby");
      this.engine.loadScenario(timeline);
      this.updateScenarioProgress();
      return true;
    } catch (error) {
      if (source === undefined) editor.setAttribute("aria-invalid", "true");
      this.setScenarioStatus(`${error.message}（当前剧本未替换）`, true);
      return false;
    }
  }

  exportScenario() {
    try {
      const timeline = this.parseScenario(document.getElementById("scenario-editor").value);
      const url = URL.createObjectURL(new Blob([JSON.stringify(timeline, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "shenren-scenario.json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      this.setScenarioStatus("已导出编辑区 JSON，未改变当前对局");
    } catch (error) {
      this.setScenarioStatus(error.message, true);
    }
  }

  clearScenario() {
    this.engine.clearScenario();
    document.getElementById("scenario-editor").setAttribute("aria-invalid", "false");
    this.setScenarioStatus("已清除剧本；编辑区内容保留");
  }

  renderScenarioStage() {
    const scenario = this.engine.scenario;
    const visible = this.engine.running || this.engine.state === "result";
    const caption = visible ? scenario?.caption : null;
    const box = document.getElementById("story-caption");
    box.classList.toggle("hidden", !caption);
    box.classList.toggle("story-ending", !!this.engine.finale || this.engine.state === "result");
    document.getElementById("story-caption-text").textContent = caption?.content || "";
    document.getElementById("story-caption-text").style.color = caption?.color || "";
    document.getElementById("story-chapter").textContent = caption ? scenario.chapter || "" : "";
  }

  clickScenarioButton(id) {
    const button = document.getElementById(id);
    if (!button || button.disabled || !button.checkVisibility()) return false;
    const rect = button.getBoundingClientRect();
    const pointer = document.createElement("div");
    pointer.className = "battle-click-pointer";
    pointer.setAttribute("aria-hidden", "true");
    pointer.style.left = `${rect.left + rect.width / 2}px`;
    pointer.style.top = `${rect.top + rect.height / 2}px`;
    pointer.innerHTML = '<svg width="28" height="34" viewBox="0 0 28 34"><path d="M3 2 L3 26 L10 20 L16 31 L21 28 L15 18 L25 17 Z" fill="white" stroke="#111" stroke-width="2"/></svg>';
    document.body.appendChild(pointer);
    const animation = pointer.animate([
      { transform: "scale(0.8)", opacity: 1 },
      { transform: "scale(1)", opacity: 1, offset: 0.35 },
      { transform: "scale(1)", opacity: 0 }
    ], { duration: 450, easing: "ease-out" });
    animation.finished.then(() => pointer.remove(), () => pointer.remove());
    button.click();
    return true;
  }

  updateScenarioProgress() {
    this.renderScenarioStage();
    this.refreshMode();
    const scenario = this.engine.scenario;
    document.getElementById("btn-scenario-play").disabled = !scenario;
    const meta = document.getElementById("scenario-meta");
    meta.classList.toggle("hidden", !scenario?.recording);
    if (scenario?.recording) {
      const total = Math.ceil(scenario.duration + 3.35 + scenario.timeline.reduce((sum, cue) => sum + (cue.action === "pause" ? cue.duration : 0), 0));
      meta.textContent = `${scenario.title}\n${window.MEME_DATA.heroes[scenario.p1HeroId].name} VS ${window.MEME_DATA.heroes[scenario.p2HeroId].name}\n主剧情 ${scenario.duration} 秒 · 含停顿及收尾约 ${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
    } else meta.textContent = "";
    document.querySelectorAll("[data-scenario-preset]").forEach((button) => {
      const preset = window.SCENARIO_PRESETS[button.dataset.scenarioPreset];
      button.setAttribute("aria-pressed", String(!!preset?.recording && preset.title === scenario?.title));
    });
    const el = document.getElementById("scenario-progress");
    el.replaceChildren();
    if (!this.engine.scenario) { el.classList.add("hidden"); return; }
    const { timeline, cursor } = this.engine.scenario;
    const actionLabels = { q: "绝境翻盘", w: "一击收尾", e: "贴脸", r: "卡车车队", hp: "设血量", ult: "充能", speed: "变速", text: "漂字", pause: "暂停", shield: "护盾", stun: "眩晕", caption: "字幕", guard: "保活", finish: "剧情收尾", response: "自动应对" };
    timeline.forEach((cue, i) => {
      const row = document.createElement("div");
      row.className = i < cursor ? "cue-done" : i === cursor ? "cue-next" : "cue-pending";
      const prefix = i < cursor ? "✓" : i === cursor ? "▶" : "·";
      const detail = cue.content ? `「${cue.content}」` : [
        cue.target ? (cue.target === "p1" ? "我方" : "敌方") : "",
        cue.value !== undefined ? String(cue.value) : "",
        cue.duration !== undefined ? `${cue.duration}s` : ""
      ].filter(Boolean).join(" · ");
      row.textContent = `${prefix} ${cue.at}s ${actionLabels[cue.action]} ${detail}`;
      el.appendChild(row);
    });
    el.classList.remove("hidden");
    if (document.getElementById("scenario-status").classList.contains("scenario-status-err")) return;
    const count = `${cursor}/${timeline.length}`;
    const status = cursor === timeline.length ? `已执行 ${count} · 剧本完成`
      : this.engine.finale || (!this.engine.running && cursor > 0) ? `对局已结束 · 已执行 ${count}`
      : scenario.recording && !scenario.started ? `已加载 ${timeline.length} 条剧情 · 点击播放从头演出`
      : this.engine.running ? `${this.engine.paused ? "暂停中" : "已执行"} ${count}`
      : `已加载 ${timeline.length} 条剧情 · 开战后执行`;
    this.setScenarioStatus(status);
  }

  refreshMode() {
    const recording = !!this.engine.scenario?.recording;
    const mode = recording ? "classic" : this.store.state.matchMode;
    const rules = window.GAME_CONFIG.modes[mode];
    const picker = document.getElementById("match-mode");
    picker.value = mode;
    picker.disabled = recording;
    document.getElementById("match-mode-hint").textContent = recording
      ? `导演剧情 · 固定角色 · ${this.engine.scenario.duration} 秒主剧情 · 1×自动演出`
      : `3秒选人 + 5秒词条5选3 · ${rules.duration}秒${rules.name}`;
    document.querySelector("#btn-start-match .btn-main-txt").textContent = recording ? "播放已加载剧情" : "⚡ 立即随机匹配开打";
    document.getElementById("battle-speed").disabled = recording;
    const auto = document.getElementById("btn-toggle-auto");
    auto.disabled = recording;
    auto.classList.toggle("hidden", recording);
    auto.textContent = `自动释放：${recording || this.store.state.autoBattle ? "开启" : "关闭"}`;
    auto.classList.toggle("active", recording || this.store.state.autoBattle);
    document.getElementById("btn-res-again").textContent = "⚡ 再来一局";
    if (!this.engine.running) this.engine.mode = mode;
  }

  renderProbabilities() {
    const chance = (rarities) => window.GAME_CONFIG.gacha.filter((bucket) => rarities.includes(bucket.rarity)).reduce((sum, bucket) => sum + bucket.weight, 0);
    document.getElementById("gacha-probabilities").innerHTML = `<span class="prob-ur">UR 究极技/彩词条 ${chance(["UR"])}%</span><span class="prob-ssr">SSR 角色/专属技 ${chance(["SSR"])}%</span><span class="prob-sr">SR/R 技能/词条 ${chance(["SR", "R"])}%</span>`;
  }

  applySettings() {
    const settings = this.store.state.settings;
    window.memeAudio.applySettings(settings);
    const reduced = settings.effects === "reduced" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.body.classList.toggle("reduced-effects", reduced);
    document.getElementById("setting-volume").value = Math.round(settings.volume * 100);
    document.getElementById("volume-value").textContent = `${Math.round(settings.volume * 100)}%`;
    document.getElementById("setting-muted").checked = settings.muted;
    document.getElementById("setting-voice").checked = settings.voice;
    document.getElementById("setting-effects").value = settings.effects;
    const autoBtn = document.getElementById("btn-toggle-auto");
    const recording = !!this.engine.scenario?.recording;
    autoBtn.classList.toggle("hidden", recording);
    if (!recording) {
      autoBtn.classList.toggle("active", this.store.state.autoBattle);
      autoBtn.innerHTML = `自动释放：<strong>${this.store.state.autoBattle ? "开启" : "关闭"}</strong>`;
    }
  }

  // 渲染大厅：4大角色切换 & (2固定核心被动 + 1自选普通主动 + 1自选究极技[主动或被动])
  renderLobby() {
    const st = this.store.state;
    const heroes = Object.values(window.MEME_DATA.heroes);
    const unlockedCount = heroes.filter((h) => st.unlockedHeroes[h.id]).length;
    document.getElementById("ui-unlocked-count").textContent = `${unlockedCount}/${heroes.length}`;

    const tabsEl = document.getElementById("hero-tabs");
    tabsEl.innerHTML = "";
    heroes.forEach((h) => {
      const unlocked = !!st.unlockedHeroes[h.id];
      const tab = document.createElement("button");
      tab.type = "button";
      tab.setAttribute("aria-pressed", st.selectedHeroPreview === h.id);
      tab.className = `hero-tab ${st.selectedHeroPreview === h.id ? "active" : ""} ${unlocked ? "" : "locked"}`;
      tab.innerHTML = `
        ${unlocked ? "" : '<span class="lock-badge">未抽到</span>'}
        <div class="tab-avatar"><img class="hero-portrait" src="${h.imagePath}" alt="${h.name}"></div>
        <div class="tab-name">${h.name}</div>
      `;
      tab.addEventListener("click", () => {
        st.selectedHeroPreview = h.id;
        this.store.save();
        this.renderLobby();
      });
      tabsEl.appendChild(tab);
    });

    const curHero = window.MEME_DATA.heroes[st.selectedHeroPreview] || heroes[0];
    const cardEl = document.getElementById("hero-loadout-card");

    const passivesHtml = curHero.corePassives
      .map(
        (p) => `
        <div class="passive-box">
          <strong>🔒 固定被动：${p.name}</strong>
          <span>${p.desc}</span>
        </div>
      `
      )
      .join("");

    const normalHtml = curHero.normalSkills
      .map((s) => {
        const owned = !!st.unlockedSkills[s.id];
        const equipped = st.equippedNormal[curHero.id] === s.id;
        const lv = st.skillLevels[s.id] || 1;
        return `
          <button class="skill-pill ${equipped ? "equipped" : ""} ${owned ? "" : "locked"}" data-slot="normal" data-hero="${curHero.id}" data-skill="${s.id}">
            <div class="skill-pill-top">
              <span>⚔️ ${s.name}</span>
              <span>${owned ? `Lv.${lv} (${s.rarity})` : "🔒抽卡解锁"}</span>
            </div>
            <div class="skill-pill-desc">${s.desc}</div>
          </button>
        `;
      })
      .join("");

    const ultHtml = curHero.ultSkills
      .map((u) => {
        const owned = !!st.unlockedSkills[u.id];
        const equipped = st.equippedUlt[curHero.id] === u.id;
        const lv = st.skillLevels[u.id] || 1;
        return `
          <button class="skill-pill ${equipped ? "equipped" : ""} ${owned ? "" : "locked"}" data-slot="ult" data-hero="${curHero.id}" data-skill="${u.id}">
            <div class="skill-pill-top">
              <span>🌈 ${u.name}</span>
              <span>${owned ? `Lv.${lv} [${u.type === "active" ? "主动" : "被动"}]` : "🔒抽卡解锁"}</span>
            </div>
            <div class="skill-pill-desc">${u.desc}</div>
          </button>
        `;
      })
      .join("");

    cardEl.innerHTML = `
      <div class="hero-bio-row">
        <div class="hero-big-icon" style="background:${curHero.color}"><img class="hero-portrait" src="${curHero.imagePath}" alt="${curHero.name}"></div>
        <div class="hero-bio-info">
          <h3>${curHero.name} ${st.unlockedHeroes[curHero.id] ? "✅已拥有" : "🔒未解锁(去混池抽/保底换)"}</h3>
          <p>${curHero.title}</p>
        </div>
      </div>

      <div class="slot-group-title">
        <span>🧬 角色天生自带：2个固定核心被动</span>
      </div>
      <div class="passive-grid">${passivesHtml}</div>

      <div class="equip-slot-row">
        <div class="slot-group-title">
          <span>⚔️ 自选普通主动技 (3选1装备 · 升级提高伤害与弹幕规模)</span>
        </div>
        <div class="skill-choice-list">${normalHtml}</div>
      </div>

      <div class="equip-slot-row">
        <div class="slot-group-title">
          <span>🌈 自选究极技能/大招 (2选1装备 · 含主动大招或纯被动大招)</span>
        </div>
        <div class="skill-choice-list">${ultHtml}</div>
      </div>
    `;

    cardEl.querySelectorAll(".skill-pill").forEach((btn) => {
      btn.addEventListener("click", () => {
        const heroId = btn.dataset.hero;
        const skillId = btn.dataset.skill;
        const slot = btn.dataset.slot;
        if (!st.unlockedSkills[skillId]) return;
        if (slot === "normal") st.equippedNormal[heroId] = skillId;
        if (slot === "ult") st.equippedUlt[heroId] = skillId;
        this.store.save();
        this.renderLobby();
      });
    });
  }

  // 全明星大混池抽卡
  executeGachaPull(count) {
    // 如果上一轮有未确认的重复卡，先自动按当前勾选结算
    if (this.pendingPulls.length > 0) {
      this.confirmPendingDupes();
    }

    if (this.store.state.tickets < count) return this.notice("抽卡券不足，完成对局后可获得奖励。");
    this.store.state.tickets -= count;
    const pulls = this.store.rollMixedPool(count);
    this.pendingPulls = pulls;

    const hasUR = pulls.some((p) => p.item.rarity === "UR");
    window.memeAudio.playGachaBurst(hasUR);

    this.refreshTopBar();
    this.renderGachaStage();
  }

  renderGachaStage() {
    const stage = document.getElementById("gacha-stage");
    const dupeBar = document.getElementById("gacha-dupe-bar");
    stage.innerHTML = "";
    if (this.pendingPulls.length === 0) stage.innerHTML = '<div class="gacha-idle-hint">每局奖励抽卡券；十连至少一张 SSR 或 UR。</div>';

    const hasDupes = this.pendingPulls.some((p) => p.isDupe);
    if (hasDupes) {
      dupeBar.classList.remove("hidden");
    } else {
      dupeBar.classList.add("hidden");
    }

    this.pendingPulls.forEach((entry, idx) => {
      const it = entry.item;
      const card = document.createElement("div");
      card.className = `pull-card rarity-${it.rarity}`;

      let bottomHtml = `<span class="new-badge">✨ 首次解锁 NEW!</span>`;
      if (entry.isDupe) {
        if (it.poolType === "hero") {
          bottomHtml = `<div style="font-size:10px;color:#00f0ff;font-weight:800">重复角色 → 自动转化 +${it.pityValue}💎</div>`;
        } else {
          const upgDesc = it.poolType === "perk" ? "升级(+刷出率)" : "升级(伤害+28%)";
          const recTag = entry.chosenAction === "upgrade" ? "★推荐" : "";
          bottomHtml = `
            <div class="dupe-choice-group">
              <button class="dupe-opt-btn upgrade ${entry.chosenAction === "upgrade" ? "selected" : ""}" data-idx="${idx}" data-act="upgrade">
                ⬆️${upgDesc}${recTag}
              </button>
              <button class="dupe-opt-btn convert ${entry.chosenAction === "convert" ? "selected" : ""}" data-idx="${idx}" data-act="convert">
                💎转+${it.pityValue}币
              </button>
            </div>
          `;
        }
      }

      card.innerHTML = `
        <div class="pull-card-head">
          <span>${it.name}</span>
          <span class="rarity-tag ${it.rarity}">${it.rarity}</span>
        </div>
        <div style="font-size:10px;color:#9499b3">${it.subLabel}</div>
        ${bottomHtml}
      `;
      stage.appendChild(card);
    });

    stage.querySelectorAll(".dupe-opt-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = Number(btn.dataset.idx);
        const act = btn.dataset.act;
        this.pendingPulls[i].chosenAction = act;
        this.store.save();
        this.renderGachaStage();
      });
    });
  }

  confirmPendingDupes() {
    if (this.pendingPulls.length === 0) return;
    const res = this.store.applyDupeDecisions(this.pendingPulls);
    this.pendingPulls = [];
    document.getElementById("gacha-dupe-bar").classList.add("hidden");
    this.refreshTopBar();

    const stage = document.getElementById("gacha-stage");
    stage.innerHTML = `
      <div class="gacha-idle-hint" style="color:#00ff88;font-weight:900">
        ✅ 已结算重复卡：成功升级 ${res.upgradedCount} 项，转化获得 +${res.gainedCoins} 💎保底币！<br/>
        点击下方继续狂抽！
      </div>
    `;
  }

  // 保底兑换商店
  renderShop() {
    const listEl = document.getElementById("shop-list");
    listEl.innerHTML = "";
    const allItems = this.store.getAllPoolItems().filter((it) => it.rarity === "UR" || it.rarity === "SSR" || it.rarity === "SR");

    allItems.forEach((it) => {
      const owned = this.store.isItemOwned(it);
      const lv = this.store.getItemLevel(it);
      const canAfford = this.store.state.pityCoins >= it.pityPrice;

      const row = document.createElement("div");
      row.className = "shop-item";
      row.innerHTML = `
        <div>
          <div style="font-size:13px;font-weight:900">
            <span class="rarity-tag ${it.rarity}">${it.rarity}</span>
            ${it.name}
            <span style="font-size:11px;color:#00ff88">${owned ? `(已拥有 Lv.${lv})` : "(未解锁)"}</span>
          </div>
          <div style="font-size:11px;color:#9499b3;margin-top:2px">${it.desc}</div>
        </div>
        <button class="btn-buy-pity" ${!canAfford ? "disabled" : ""}>
          💎 ${it.pityPrice} ${owned ? (it.poolType === "hero" ? "已满" : "直升1级") : "强娶解锁"}
        </button>
      `;

      const buyBtn = row.querySelector(".btn-buy-pity");
      if (owned && it.poolType === "hero") buyBtn.disabled = true;
      buyBtn.addEventListener("click", () => {
        if (buyBtn.disabled) return;
        const currentlyOwned = this.store.isItemOwned(it);
        if (currentlyOwned && it.poolType === "hero") return;
        if (this.store.state.pityCoins < it.pityPrice) return;
        buyBtn.disabled = true;
        this.store.state.pityCoins -= it.pityPrice;
        if (!currentlyOwned) {
          this.store.unlockItemDirectly(it);
        } else if (it.poolType === "perk") {
          this.store.state.perkLevels[it.id] = (this.store.state.perkLevels[it.id] || 1) + 1;
        } else if (it.poolType === "skill") {
          this.store.state.skillLevels[it.id] = (this.store.state.skillLevels[it.id] || 1) + 1;
        }
        this.store.save();
        window.memeAudio.playGachaBurst(it.rarity === "UR");
        this.refreshTopBar();
        this.renderShop();
      });

      listEl.appendChild(row);
    });
  }

  // 词条池与 5选3 刷出权重图鉴
  renderCodex() {
    const listEl = document.getElementById("codex-list");
    listEl.innerHTML = "";
    window.MEME_DATA.perks.forEach((pk) => {
      const owned = !!this.store.state.unlockedPerks[pk.id];
      const lv = this.store.state.perkLevels[pk.id] || 1;
      const weight = this.store.getPerkDraftWeight(pk);

      const row = document.createElement("div");
      row.className = "codex-item";
      row.innerHTML = `
        <div>
          <div style="font-size:13px;font-weight:900">
            <span class="rarity-tag ${pk.rarity}">${pk.rarity}</span>
            ${pk.name}
            <span style="font-size:11px;color:${owned ? "#00ff88" : "#ff2a54"}">${owned ? `Lv.${lv}` : "未抽到"}</span>
          </div>
          <div style="font-size:11px;color:#9499b3;margin-top:2px">${pk.desc}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:11px;color:#ffe600;font-weight:900">刷出权重: ${owned ? weight : 0}</div>
          <div style="font-size:10px;color:#9499b3">${pk.type === "active" ? "主动按钮" : "常驻被动"}</div>
        </div>
      `;
      listEl.appendChild(row);
    });
  }

  // ==================== 开局快节奏两步盲盒流程 ====================
  // 阶段 A：3秒角色随机抽卡跳动（可点击立即锁定，不点则倒计时结束自动随机选定）
  startMatchDraftFlow() {
    const recording = this.engine.scenario;
    if (recording?.recording) {
      document.body.classList.add("pure-record-mode");
      document.getElementById("game-notice").classList.add("hidden");
      clearInterval(this.draftTimerId);
      this.draftGeneration++;
      this.switchScreen("screen-battle");
      document.getElementById("draft-overlay").classList.add("hidden");
      document.getElementById("result-overlay").classList.add("hidden");
      this.toggleDirectorPanel(false);
      this.engine.startMatch(recording.p1HeroId, []);
      return;
    }
    clearInterval(this.draftTimerId);
    this.engine.stop("draft");
    this.draftGeneration++;
    this.switchScreen("screen-battle");
    document.getElementById("result-overlay").classList.add("hidden");

    const draftEl = document.getElementById("draft-overlay");
    draftEl.classList.remove("hidden");

    const allHeroes = Object.values(window.MEME_DATA.heroes);
    const unlockedIds = allHeroes.filter((h) => this.store.state.unlockedHeroes[h.id]).map((h) => h.id);
    const poolIds = unlockedIds.length > 0 ? unlockedIds : ["dayun", "hajimi"];

    let activeHeroId = poolIds[Math.floor(Math.random() * poolIds.length)];
    let timeLeft = 3;

    const renderStep1 = () => {
      const cardsHtml = allHeroes
        .map((h) => {
          const isUnlocked = poolIds.includes(h.id);
          return `
            <button type="button" class="roulette-card ${activeHeroId === h.id ? "highlight" : ""}" data-hid="${h.id}" ${isUnlocked ? "" : "disabled"} style="opacity:${isUnlocked ? 1 : 0.4}">
              <div class="draft-portrait"><img class="hero-portrait" src="${h.imagePath}" alt="${h.name}"></div>
              <div style="font-size:14px;font-weight:900;margin-top:4px">${h.name}</div>
              <div style="font-size:10px;color:#9499b3">${isUnlocked ? "点击立即锁定" : "未解锁"}</div>
            </button>
          `;
        })
        .join("");

      draftEl.innerHTML = `
        <div class="draft-header">
          <span class="draft-step-pill">STEP 1/2 · 随机盲盒抽角色</span>
          <h2>🎲 正在随机跳动抽取参战神人...</h2>
          <div style="font-size:11px;color:#9499b3">点击任意已解锁角色立即锁定，不选则自动随机出战！</div>
          <div class="draft-countdown">${timeLeft.toFixed(1)}s</div>
        </div>
        <div class="roulette-grid">${cardsHtml}</div>
      `;

      draftEl.querySelectorAll(".roulette-card").forEach((c) => {
        c.addEventListener("click", () => {
          const hid = c.dataset.hid;
          if (!poolIds.includes(hid)) return;
          clearInterval(this.draftTimerId);
          window.memeAudio.playClash(false);
          this.startPerk5Pick3Flow(hid);
        });
      });
    };

    renderStep1();

    this.draftTimerId = setInterval(() => {
      timeLeft -= 0.25;
      // 跳动高亮
      activeHeroId = poolIds[Math.floor(Math.random() * poolIds.length)];
      window.memeAudio.playWallBounce();
      if (timeLeft <= 0) {
        clearInterval(this.draftTimerId);
        this.startPerk5Pick3Flow(activeHeroId);
      } else {
        draftEl.querySelector(".draft-countdown").textContent = `${timeLeft.toFixed(1)}s`;
        draftEl.querySelectorAll(".roulette-card").forEach((card) => card.classList.toggle("highlight", card.dataset.hid === activeHeroId));
      }
    }, 250);
  }

  // 阶段 B：词条 5 选 3（每局先随机一个流派权重，帮助稳定成型）
  startPerk5Pick3Flow(chosenHeroId) {
    clearInterval(this.draftTimerId);
    if (this.engine.state !== "draft") this.engine.stop("draft");
    const generation = this.draftGeneration;
    const draftEl = document.getElementById("draft-overlay");
    const draftRoll = this.store.rollFivePerksForDraft(this.store.state.preferredArchetype === "all" ? null : this.store.state.preferredArchetype);
    const focusArch = draftRoll.focusArch;
    const fivePerks = draftRoll.perks;
    const selectedIds = new Set();
    let timeLeft = 5;
    let finalized = false;

    const finalizeAndFight = () => {
      if (finalized || generation !== this.draftGeneration || this.engine.state !== "draft") return;
      finalized = true;
      clearInterval(this.draftTimerId);
      // 不足3个则自动随机补满3个
      for (const pk of window.GameRandom.shuffle(fivePerks)) {
        if (selectedIds.size >= 3) break;
        selectedIds.add(pk.id);
      }
      const finalPerks = fivePerks.filter((p) => selectedIds.has(p.id));
      draftEl.classList.add("hidden");
      this.engine.startMatch(chosenHeroId, finalPerks);
    };

    const renderStep2 = () => {
      const listHtml = fivePerks
        .map((pk) => {
          const isSel = selectedIds.has(pk.id);
          const lv = this.store.state.perkLevels[pk.id] || 1;
          return `
            <button type="button" class="perk-draft-item ${isSel ? "selected" : ""} rarity-${pk.rarity}" data-pid="${pk.id}" aria-pressed="${isSel}">
              <div>
                <div style="font-size:13px;font-weight:900">
                  <span class="rarity-tag ${pk.rarity}">${pk.rarity}</span>
                  ${pk.name}
                  <span style="font-size:10px;color:${window.MEME_DATA.archetypes[pk.archetype]?.color || "#ffe600"}">[${window.MEME_DATA.archetypes[pk.archetype]?.name || "通用"}]</span>
                  <span style="font-size:10px;color:#ffe600">[${pk.type === "active" ? "⚡主动技" : "🛡️被动"}]</span>
                  <span style="font-size:10px;color:#9499b3">权重Lv.${lv}</span>
                </div>
                <div style="font-size:10px;color:#cbd2f6;margin-top:2px">${pk.desc}</div>
              </div>
              <div style="font-size:13px;font-weight:900;color:${isSel ? "#00ff88" : "#9499b3"}">
                ${isSel ? "✅已选" : "点选"}
              </div>
            </button>
          `;
        })
        .join("");

      draftEl.innerHTML = `
        <div class="draft-header">
          <span class="draft-step-pill">STEP 2/2 · ${window.MEME_DATA.archetypes[focusArch].name} UP · 词条5选3 (${selectedIds.size}/3)</span>
          <h2>⚡ 选择 3 个神人词条加持本局！</h2>
          <div style="font-size:11px;color:#9499b3">本局流派权重已锁定：${window.MEME_DATA.archetypes[focusArch].desc}</div>
          <div class="draft-countdown">${timeLeft.toFixed(1)}s</div>
        </div>
        <div class="perk-draft-list">${listHtml}</div>
        <button id="btn-instant-lock-perks" class="btn-mega-start" style="width:100%;padding:8px">
          <span class="btn-main-txt" style="font-size:16px">🔥 立即开战 (差额自动随机补齐)</span>
        </button>
      `;

      draftEl.querySelectorAll(".perk-draft-item").forEach((row) => {
        row.addEventListener("click", () => {
          const pid = row.dataset.pid;
          if (selectedIds.has(pid)) {
            selectedIds.delete(pid);
          } else if (selectedIds.size < 3) {
            selectedIds.add(pid);
          }
          window.memeAudio.playWallBounce();
          renderStep2();
        });
      });

      const lockBtn = document.getElementById("btn-instant-lock-perks");
      if (lockBtn) lockBtn.addEventListener("click", finalizeAndFight);
    };

    renderStep2();

    this.draftTimerId = setInterval(() => {
      timeLeft -= 0.5;
      if (timeLeft <= 0) {
        finalizeAndFight();
      } else {
        const cdEl = draftEl.querySelector(".draft-countdown");
        if (cdEl) cdEl.textContent = `${timeLeft.toFixed(1)}s`;
      }
    }, 500);
  }

  bindEvents() {
    window.addEventListener("game-storage-error", () => this.notice("当前浏览器无法保存进度，请检查存储权限后再刷新。"));
    document.getElementById("match-mode").addEventListener("change", (event) => {
      this.store.state.matchMode = event.target.value;
      this.store.save();
      this.refreshMode();
    });
    const settingsDialog = document.getElementById("settings-dialog");
    document.getElementById("btn-settings").addEventListener("click", () => {
      this.settingsPausedBattle = this.engine.running && !this.engine.paused;
      if (this.engine.running) this.engine.setPaused(true);
      settingsDialog.showModal();
    });
    settingsDialog.addEventListener("close", () => {
      if (this.settingsPausedBattle && this.engine.running) this.engine.setPaused(false);
      this.settingsPausedBattle = false;
    });
    document.getElementById("btn-close-settings").addEventListener("click", () => settingsDialog.close());
    for (const id of ["setting-volume", "setting-muted", "setting-voice", "setting-effects"]) {
      document.getElementById(id).addEventListener("input", () => {
        this.store.state.settings = {
          volume: Number(document.getElementById("setting-volume").value) / 100,
          muted: document.getElementById("setting-muted").checked,
          voice: document.getElementById("setting-voice").checked,
          effects: document.getElementById("setting-effects").value
        };
        this.store.save();
        this.applySettings();
      });
    }
    window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", () => this.applySettings());
    // 导航切换
    document.getElementById("btn-start-match").addEventListener("click", () => this.startMatchDraftFlow());
    document.getElementById("btn-open-gacha").addEventListener("click", () => this.switchScreen("screen-gacha"));
    document.getElementById("btn-open-shop").addEventListener("click", () => this.switchScreen("screen-shop"));
    document.getElementById("btn-open-codex").addEventListener("click", () => this.switchScreen("screen-codex"));

    document.querySelectorAll(".btn-back").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (this.pendingPulls.length > 0) this.confirmPendingDupes();
        this.switchScreen(btn.dataset.target);
      });
    });

    // 抽卡按钮
    document.getElementById("btn-pull-1").addEventListener("click", () => this.executeGachaPull(1));
    document.getElementById("btn-pull-10").addEventListener("click", () => this.executeGachaPull(10));

    document.getElementById("btn-all-upgrade").addEventListener("click", () => {
      this.pendingPulls.forEach((p) => {
        if (p.isDupe && p.item.poolType !== "hero") p.chosenAction = "upgrade";
      });
      this.store.save();
      this.renderGachaStage();
    });

    document.getElementById("btn-all-convert").addEventListener("click", () => {
      this.pendingPulls.forEach((p) => {
        if (p.isDupe) p.chosenAction = "convert";
      });
      this.store.save();
      this.renderGachaStage();
    });

    document.getElementById("btn-confirm-gacha").addEventListener("click", () => this.confirmPendingDupes());

    // 战斗内控制栏
    const autoBtn = document.getElementById("btn-toggle-auto");
    autoBtn.addEventListener("click", () => {
      this.store.state.autoBattle = !this.store.state.autoBattle;
      this.store.save();
      autoBtn.classList.toggle("active", this.store.state.autoBattle);
      this.applySettings();
    });

    document.getElementById("btn-quick-rematch").addEventListener("click", () => this.startMatchDraftFlow());
    document.getElementById("btn-skip-finale").addEventListener("click", () => this.engine.finale?.complete(true));
    document.getElementById("battle-speed").addEventListener("change", (event) => this.engine.setSpeed(event.target.value));
    document.getElementById("btn-pause").addEventListener("click", () => this.engine.setPaused(!this.engine.paused));
    document.getElementById("btn-battle-lobby").addEventListener("click", () => this.switchScreen("screen-lobby"));
    document.getElementById("qte-counter-btn").addEventListener("click", () => this.engine.triggerManualQTE());
    document.getElementById("ultimate-dodge-btn").addEventListener("click", () => this.engine.triggerUltimateDodge());
    document.getElementById("ultimate-dodge-fallback").addEventListener("click", () => this.engine.triggerUltimateDodge());
    document.getElementById("ultimate-counter-btn").addEventListener("click", () => this.engine.triggerUltimateCounter());
    document.getElementById("ultimate-counter-fallback").addEventListener("click", () => this.engine.triggerUltimateCounter());

    // 战后结算跳转
    document.getElementById("btn-res-gacha").addEventListener("click", () => {
      document.getElementById("result-overlay").classList.add("hidden");
      this.switchScreen("screen-gacha");
    });
    document.getElementById("btn-res-again").addEventListener("click", () => {
      document.getElementById("result-overlay").classList.add("hidden");
      this.startMatchDraftFlow();
    });

    // 后台300秒长局平衡模拟器
    const runSim = async () => {
      if (this.simulating) return;
      this.simulating = true;
      const buttons = [document.getElementById("btn-run-sim"), document.getElementById("btn-run-sim-dialog")];
      buttons.forEach((button) => { button.disabled = true; });
      const txtEl = document.getElementById("sim-result-text");
      const detail = document.getElementById("simulation-report");
      try {
        const report = await this.engine.runHeadlessSimulation(Number(document.getElementById("sim-matches").value), {
          seed: Number(document.getElementById("sim-seed").value),
          mode: this.store.state.matchMode,
          onProgress: (done, total) => { detail.textContent = txtEl.textContent = `模拟中 ${done}/${total} 局…`; }
        });
        this.lastSimulation = report;
        txtEl.textContent = `${report.matches}局：胜率${report.winRate}% · 平均${report.meanDuration}秒 · 超时${report.timeoutRate}%`;
        const rows = (group, labels) => Object.entries(group).map(([key, row]) => `<tr><td>${labels[key]?.name || key}</td><td>${row.matches}</td><td>${(row.wins / row.matches * 100).toFixed(1)}%</td><td>${(row.duration / row.matches).toFixed(1)}秒</td><td>${(row.timeouts / row.matches * 100).toFixed(1)}%</td></tr>`).join("");
        const phases = Object.entries(report.byFinishPhase).map(([phase, count]) => `${this.engine.getPhaseLabel(phase)} ${count}局`).join(" · ");
        detail.innerHTML = `<p>${window.GAME_CONFIG.modes[report.mode].name} · 种子 ${report.seed} · ${report.matches}局：${report.p1Wins}胜 / ${report.p2Wins}负 / ${report.draws}平</p><p>胜率 ${report.winRate}% · 平均 ${report.meanDuration}秒 · 超时 ${report.timeoutRate}%</p><p>${phases}</p><p>读取当前配装与解锁池，双方自动施法；小样本分组仅供观察。</p><table><thead><tr><th>角色 / 流派UP / 技能均级</th><th>局数</th><th>胜率</th><th>均时</th><th>超时</th></tr></thead><tbody>${rows(report.byHero, window.MEME_DATA.heroes)}${rows(report.byArchetype, window.MEME_DATA.archetypes)}${rows(report.bySkillLevel, {})}</tbody></table>`;
      } catch (error) {
        detail.textContent = txtEl.textContent = `模拟失败：${error.message}`;
      } finally {
        this.simulating = false;
        buttons.forEach((button) => { button.disabled = false; });
      }
    };
    document.getElementById("btn-run-sim").addEventListener("click", runSim);
    document.getElementById("btn-run-sim-dialog").addEventListener("click", runSim);
    document.getElementById("btn-open-simulation").addEventListener("click", () => document.getElementById("simulation-dialog").showModal());
    document.getElementById("btn-close-simulation").addEventListener("click", () => document.getElementById("simulation-dialog").close());

    document.getElementById("btn-director").addEventListener("click", () => this.toggleDirectorPanel());
    document.getElementById("btn-close-director").addEventListener("click", () => this.toggleDirectorPanel(false));
    document.querySelectorAll("[data-director-script]").forEach((button) => {
      button.addEventListener("click", () => this.runDirectorScript(button.dataset.directorScript));
    });
    document.querySelectorAll("[data-scenario-preset]").forEach((button) => {
      button.addEventListener("click", () => {
        const preset = window.SCENARIO_PRESETS[button.dataset.scenarioPreset];
        const editor = document.getElementById("scenario-editor");
        editor.value = Array.isArray(preset) && preset.length === 0 ? "" : JSON.stringify(preset, null, 2);
        if (button.dataset.scenarioPreset === "custom") this.clearScenario();
        else this.loadScenario();
      });
    });
    document.getElementById("btn-scenario-load").addEventListener("click", () => this.loadScenario());
    document.getElementById("btn-scenario-clear").addEventListener("click", () => this.clearScenario());
    document.getElementById("btn-scenario-play").addEventListener("click", () => {
      if (!this.loadScenario()) return;
      document.body.classList.add("pure-record-mode");
      this.toggleDirectorPanel(false);
      this.startMatchDraftFlow();
    });
    document.getElementById("btn-scenario-import").addEventListener("click", () => document.getElementById("scenario-file").click());
    document.getElementById("scenario-file").addEventListener("change", async (event) => {
      const file = event.target.files[0];
      event.target.value = "";
      if (!file) return;
      try {
        this.loadScenario(await file.text());
      } catch (error) {
        this.setScenarioStatus(`无法读取剧本文件：${error.message}`, true);
      }
    });
    document.getElementById("btn-scenario-export").addEventListener("click", () => this.exportScenario());

    // 导演录屏作弊快捷键与点击按钮共用剧情逻辑。
    window.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || e.target.closest("input,select,textarea,dialog")) return;
      const k = e.key.toLowerCase();
      if (k === "p") {
        document.body.classList.toggle("pure-record-mode");
        this.toggleDirectorPanel(false);
      } else if (k === "h" && !document.body.classList.contains("pure-record-mode")) {
        this.toggleDirectorPanel();
      } else if (k === "escape") {
        this.toggleDirectorPanel(false);
      } else if (e.code === "Space" && this.engine.running) {
        e.preventDefault();
        if (this.engine.pendingUltimate && !this.engine.paused) this.engine.triggerUltimateCounter();
        else this.engine.setPaused(!this.engine.paused);
      } else if (k === "d" && this.engine.running) {
        // 手动技术流：D 键等同于最后一瞬究极闪避
        this.engine.triggerUltimateDodge();
      } else if (k === "f" && this.engine.running) {
        e.preventDefault();
        this.engine.triggerManualQTE();
      } else if (["1", "2", "3", "4", "5"].includes(k) && this.engine.running) {
        const idx = Number(k) - 1;
        this.engine.castActiveSlot(this.engine.p1, this.engine.p2, idx, true, false);
      } else if (["q", "w", "e", "r", "t"].includes(k)) {
        this.runDirectorScript(k);
      } else if (k === "b") {
        runSim();
      }
    });
  }
}

window.addEventListener("DOMContentLoaded", () => {
  window.appUI = new AppController();
  const params = new URLSearchParams(window.location.search);
  const shot = params.get("shot");
  if (shot) {
    document.body.classList.add("pure-record-mode");
    if (shot === "gacha") {
      window.appUI.switchScreen("screen-gacha");
      window.appUI.executeGachaPull(10);
    } else if (shot === "shop") {
      window.appUI.switchScreen("screen-shop");
    } else if (shot === "codex") {
      window.appUI.switchScreen("screen-codex");
    } else if (shot === "draft1") {
      const activePerks = window.MEME_DATA.perks.filter((p) => p.type === "active").slice(0, 3);
      window.appUI.engine.startMatch("dayun", activePerks);
      window.appUI.engine.setPaused(true);
      window.appUI.startMatchDraftFlow();
      clearInterval(window.appUI.draftTimerId);
    } else if (shot === "draft2") {
      const activePerks = window.MEME_DATA.perks.filter((p) => p.type === "active").slice(0, 3);
      window.appUI.engine.startMatch("dayun", activePerks);
      window.appUI.engine.setPaused(true);
      window.appUI.switchScreen("screen-battle");
      document.getElementById("draft-overlay").classList.remove("hidden");
      window.appUI.startPerk5Pick3Flow("dayun");
      clearInterval(window.appUI.draftTimerId);
    } else if (shot === "battle") {
      window.appUI.switchScreen("screen-battle");
      const activePerks = window.MEME_DATA.perks.filter((p) => p.type === "active").slice(0, 3);
      window.appUI.engine.startMatch("dayun", activePerks);
      window.appUI.engine.castActiveSlot(window.appUI.engine.p1, window.appUI.engine.p2, 0, true, false);
      window.appUI.engine.castActiveSlot(window.appUI.engine.p1, window.appUI.engine.p2, 1, true, false);
      document.getElementById("qte-counter-btn").classList.remove("hidden");
      window.appUI.engine.update(0.15, false);
      window.appUI.engine.draw();
    } else if (shot === "sys1") {
      // 系统1专用：保底商城购买升级后的高积分状态
      window.appUI.store.state.level = 8;
      window.appUI.store.state.pityCoins = 680;
      window.appUI.store.state.tickets = 95;
      window.appUI.store.state.unlockedHeroes["laoda"] = true;
      window.appUI.refreshTopBar();
      window.appUI.switchScreen("screen-shop");
      document.getElementById("shop-list").scrollTop = 180;
    } else if (shot === "sys2") {
      // 系统2专用：全明星混池完成20连抽并触发重复卡智能升级面板
      window.appUI.store.state.level = 12;
      window.appUI.store.state.tickets = 160;
      window.appUI.switchScreen("screen-gacha");
      window.appUI.executeGachaPull(10);
      window.appUI.executeGachaPull(10);
    } else if (shot === "sys3") {
      // 系统3专用：战后胜利结算与升级奖励系统界面
      window.appUI.switchScreen("screen-battle");
      const activePerks = window.MEME_DATA.perks.filter((p) => p.type === "active").slice(0, 3);
      window.appUI.engine.startMatch("hajimi", activePerks);
      window.appUI.engine.p2.hp = 0;
      window.appUI.engine.manualPerfectCount = 3;
      window.appUI.engine.finishMatch();
    }
  }
});
