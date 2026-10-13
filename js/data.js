// 核心配置文件 v2.0：
// 1. 4大缝合梗角色 + 专属大招全屏 Cut-in 动画分镜配置 + 落地预警时间
// 2. 5大流派体系（蒙多巨像流 / 秒杀赌狗流 / 无限法术流 / 不死狂徒回血流 / 《师父Sifu》见招拆招技术流）共 25 个词条
// 3. 5分钟（300秒）前/中/后期/加时神仙局演进机制

window.MEME_DATA = {
  // 五大流派定义（用于UI标签、5选3流派共鸣与稳定成型）
  archetypes: {
    colossus: { id: "colossus", name: "🟢 蒙多巨像流", color: "#00ff88", desc: "心之钢无限叠体型+血量，体型与生命持续成长，近身碾压对手！" },
    assassin: { id: "assassin", name: "🔴 秒杀赌狗流", color: "#ff2a54", desc: "开局爆发+概率9999真伤斩杀，要么3秒秒人，要么被拖死！" },
    mage:     { id: "mage",     name: "🔵 无限火力法术流", color: "#00f0ff", desc: "技能极速冷却+多重弹幕复制，满屏激光弹幕洗地！" },
    vamp:     { id: "vamp",     name: "🟣 不死狂徒回血流", color: "#b829ff", desc: "脱战狂回+受击反伤+溢出血量转护盾，打不死的蟑螂！" },
    sifu:     { id: "sifu",     name: "🟡 师父Sifu技术流", color: "#ffe600", desc: "架势条打断+完美闪避反击+岁数越打越年轻，纯靠武德！" }
  },

  // 4大首发抽象梗角色（含全屏大招 Cut-in 演出分镜配置）
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
      corePassives: [
        { id: "dy_p1", name: "百吨惯性", desc: "碰墙反弹后移速+25%，下次撞击附带55点泥头车碾压伤害并叠加1层体型" },
        { id: "dy_p2", name: "强制转生", desc: "自身每损失15%生命，体积膨胀8%，每个损血阶段只触发一次" }
      ],
      normalSkills: [
        {
          id: "dy_s1",
          name: "远光灯致盲",
          rarity: "SR",
          unlockedDefault: true,
          cooldown: 4.0,
          type: "active",
          effectKind: "beam_flash",
          animationType: "scale",
          baseDamage: 105,
          desc: "真身短暂变大至1.65倍，爆闪远光灯弹幕造成伤害并削弱架势",
          shout: "远光灯警告!!"
        },
        {
          id: "dy_s2",
          name: "氮气漂移甩尾",
          rarity: "SSR",
          unlockedDefault: false,
          pityPrice: 90,
          cooldown: 3.6,
          type: "active",
          effectKind: "dash_ram",
          animationType: "dash_trail",
          baseDamage: 135,
          desc: "氮气加速冲刺0.5秒，留下彩色残影，沿途首次撞到对手造成伤害",
          shout: "排水沟过弯!!"
        },
        {
          id: "dy_s3",
          name: "连环撒钉轮胎",
          rarity: "SSR",
          unlockedDefault: false,
          pityPrice: 90,
          cooldown: 4.2,
          type: "active",
          effectKind: "proj_burst",
          animationType: "summon",
          baseDamage: 120,
          desc: "召唤转生重卡向对手冲撞，独立移动并造成一次伤害",
          shout: "备胎全飞啦!!"
        }
      ],
      ultSkills: [
        {
          id: "dy_u1",
          name: "异世界送货专列",
          rarity: "UR",
          unlockedDefault: true,
          type: "active",
          ultimate: true,
          effectKind: "ult_truck_stampede",
          animationType: "scale",
          pityPrice: 200,
          cutinTitle: "【究极奥义】异世界转生百吨专列!!",
          cutinSub: "完了完了！前面是泥头车车队！快抓落地红圈闪避！",
          cutinBg: "linear-gradient(135deg, #2d0200 0%, #8f1100 45%, #ff3b30 78%, #ffb800 100%)",
          cutinTheme: "dayun",
          cutinChant: "隐藏着异世界力量的钥匙啊 · 解除百吨王限速封印！",
          cutinBadge: "🚛 异世界转生快递 · 封印解除",
          cutinSealText: "DAYUN EXPRESS // ISEKAI SEAL RELEASE // HUNDRED-TON OVERDRIVE",
          cutinProps: ["🚛", "⚠️", "⚡", "💥", "🛞", "🔥"],
          cutinStages: ["✦ 第一幕：百吨魔法阵展开 ✦", "✦ 第二幕：远光灯全开 · 泥头车变身 ✦", "✦ 第三幕：锁定目标 · 全速撞击衔接 ✦"],
          desc: "【主动究极】0.9秒特写后百吨专列冲入战场，0.6秒后命中；核心为目标最大生命36%（等级至多48%），3辆车附加伤害总额不超过15%。最后0.22秒可回避，0.08秒可拆招",
          shout: "隐藏着异世界力量的钥匙啊！全员准备转生!!"
        },
        {
          id: "dy_u2",
          name: "不死泥头装甲",
          rarity: "UR",
          unlockedDefault: false,
          type: "passive",
          effectKind: "ult_passive_juggernaut",
          pityPrice: 220,
          desc: "【被动究极】究极能量充满后触发，核心造成目标最大生命22%（随等级至多30%），附加命中总额不超过15%，并回血90点、永久变大4%",
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
        { id: "hj_p1", name: "应激哈气", desc: "受到撞击时35%概率触发哈气反震，追加60点基础反击伤害" },
        { id: "hj_p2", name: "九命猫薄荷", desc: "生命首次低于30%时瞬间回复220血并进入4秒红温狂暴" }
      ],
      normalSkills: [
        {
          id: "hj_s1",
          name: "高频喵喵拳",
          rarity: "SR",
          unlockedDefault: true,
          cooldown: 3.2,
          type: "active",
          effectKind: "melee_flurry",
          animationType: "blitz",
          baseDamage: 98,
          desc: "0.4秒内穿梭战场折返三次，每次穿过对手造成三分之一技能伤害",
          shout: "阿巴阿巴喵拳!!"
        },
        {
          id: "hj_s2",
          name: "飞天猫砂盆",
          rarity: "SSR",
          unlockedDefault: false,
          pityPrice: 90,
          cooldown: 3.8,
          type: "active",
          effectKind: "proj_burst",
          animationType: "summon",
          baseDamage: 125,
          desc: "召唤猫猫护卫突袭对手，命中造成伤害并减速2秒",
          shout: "吃我满盆猫砂!!"
        },
        {
          id: "hj_s3",
          name: "咕咕嘎嘎音波",
          rarity: "SSR",
          unlockedDefault: false,
          pityPrice: 90,
          cooldown: 4.0,
          type: "active",
          effectKind: "sonic_ring",
          baseDamage: 118,
          desc: "释放全屏扩散哈气声波，震飞对手并击碎其护盾",
          shout: "哈——气——!!"
        }
      ],
      ultSkills: [
        {
          id: "hj_u1",
          name: "耄耋红温大暴走",
          rarity: "UR",
          unlockedDefault: true,
          type: "active",
          ultimate: true,
          effectKind: "ult_cat_frenzy",
          animationType: "blitz",
          pityPrice: 200,
          cutinTitle: "【究极奥义】耄耋红温·千爪破防杀!!",
          cutinSub: "红温真身即将扑入战场！等警示圈收缩后回避或拆招！",
          cutinBg: "linear-gradient(135deg, #2b0700 0%, #9c2700 45%, #ff5500 78%, #ffe600 100%)",
          cutinTheme: "hajimi",
          cutinChant: "隐藏着哈基米力量的猫薄荷啊 · 在我面前显示红温真身！",
          cutinBadge: "😾 耄耋红温形态 · 封印解除",
          cutinSealText: "HAJIMI MAODIE // CARDCAPTOR FURY // THOUSAND-CLAW OVERHEAT",
          cutinProps: ["😾", "🐾", "💢", "🐟", "🔥", "⚡"],
          cutinStages: ["✦ 第一幕：猫薄荷星阵唤醒 ✦", "✦ 第二幕：血压拉满 · 耄耋红温变身 ✦", "✦ 第三幕：千爪残影 · 瞬移扑杀衔接 ✦"],
          desc: "【主动究极】0.9秒特写后真身扑杀，战场0.6秒后命中；核心为目标最大生命36%（等级至多48%），猫猫护卫附加伤害总额不超过15%。最后0.22秒可回避，0.08秒可拆招",
          shout: "咕咕嘎嘎！彻底疯狂哈基米!!"
        },
        {
          id: "hj_u2",
          name: "赛博逗猫棒领域",
          rarity: "UR",
          unlockedDefault: false,
          type: "passive",
          effectKind: "ult_passive_laser",
          pityPrice: 220,
          desc: "【被动究极】究极能量充满后触发，核心造成目标最大生命22%（随等级至多30%），并生成附加激光命中，附加伤害总额不超过15%",
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
        { id: "ld_p1", name: "凌晨四点半", desc: "暴击率常驻提升25%，每次暴击飘出『孩子们！』并削减敌方架势" },
        { id: "ld_p2", name: "曼巴铁肘", desc: "两球直接碰撞时，额外追加70点基础肘击伤害" }
      ],
      normalSkills: [
        {
          id: "ld_s1",
          name: "暴风闪光肘",
          rarity: "SR",
          unlockedDefault: true,
          cooldown: 3.4,
          type: "active",
          effectKind: "dash_ram",
          animationType: "teleport",
          baseDamage: 115,
          desc: "原地消散0.12秒后在对手身后重现，重肘突袭必定暴击",
          shout: "看我这一肘!!"
        },
        {
          id: "ld_s2",
          name: "热带冰红茶喷射",
          rarity: "SSR",
          unlockedDefault: false,
          pityPrice: 90,
          cooldown: 4.0,
          type: "active",
          effectKind: "heal_splash",
          baseDamage: 105,
          desc: "畅饮冰红茶回复130生命，并向对手泼洒高糖粘液",
          shout: "真好喝啊孩子们!!"
        },
        {
          id: "ld_s3",
          name: "后仰跳投三分雨",
          rarity: "SSR",
          unlockedDefault: false,
          pityPrice: 90,
          cooldown: 4.1,
          type: "active",
          effectKind: "proj_burst",
          animationType: "clones",
          baseDamage: 130,
          desc: "分裂两个持续0.8秒的镜像夹击，本体发射篮球；三路各承担三分之一技能伤害",
          shout: "美如画后仰!!"
        }
      ],
      ultSkills: [
        {
          id: "ld_u1",
          name: "天降曼巴直升机",
          rarity: "UR",
          unlockedDefault: true,
          type: "active",
          ultimate: true,
          effectKind: "ult_heli_crash",
          animationType: "summon",
          pityPrice: 220,
          cutinTitle: "【究极奥义】孩子们·曼巴直升机天降正义!!",
          cutinSub: "曼巴直升机即将俯冲！回到战场后看准红圈拆招！",
          cutinBg: "linear-gradient(135deg, #16002c 0%, #561496 48%, #9b26ff 78%, #ffe600 100%)",
          cutinTheme: "laoda",
          cutinChant: "凌晨四点半的星光啊 · 赐予我紫金冰红茶的曼巴真身！",
          cutinBadge: "🚁 紫金曼巴战神 · 封印解除",
          cutinSealText: "MAMBA FOREVER // 24-8 GOLDEN AURA // HELICOPTER ELBOW DROP",
          cutinProps: ["🚁", "🏀", "🍹", "👑", "💜", "⚡"],
          cutinStages: ["✦ 第一幕：紫金24号星阵降临 ✦", "✦ 第二幕：冰红茶灌注 · 曼巴觉醒变身 ✦", "✦ 第三幕：螺旋桨锁定 · 天降重肘衔接 ✦"],
          desc: "【主动究极】0.9秒特写后直升机俯冲，战场0.6秒后命中；核心为目标最大生命36%（等级至多48%），3架护航机附加伤害总额不超过15%。最后0.22秒可回避，0.08秒可拆招",
          shout: "孩子们我回来了！曼巴出击!!"
        },
        {
          id: "ld_u2",
          name: "永不言弃黑曼巴",
          rarity: "UR",
          unlockedDefault: false,
          type: "passive",
          effectKind: "ult_passive_mamba",
          pityPrice: 220,
          desc: "【被动究极】究极能量充满后触发，核心造成目标最大生命22%（随等级至多30%），并挥出附加铁肘，附加伤害总额不超过15%",
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
          cooldown: 3.4,
          type: "active",
          effectKind: "dash_ram",
          animationType: "scale",
          baseDamage: 110,
          desc: "真身短暂变大至1.65倍，用肩膀猛烈撞击，削减对手架势",
          shout: "铁山靠顶飞!!"
        },
        {
          id: "kg_s2",
          name: "坤山劈地篮球",
          rarity: "SSR",
          unlockedDefault: false,
          pityPrice: 90,
          cooldown: 3.9,
          type: "active",
          effectKind: "proj_burst",
          animationType: "clones",
          baseDamage: 128,
          desc: "分裂两个持续0.8秒的镜像夹击，本体发射篮球；镜像受击或命中后消散",
          shout: "看我运球如风!!"
        },
        {
          id: "kg_s3",
          name: "只因你太美高音",
          rarity: "SSR",
          unlockedDefault: false,
          pityPrice: 90,
          cooldown: 4.0,
          type: "active",
          effectKind: "sonic_ring",
          baseDamage: 122,
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
          type: "active",
          ultimate: true,
          effectKind: "ult_basketball_rain",
          animationType: "summon",
          pityPrice: 220,
          cutinTitle: "【究极奥义】练习生两年半·万凰朝宗篮球陨石!!",
          cutinSub: "篮球陨石即将降临！回到战场后看准红圈回避！",
          cutinBg: "linear-gradient(135deg, #001329 0%, #004e8c 45%, #00d4ff 78%, #ff2a54 100%)",
          cutinTheme: "kunge",
          cutinChant: "修炼两年半的唱跳RAP之力啊 · 化作中分背带裤舞台降临！",
          cutinBadge: "🏀 两年半C位公演 · 封印解除",
          cutinSealText: "TWO AND A HALF YEARS // KUN STAGE // PHOENIX BASKETBALL METEOR",
          cutinProps: ["🏀", "🐔", "🎵", "🪶", "✨", "🎤"],
          cutinStages: ["✦ 第一幕：两年半公演星阵点亮 ✦", "✦ 第二幕：背带裤铁山靠 · 坤哥C位变身 ✦", "✦ 第三幕：万凰朝宗 · 陨石篮球衔接 ✦"],
          desc: "【主动究极】0.9秒特写后篮球陨石降临，战场0.6秒后命中；核心为目标最大生命36%（等级至多48%），3个防守中锋附加伤害总额不超过15%。最后0.22秒可回避，0.08秒可拆招",
          shout: "你干嘛哎哟！唱跳RAP终极奥义!!"
        },
        {
          id: "kg_u2",
          name: "中分头引力场",
          rarity: "UR",
          unlockedDefault: false,
          type: "passive",
          effectKind: "ult_passive_orbit",
          pityPrice: 220,
          desc: "【被动究极】究极能量充满后触发，核心造成目标最大生命22%（随等级至多30%），并生成2个护体篮球附加命中，附加伤害总额不超过15%",
          shout: "护体篮球全开!!"
        }
      ]
    }
  },

  // 25个通用词条池 —— 按五大流派分类，支持稳定构筑流派（蒙多变大/秒杀流/法术流/回血流/师父Sifu技术流）
  perks: [
    // ==================== 🟢 蒙多巨像流 (Colossus: 慢慢变大、心之钢、超出屏幕) ====================
    {
      id: "pk_col_1",
      archetype: "colossus",
      name: "心之钢·无限叠",
      rarity: "SR",
      type: "passive",
      unlockedDefault: true,
      cooldown: 0,
      pityPrice: 60,
      desc: "【巨像流核心】每次肉搏碰撞发出『铛！』声，永久增加65最大生命且体型变大5%（生命成长持续累积，体型在场地安全上限内增长）！",
      shout: "铛!!心之钢+1!!"
    },
    {
      id: "pk_col_2",
      archetype: "colossus",
      name: "蒙多想去哪就去哪",
      rarity: "UR",
      type: "active",
      ultimate: true,
      unlockedDefault: true,
      heal: 220,
      pityPrice: 180,
      cutinTitle: "【巨像觉醒】蒙多医生·狂暴巨大化!!",
      cutinSub: "体型增长25%，立即回复220血！",
      cutinBg: "linear-gradient(135deg, #00240c 0%, #007a33 48%, #00ff88 80%, #ccff00 100%)",
      cutinTheme: "colossus",
      cutinChant: "隐藏着巨像心之钢的生命力啊 · 让我的体型突破天际吧！",
      cutinBadge: "🟢 蒙多巨像真身 · 封印解除",
      cutinSealText: "COLOSSUS HEARTSTEEL // INFINITE GROWTH // MUNDO GOES WHERE HE PLEASES",
      cutinProps: ["🟢", "🛡️", "💪", "⚡", "💚", "🔨"],
      cutinStages: ["✦ 第一幕：心之钢巨像法阵共鸣 ✦", "✦ 第二幕：生命狂涌 · 体型暴涨变身 ✦", "✦ 第三幕：巨像降临 · 碾压全场衔接 ✦"],
      desc: "【主动究极】究极能量充满后触发，立即回复220血并永久膨胀25%体型；该成长究极不造成核心伤害",
      shout: "蒙多觉得你是个大娘们!!"
    },
    {
      id: "pk_col_3",
      archetype: "colossus",
      name: "日炎圣盾烫脚",
      rarity: "R",
      type: "passive",
      unlockedDefault: true,
      cooldown: 0,
      desc: "【巨像流】周身常驻火焰光环（范围随体型无限放大），持续灼烧近身对手，伤害随体型成长",
      shout: "日炎烤肉咯!!"
    },
    {
      id: "pk_col_4",
      archetype: "colossus",
      name: "泰坦吞噬生长",
      rarity: "R",
      type: "passive",
      unlockedDefault: true,
      cooldown: 0,
      desc: "【巨像流】每过3秒自动生长变大3.5%并回复35点生命，越往后期越肉、越大",
      shout: "还在长身体!!"
    },
    {
      id: "pk_col_5",
      archetype: "colossus",
      name: "反甲刺猬重装",
      rarity: "SR",
      type: "passive",
      unlockedDefault: false,
      cooldown: 0,
      pityPrice: 60,
      desc: "【巨像流】受到任何伤害减免20%，并将28%伤害加上自身体型倍率反弹给攻击者",
      shout: "反甲扎手吧!!"
    },

    // ==================== 🔴 秒杀赌狗流 (Assassin: 开局高爆、概率9999秒杀、一刀流) ====================
    {
      id: "pk_asn_1",
      archetype: "assassin",
      name: "9999断头台彩票",
      rarity: "UR",
      type: "passive",
      unlockedDefault: true,
      cooldown: 0,
      pityPrice: 180,
      desc: "【秒杀流核心】每次攻击有6%概率（对手血量低于35%时提升至15%）直接触发『9999断头台秒杀』瞬间清空对手血条！",
      shout: "🎰9999逆天秒杀!!"
    },
    {
      id: "pk_asn_2",
      archetype: "assassin",
      name: "德拉克萨暮刃背刺",
      rarity: "SR",
      type: "active",
      unlockedDefault: true,
      animationType: "teleport",
      cooldown: 4.5,
      baseDamage: 175,
      pityPrice: 60,
      desc: "【秒杀流主动】瞬间闪现到对手身后猛刺一刀，必定暴击！若对手残血额外追加120斩杀伤",
      shout: "瞬步背刺一刀!!"
    },
    {
      id: "pk_asn_3",
      archetype: "assassin",
      name: "开局三板斧玻璃大炮",
      rarity: "R",
      type: "passive",
      unlockedDefault: true,
      cooldown: 0,
      desc: "【秒杀流】前20秒造成的所有伤害提升55%！但自身最大生命值降低15%，追求开局直接秒人",
      shout: "开局莽夫三板斧!!"
    },
    {
      id: "pk_asn_4",
      archetype: "assassin",
      name: "无尽之刃刀刀烈火",
      rarity: "SR",
      type: "passive",
      unlockedDefault: false,
      cooldown: 0,
      pityPrice: 60,
      desc: "【秒杀流】暴击率提升30%，且暴击伤害从145%直接飙升至210%！",
      shout: "刀刀烈火暴击!!"
    },
    {
      id: "pk_asn_5",
      archetype: "assassin",
      name: "收集者12%直接处决",
      rarity: "R",
      type: "passive",
      unlockedDefault: true,
      cooldown: 0,
      desc: "【秒杀流】敌方生命值低于12%时，任何伤害直接触发『9999金币处决』，无视护盾！",
      shout: "收集者收米处决!!"
    },

    // ==================== 🔵 无限火力法术流 (Mage: 极速CD、多重施法、满屏弹幕) ====================
    {
      id: "pk_mag_1",
      archetype: "mage",
      name: "无限火力65%急速",
      rarity: "UR",
      type: "passive",
      unlockedDefault: true,
      cooldown: 0,
      pityPrice: 180,
      desc: "【法术流核心】非究极主动技能冷却速度加快65%，每次非究极技能额外发出2颗奥术飞弹；不加速或复制究极！",
      shout: "🔥无限火力全开!!"
    },
    {
      id: "pk_mag_2",
      archetype: "mage",
      name: "全屏高能弹幕洗地",
      rarity: "UR",
      type: "active",
      ultimate: true,
      unlockedDefault: false,
      pityPrice: 180,
      cutinTitle: "【法术奥义】前方高能·亿万彩虹弹幕雨!!",
      cutinSub: "特写结束后高能弹幕飞入战场，看准落点回避！",
      cutinBg: "linear-gradient(135deg, #000d29 0%, #0044aa 45%, #00f0ff 78%, #b829ff 100%)",
      cutinTheme: "mage",
      cutinChant: "无限火力的奥术星辰啊 · 倾泻满屏彩虹弹幕洗礼战场吧！",
      cutinBadge: "🔵 无限法神形态 · 封印解除",
      cutinSealText: "ARCANE OVERDRIVE // UNLIMITED BARRAGE // RAINBOW STARLIGHT",
      cutinProps: ["🔵", "✨", "🌟", "🔮", "⚡", "🌈"],
      cutinStages: ["✦ 第一幕：奥术无限星阵展开 ✦", "✦ 第二幕：法力沸腾 · 弹幕女神变身 ✦", "✦ 第三幕：亿万彩虹 · 全屏轰炸衔接 ✦"],
      desc: "【主动究极】0.9秒特写后战场蓄势0.6秒命中并生成5枚弹幕；核心为目标最大生命36%（等级至多48%），附加伤害总额不超过15%。最后0.22秒可回避，0.08秒可拆招",
      shout: "前方高能弹幕洗地!!"
    },
    {
      id: "pk_mag_3",
      archetype: "mage",
      name: "卢登的回声溅射",
      rarity: "R",
      type: "passive",
      unlockedDefault: true,
      cooldown: 0,
      desc: "【法术流】每次释放技能，立即向对手迸发3道闪电弹幕（每道45伤）",
      shout: "卢登闪电溅射!!"
    },
    {
      id: "pk_mag_4",
      archetype: "mage",
      name: "多重施法镜像",
      rarity: "SR",
      type: "passive",
      unlockedDefault: true,
      cooldown: 0,
      pityPrice: 60,
      desc: "【法术流】释放非究极主动技能时，有50%概率0.3秒后免费重放一次；镜像不重复充能、不重放究极！",
      shout: "双重施法触发!!"
    },
    {
      id: "pk_mag_5",
      archetype: "mage",
      name: "滚筒洗衣机引力场",
      rarity: "SR",
      type: "active",
      unlockedDefault: false,
      cooldown: 5.5,
      baseDamage: 130,
      pityPrice: 60,
      desc: "【法术流主动】使整个竞技场高速旋转3秒，发射环形法球漩涡",
      shout: "全自动滚筒法阵!!"
    },

    // ==================== 🟣 不死狂徒回血流 (Vamp: 狂暴回血、溢出血量护盾、免死锁血) ====================
    {
      id: "pk_vmp_1",
      archetype: "vamp",
      name: "狂徒铠甲每秒狂奶",
      rarity: "SR",
      type: "passive",
      unlockedDefault: true,
      cooldown: 0,
      pityPrice: 60,
      desc: "【回血流核心】每秒固定恢复3.5%最大生命值！中期恢复量乘1.6，后期乘2.4，溢出的治疗自动转化为白盾！",
      shout: "💚狂徒呼吸回血!!"
    },
    {
      id: "pk_vmp_2",
      archetype: "vamp",
      name: "饮血剑刀刀满血",
      rarity: "SR",
      type: "passive",
      unlockedDefault: true,
      cooldown: 0,
      pityPrice: 60,
      desc: "【回血流】造成的所有碰撞与技能实际伤害，38%转化为自身生命值，溢出治疗转护盾！",
      shout: "大口吸血续命!!"
    },
    {
      id: "pk_vmp_3",
      archetype: "vamp",
      name: "拼夕夕99.99%免死",
      rarity: "UR",
      type: "passive",
      unlockedDefault: false,
      cooldown: 0,
      pityPrice: 180,
      desc: "【彩色被动】受到致命一击时强制锁1滴血3秒，瞬间回满50%血量并弹出『还差0.01刀』反震！",
      shout: "🛡️请好友帮砍一刀免死!!"
    },
    {
      id: "pk_vmp_4",
      archetype: "vamp",
      name: "弹簧肉垫摸墙奶",
      rarity: "R",
      type: "passive",
      unlockedDefault: true,
      cooldown: 0,
      desc: "【回血流】每次碰到竞技场墙壁立即回复45点生命值",
      shout: "摸墙回口老血!"
    },
    {
      id: "pk_vmp_5",
      archetype: "vamp",
      name: "吨吨吨快乐水急救",
      rarity: "R",
      type: "active",
      unlockedDefault: true,
      cooldown: 5.0,
      baseDamage: 0,
      heal: 195,
      desc: "【回血流主动】猛炫冰镇快乐水，瞬间回复195生命并获得80护盾",
      shout: "肥宅水满血复活!"
    },

    // ==================== 🟡 《师父 Sifu》见招拆招技术流 (Sifu: 架势破防、极限闪避、越打越年轻) ====================
    {
      id: "pk_sifu_1",
      archetype: "sifu",
      name: "师父Sifu·见招拆招",
      rarity: "UR",
      type: "passive",
      unlockedDefault: true,
      cooldown: 0,
      pityPrice: 180,
      desc: "【技术流核心】成功闪避敌方大招或触发极限弹反时，立即返还全部技能CD，回复180血，并打出320点『寸拳处决』！",
      shout: "🥋木人桩寸拳反杀!!"
    },
    {
      id: "pk_sifu_2",
      archetype: "sifu",
      name: "下段扫堂腿破架势",
      rarity: "SR",
      type: "active",
      unlockedDefault: true,
      cooldown: 3.8,
      baseDamage: 135,
      pityPrice: 60,
      desc: "【技术流主动】贴身扫堂腿，直接削减对手50%架势条！对手架势条满时触发眩晕处决暴击",
      shout: "下段扫堂破防!!"
    },
    {
      id: "pk_sifu_3",
      archetype: "sifu",
      name: "铜钱护符·越打越年轻",
      rarity: "SR",
      type: "passive",
      unlockedDefault: true,
      cooldown: 0,
      pityPrice: 60,
      desc: "【技术流】初始20岁，受击老1岁加攻击，完美闪避/弹反年轻5岁加攻速与闪避率！武德充沛！",
      shout: "重返20岁巅峰武德!!"
    },
    {
      id: "pk_sifu_4",
      archetype: "sifu",
      name: "借力打力太极云手",
      rarity: "R",
      type: "passive",
      unlockedDefault: true,
      cooldown: 0,
      desc: "【技术流】有25%基础概率自动触发『太极偏斜』闪避伤害，并反抽对手一耳光(85伤)",
      shout: "借力打力闪避!!"
    },
    {
      id: "pk_sifu_5",
      archetype: "sifu",
      name: "砸瓦鲁多·子弹时间",
      rarity: "UR",
      type: "active",
      ultimate: true,
      unlockedDefault: false,
      pityPrice: 180,
      cutinTitle: "【武学奥义】静如处子·心眼子弹时间!!",
      cutinSub: "看破一切破绽！冻结全场2秒并连续寸拳暴打！",
      cutinBg: "linear-gradient(135deg, #241900 0%, #8a5a00 45%, #ffe600 78%, #ff8800 100%)",
      cutinTheme: "sifu",
      cutinChant: "木人桩与铜钱护符的武德啊 · 开启心眼冻结时空万物！",
      cutinBadge: "🟡 宗师心眼觉醒 · 封印解除",
      cutinSealText: "SIFU WUDE // TIME FREEZE FOCUS // ONE-INCH PUNCH EXECUTION",
      cutinProps: ["🟡", "🥋", "🪙", "👊", "⚡", "⏱️"],
      cutinStages: ["✦ 第一幕：太极铜钱卦阵运转 ✦", "✦ 第二幕：重返巅峰 · 武道宗师变身 ✦", "✦ 第三幕：时停破绽 · 寸拳连打衔接 ✦"],
      desc: "【主动究极】究极能量充满后触发，冻结全场2秒；核心造成目标最大生命36%（随等级至多48%），附加伤害总额不超过15%",
      shout: "看破你的破绽了!!"
    }
  ]
};

