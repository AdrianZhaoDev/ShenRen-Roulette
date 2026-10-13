# 新角色资源渠道参考

## 渠道清单

| 类型 | 优先渠道 | 使用规则 |
| --- | --- | --- |
| 立绘/图标 | 自制、用户提供、Wikimedia Commons、Openverse | 核对单个文件的许可证与署名要求；不要只看站点首页 |
| GIF/短视频 | 自制、作者明确授权、官方媒体包 | 先确认是否允许下载、改编和再分发；大视频尽量不入仓库 |
| 音效 | 自制、Freesound（逐条看许可证）、OpenGameArt、公共领域音频 | 记录作者、许可证和处理步骤；限制时长与响度 |
| 梗图/网络素材 | 原作者公开授权或仅本地试玩 | 未授权内容标记 `review-required`，不进入可分发包 |

这些是检索入口，不是自动授权。平台用户上传内容必须逐项核实。

## `assets/sources/manifest.json` 登记字段

```json
{
  "character": "角色显示名",
  "file": "assets/images/example.png",
  "source": "原始文件 URL",
  "author": "作者或未知",
  "license": "许可证名称或 unknown",
  "retrievedAt": "YYYY-MM-DD",
  "status": "verified|review-required|blocked",
  "sha256": "可选，实际文件哈希",
  "processing": "裁切、转码、响度处理等"
}
```

图片、GIF、视频、音频分别登记；远程页面和实际文件 URL 都可以记录，但必须区分字段，例如增加 `page`。不能把 `status: verified` 当成法律意见，许可证不明时使用 `review-required`。

## 审核清单

- [ ] 能打开原始来源并定位到具体文件或作者声明
- [ ] 许可证允许当前用途；若不允许，限制为本地试玩并标记风险
- [ ] 已记录作者、来源、下载日期和处理方式
- [ ] 文件尺寸、格式、时长适合浏览器加载
- [ ] 未把远程资源 URL 作为运行时依赖
- [ ] 角色文案没有未经证实的现实人物指控或敏感信息
- [ ] 新技能复用了已有 `effectKind`，或提供了实现与测试
