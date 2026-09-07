# 安装配置指南（中文版）

> SETUP.md 的中文版。项目界面已汉化，默认语言为简体中文。

本地开发、生产部署、环境变量、文件上传、邮件、支付、定时任务以及必需的 KayX 许可证流程的完整指南。

---

## ✅ 开始之前

- Node.js **18.17+**（推荐 Node 20+）
- npm
- MongoDB Atlas 或其他可连接的 MongoDB 实例
- 有效的 **KayX 许可证**配置

推荐的生产服务：**MongoDB Atlas**、**Vercel**、**Vercel Blob** 或 **Cloudinary**（上传）

## 🚀 本地快速开始

```bash
npm install                                # 1. 安装依赖
cp .env.example .env                       # 2. 创建 .env
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"   # 3. 生成 NEXTAUTH_SECRET
npm run init-db                            # 4. 初始化数据库（创建初始管理员）
npm run dev                                # 5. 启动开发服务器
```

最低必需配置：

```env
MONGODB_URI=
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=
KAYX_LICENSE_KEY=
KAYX_PRODUCT_ID=minecraft-server-web
KAYX_LICENSE_API_URL=
KAYX_API_TOKEN=
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change-me
```

> [!IMPORTANT]
> 应用会在开发启动前校验许可证，许可证无效或不完整时网站无法启动。

## 🔧 核心环境变量

| 变量 | 必需 | 用途 |
|---|:---:|---|
| `MONGODB_URI` | ✅ | MongoDB 连接串 |
| `NEXTAUTH_URL` | ✅ | 登录回调的基础 URL |
| `NEXTAUTH_SECRET` | ✅ | NextAuth 会话/JWT 密钥 |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | ✅ | 初始管理员（种子数据） |
| `KAYX_LICENSE_KEY` / `KAYX_PRODUCT_ID` / `KAYX_LICENSE_API_URL` / `KAYX_API_TOKEN` | ✅ | KayX 许可证相关 |
| `SITE_NAME` / `SITE_URL` | 推荐 | SEO 与邮件中的品牌名/站点 URL |

许可证可选变量：`KAYX_SHARED_SECRET`、`LICENSE_FAIL_OPEN`（许可证 API 故障时临时放行）、`LICENSE_CACHE_TTL_MS`（校验缓存时长）

## 📦 按功能分类的变量

- **Minecraft**：`MINECRAFT_SERVER_IP`、`MINECRAFT_SERVER_PORT`、`MC_ONLINE_MODE`、`RCON_HOST/PORT/PASSWORD`
- **客户端公开变量**：`NEXT_PUBLIC_MINECRAFT_SERVER_IP/PORT`、`NEXT_PUBLIC_DISCORD_URL`、`NEXT_PUBLIC_TIKTOK_URL`、`NEXT_PUBLIC_YOUTUBE_URL`、`NEXT_PUBLIC_STAFF_APPLICATIONS_OPEN`
- **上传**：`BLOB_READ_WRITE_TOKEN`、`CLOUDINARY_URL`（或 `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET`）
- **邮件**：`SMTP_HOST`、`SMTP_PORT`、`SMTP_USER`、`SMTP_PASS`、`SMTP_FROM`
- **支付（PayPal）**：`PAYPAL_ENV`、`PAYPAL_CLIENT_ID`、`PAYPAL_CLIENT_SECRET`
- **支付（Stripe）**：`STRIPE_SECRET_KEY`、`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`、`STRIPE_WEBHOOK_SECRET`
- **定时任务**：`CRON_SECRET`
- **AI 功能**：`GROQ_API_KEY`、`GROQ_MODEL`、`TICKETS_AI_ENABLED`、`TICKETS_AI_PROVIDER`、`OLLAMA_BASE_URL`、`OLLAMA_MODEL`

## 🌍 生产部署（推荐 Vercel）

1. 在托管平台配置全部环境变量；2. 将 `NEXTAUTH_URL` 和 `SITE_URL` 设为正式域名；3. 确认 Atlas IP 白名单放行部署环境；4. 配置持久化上传服务；5. 确认生产环境可访问 KayX 许可证 API；6. 修改环境变量后重新部署。

**Vercel 注意**：构建用 `npm run build`；生产启动走 `scripts/start.mjs`，会先校验许可证；Vercel 文件系统是临时的，不能用本地上传；预览/生产环境的变量可能不同。

**自建服务器注意**：本地上传需要持久化存储；网站与许可证 API 不在同一机器时，许可证地址不能用 `localhost`；注意防火墙、反向代理、端口与 TLS。

## 🖼️ 文件上传

上传助手按以下优先级工作：1. Cloudinary（已配置）→ 2. Vercel Blob（有 Token）→ 3. 本地文件系统（开发/自建）。

生产推荐配置 `BLOB_READ_WRITE_TOKEN` 或 `CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME`。

## ✉️ 邮件

启用密码重置和邮件订阅需配置 SMTP：

```env
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=999Wrld Network <no-reply@yourdomain.com>
```

未配置 SMTP 时：密码重置邮件无法发送，邮件订阅发送会跳过或失败。

## 💳 支付

仅在需要商店结账时配置，注意测试/正式密钥要匹配，避免结账异常。

```env
# PayPal
PAYPAL_ENV=sandbox
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
```

## 🕒 定时任务与自动化

- 端点：`/api/cron/newsletter-weekly`
- 鉴权方式：`User-Agent: vercel-cron/1.0`、`x-cron-secret` 头、或 `?secret=`（配置 `CRON_SECRET` 时）

```bash
curl -i "https://你的域名/api/cron/newsletter-weekly?secret=你的CRON_SECRET"
```

## 🗺️ SEO 与站长验证

配置 `SITE_URL`、`GOOGLE_SITE_VERIFICATION`、`BING_SITE_VERIFICATION`。内置 `sitemap.xml`、`robots.txt`、规范链接、OpenGraph/Twitter 元数据与 JSON-LD。

## 🧪 上线前检查清单

1. `npm run dev` 能正常启动；2. 登录正常；3. 后台可访问；4. 许可证校验通过；5. 上传可用；6. 密码重置邮件正常；7. 支付使用正确的环境；8. `sitemap.xml` 和 `robots.txt` 响应正常。建议运行 `npm run lint` 和 `npm run build`。

## 📜 常用命令

`npm run dev` · `npm run build` · `npm start` · `npm run lint` · `npm run init-db` · `npm run deliveries:worker` · `npm run stats`

遇到问题请查看 TROUBLESHOOTING.md。
