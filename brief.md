# 立项契约 brief.md（W0 · 团长唯一写入者）

> 全流程唯一输入源。本文件是动态内容，允许包含项目名与日期；**不要把它拼进 SHARED-PREFIX.md**。

## 1. 目标

做一个**纯前端**的「文字海报生成器」：用户输入一段中文/中英混排文字，浏览器用 Canvas 2D 实时排版并渲染成海报，可切换主题/画幅/横竖排并导出 PNG；产物部署到 Vercel，公网可直接访问。

## 2. 非目标（明确不做什么）

- [x] 不做登录、账号、云端存储、任何后端 API / Serverless 函数
- [x] 不做 AI 文生图、模板商城、多人协作、评论
- [x] 不做付费、数据埋点、SEO 内容站
- [x] 不引入 React/Vue 等框架，不引入打包器（原生 ES Module 静态托管）
- [x] 不加载网络字体（只用系统字体栈），不引入版权图库/字体

## 3. 约束

- 技术栈：HTML + CSS + 原生 ES Modules + Canvas 2D；测试用 Node 内置 `node --test`，**零运行时依赖、零构建步骤**
- 字体：系统字体栈（宋体/黑体/楷体/等宽），保证 Windows/macOS 都有回退
- 浏览器：Chrome/Edge 120+、Safari 17+、Firefox 121+
- 部署：Vercel 静态托管，部署根目录 `project/src/`
- 时间与成本：单轮跑完，W3 两个 dev 并行 + 一个 test 并行
- 合规与安全：无用户数据上传；分享链接只把参数编码进 URL hash，不发请求

## 4. 验收标准

- [ ] 输入 40–300 字中文段落，输入停止后 1 帧内出预览；预览与导出 PNG 的内容、比例一致
- [ ] 中文按字换行、英文按词换行；行首不出现 `，。、；：！？）」』》` 等禁则标点；英文单词不被截断
- [ ] 5 种画幅（3:4 / 4:5 / 1:1 / 9:16 / 16:9）切换后画布比例正确，导出尺寸 = 画幅 × 2
- [ ] ≥8 个主题，配色/字体/装饰各不相同；「随机灵感」同一个 seed 结果可复现
- [ ] 支持横排 / 竖排、左/中/右对齐、首句放大、页脚署名、右上角标签
- [ ] 导出 2x PNG 成功；刷新页面恢复上次文字与设置
- [ ] `node --test project/tests` 全绿；`node project/ci/precheck.mjs` 通过；`node project/ci/smoke.mjs` 通过
- [ ] Vercel 线上 URL 可访问，`index.html` 返回 200，控制台无报错

## 5. 已知材料

| 材料 | 路径 | 允许哪个阶段读 |
|---|---|---|
| agent team 骨架（流程/编排器/交接协议） | 上级目录 agent-team-skeleton/ | W0–W5 |
| 用户原始需求 | 本文件 #1 / #4 | 全阶段 |

## 6. 交付物清单

| 产物 | 路径 | 唯一写入者 |
|---|---|---|
| 立项契约 | project/brief.md | lead |
| Gate 判定记录 | project/gates.md | lead |
| PRD | project/prd.md | prd-writer |
| 架构 / 契约 / 所有权 / CI 骨架 | project/architecture.md, api-contract.yaml, ownership.yaml, ci/*.mjs | architect |
| 渲染引擎 | project/src/js/core/** | dev/a |
| 界面与交互 | project/src/index.html, project/src/css/**, project/src/js/ui/** | dev/b |
| 测试与 package.json | project/tests/**, project/package.json | test/contract |
| Vercel 配置 / 部署记录 | project/src/vercel.json, project/deploy.md | release |
| 计量日志 / 运行状态 | project/usage.jsonl, run-state.json | **编排器**（成员不得写） |

## 7. 参考与调研切面（本项目不单独扇出 W1 调研）

| 切面 | 边界：只查什么，明确不查什么 | 来源指引 | 最大检索轮次 |
|---|---|---|---|
| 排版参考 | 只看文字卡片的行宽/留白/字号层级，不做竞品功能清单 | 小红书/微博文字卡片、日式竖排海报 | 0（已内化进 PRD） |
| 版权约束 | 只确认系统字体与自绘装饰可商用，不调研图库授权 | 系统字体栈 | 0 |

> 项目为单人小工具，调研合并进 W0，省掉 4 个扇出成员。W1 直接写 PRD。

## 8. 规模与 effort 预算

- L 条件：[ ] 新起服务　[x] 有跨模块接口（core ↔ ui）　[x] 改动文件数 > 8　[ ] 需要外部系统或数据迁移
- M 条件：[x] 改动 2 个及以上模块　[x] 需要契约　[x] 改动文件数 3–8
- 判定结果：M（纯静态、无后端、无迁移；W3 按 2 个 dev + 1 个 test 扇出）
- 总 token 预算：300k 量级；各波占比见 `runbook/budgets.json`
- 规模规则：M = 2–4 成员每员 10–15 次调用

## 9. 假设与风险

- 假设：Vercel 静态托管无需构建配置；用户本机装有常见中文字体
- 假设：Canvas `measureText` 在目标浏览器可用（含 `letterSpacing` 属性不支持时的兜底）
- 风险：不同 OS 字体回退宽度不同，导致同一段文字行数略有差异——接受，导出以本机字体为准
- 风险：竖排时英文/数字处理不完美——降级为逐字竖排，PRD 中标注限制
- 风险：Vercel 需要用户登录/CLI 授权，部署可能停在凭据上——由 release 报 blocked，团长升级给用户

## 10. Gate 与变更记录

- Gate 判定统一记录在 `project/gates.md`（lead 唯一写入者），此处只登记判定人姓名。
- Gate 1（PRD 定稿）判定人：用户（首条需求即授权范围，代记为「用户预授权」）
- Gate 2（契约冻结）判定人：用户（同上）
- 编排器命令：`python scripts/orchestrator.py approve-gate G1 --by <姓名>`
- Gate 不通过时的动作：只重试本波，不重跑上游

| 时间 | 变更内容 | 影响波次 |
|---|---|---|
| 2026-11-09 | 立项：M 规模，纯前端 Canvas 海报生成器，Vercel 部署 | W0 |
