# 技术架构（W2 · architect 唯一写入者）

> Gate 2 检查对象。本文件与 `api-contract.yaml`、`ownership.yaml`、`ci/*.mjs` 同时产出、同时冻结。
> 需求基线：`project/prd.md`（只引用 ID，不复制全文）。约束来源：`project/brief.md#3 #4`。

## 1. 上下文

- 产品：字间 ZIJIAN，纯前端文字海报生成器；输入文字 → Canvas 排版 → 导出 PNG。
- 形态：零构建静态站（HTML + CSS + 原生 ES Module），部署根目录 `project/src/`，Vercel 静态托管。
- 无后端、无第三方运行时依赖；测试用 Node 内置 `node --test`。
- 关键约束：中文换行必须可控（禁则）、导出的图必须与预览一致、同 seed 同结果。

## 2. 架构决策记录（ADR）

| ID | 决策点 | 备选方案 | 决定 | 理由 | 代价 / 风险 |
|---|---|---|---|---|---|
| A1 | 构建方式 | Vite/打包器；零构建 ES Module | 零构建 | 产物即源码，Vercel 直接静态托管，无 CI 构建失败面；本项目模块数 < 10，浏览器原生 ESM 足够 | 无 tree-shaking / 无 TS 类型检查；靠契约测试兜底 |
| A2 | 渲染方案 | 第三方海报库；DOM+html2canvas；原生 Canvas 2D | 原生 Canvas 2D | 导出即所见，无 DOM 截图误差；文字换行、字距、透明度完全可控 | 排版算法要自己写（最大工作量在 text-layout） |
| A3 | 字体 | 网络字体（思源系列）；系统字体栈 | 系统字体栈 | 中文 webfont 动辄 5–10MB，且 `document.fonts.ready` 前渲染会错位；系统栈零请求零 FOUT | 不同 OS 字形/宽度不同，行数可能差 1 行；接受 |
| A4 | 模块划分 | 单文件 app.js；按 core/ui 拆分 | core（纯逻辑+绘制）/ ui（DOM+状态） | core 可在 Node 里用假 measurer 单测；ui 改动不会碰排版算法；两人可并行 | 需要一份模块契约（本波产出） |
| A5 | 文本测量 | 依赖 `ctx.letterSpacing`（Chrome 99+）；逐字测量 | 逐字测量 + 手动推进 | Safari 17 前不支持该属性，逐字绘制保证预览/导出/测试三方测量一致 | 长英文单词失去 kerning/ligature，视觉影响可忽略 |
| A6 | 自动适配字号 | 固定字号 + 截断；二分搜索最大可放字号 | 二分搜索（12 次迭代，下限 10px） | 用户不改参数也能放下 300 字；对数复杂度避免逐档重排卡顿 | 字号非整数时用 `Math.round` 收敛，可能差 0.5px |
| A7 | 分享链接 | 服务端短链；URL hash base64url | URL hash 只编码非默认字段 | 零后端；hash 不发请求，不泄露内容到服务器日志 | 长文链接可能 > 2KB，PRD Q2 已接受 |
| A8 | 装饰纹理 | 外部位图纹理；Canvas 程序化绘制 | 程序化绘制（渐变/网格/噪点/角标） | 零网络请求、可随主题变量、可 2x 无损导出 | 噪点用 180px tile 平铺，放大后颗粒略均匀（可接受） |

## 3. 模块划分

| 模块 | 职责 | 对外接口 | 依赖 | owner |
|---|---|---|---|---|
| `core/rng.js` | 可复现随机数（FNV-1a + mulberry32） | `hashSeed` / `createRng` | 无 | dev/a |
| `core/presets.js` | 画幅、主题、字体栈、示例文案、文本框换算、随机风格 | `RATIOS` / `THEMES` / `FONTS` / `SAMPLES` / `PLACEHOLDER_TEXT` / `getTheme` / `getRatio` / `getTextBox` / `resolveFontStack` / `randomStyle` | rng 类型约定 | dev/a |
| `core/text-layout.js` | 切词、CJK 换行、禁则、竖排、字号自适应 | `normalizeText` / `tokenizeParagraph` / `wrapParagraph` / `layoutText` / `layoutDocument` / `fitDocument` | 纯函数，无 Canvas | dev/a |
| `core/spec.js` | 规格归一化与分享编解码 | `DEFAULT_SPEC` / `normalizeSpec` / `toShareHash` / `fromShareHash` / `posterFileName` | presets | dev/a |
| `core/renderer.js` | 背景/纹理/装饰/文字/页脚绘制 | `renderPoster(ctx, spec, {width,height})` | presets, rng, text-layout | dev/a |
| `core/exporter.js` | 离屏 2x 重绘、下载、剪贴板 | `renderToCanvas` / `posterBlob` / `downloadPoster` / `copyPoster` | renderer | dev/a |
| `ui/app.js` | 状态、控件、预览缩放、持久化、分享、toast | `boot()`（入口自执行） | core 全部 | dev/b |
| `index.html` / `css/style.css` | 结构与视觉 | `#poster` canvas、`[data-field]` 控件约定 | 无 | dev/b |

> 模块数按 ADR A4 控制在 2 个 owner：core（算法与绘制）与 ui（交互与呈现），测试独立。

## 4. 数据流

