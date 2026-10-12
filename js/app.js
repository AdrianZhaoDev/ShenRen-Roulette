// 全局 UI 控制器：大厅配装、全明星混池抽卡、重复卡智能分流、保底商店、开局3秒抽人+5秒词条5选3、录屏导演快捷键

class AppController {
  constructor() {
    this.store = window.gameStore;
    this.canvas = document.getElementById("battle-canvas");
    this.engine = new window.BattleEngine(this.canvas);
    this.pendingPulls = [];
    this.draftTimerId = null;

    this.bindEvents();
    this.refreshTopBar();
    this.renderLobby();
  }

  switchScreen(screenId) {
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
    const redDot = document.getElementById("gacha-red-dot");
    if (redDot) {
      redDot.textContent = st.tickets >= 10 ? `可抽${Math.floor(st.tickets / 10)}十连!` : "狂送十连!";
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
      const tab = document.createElement("div");
      tab.className = `hero-tab ${st.selectedHeroPreview === h.id ? "active" : ""} ${unlocked ? "" : "locked"}`;
      tab.innerHTML = `
        ${unlocked ? "" : '<span class="lock-badge">未抽到</span>'}
        <div class="tab-avatar">${h.emoji}</div>
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
        <div class="hero-big-icon" style="background:${curHero.color}">${curHero.emoji}</div>
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
          <span>⚔️ 自选普通主动技 (3选1装备 · 抽重卡可翻倍伤害特效)</span>
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

    if (this.store.state.tickets < count) {
      // 既然设计是激进狂送抽卡，券不够时直接免费补发20抽助兴！
      this.store.state.tickets += 20;
    }
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
          const upgDesc = it.poolType === "perk" ? "升级(+刷出率)" : "升级(特效翻倍)";
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
        if (this.store.state.pityCoins < it.pityPrice) return;
        this.store.state.pityCoins -= it.pityPrice;
        if (!owned) {
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
    clearInterval(this.draftTimerId);
    this.switchScreen("screen-battle");
    document.getElementById("result-overlay").classList.add("hidden");

    const draftEl = document.getElementById("draft-overlay");
    draftEl.classList.remove("hidden");

    const allHeroes = Object.values(window.MEME_DATA.heroes);
    const unlockedIds = allHeroes.filter((h) => this.store.state.unlockedHeroes[h.id]).map((h) => h.id);
    const poolIds = unlockedIds.length > 0 ? unlockedIds : ["dayun", "hajimi"];

    let activeHeroId = poolIds[Math.floor(Math.random() * poolIds.length)];
    let timeLeft = 2.6;

    const renderStep1 = () => {
      const cardsHtml = allHeroes
        .map((h) => {
          const isUnlocked = poolIds.includes(h.id);
          return `
            <div class="roulette-card ${activeHeroId === h.id ? "highlight" : ""}" data-hid="${h.id}" style="opacity:${isUnlocked ? 1 : 0.4}">
              <div style="font-size:36px">${h.emoji}</div>
              <div style="font-size:14px;font-weight:900;margin-top:4px">${h.name}</div>
              <div style="font-size:10px;color:#9499b3">${isUnlocked ? "点击立即锁定" : "未解锁"}</div>
            </div>
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
        renderStep1();
      }
    }, 250);
  }

  // 阶段 B：词条 5 选 3（每局先随机一个流派权重，帮助稳定成型）
  startPerk5Pick3Flow(chosenHeroId) {
    clearInterval(this.draftTimerId);
    const draftEl = document.getElementById("draft-overlay");
    const draftRoll = this.store.rollFivePerksForDraft(this.store.state.preferredArchetype === "all" ? null : this.store.state.preferredArchetype);
    const focusArch = draftRoll.focusArch;
    const fivePerks = draftRoll.perks;
    const selectedIds = new Set();
    let timeLeft = 4.5;

    const finalizeAndFight = () => {
      clearInterval(this.draftTimerId);
      // 不足3个则自动随机补满3个
      for (const pk of fivePerks) {
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
            <div class="perk-draft-item ${isSel ? "selected" : ""} rarity-${pk.rarity}" data-pid="${pk.id}">
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
            </div>
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
          if (selectedIds.size === 3) {
            finalizeAndFight();
          } else {
            renderStep2();
          }
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
      this.renderGachaStage();
    });

    document.getElementById("btn-all-convert").addEventListener("click", () => {
      this.pendingPulls.forEach((p) => {
        if (p.isDupe) p.chosenAction = "convert";
      });
      this.renderGachaStage();
    });

    document.getElementById("btn-confirm-gacha").addEventListener("click", () => this.confirmPendingDupes());

    // 战斗内控制栏
    const autoBtn = document.getElementById("btn-toggle-auto");
    autoBtn.addEventListener("click", () => {
      this.store.state.autoBattle = !this.store.state.autoBattle;
      this.store.save();
      autoBtn.classList.toggle("active", this.store.state.autoBattle);
      autoBtn.innerHTML = `🤖 自动释放: <strong>${this.store.state.autoBattle ? "开启" : "关闭(纯手操)"}</strong> (手点可抢先抓贴脸时机!)`;
    });

    document.getElementById("btn-quick-rematch").addEventListener("click", () => this.startMatchDraftFlow());
    document.getElementById("qte-counter-btn").addEventListener("click", () => this.engine.triggerManualQTE());
    document.getElementById("ultimate-dodge-btn").addEventListener("click", () => this.engine.triggerUltimateDodge());
    document.getElementById("ultimate-dodge-fallback").addEventListener("click", () => this.engine.triggerUltimateDodge());

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
    const runSim = () => {
      const report = this.engine.runHeadlessSimulation(200);
      const txtEl = document.getElementById("sim-result-text");
      txtEl.innerHTML = `✅ 已完成 <strong>${report.matches}</strong> 局全随机纯自动长局对战：<br/>我方胜率：<strong style="color:#00ff88;font-size:14px">${report.winRate}%</strong> (${report.p1Wins}胜 / ${report.matches - report.p1Wins}负) — 目标区间 40%~60%！`;
    };
    document.getElementById("btn-run-sim").addEventListener("click", runSim);

    // 导演录屏作弊快捷键
    window.addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();
      if (k === "p") {
        document.body.classList.toggle("pure-record-mode");
      } else if (e.code === "Space" && this.engine.running) {
        e.preventDefault();
        this.engine.paused = !this.engine.paused;
      } else if (k === "d" && this.engine.running) {
        // 手动技术流：D 键等同于最后一瞬究极闪避
        this.engine.triggerUltimateDodge();
      } else if (["1", "2", "3", "4", "5"].includes(k) && this.engine.running) {
        const idx = Number(k) - 1;
        this.engine.castActiveSlot(this.engine.p1, this.engine.p2, idx, true, false);
      } else if (k === "q" && this.engine.running) {
        // 剧本：我方锁1滴血绝境翻盘
        this.engine.p1.hp = 1;
        this.engine.p1.immortalTimer = 3.5;
        this.engine.p1.activeSlots.forEach((s) => (s.cdLeft = 0));
        this.engine.spawnText("🎬剧本：1滴血锁血+全技能就绪!!", this.engine.p1.x, this.engine.p1.y - 50, "#ffe600", 24);
      } else if (k === "w" && this.engine.running) {
        // 剧本：敌方变1滴血待斩杀
        this.engine.p2.hp = 1;
        this.engine.spawnText("🎬剧本：对手破防仅剩1滴血!!", this.engine.p2.x, this.engine.p2.y - 50, "#ff2a54", 24);
      } else if (k === "e" && this.engine.running) {
        // 剧本：强制双方贴脸碰撞
        const cx = this.engine.arena.x + this.engine.arena.w / 2;
        const cy = this.engine.arena.y + this.engine.arena.h / 2;
        this.engine.p1.x = cx - 35;
        this.engine.p1.y = cy;
        this.engine.p2.x = cx + 35;
        this.engine.p2.y = cy;
      } else if (k === "r" && this.engine.running) {
        // 剧本：召唤全屏大运冲撞
        this.engine.castActiveSlot(this.engine.p1, this.engine.p2, 0, true, false);
        for (let i = 0; i < 4; i++) {
          this.engine.truckHazards.push({
            owner: this.engine.p1,
            x: this.engine.arena.x - 40 - i * 90,
            y: this.engine.arena.y + 100 + i * 130,
            vx: 720,
            w: 110,
            h: 54,
            dmg: 140,
            hitDone: false
          });
        }
        this.engine.spawnText("🚛 导演指令：百吨王车队进场!!", cxOrMid(this.engine), 240, "#ffe600", 26);
      } else if (k === "t") {
        this.store.state.tickets += 50;
        this.store.state.pityCoins += 500;
        this.store.save();
        this.refreshTopBar();
      } else if (k === "b") {
        runSim();
      }
    });
  }
}

function cxOrMid(engine) {
  return engine.width / 2;
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
      window.appUI.engine.paused = true;
      window.appUI.startMatchDraftFlow();
      clearInterval(window.appUI.draftTimerId);
    } else if (shot === "draft2") {
      const activePerks = window.MEME_DATA.perks.filter((p) => p.type === "active").slice(0, 3);
      window.appUI.engine.startMatch("dayun", activePerks);
      window.appUI.engine.paused = true;
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
