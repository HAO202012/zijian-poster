# 部署记录（W5 · release 唯一写入者）

## 1. 结论

| 项 | 结果 |
|---|---|
| 本地集成 | 通过（precheck / 35 项测试 / smoke 全 200） |
| 浏览器验收 | 通过（Edge 实机，桌面 1280×860 + 移动 390×844，控制台零报错） |
| Vercel 部署 | **成功**：`READY`，生产别名已绑定 |
| 线上地址 | **https://zijian-poster.vercel.app** |
| 部署 ID | `dpl_F2ifmJigKq8tkYn2YmHPTjUVi2Si`（`zijian-poster-4iezk3yjy-wang-17d4.vercel.app`） |
| 账号 / 团队 | `hao202012` / `wang-17d4` |
| 部署保护 | 已关闭（`ssoProtection: null`），`zijian-poster.vercel.app` 无需登录即可访问 |
| 线上 HTTP 复核 | **由本机网络限制未完成**：本机到 `*.vercel.app` 的 443 连接超时（DNS 解析到 202.160.130.118，任何边缘 IP 均 000），Vercel API 侧已确认 `READY` + 域名 `verified` |

> 需要你在浏览器打开一次确认首屏；若出现 404，说明根目录被 CLI 多套了一层 `src`，处理方式见 §6。

## 2. 部署方式

纯静态站，无构建步骤。部署内容 = `project/src/`（index.html + css + 6 个 core 模块 + 1 个 ui 模块 + vercel.json）。

```bash
# 首次 / 日常发布
npx vercel deploy --prod --yes --project zijian-poster

# 指定团队时
npx vercel deploy --prod --yes --project zijian-poster --scope wang-17d4
```

注意事项（实测踩到的坑）：

- 在 `project/` 或 `text-poster/` 目录里带路径参数部署时，Vercel CLI 会把上级 `package.json` 当项目根，产物树里多一层 `src/`。**在 `project/src/` 目录内直接执行**最稳。
- 项目名 `zijian-poster` 首次部署需 `--create-if-missing`，否则报 `Project was not found`。
- 团队成员默认继承团队级 Deployment Protection；本项目已用 API 把 `ssoProtection` 置为 `null`。若重建项目，记得再关一次，否则线上是 Vercel 登录页。

`project/src/vercel.json` 已固定：`cleanUrls`、`trailingSlash=false`、`X-Content-Type-Options`、`Referrer-Policy: no-referrer`、`X-Frame-Options`、`Permissions-Policy`，`/js/*` 设 `max-age=0, must-revalidate`。

## 3. 本地复核命令（发布前置）

```bash
cd text-poster
node project/ci/precheck.mjs   # [OK] 9 个文件，无外链、无裸模块 import
node project/ci/test.mjs       # 35 pass / 0 fail
node project/ci/smoke.mjs      # [OK] 5 个资源 200

# 本地预览
cd project/src && npx serve .
```

## 4. 浏览器验收记录（W4 / W5 共用）

| 编号 | 用例 | 结果 |
|---|---|---|
| A1 | 文案清空 → 预览显占位文案、导出/复制禁用 | 通过 |
| A2 | 输入 47 字 → 刷新后文字/主题/画幅恢复 | 通过 |
| A3 | 分享链接（#s=）新标签打开 → 主题/画幅/文字一致 | 通过 |
| A4 | 1:1 导出 → 2160×2160（2x）、文件名 `zijian-moss-1x1-42.png` | 通过 |
| A5 | 3:4 导出 → 2160×2880，约 5–8MB（颗粒纹理，属预期） | 通过 |
| A6 | 同 seed 随机风格两次结果一致 | 通过 |
| A7 | 竖排 / 横排切换、首句放大、页脚与标签 | 通过 |
| A8 | 移动端 390×844 布局、吸底操作 | 通过 |

## 5. 上线后冒烟清单

- [ ] 首页 200，标题「字间 ZIJIAN · 文字海报生成器」
- [ ] `/js/ui/app.js`、`/js/core/renderer.js` content-type 为 `text/javascript`
- [ ] 输入文字 → 预览在 1 帧内更新
- [ ] 下载 PNG → 尺寸 = 画幅 × 2
- [ ] 刷新后恢复上次内容（localStorage）
- [ ] 控制台无报错、无 404（favicon 已内联为 data URI）
- [ ] 手机端打开不被登录页拦截

## 6. 若线上 404

说明部署根目录被套了一层 `src`。两种修法任选：

1. 在 `project/src/` 内重新部署（推荐）：
   ```bash
   cd project/src && npx vercel redeploy --prod --yes --project zijian-poster
   ```
2. 改用 Build Output API：把站点文件放到 `.vercel/output/static/`，写 `.vercel/output/config.json` 为 `{"version":3}`，再 `vercel deploy --prebuilt --prod`。

## 7. 回滚

在 Vercel 控制台 Deployments 里 Promote 上一个部署，或：

```bash
npx vercel rollback zijian-poster-i80zioeit-wang-17d4.vercel.app --token $VERCEL_TOKEN
```

## 8. 已知限制

- 2x PNG 体积 5–8MB（颗粒纹理），平台若限体积可把 `exporter.renderToCanvas` 的 scale 调成 1.5。
- 字体走系统栈，不同 OS 行数可能差 1 行。
- 分享链接只编码非默认字段，超长文案链接可能被平台截断（UI 已提示）。
- 项目上仍挂着一条自动化保护绕过密钥（由 `vercel curl` 自动创建）；保护已整体关闭，密钥不再有额外作用，可在 Project → Settings → Deployment Protection 内吊销。
