# 999Wrld Network — 项目说明（中文版）

> 本文件是 README 的中文翻译版。界面与代码已完成简体中文汉化（默认语言：`zh`），原语言（西/英）仍可通过右上角语言切换器使用。

**999Wrld Network** 是一个功能完整的 Minecraft 服务器官网，带有**社区/社交网络**风格：新闻、论坛、个人资料、商店、客服工单以及完整的后台管理面板。

**技术栈**：Next.js 14（App Router）+ React + TypeScript ｜ TailwindCSS + Framer Motion ｜ NextAuth（JWT）｜ MongoDB Atlas + Mongoose ｜ AI 聊天机器人（Groq）

---

## 🚨 运行需要许可证

> [!IMPORTANT]
> 本项目**没有有效的 KayX 许可证将无法启动**，开发和生产环境均需要许可证，激活与支持通过官方 Discord 处理。

```env
KAYX_LICENSE_KEY=你的许可证密钥
KAYX_PRODUCT_ID=你的产品名称
KAYX_LICENSE_API_URL=http://你的服务器:3001/api/client
KAYX_API_TOKEN=你的API密钥
```

许可证缺失或无效时：应用启动被阻止、网站跳转到许可证页面、受保护的 API 返回 `403`。

---

## ✨ 功能亮点

- 社交身份：`@username` + `displayName`（类似社交应用）
- 动态内容：博客/新闻 + 支持多媒体的论坛
- 生产可用的管理后台：角色、审核与设置
- SEO 就绪：`sitemap.xml`、`robots.txt`、规范链接、JSON-LD
- 部署友好：MongoDB Atlas + NextAuth + 兼容 Vercel 的上传

### 🌐 公开功能
首页（服务器状态，IP/端口可配置）· 新闻/博客（文章、浏览、点赞）· 论坛（帖子、回复、点赞、图片）· 公开/私密个人资料（头像、横幅、动态、关注）· 商店（商品+分类）· 客服（工单+聊天）· 通知 · 法律页面（条款/隐私/规则）

### 🛠️ 管理后台（`/admin`）
控制台统计 · 用户管理（角色/封禁/认证）· 商品管理 · 工单 · 论坛审核 · 新闻管理 · 职位申请 · 日志 · 设置（含维护模式）· 按板块权限（OWNER）

---

## 🚀 快速开始

```bash
npm install                 # 1. 安装依赖
cp .env.example .env        # 2. 复制环境变量模板
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"  # 3. 生成 NEXTAUTH_SECRET
npm run init-db             # 4. 初始化数据库（含初始管理员）
npm run dev                 # 5. 启动开发服务器
```

打开 http://localhost:3000 。完整部署指南见 SETUP.md。

## 🔐 角色与权限

| 角色 | 权限 |
|---|---|
| `OWNER` | 完全访问 + 按板块分配权限 |
| `ADMIN` | 后台访问（可按板块限制） |
| `STAFF` | 后台访问 |
| `USER` | 公开页面 + 自己的资料 |

初始管理员由 `npm run init-db` 使用 `ADMIN_EMAIL` / `ADMIN_PASSWORD` 创建。

## 🔧 环境变量（主要）

**必需**：`KAYX_LICENSE_KEY`、`KAYX_PRODUCT_ID`、`KAYX_LICENSE_API_URL`、`KAYX_API_TOKEN`、`MONGODB_URI`、`NEXTAUTH_URL`、`NEXTAUTH_SECRET`

**常用可选**：`ADMIN_EMAIL`/`ADMIN_PASSWORD`（初始管理员）、`SITE_NAME`、`SITE_URL`、`MINECRAFT_SERVER_IP/PORT`（服务器状态）、`BLOB_READ_WRITE_TOKEN`（Vercel 上传）、`GROQ_API_KEY`（聊天机器人）、`CLOUDINARY_URL`（备用图床）、`NEXT_PUBLIC_DISCORD_URL` 等社交链接

