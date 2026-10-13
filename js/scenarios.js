window.SCENARIO_PRESETS = {
  comeback: [
    { at: 3, action: "text", content: "🎬 逆风翻盘剧本启动…" },
    { at: 10, action: "hp", target: "p1", value: 0.15 },
    { at: 10, action: "text", content: "主角被压制到残血…", color: "#ff2a54" },
    { at: 15, action: "q" },
    { at: 15, action: "text", content: "触发绝境天赋!!" },
    { at: 20, action: "ult", target: "p1" },
    { at: 22, action: "e" },
    { at: 22, action: "text", content: "⚡ 贴脸终结!!" }
  ],
  faceoff: [
    { at: 3, action: "text", content: "🔥 贴脸血战剧本启动…" },
    { at: 5, action: "e" },
    { at: 12, action: "e" },
    { at: 12, action: "text", content: "再次贴脸!!" },
    { at: 20, action: "ult", target: "p1" },
    { at: 22, action: "ult", target: "p2" },
    { at: 25, action: "e" },
    { at: 25, action: "text", content: "⚡ 最终对决!!" }
  ],
  truck: [
    { at: 3, action: "text", content: "🚛 卡车派对剧本启动…" },
    { at: 5, action: "r" },
    { at: 10, action: "r" },
    { at: 10, action: "text", content: "加倍卡车!!", color: "#ffe600" },
    { at: 15, action: "e" },
    { at: 16, action: "r" },
    { at: 16, action: "text", content: "🚛🚛🚛 百吨轰炸!!" },
    { at: 22, action: "r" }
  ],
  custom: [],
};
