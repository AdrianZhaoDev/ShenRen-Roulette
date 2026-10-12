// 核心配置文件：4大缝合梗角色、专属技能池（2固定被动+1自选普通主动+1自选究极技[含主动/被动]）、16个通用词条、全明星大混池与存档

window.MEME_DATA = {
  // 4大首发抽象梗角色
  heroes: {
    dayun: {
      id: "dayun",
      name: "大运百吨王",
      title: "异世界转生专列 · 泥头车神",
      emoji: "🚛",
      color: "#ff3b30",
      accent: "#ffe600",
      imagePath: "assets/images/dayun.png",
      unlockedDefault: true,
      rarity: "SSR",
      pityPrice: 120,
      // 2个固定核心被动
      corePassives: [
        { id: "dy_p1", name: "百吨惯性", desc: "碰墙反弹后移速+25%，下次撞击附带45点泥头车碾压伤害" },
        { id: "dy_p2", name: "强制转生", desc: "自身每损失20%生命，体积膨胀10%且撞击震屏翻倍" }
      ],
      // 普通主动技池（上场自选装备1个）
      normalSkills: [
        {
          id: "dy_s1",
          name: "远光灯致盲",
          rarity: "SR",
          unlockedDefault: true,
          cooldown: 4.2,
          type: "active",
          effectKind: "beam_flash",
          baseDamage: 95,
          desc: "爆闪远光灯直射对手，造成伤害并使其短暂反向乱弹",
          shout: "远光灯警告!!"
        },
        {
          id: "dy_s2",
          name: "氮气漂移甩尾",
          rarity: "SSR",
          unlockedDefault: false,
          pityPrice: 90,
          cooldown: 3.8,
          type: "active",
          effectKind: "dash_ram",
          baseDamage: 125,
          desc: "瞬间朝敌人方向暴力冲刺撞击，贴脸释放伤害+40%",
          shout: "排水沟过弯!!"
        },
        {
          id: "dy_s3",
          name: "连环撒钉轮胎",
          rarity: "SSR",
          unlockedDefault: false,
          pityPrice: 90,
          cooldown: 4.5,
          type: "active",
          effectKind: "proj_burst",
          baseDamage: 110,
          desc: "向四周狂甩4个燃烧备胎弹幕，触碰爆炸",
          shout: "备胎全飞啦!!"
        }
      ],
      // 究极技能池（大招：可是主动，也可是被动，上场自选1个）
      ultSkills: [
        {
          id: "dy_u1",
          name: "异世界送货专列",
          rarity: "UR",
          unlockedDefault: true,
          cooldown: 8.5,
          type: "active",
          effectKind: "ult_truck_stampede",
          baseDamage: 210,
          pityPrice: 200,
          desc: "【主动大招】召唤3辆百吨王横穿全屏碾压，满屏喇叭炸麦！",
          shout: "全员准备转生!!"
        },
        {
          id: "dy_u2",
          name: "不死泥头装甲",
          rarity: "UR",
          unlockedDefault: false,
          type: "passive",
          effectKind: "ult_passive_juggernaut",
          baseDamage: 160,
          pityPrice: 220,
          desc: "【被动大招】无需按键！每4秒自动爆发出环形尾气冲击波并回血80点",
          shout: "全自动百吨装甲!!"
        }
      ]
    },

    hajimi: {
      id: "hajimi",
      name: "哈基米耄耋",
      title: "急急急豪猫 · 破防哈气王",
      emoji: "😾",
      color: "#ff9500",
      accent: "#00f0ff",
      imagePath: "assets/images/hajimi.png",
      unlockedDefault: true,
      rarity: "SSR",
      pityPrice: 120,
      corePassives: [
        { id: "hj_p1", name: "应激哈气", desc: "受到撞击时35%概率触发哈气反震，反弹55点真实伤害" },
        { id: "hj_p2", name: "九命猫薄荷", desc: "生命首次低于30%时瞬间回复180血并进入3秒红温狂暴" }
      ],
      normalSkills: [
        {
          id: "hj_s1",
          name: "高频喵喵拳",
          rarity: "SR",
          unlockedDefault: true,
          cooldown: 3.4,
          type: "active",
          effectKind: "melee_flurry",
          baseDamage: 90,
          desc: "向周围疯狂挥出残影猫爪，距离越近连击越高",
          shout: "阿巴阿巴喵拳!!"
        },
        {
          id: "hj_s2",
          name: "飞天猫砂盆",
          rarity: "SSR",
          unlockedDefault: false,
          pityPrice: 90,
          cooldown: 4.0,
          type: "active",
          effectKind: "proj_burst",
          baseDamage: 115,
          desc: "投掷旋转猫砂盆追踪对手，命中附加减速毒雾",
          shout: "吃我满盆猫砂!!"
        },
        {
          id: "hj_s3",
          name: "咕咕嘎嘎音波",
          rarity: "SSR",
          unlockedDefault: false,
          pityPrice: 90,
          cooldown: 4.2,
          type: "active",
          effectKind: "sonic_ring",
          baseDamage: 108,
          desc: "释放全屏扩散哈气声波，震飞对手并削减其护盾",
          shout: "哈——气——!!"
        }
      ],
      ultSkills: [
        {
          id: "hj_u1",
          name: "耄耋红温大暴走",
          rarity: "UR",
          unlockedDefault: true,
          cooldown: 8.2,
          type: "active",
          effectKind: "ult_cat_frenzy",
          baseDamage: 205,
          pityPrice: 200,
          desc: "【主动大招】化身巨型红温豪猫全屏瞬移连抓5次，附带撕裂流血",
          shout: "彻底疯狂哈基米!!"
        },
        {
          id: "hj_u2",
          name: "赛博逗猫棒领域",
          rarity: "UR",
          unlockedDefault: false,
          type: "passive",
          effectKind: "ult_passive_laser",
          baseDamage: 155,
          pityPrice: 220,
          desc: "【被动大招】无需按键！场上持续生成红外线激光点，每秒灼烧对手",
          shout: "红点锁定你了!!"
        }
      ]
    },

    laoda: {
      id: "laoda",
      name: "肘击王牢大",
      title: "曼巴直升机 · 冰红茶战神",
      emoji: "🚁",
      color: "#b829ff",
      accent: "#ffe600",
      imagePath: "assets/images/laoda.png",
      unlockedDefault: false,
      rarity: "SSR",
      pityPrice: 140,
      corePassives: [
        { id: "ld_p1", name: "凌晨四点半", desc: "开局前8秒暴击率提升30%，每次暴击飘出巨型『孩子们！』" },
        { id: "ld_p2", name: "曼巴铁肘", desc: "两球直接碰撞时，额外追加65点无视防御的肘击伤害" }
      ],
      normalSkills: [
        {
          id: "ld_s1",
          name: "暴风闪光肘",
          rarity: "SR",
          unlockedDefault: true,
          cooldown: 3.6,
          type: "active",
          effectKind: "dash_ram",
          baseDamage: 105,
          desc: "高速突进一记重肘，若在贴脸距离施放必定暴击",
          shout: "看我这一肘!!"
        },
        {
          id: "ld_s2",
          name: "热带冰红茶喷射",
          rarity: "SSR",
          unlockedDefault: false,
          pityPrice: 90,
          cooldown: 4.1,
          type: "active",
          effectKind: "heal_splash",
          baseDamage: 95,
          desc: "畅饮冰红茶回复110生命，并向对手泼洒高糖粘液",
          shout: "真好喝啊孩子们!!"
        },
        {
          id: "ld_s3",
          name: "后仰跳投三分雨",
          rarity: "SSR",
          unlockedDefault: false,
          pityPrice: 90,
          cooldown: 4.3,
          type: "active",
          effectKind: "proj_burst",
          baseDamage: 120,
          desc: "后撤拉开距离并连射3颗燃烧篮球弹幕",
          shout: "美如画后仰!!"
        }
      ],
      ultSkills: [
        {
          id: "ld_u1",
          name: "天降曼巴直升机",
          rarity: "UR",
          unlockedDefault: true,
          cooldown: 8.6,
          type: "active",
          effectKind: "ult_heli_crash",
          baseDamage: 220,
          pityPrice: 220,
          desc: "【主动大招】召唤螺旋桨风暴席卷全屏，把对手吸到中心疯狂肘击！",
          shout: "孩子们我回来了!!"
        },
        {
          id: "ld_u2",
          name: "永不言弃黑曼巴",
          rarity: "UR",
          unlockedDefault: false,
          type: "passive",
          effectKind: "ult_passive_mamba",
          baseDamage: 170,
          pityPrice: 220,
          desc: "【被动大招】无需按键！血量越低攻速与反弹速度越快，且每3秒自动肘击一次",
          shout: "曼巴永不熄火!!"
        }
      ]
    },

    kunge: {
      id: "kunge",
      name: "练习生坤哥",
      title: "两年半宗师 · 铁山靠篮球帝",
      emoji: "🏀",
      color: "#00d4ff",
      accent: "#ff2a54",
      imagePath: "assets/images/kunge.png",
      unlockedDefault: false,
      rarity: "SSR",
      pityPrice: 140,
      corePassives: [
        { id: "kg_p1", name: "两年半内功", desc: "每释放一次技能，叠加1层唱跳Rap充能，满3层炸裂全屏羽毛" },
        { id: "kg_p2", name: "背带裤护体", desc: "受到超过120点的重击时，自动减免35%并反弹一颗篮球" }
      ],
      normalSkills: [
        {
          id: "kg_s1",
          name: "夺命铁山靠",
          rarity: "SR",
          unlockedDefault: true,
          cooldown: 3.5,
          type: "active",
          effectKind: "dash_ram",
          baseDamage: 100,
          desc: "用肩膀猛烈顶飞对手，造成击退与高额震屏",
          shout: "铁山靠顶飞!!"
        },
        {
          id: "kg_s2",
          name: "坤山劈地篮球",
          rarity: "SSR",
          unlockedDefault: false,
          pityPrice: 90,
          cooldown: 4.0,
          type: "active",
          effectKind: "proj_burst",
          baseDamage: 118,
          desc: "发射在场地内高速弹跳5次的巨型火焰篮球",
          shout: "看我运球如风!!"
        },
        {
          id: "kg_s3",
          name: "只因你太美高音",
          rarity: "SSR",
          unlockedDefault: false,
          pityPrice: 90,
          cooldown: 4.2,
          type: "active",
          effectKind: "sonic_ring",
          baseDamage: 112,
          desc: "发出魔音贯耳冲击波，全屏飘满『你干嘛~哎哟』",
          shout: "你干嘛~哎哟!!"
        }
      ],
      ultSkills: [
        {
          id: "kg_u1",
          name: "万凰朝宗篮球雨",
          rarity: "UR",
          unlockedDefault: true,
          cooldown: 8.4,
          type: "active",
          effectKind: "ult_basketball_rain",
          baseDamage: 215,
          pityPrice: 220,
          desc: "【主动大招】全场黑屏灯光秀，漫天背带篮球无差别轰炸！",
          shout: "唱跳RAP终极奥义!!"
        },
        {
          id: "kg_u2",
          name: "中分头引力场",
          rarity: "UR",
          unlockedDefault: false,
          type: "passive",
          effectKind: "ult_passive_orbit",
          baseDamage: 165,
          pityPrice: 220,
          desc: "【被动大招】无需按键！3颗高速旋转篮球常驻环绕周身，触碰即炸",
          shout: "护体篮球全开!!"
        }
      ]
    }
  },

  // 16个通用词条池（开局刷5选3；抽卡升级仅提升刷出权重，不涨数值破坏平衡）
  perks: [
    // R 级词条 (6个)
    { id: "pk_r1", name: "老式DVD加速", rarity: "R", type: "passive", unlockedDefault: true, cooldown: 0, desc: "【被动】基础弹跳移速+30%，碰墙火花特效翻倍", shout: "DVD狂飙!" },
    { id: "pk_r2", name: "弹簧肉垫", rarity: "R", type: "passive", unlockedDefault: true, cooldown: 0, desc: "【被动】每次碰到墙壁回复25点生命值", shout: "摸墙回口血!" },
    { id: "pk_r3", name: "急眼红温", rarity: "R", type: "passive", unlockedDefault: true, cooldown: 0, desc: "【被动】血量低于50%时体型变大25%且碰撞伤害+25%", shout: "开始红温了!" },
    { id: "pk_r4", name: "随手甩拖鞋", rarity: "R", type: "active", unlockedDefault: true, cooldown: 4.2, baseDamage: 75, desc: "【主动】朝对手扔出一只穿模人字拖，附带短暂顿帧", shout: "吃我一拖鞋!" },
    { id: "pk_r5", name: "喝口肥宅水", rarity: "R", type: "active", unlockedDefault: true, cooldown: 5.5, baseDamage: 0, heal: 115, desc: "【主动】吨吨吨猛炫快乐水，立即恢复115点生命", shout: "肥宅水续命!" },
    { id: "pk_r6", name: "反伤刺猬壳", rarity: "R", type: "passive", unlockedDefault: true, cooldown: 0, desc: "【被动】受到任何技能伤害时，反弹22%给对手", shout: "反弹无效化!" },

    // SR 级词条 (6个)
    { id: "pk_sr1", name: "高压电摇嘲讽", rarity: "SR", type: "active", unlockedDefault: true, cooldown: 4.5, baseDamage: 95, pityPrice: 60, desc: "【主动】鬼畜电摇释放环形电网，麻痹并电击对手", shout: "精神电摇攻击!!" },
    { id: "pk_sr2", name: "尊嘟假嘟分身", rarity: "SR", type: "active", unlockedDefault: true, cooldown: 5.0, baseDamage: 100, pityPrice: 60, desc: "【主动】炸出2个残影假球冲撞对手，真假难辨", shout: "尊嘟假嘟?!" },
    { id: "pk_sr3", name: "功德木鱼敲击", rarity: "SR", type: "passive", unlockedDefault: false, cooldown: 0, pityPrice: 60, desc: "【被动】每次命中飘出『功德+1』，每满4次触发一道佛光天雷(85伤)", shout: "功德暴击+999!!" },
    { id: "pk_sr4", name: "大肠包小肠毒雾", rarity: "SR", type: "active", unlockedDefault: false, cooldown: 4.8, baseDamage: 105, pityPrice: 60, desc: "【主动】在脚下铺设九转大肠生化区，踩中持续狂掉血", shout: "原汁原味九转!!" },
    { id: "pk_sr5", name: "吸血资本家", rarity: "SR", type: "passive", unlockedDefault: false, cooldown: 0, pityPrice: 60, desc: "【被动】造成的所有碰撞与技能伤害，28%转化为自身生命", shout: "疯狂吸血中!!" },
    { id: "pk_sr6", name: "香蕉皮溜冰场", rarity: "SR", type: "active", unlockedDefault: false, cooldown: 4.4, baseDamage: 92, pityPrice: 60, desc: "【主动】全场撒满香蕉皮，使对手失控高速乱撞墙壁", shout: "脚底抹油咯!!" },

    // UR 逆天彩色神级词条 (4个，超低爆率、满屏特效)
    { id: "pk_ur1", name: "滚筒洗衣机领域", rarity: "UR", type: "active", unlockedDefault: false, cooldown: 7.0, baseDamage: 155, pityPrice: 180, desc: "【彩色主动】整个竞技场疯狂旋转3秒，双方被甩向中心疯狂互撞！", shout: "全自动滚筒模式!!" },
    { id: "pk_ur2", name: "砸瓦鲁多·时停", rarity: "UR", type: "active", unlockedDefault: false, cooldown: 7.8, baseDamage: 165, pityPrice: 180, desc: "【彩色主动】画面反色冻结对手1.8秒，期间我方伤害必定暴击！", shout: "时间停止吧!!" },
    { id: "pk_ur3", name: "拼夕夕99.99%免死", rarity: "UR", type: "passive", unlockedDefault: false, cooldown: 0, pityPrice: 180, desc: "【彩色被动】致命一击时强制锁1滴血2.2秒，并弹出『还差0.01刀』全屏反炸！", shout: "请好友帮砍一刀!!" },
    { id: "pk_ur4", name: "全屏弹幕护体", rarity: "UR", type: "active", unlockedDefault: false, cooldown: 6.8, baseDamage: 160, pityPrice: 180, desc: "【彩色主动】召唤满屏彩色高能梗弹幕横扫场地，视觉统治力拉满！", shout: "前方高能弹幕护体!!" }
  ]
};