```
textarea/控件 → ui/app.js 状态（normalizeSpec）
                     ↓ rAF 合并
              core/renderer.renderPoster(ctx, spec)
                     ↑
        core/text-layout.fitDocument(measure=逐字测量)
                     ↑
            core/presets.getTheme / RATIOS

导出：spec → exporter.renderToCanvas(scale=2) → renderPoster → toBlob → a[download]
分享：spec → spec.toShareHash → location.hash → 刷新 → spec.fromShareHash
持久化：spec → localStorage["zijian.state.v1"]（节流 400ms）
```

## 5. 契约与所有权

- 模块契约：`project/api-contract.yaml`（本波 `frozen: false`，Gate 2 通过后由编排器改为 true）
- 文件所有权：`project/ownership.yaml`（每条路径唯一 owner）
- 变更规则：Gate 2 后任何契约变更须复审并通知受影响 owner；dev 不得改契约

## 6. 测试策略

- 纯逻辑（rng / presets / text-layout / spec）在 Node 里直接 import 测试，用假 measurer：`measure = (text, size) => [...text].length * size`（逐字计宽，不含字距；字距由 layout 内部按 em 叠加），不依赖 Canvas。
- 绘制层不做像素断言（Node 无 Canvas），靠 `smoke.mjs` 起静态服务 + 人工浏览器验收（W4 lead）。
- 契约测试先于实现可用：`test/contract` 只读契约，不读实现。
- 验收映射：F2 → `tests/text-layout.test.js`；F3 → `tests/presets.test.js`（含 THEMES 对比度 ≥4.5:1 不变式）；F4 → `tests/presets.test.js`（画幅尺寸）+ `tests/spec.test.js`（ratioId 归一化）；F8 → `tests/rng.test.js` + `tests/spec.test.js`（seed 取整）；F9 → `tests/spec.test.js`（share 往返、完整 `#s=` URL）。
- 人工验收（W4 lead）：F1 空文本占位、F6 页脚为空时文本块位置不变、竖排 + 首句放大的视觉效果、导出 2x 像素尺寸。

> 口径统一：PRD F2 写的「0.94 递减」是示意，实现用 `fitDocument` 二分搜索达到同一目标（放下且 ≥10px），验收标准不变。

## 7. 风险与缓解

| 风险 | 影响 | 缓解 | 触发条件 |
|---|---|---|---|
| 逐字测量 + 二分搜索在 1000 字时变慢 | F2 交互卡顿 | 只对当前字号做 12 次迭代；测量结果按 `字号+字符` 缓存 | 输入 > 800 字 |
| 系统字体缺楷体 | 楷体主题回退宋体 | 字体栈末位始终带 `serif` 兜底 | Windows 精简版 |
| 竖排 + 首句放大导致列数计算偏差 | 视觉挤压 | 竖排时标题列间距单独 +0.15em；W4 人工看一次 | 竖排 + 长标题 |
| Vercel 未登录 | W5 blocked | release 报 `blocked_on=vercel_auth`，团长升级用户 | 部署时 |
| 分享 hash 过长 | 微信等平台截断 | 只编码非默认字段；超 3000 字符时提示改用下载 | 长文 + 多改项 |
| measure 语义漂移（字距/字体） | 预览与导出宽度不一致 | 契约 v1.1 固定 `measure(text,fontSize,role)` 不含字距，字距只在 layout 内叠加；渲染器与测试共用同一 measure 定义 | W3 起 |

## 9. 评审结论处置（review/arch）

| 编号 | 风险 | 处置 |
|---|---|---|
| R1 | measure 签名三方不一致 | 契约 v1.1 统一为 `measure(text,fontSize,role)`，role ∈ headline/body，假 measurer 统一 `[...text].length*size` |
| R2 | measure 不含字距/字体栈 | 契约明确 measure 不含字距，字距由 layout 内部叠加；FONTS.stack 末位必须 generic |
| R3 | ctx 变换契约含糊 | 契约写明禁止 setTransform/外泄，预览 backing store = 逻辑 × min(dpr,2) |
| R4 | `#s=` 拼接责任无主 | `toShareHash` 只返回纯 base64url，ui 负责拼 `#s=`；`fromShareHash` 接受完整 URL |
| R5 | 示例文案/占位无导出 | presets 增加 `SAMPLES` / `PLACEHOLDER_TEXT`，写入 ui_consumes |
| R6 | fontSize 同名不同义、box 换算缺席 | 契约加单位约定段与 `getTextBox(ratio, margin)`；页脚高度 = 短边×0.06 恒定 |
| R7 | package.json 造成 dev 前置串行 | package.json 改由 architect 在 W2 建骨架（type=module + test script）并在 ownership 登记 |
| R8 | 需求→验收映射错配 | 修正测试映射，THEMES 加对比度不变式，F6 进人工验收清单 |

## 8. 按需加载清单

| 路径 | 用途 | 哪个阶段读 |
|---|---|---|
| `project/references/` | 低频参考（本波未放材料） | 默认不读 |
| `project/prd.md#3` | 需求细节，W3 按模块读对应段 | W3 |

---
> Gate 2 判定由 lead 写进 `project/gates.md`，本文件不写判定结论。
> `project/ci/` 三个 Node 脚本骨架（precheck / test / smoke）由 architect 在 W2 一并产出，owner 登记在 `ownership.yaml`。