## 📜 常用脚本

| 命令 | 说明 |
|---|---|
| `npm run dev` / `build` / `start` / `lint` | 开发 / 构建 / 运行 / 检查 |
| `npm run init-db` | 初始化数据库 + 创建管理员 |
| `npm run stats` | 项目统计 |
| `node scripts/reset-admin-password.js` | 重置管理员密码 |

## 🖼️ 文件上传

- **本地开发**：写入 `public/uploads/...`
- **生产（Vercel）**：文件系统为临时的，必须使用 **Vercel Blob**（`BLOB_READ_WRITE_TOKEN`）或 Cloudinary

## 🌍 部署（推荐 Vercel）

1. 在托管平台配置环境变量；2. 检查 Atlas 的 IP 白名单；3. 将 `NEXTAUTH_URL` 设为正式域名；4. 配置 Blob Token（如需上传）。

## 🗺️ SEO

内置 `sitemap.xml`、`robots.txt`、规范链接与 JSON-LD（Organization / WebSite / NewsArticle / DiscussionForumPosting）。生产环境设置 `SITE_URL` 后到 Google Search Console 提交站点地图。

## 🧯 故障排查

- **登录失败**：检查 `MONGODB_URI`、`NEXTAUTH_URL`、`NEXTAUTH_SECRET`，运行 `npm run init-db`，清除 `.next` 缓存重启
- **MongoDB 连接失败**：核对 Atlas 用户名/密码与 IP 白名单
- 更多见 TROUBLESHOOTING.md

## 🔒 安全

不要把 `.env` 提交到仓库；密钥泄露立即轮换；漏洞上报见 SECURITY.md。

## 📄 许可

本项目基于 **AGPL-3.0** 许可，见 LICENSE。

## 📝 汉化说明

- 默认语言已改为中文（`lib/i18n.ts` 的 `normalizeLang` 默认值）
- 新增 `zh` 完整字典（838 条），原 `es`/`en` 字典保留
- 语言切换器（`components/LanguageSwitcher.tsx`）新增「简体中文」
- 页面/组件中硬编码的西班牙语提示已批量替换为中文
- 日期格式：中文环境使用 `zh-CN`

---

## 🔓 许可证说明（本修改版）

本修改版已**从根源移除 KayX 许可证与 API 验证**：

- `lib/license.ts` → 替换为存根，`validateLicense()` 始终返回通过
- `scripts/license-check.mjs` → 启动校验永远通过，`npm run dev` / `npm start` 不再拦截
- `middleware.ts` → 移除每请求的许可证拦截与 `/licencia` 跳转
- `app/licencia`、`app/api/license` → 已删除

**不再需要** `KAYX_LICENSE_KEY`、`KAYX_PRODUCT_ID`、`KAYX_LICENSE_API_URL`、`KAYX_API_TOKEN` 等变量，`.env` 中可全部删除。

---

## 🎮 Minecraft 服务器在线检测

网站首页和状态接口会**联网检测你的 MC 服务器是否可用**，双通道保证：

1. **直连 Server List Ping（SLP 协议）**：Node.js 托管时直接 TCP 连接服务器 25565 端口，毫秒级、零依赖
2. **公共 API 兜底（mcsrvstat.us）**：Vercel 等 Serverless 环境（无法使用 TCP）自动改用公共 API

**配置**（`.env`）：
```env
MINECRAFT_SERVER_IP=你的服务器IP或域名
MINECRAFT_SERVER_PORT=25565
NEXT_PUBLIC_MINECRAFT_SERVER_IP=你的服务器IP或域名   # 首页展示用
```

**手动检测**（无需启动网站）：
```bash
npm run check:server                      # 检测 .env 中配置的服务器
node scripts/check-server.mjs mc.example.com 25565   # 检测任意地址
```

**接口**（供前端/第三方调用）：`GET /api/server/status?host=IP&port=25565`
返回 `{ online, players: { online, max, list }, version, motd, favicon, ping }`
