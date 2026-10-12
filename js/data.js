// 核心配置文件 v2.0：
// 1. 4大缝合梗角色 + 专属大招全屏 Cut-in 动画分镜配置 + 落地预警时间
// 2. 5大流派体系（蒙多巨像流 / 秒杀赌狗流 / 无限法术流 / 不死狂徒回血流 / 《师父Sifu》见招拆招技术流）共 25 个词条
// 3. 5分钟（300秒）前/中/后期/加时神仙局演进机制

window.MEME_DATA = {
  // 五大流派定义（用于UI标签、5选3流派共鸣与稳定成型）
  archetypes: {
    colossus: { id: "colossus", name: "🟢 蒙多巨像流", color: "#00ff88", desc: "心之钢无限叠体型+血量，后期大到超出屏幕直接碾压！" },
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
        { id: "dy_p2", name: "强制转生", desc: "自身每损失15%生命，体积膨胀8%且撞击震屏翻倍" }
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
          baseDamage: 105,
          desc: "爆闪远光灯直射对手，造成伤害并削弱其架势条",
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
          baseDamage: 135,
          desc: "瞬间朝敌人方向暴力冲刺撞击，贴脸释放伤害+45%",
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
          baseDamage: 120,
          desc: "向四周狂甩4个燃烧备胎弹幕，触碰爆炸",
          shout: "备胎全飞啦!!"
        }
      ],
      ultSkills: [
        {
          id: "dy_u1",
          name: "异世界送货专列",
          rarity: "UR",
          unlockedDefault: true,
          cooldown: 9.0,
          type: "active",
          effectKind: "ult_truck_stampede",
          baseDamage: 320,
          pityPrice: 200,
          cutinTitle: "【究极奥义】异世界转生百吨专列!!",
          cutinSub: "完了完了！前面是泥头车车队！快抓落地红圈闪避！",
          cutinBg: "linear-gradient(135deg, #4a0000, #ff3b30, #ff9500)",
          desc: "【全屏动画大招】播放泥头车长鸣前摇动画，0.8秒后召唤百吨王轰炸目标区域（可抓最后一瞬闪避缓解85%伤害）！",
          shout: "全员准备转生!!"
        },
        {
          id: "dy_u2",
          name: "不死泥头装甲",
          rarity: "UR",
          unlockedDefault: false,
          type: "passive",
          effectKind: "ult_passive_juggernaut",
          baseDamage: 175,
          pityPrice: 220,
          desc: "【被动大招】无需按键！每3.5秒自动爆发出环形尾气冲击波，回血90点并永久变大4%",
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
        { id: "hj_p1", name: "应激哈气", desc: "受到撞击时35%概率触发哈气反震，反弹60点真实伤害并打断对手" },
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
          baseDamage: 98,
          desc: "向周围疯狂挥出残影猫爪，距离越近连击越高",
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
          baseDamage: 125,
          desc: "投掷旋转猫砂盆追踪对手，命中附加减速毒雾",
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
          cooldown: 8.8,
          type: "active",
          effectKind: "ult_cat_frenzy",
          baseDamage: 310,
          pityPrice: 200,
          cutinTitle: "【究极奥义】耄耋红温·千爪破防杀!!",
          cutinSub: "急了急了彻底红温了！锁定0.8秒后瞬移扑杀！",
          cutinBg: "linear-gradient(135deg, #3b1100, #ff5500, #ffe600)",
          desc: "【全屏动画大招】全屏特写红温哈气动画，锁定目标0.8秒后瞬移五连抓（抓落地瞬间可极限闪避）！",
          shout: "彻底疯狂哈基米!!"
        },
        {
          id: "hj_u2",
          name: "赛博逗猫棒领域",
          rarity: "UR",
          unlockedDefault: false,
          type: "passive",
          effectKind: "ult_passive_laser",
          baseDamage: 165,
          pityPrice: 220,
          desc: "【被动大招】无需按键！场上持续生成红外线激光点，每3.5秒自动灼烧对手",
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
        { id: "ld_p1", name: "凌晨四点半", desc: "暴击率常驻提升25%，每次暴击飘出巨型『孩子们！』并削减敌方架势" },
        { id: "ld_p2", name: "曼巴铁肘", desc: "两球直接碰撞时，额外追加70点无视防御的肘击伤害" }
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
          baseDamage: 115,
          desc: "高速突进一记重肘，若在贴脸距离施放必定暴击",
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
          baseDamage: 130,
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
          cooldown: 9.2,
          type: "active",
          effectKind: "ult_heli_crash",
          baseDamage: 335,
          pityPrice: 220,
          cutinTitle: "【究极奥义】孩子们·曼巴直升机天降正义!!",
          cutinSub: "See You Again 响起了！0.8秒后螺旋桨重肘轰击红圈！",
          cutinBg: "linear-gradient(135deg, #1b0036, #7928ca, #ff0080)",
          desc: "【全屏动画大招】触发全屏紫金曼巴觉醒动画，0.8秒后从天而降毁灭重肘（可极限闪避躲开核心冲击）！",
          shout: "孩子们我回来了!!"
        },
        {
          id: "ld_u2",
          name: "永不言弃黑曼巴",
          rarity: "UR",
          unlockedDefault: false,
          type: "passive",
          effectKind: "ult_passive_mamba",
          baseDamage: 180,
          pityPrice: 220,
          desc: "【被动大招】无需按键！血量越低攻速与反弹速度越快，每3.5秒自动挥出曼巴铁肘",
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
          baseDamage: 110,
          desc: "用肩膀猛烈顶飞对手，造成击退与高额架势削减",
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
          baseDamage: 128,
          desc: "发射在场地内高速弹跳5次的巨型火焰篮球",
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
          cooldown: 9.0,
          type: "active",
          effectKind: "ult_basketball_rain",
          baseDamage: 325,
          pityPrice: 220,
          cutinTitle: "【究极奥义】练习生两年半·万凰朝宗篮球陨石!!",
          cutinSub: "中分头背带裤全屏公演开始！注意躲避0.8秒后的陨石红圈！",
          cutinBg: "linear-gradient(135deg, #001f3f, #00d4ff, #ff0055)",
          desc: "【全屏动画大招】全场黑屏C位灯光秀前摇，0.8秒后天降巨型燃烧篮球砸向目标（可抓瞬间闪避）！",
          shout: "唱跳RAP终极奥义!!"
        },
        {
          id: "kg_u2",
          name: "中分头引力场",
          rarity: "UR",
          unlockedDefault: false,
          type: "passive",
          effectKind: "ult_passive_orbit",
          baseDamage: 175,
          pityPrice: 220,
          desc: "【被动大招】无需按键！3颗高速旋转篮球常驻环绕周身，触碰即炸",
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
      desc: "【巨像流核心】每次肉搏碰撞发出『铛！』声，永久增加65最大生命且体型变大5%（无上限，可超出屏幕）！",
      shout: "铛!!心之钢+1!!"
    },
    {
      id: "pk_col_2",
      archetype: "colossus",
      name: "蒙多想去哪就去哪",
      rarity: "UR",
      type: "active",
      unlockedDefault: true,
      cooldown: 7.5,
      baseDamage: 90,
      heal: 220,
      pityPrice: 180,
      cutinTitle: "【巨像觉醒】蒙多医生·狂暴巨大化!!",
      cutinSub: "体型暴涨35%！缓慢持续回血！准备把整个屏幕塞满！",
      cutinBg: "linear-gradient(135deg, #003311, #00ff88, #aaff00)",
      desc: "【彩色主动】立即回复220血，永久膨胀25%体型！体型越大碰撞碾压伤害越高，后期直接塞满整个屏幕！",
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
      desc: "【巨像流】周身常驻火焰光环（范围随体型无限放大），每秒自动灼烧范围内对手45~120点生命",
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
      desc: "【秒杀流核心】每次攻击有6%概率（对手血量低于35%时翻倍至15%）直接触发『9999断头台秒杀』瞬间清空对手血条！",
      shout: "🎰9999逆天秒杀!!"
    },
    {
      id: "pk_asn_2",
      archetype: "assassin",
      name: "德拉克萨暮刃背刺",
      rarity: "SR",
      type: "active",
      unlockedDefault: true,
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
      name: "收集者5%直接处决",
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
      name: "无限火力80%急速",
      rarity: "UR",
      type: "passive",
      unlockedDefault: true,
      cooldown: 0,
      pityPrice: 180,
      desc: "【法术流核心】所有主动技能与大招冷却速度加快65%！并且每次释放技能额外 bắn 出2颗奥术飞弹！",
      shout: "🔥无限火力全开!!"
    },
    {
      id: "pk_mag_2",
      archetype: "mage",
      name: "全屏高能弹幕洗地",
      rarity: "UR",
      type: "active",
      unlockedDefault: false,
      cooldown: 6.5,
      baseDamage: 240,
      pityPrice: 180,
      cutinTitle: "【法术奥义】前方高能·亿万彩虹弹幕雨!!",
      cutinSub: "满屏弹幕护体正在蓄力！0.8秒后覆盖轰炸！",
      cutinBg: "linear-gradient(135deg, #001133, #00f0ff, #b829ff)",
      desc: "【彩色主动】播放全屏弹幕前摇，随后向全场倾泻12颗高能追踪弹幕，视觉统治力拉满！",
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
      desc: "【法术流】每次释放主动技能，立即向对手迸发3道闪电弹幕（每道45伤）",
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
      desc: "【法术流】释放任何主动技能时，有50%概率0.3秒后免费再自动重放一次！",
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
      desc: "【回血流核心】每秒固定恢复3.5%最大生命值！进入中后期恢复量翻倍，溢出的治疗自动转化为白盾！",
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
      desc: "【回血流】造成的所有碰撞与技能伤害，38%转化为自身生命值与护盾！",
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
      unlockedDefault: false,
      cooldown: 7.5,
      baseDamage: 180,
      pityPrice: 180,
      cutinTitle: "【武学奥义】静如处子·心眼子弹时间!!",
      cutinSub: "看破一切破绽！冻结全场2秒并连续寸拳暴打！",
      cutinBg: "linear-gradient(135deg, #2b2200, #ffe600, #ff8800)",
      desc: "【彩色主动】开启《师父》专注心眼冻结对手2.0秒，期间我方所有攻击必定暴击且打爆架势条！",
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
      autoBattle: true
    };
  }

  load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return this.getDefaultState();
      const parsed = JSON.parse(raw);
      const def = this.getDefaultState();
      return {
        ...def,
        ...parsed,
        unlockedHeroes: { ...def.unlockedHeroes, ...(parsed.unlockedHeroes || {}) },
        unlockedSkills: { ...def.unlockedSkills, ...(parsed.unlockedSkills || {}) },
        skillLevels: { ...def.skillLevels, ...(parsed.skillLevels || {}) },
        unlockedPerks: { ...def.unlockedPerks, ...(parsed.unlockedPerks || {}) },
        perkLevels: { ...def.perkLevels, ...(parsed.perkLevels || {}) }
      };
    } catch (e) {
      return this.getDefaultState();
    }
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (e) {}
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
      const r = Math.random() * 100;
      let candidates = [];
      if (count === 10 && i === 9 && r > 28) {
        candidates = allItems.filter((it) => it.rarity === "SSR" || it.rarity === "UR");
      } else if (r < 4.5) {
        candidates = allItems.filter((it) => it.rarity === "UR");
      } else if (r < 12.5) {
        candidates = allItems.filter((it) => it.poolType === "hero");
      } else if (r < 28.5) {
        candidates = allItems.filter((it) => it.poolType === "skill" && it.rarity !== "UR");
      } else if (r < 60.0) {
        candidates = allItems.filter((it) => it.poolType === "perk" && it.rarity === "SR");
      } else {
        candidates = allItems.filter((it) => it.poolType === "perk" && it.rarity === "R");
      }

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