// 存档管理与全明星大混池逻辑
class GameStore {
  constructor() {
    this.storageKey = "MEME_BRAWL_SAVE_V1";
    this.state = this.load();
  }

  getDefaultState() {
    const unlockedHeroes = {};
    const equippedNormal = {};
    const equippedUlt = {};
    const skillLevels = {};
    const unlockedSkills = {};

    Object.values(window.MEME_DATA.heroes).forEach((h) => {
      unlockedHeroes[h.id] = !!h.unlockedDefault;
      h.normalSkills.forEach((s) => {
        unlockedSkills[s.id] = !!s.unlockedDefault;
        skillLevels[s.id] = 1;
        if (s.unlockedDefault && !equippedNormal[h.id]) equippedNormal[h.id] = s.id;
      });
      h.ultSkills.forEach((u) => {
        unlockedSkills[u.id] = !!u.unlockedDefault;
        skillLevels[u.id] = 1;
        if (u.unlockedDefault && !equippedUlt[h.id]) equippedUlt[h.id] = u.id;
      });
    });

    const unlockedPerks = {};
    const perkLevels = {};
    window.MEME_DATA.perks.forEach((p) => {
      unlockedPerks[p.id] = !!p.unlockedDefault;
      perkLevels[p.id] = 1;
    });

    return {
      level: 1,
      exp: 20,
      tickets: 30, // 开局直接送30抽爽抽
      pityCoins: 100,
      selectedHeroPreview: "dayun",
      unlockedHeroes,
      unlockedSkills,
      skillLevels,
      equippedNormal,
      equippedUlt,
      unlockedPerks,
      perkLevels,
      autoBattle: true
    };
  }