// 存档管理与全明星大混池逻辑
class GameStore {
  constructor() {
    this.storageKey = "MEME_BRAWL_SAVE_V2";
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
      tickets: 40, // 开局送40抽
      pityCoins: 150,
      selectedHeroPreview: "dayun",
      preferredArchetype: "all", // 支持倾向流派或纯随机共鸣
      unlockedHeroes,
      unlockedSkills,
      skillLevels,
      equippedNormal,
      equippedUlt,
      unlockedPerks,
      perkLevels,
      autoBattle: true,
      matchMode: "quick",
      settings: { volume: 0.65, muted: false, voice: true, effects: "full" },
      pendingPulls: []
    };
  }

  load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return this.getDefaultState();
      const parsed = JSON.parse(raw);
      const def = this.getDefaultState();
      const state = {
        ...def,
        ...parsed,
        unlockedHeroes: { ...def.unlockedHeroes, ...(parsed.unlockedHeroes || {}) },
        unlockedSkills: { ...def.unlockedSkills, ...(parsed.unlockedSkills || {}) },
        skillLevels: { ...def.skillLevels, ...(parsed.skillLevels || {}) },
        unlockedPerks: { ...def.unlockedPerks, ...(parsed.unlockedPerks || {}) },
        perkLevels: { ...def.perkLevels, ...(parsed.perkLevels || {}) },
        equippedNormal: { ...def.equippedNormal, ...(parsed.equippedNormal || {}) },
        equippedUlt: { ...def.equippedUlt, ...(parsed.equippedUlt || {}) },
        settings: { ...def.settings, ...(parsed.settings || {}) },
        pendingPulls: Array.isArray(parsed.pendingPulls) ? parsed.pendingPulls : []
      };
      for (const key of ["tickets", "pityCoins", "level", "exp"]) {
        state[key] = Number.isFinite(state[key]) ? Math.max(key === "level" ? 1 : 0, Math.floor(state[key])) : def[key];
      }
      state.matchMode = window.GAME_CONFIG.modes[state.matchMode] ? state.matchMode : "quick";
      state.settings.volume = Number.isFinite(state.settings.volume) ? Math.max(0, Math.min(1, state.settings.volume)) : 0.65;
      state.settings.effects = state.settings.effects === "reduced" ? "reduced" : "full";
      state.autoBattle = state.autoBattle !== false;
      state.preferredArchetype = window.MEME_DATA.archetypes[state.preferredArchetype] ? state.preferredArchetype : "all";
      for (const levels of [state.skillLevels, state.perkLevels]) {
        for (const id of Object.keys(levels)) levels[id] = Number.isFinite(levels[id]) ? Math.max(1, Math.floor(levels[id])) : 1;
      }
      Object.values(window.MEME_DATA.heroes).forEach((hero) => {
        for (const [field, skills] of [["equippedNormal", hero.normalSkills], ["equippedUlt", hero.ultSkills]]) {
          if (!skills.some((skill) => skill.id === state[field][hero.id] && state.unlockedSkills[skill.id])) state[field][hero.id] = def[field][hero.id];
        }
      });
      const allItems = this.getAllPoolItems();
      state.pendingPulls = state.pendingPulls.slice(0, 10).flatMap((entry) => {
        const item = allItems.find((it) => it.id === entry?.item?.id && it.poolType === entry.item.poolType);
        return item && typeof entry.uid === "string" ? [{ ...entry, item, chosenAction: ["unlock", "upgrade", "convert"].includes(entry.chosenAction) ? entry.chosenAction : "convert" }] : [];
      });
      return state;
    } catch (e) {
      return this.getDefaultState();
    }
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
      this.storageError = false;
      return true;
    } catch (e) {
      this.storageError = true;
      window.dispatchEvent(new CustomEvent("game-storage-error"));
      return false;
    }
  }

  getAllPoolItems() {
    const items = [];
    window.MEME_DATA.perks.forEach((p) => {
      const arch = window.MEME_DATA.archetypes[p.archetype];
      items.push({
        poolType: "perk",
        id: p.id,
        name: p.name,
        rarity: p.rarity,
        subLabel: `${arch ? arch.name : "通用"} · ${p.type === "active" ? "主动词条" : "被动词条"}`,
        desc: p.desc,
        pityValue: p.rarity === "UR" ? 60 : p.rarity === "SR" ? 25 : 10,
        pityPrice: p.pityPrice || 40
      });
    });

    Object.values(window.MEME_DATA.heroes).forEach((h) => {
      items.push({
        poolType: "hero",
        id: h.id,
        name: h.name,
        rarity: "SSR",
        subLabel: "全新抽象角色",
        desc: `${h.title}（自带双核心被动+专属全屏大招动画）`,
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
          subLabel: `${h.name}究极技能(${u.type === "active" ? "全屏动画主动" : "常驻被动"})`,
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

  rollMixedPool(count = 1) {
    const allItems = this.getAllPoolItems();
    const results = [];

    for (let i = 0; i < count; i++) {
      const guaranteed = count === 10 && i === 9 && !results.some((entry) => ["SSR", "UR"].includes(entry.item.rarity));
      const buckets = window.GAME_CONFIG.gacha.filter((bucket) => !guaranteed || ["SSR", "UR"].includes(bucket.rarity));
      let roll = Math.random() * buckets.reduce((sum, bucket) => sum + bucket.weight, 0);
      const bucket = buckets.find((b) => (roll -= b.weight) < 0) || buckets[buckets.length - 1];
      const candidates = allItems.filter((it) => it.rarity === bucket.rarity && (!bucket.poolType || it.poolType === bucket.poolType));

      const picked = candidates[Math.floor(Math.random() * candidates.length)];
      const isDupe = this.isItemOwned(picked);

      let defaultAction = "upgrade";
      if (!isDupe) {
        defaultAction = "unlock";
      } else if (picked.poolType === "hero") {
        defaultAction = "convert";
      } else if (picked.poolType === "perk" && picked.rarity === "R") {
        defaultAction = "convert";
      } else {
        defaultAction = "upgrade";
      }

      results.push({
        uid: `pull_${Date.now()}_${i}_${Math.random()}`,
        item: picked,
        isDupe,
        chosenAction: defaultAction
      });

      if (!isDupe) {
        this.unlockItemDirectly(picked);
      }
    }

    this.state.pendingPulls = results;
    this.save();
    return results;
  }

  unlockItemDirectly(item) {
    if (item.poolType === "perk") this.state.unlockedPerks[item.id] = true;
    if (item.poolType === "hero") this.state.unlockedHeroes[item.id] = true;
    if (item.poolType === "skill") this.state.unlockedSkills[item.id] = true;
  }

  applyDupeDecisions(pullResults) {
    let gainedCoins = 0;
    let upgradedCount = 0;

    const pendingById = new Map(this.state.pendingPulls.map((entry) => [entry.uid, entry]));
    const consumed = new Set();
    pullResults.forEach((submitted) => {
      if (!submitted || consumed.has(submitted.uid)) return;
      const entry = pendingById.get(submitted.uid);
      if (!entry) return;
      consumed.add(submitted.uid);
      if (!entry.isDupe) return;
      const it = entry.item;
      if (submitted.chosenAction === "convert" || it.poolType === "hero") {
        gainedCoins += it.pityValue;
      } else if (submitted.chosenAction === "upgrade") {
        upgradedCount++;
        if (it.poolType === "perk") {
          this.state.perkLevels[it.id] = (this.state.perkLevels[it.id] || 1) + 1;
        } else if (it.poolType === "skill") {
          this.state.skillLevels[it.id] = (this.state.skillLevels[it.id] || 1) + 1;
        }
      }
    });

    this.state.pityCoins += gainedCoins;
    this.state.pendingPulls = [];
    this.save();
    return { gainedCoins, upgradedCount };
  }

  getPerkDraftWeight(perk, focusArchetype = null) {
    const lv = this.state.perkLevels[perk.id] || 1;
    const baseWeight = perk.rarity === "UR" ? 22 : perk.rarity === "SR" ? 48 : 75;
    // 流派稳定成型机制：当本局随机抽定一个主打流派时，该流派词条权重 x2.6，保证能稳定凑出蒙多流/秒杀流/师父流！
    const archBonus = focusArchetype && perk.archetype === focusArchetype ? 2.6 : 1.0;
    return Math.round(baseWeight * (1 + (lv - 1) * 0.45) * archBonus);
  }

  // 开局按权重抽取 5 个词条供玩家 5选3（自动附带本局随机流派up，确保容易凑齐同流派套路）
  rollFivePerksForDraft(forcedArchetype = null) {
    const pool = window.MEME_DATA.perks.filter((p) => this.state.unlockedPerks[p.id]);
    const archKeys = Object.keys(window.MEME_DATA.archetypes);
    const focusArch = forcedArchetype || archKeys[Math.floor(Math.random() * archKeys.length)];

    const picked = [];
    const available = [...pool];

    while (picked.length < 5 && available.length > 0) {
      const weights = available.map((p) => this.getPerkDraftWeight(p, focusArch));
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
    return { focusArch, perks: picked };
  }
}

window.gameStore = new GameStore();
