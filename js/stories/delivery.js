window.SCENARIO_PRESETS.delivery = {
  "title": "顾客点了外卖，大运把顾客送走了",
  "recording": true,
  "duration": 120,
  "p1HeroId": "dayun",
  "p2HeroId": "hajimi",
  "timeline": [
    {
      "at": 0,
      "action": "caption",
      "content": "接单：这单必须送到。",
      "duration": 8,
      "chapter": "接单"
    },
    {
      "at": 0,
      "action": "guard",
      "target": "p1",
      "value": 0.35
    },
    {
      "at": 0,
      "action": "guard",
      "target": "p2",
      "value": 0.5
    },
    {
      "at": 8,
      "action": "caption",
      "content": "顾客：不下楼，也不签收！",
      "duration": 10,
      "chapter": "客户来电"
    },
    {
      "at": 10,
      "action": "e"
    },
    {
      "at": 10,
      "action": "stun",
      "target": "p1",
      "duration": 2.5
    },
    {
      "at": 17,
      "action": "hp",
      "target": "p1",
      "value": 0.55
    },
    {
      "at": 18,
      "action": "caption",
      "content": "餐还没接。\n骑手先挨了一顿打。",
      "duration": 10
    },
    {
      "at": 20,
      "action": "hp",
      "target": "p1",
      "value": 0.42
    },
    {
      "at": 28,
      "action": "guard",
      "target": "p1",
      "value": 0.15
    },
    {
      "at": 28,
      "action": "hp",
      "target": "p1",
      "value": 0.32
    },
    {
      "at": 28,
      "action": "caption",
      "content": "顾客：还没送到？差评！\n骑手：你先让开啊！",
      "duration": 7
    },
    {
      "at": 30,
      "action": "e"
    },
    {
      "at": 35,
      "action": "caption",
      "content": "平台：即将超时！\n骑手：开盾，硬送。",
      "duration": 10,
      "chapter": "平台催单"
    },
    {
      "at": 35,
      "action": "hp",
      "target": "p1",
      "value": 0.22
    },
    {
      "at": 35,
      "action": "shield",
      "target": "p1",
      "value": 0.35
    },
    {
      "at": 45,
      "action": "hp",
      "target": "p1",
      "value": 0.18
    },
    {
      "at": 45,
      "action": "caption",
      "content": "平台：别让顾客等！\n骑手：他正在追着我打！",
      "duration": 10
    },
    {
      "at": 46,
      "action": "e"
    },
    {
      "at": 55,
      "action": "caption",
      "content": "护盾再顶一下。\n这单不能超时。",
      "duration": 10
    },
    {
      "at": 55,
      "action": "guard",
      "target": "p1",
      "value": 0.06
    },
    {
      "at": 55,
      "action": "hp",
      "target": "p1",
      "value": 0.15
    },
    {
      "at": 55,
      "action": "shield",
      "target": "p1",
      "value": 0.2
    },
    {
      "at": 65,
      "action": "caption",
      "content": "普通配送失败，升级重型。\n骑手车队：第一波出发！",
      "duration": 10,
      "chapter": "重型配送"
    },
    {
      "at": 65,
      "action": "guard",
      "target": "p2",
      "value": 0.25
    },
    {
      "at": 68,
      "action": "r"
    },
    {
      "at": 72,
      "action": "hp",
      "target": "p2",
      "value": 0.4
    },
    {
      "at": 75,
      "action": "caption",
      "content": "顾客：拒收！\n骑手：那就加急。",
      "duration": 10
    },
    {
      "at": 78,
      "action": "hp",
      "target": "p1",
      "value": 0.1
    },
    {
      "at": 78,
      "action": "e"
    },
    {
      "at": 85,
      "action": "caption",
      "content": "骑手车队：第二波，加急！\n骑手：今天必须送到。",
      "duration": 10
    },
    {
      "at": 85,
      "action": "guard",
      "target": "p2",
      "value": 0.08
    },
    {
      "at": 85,
      "action": "r"
    },
    {
      "at": 89,
      "action": "hp",
      "target": "p2",
      "value": 0.18
    },
    {
      "at": 95,
      "action": "caption",
      "content": "骑手：快没血了，别催！\n平台：订单仍未完成。",
      "duration": 5,
      "chapter": "超时警报"
    },
    {
      "at": 95,
      "action": "guard",
      "target": "p1",
      "value": 0.005
    },
    {
      "at": 95,
      "action": "hp",
      "target": "p1",
      "value": 0.03
    },
    {
      "at": 95,
      "action": "shield",
      "target": "p1",
      "value": 0
    },
    {
      "at": 100,
      "action": "q"
    },
    {
      "at": 100,
      "action": "caption",
      "content": "1滴血，也得送到。\n锁血3.5秒，技能刷新！",
      "duration": 8,
      "chapter": "贴脸收尾"
    },
    {
      "at": 101,
      "action": "e"
    },
    {
      "at": 101,
      "action": "stun",
      "target": "p2",
      "duration": 2.5
    },
    {
      "at": 108,
      "action": "caption",
      "content": "骑手：您好，贴脸送达。\n顾客：我没点转生套餐！",
      "duration": 7
    },
    {
      "at": 108,
      "action": "e"
    },
    {
      "at": 108,
      "action": "guard",
      "target": "p2",
      "value": 0.015
    },
    {
      "at": 108,
      "action": "hp",
      "target": "p2",
      "value": 0.06
    },
    {
      "at": 115,
      "action": "caption",
      "content": "订单已送达。\n客户也已送达。",
      "duration": 9,
      "chapter": "签收"
    },
    {
      "at": 115,
      "action": "guard",
      "target": "p2",
      "value": 0
    },
    {
      "at": 120,
      "action": "finish",
      "target": "p2"
    }
  ]
};