  load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return this.getDefaultState();
      const parsed = JSON.parse(raw);
      return Object.assign(this.getDefaultState(), parsed);
    } catch (e) {
      return this.getDefaultState();
    }
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (e) {}
  }

  // 构建全明星大混池的所有可抽条目
  getAllPoolItems() {
    const items = [];
    // 1. 通用词条 (R / SR / UR)
    window.MEME_DATA.perks.forEach((p) => {
      items.push({
        poolType: "perk",
        id: p.id,
        name: p.name,
        rarity: p.rarity,
        subLabel: p.type === "active" ? "通用主动词条" : "通用被动词条",
        desc: p.desc,
        pityValue: p.rarity === "UR" ? 60 : p.rarity === "SR" ? 25 : 10,
        pityPrice: p.pityPrice || 40
      });
    });

    // 2. 角色本体 & 角色专属普通技 & 角色专属究极技
    Object.values(window.MEME_DATA.heroes).forEach((h) => {
      items.push({
        poolType: "hero",
        id: h.id,
        name: h.name,
        rarity: "SSR",
        subLabel: "全新抽象角色",
        desc: `${h.title}（自带双核心被动）`,
        pityValue: 50,
        pityPrice: h.pityPrice || 140
      });
      h.normalSkills.forEach((s) => {
        items.push({
          poolType: "skill",
          skillSlot: "normal",
          heroId: h.id,
          id: s.id,
          name: `${h.name}·${s.name}`,
          shortName: s.name,
          rarity: s.rarity,
          subLabel: `${h.name}专属主动技`,
          desc: s.desc,
          pityValue: 35,
          pityPrice: s.pityPrice || 90
        });
      });
      h.ultSkills.forEach((u) => {
        items.push({
          poolType: "skill",
          skillSlot: "ult",
          heroId: h.id,
          id: u.id,
          name: `${h.name}·${u.name}`,
          shortName: u.name,
          rarity: "UR",
          subLabel: `${h.name}究极技能(${u.type === "active" ? "主动" : "被动"})`,
          desc: u.desc,
          pityValue: 70,
          pityPrice: u.pityPrice || 200
        });
      });
    });

    return items;
  }

  isItemOwned(item) {
    if (item.poolType === "perk") return !!this.state.unlockedPerks[item.id];
    if (item.poolType === "hero") return !!this.state.unlockedHeroes[item.id];
    if (item.poolType === "skill") return !!this.state.unlockedSkills[item.id];
    return false;
  }

  getItemLevel(item) {
    if (item.poolType === "perk") return this.state.perkLevels[item.id] || 1;
    if (item.poolType === "skill") return this.state.skillLevels[item.id] || 1;
    return 1;
  }

  // 全明星大混池抽取：高概率词条(72%)，低概率角色技能(16%)，低概率新角色(8%)，超低概率UR究极技/彩色词条(4%)
  rollMixedPool(count = 1) {
    const allItems = this.getAllPoolItems();
    const results = [];

    for (let i = 0; i < count; i++) {
      const r = Math.random() * 100;
      let candidates = [];
      // 十连最后一发保底至少 SR/SSR/UR
      if (count === 10 && i === 9 && r > 28) {
        candidates = allItems.filter((it) => it.rarity === "SSR" || it.rarity === "UR");
      } else if (r < 4.2) {
        // 超低概率：究极技能 或 UR彩色词条
        candidates = allItems.filter((it) => it.rarity === "UR");
      } else if (r < 12.2) {
        // 低概率：角色本体
        candidates = allItems.filter((it) => it.poolType === "hero");
      } else if (r < 28.5) {
        // 低概率：角色普通专属技能
        candidates = allItems.filter((it) => it.poolType === "skill" && it.rarity !== "UR");
      } else if (r < 58.0) {
        // 中高概率：SR词条
        candidates = allItems.filter((it) => it.poolType === "perk" && it.rarity === "SR");
      } else {
        // 高概率：R词条
        candidates = allItems.filter((it) => it.poolType === "perk" && it.rarity === "R");
      }

      const picked = candidates[Math.floor(Math.random() * candidates.length)];
      const isDupe = this.isItemOwned(picked);

      // 智能推荐：高阶词条(UR/SR)或角色技能默认推荐【upgrade】，R级低阶词条或重复角色本体默认推荐【convert】
      let defaultAction = "upgrade";
      if (!isDupe) {
        defaultAction = "unlock";
      } else if (picked.poolType === "hero") {
        defaultAction = "convert"; // 角色本体无等级，重复直接转高额保底币
      } else if (picked.poolType === "perk" && picked.rarity === "R") {
        defaultAction = "convert"; // 低阶词条默认推荐转币，玩家也可手动点升级提权重
      } else {
        defaultAction = "upgrade"; // 高等级词条推荐升级(提高刷出概率)，角色技能推荐升级(伤害特效翻倍)
      }

      results.push({
        uid: `pull_${Date.now()}_${i}_${Math.random()}`,
        item: picked,
        isDupe,
        chosenAction: defaultAction
      });

      // 如果是首次抽到新卡，立即解锁，这样同一轮十连再抽到第二张时自动识别为重复卡！
      if (!isDupe) {
        this.unlockItemDirectly(picked);
      }
    }

    this.save();
    return results;
  }

  unlockItemDirectly(item) {
    if (item.poolType === "perk") this.state.unlockedPerks[item.id] = true;
    if (item.poolType === "hero") this.state.unlockedHeroes[item.id] = true;
    if (item.poolType === "skill") this.state.unlockedSkills[item.id] = true;
  }

  // 确认执行重复卡的选择（升级 or 转化保底币）
  applyDupeDecisions(pullResults) {
    let gainedCoins = 0;
    let upgradedCount = 0;

    pullResults.forEach((entry) => {
      if (!entry.isDupe) return;
      const it = entry.item;
      if (entry.chosenAction === "convert" || it.poolType === "hero") {
        gainedCoins += it.pityValue;
      } else if (entry.chosenAction === "upgrade") {
        upgradedCount++;
        if (it.poolType === "perk") {
          this.state.perkLevels[it.id] = (this.state.perkLevels[it.id] || 1) + 1;
        } else if (it.poolType === "skill") {
          this.state.skillLevels[it.id] = (this.state.skillLevels[it.id] || 1) + 1;
        }
      }
    });

    this.state.pityCoins += gainedCoins;
    this.save();
    return { gainedCoins, upgradedCount };
  }

  // 根据词条等级计算局内【5选3】刷出权重（词条升级只加刷出概率，不加数值，确保胜率平衡）
  getPerkDraftWeight(perk) {
    const lv = this.state.perkLevels[perk.id] || 1;
    const baseWeight = perk.rarity === "UR" ? 18 : perk.rarity === "SR" ? 45 : 75;
    // 每升1级，刷出权重提升 45%
    return Math.round(baseWeight * (1 + (lv - 1) * 0.45));
  }

  // 开局按权重随机抽取 5 个不重复的已解锁词条供玩家 5选3
  rollFivePerksForDraft() {
    const pool = window.MEME_DATA.perks.filter((p) => this.state.unlockedPerks[p.id]);
    const picked = [];
    const available = [...pool];

    while (picked.length < 5 && available.length > 0) {
      const weights = available.map((p) => this.getPerkDraftWeight(p));
      const totalW = weights.reduce((a, b) => a + b, 0);
      let roll = Math.random() * totalW;
      let idx = 0;
      for (let i = 0; i < available.length; i++) {
        roll -= weights[i];
        if (roll <= 0) {
          idx = i;
          break;
        }
      }
      picked.push(available[idx]);
      available.splice(idx, 1);
    }
    return picked;
  }
}

window.gameStore = new GameStore();
