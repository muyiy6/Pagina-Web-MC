# 故障排查指南（中文版）

> TROUBLESHOOTING.md 的中文版。常见问题速查：启动失败、许可证、登录、MongoDB、上传、定时任务、支付与 SEO。

---

## ⚡ 快速检查

遇到问题时先做这一步：

```bash
rm -rf .next
npm install
npm run dev
```

并确认 `.env` 中至少包含：`MONGODB_URI`、`NEXTAUTH_URL`、`NEXTAUTH_SECRET`、`KAYX_LICENSE_KEY`、`KAYX_PRODUCT_ID`、`KAYX_LICENSE_API_URL`、`KAYX_API_TOKEN`。

## 🚨 应用无法就绪（Ready）

**1) 许可证校验失败**：`npm run dev` / `npm start` 提前退出，终端显示许可证认证或完整性错误。检查 KayX 四个变量以及许可证 API 是否可达，详见 docs/license-system.md。
**2) Next.js 缓存损坏**：`rm -rf .next && npm run dev`。
**3) 依赖不同步**：`rm -rf node_modules .next && npm install && npm run dev`。
**4) 终端界面卡但服务可能正常**：项目用 `scripts/dev.mjs` 自定义开发包装器，先确认 Next 是否仍在响应请求。

## 🔐 被重定向到 `/licencia`

说明中间件中的运行时校验失败：许可证变量缺失、产品 ID 错误、API token 错误、许可证服务器不可达或许可证无效/过期。可打开 `/api/license/status` 查看状态，判断是仅启动校验失败还是运行时校验也失败。

## 👤 登录问题

- 检查 `NEXTAUTH_URL`、`NEXTAUTH_SECRET`、MongoDB 连接，以及是否已创建初始管理员（`npm run init-db`）。
- 缺少 NextAuth 密钥时重新生成：`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`，然后重启应用。

## 🗄️ MongoDB 问题

- **认证失败**：`MONGODB_URI` 用户名/密码错误；密码含特殊字符未正确转义；集群主机或数据库名错误。
- **无法连接 Atlas**：检查 Atlas 的 **网络访问白名单**、数据库用户权限，以及是否使用了 Atlas 提供的准确连接串。

## 🌍 仅生产环境的问题

- **本地正常、Vercel 不正常**：确认生产环境变量已设置、修改后已重新部署、`SITE_URL` 与 `NEXTAUTH_URL` 为正式域名、Vercel 能访问许可证 API。
- **改了环境变量没效果**：必须重新部署，Vercel 不会把新变量应用到旧部署。

## 🖼️ 上传问题

- **本地正常但生产环境文件消失**：在 Vercel 上依赖本地文件系统就会出现此问题，请改用 `BLOB_READ_WRITE_TOKEN`（Vercel Blob）或 `CLOUDINARY_URL`。
- **上传被拒绝**：上传助手只接受常见图片格式，会拒绝无效类型或超大文件。

## ✉️ 邮件问题

密码重置或订阅邮件发不出时，检查 `SMTP_HOST`、`SMTP_PORT`、`SMTP_USER`、`SMTP_PASS`、`SMTP_FROM`。未配置 SMTP 时，依赖邮件的功能无法投递真实邮件。

## 🕒 邮件订阅定时任务问题

- **路由返回 401/403**：使用以下任一方式鉴权——Vercel cron（`User-Agent: vercel-cron/1.0`）、`x-cron-secret` 请求头、或 `?secret=`。
- **订阅邮件不发送**：检查 SMTP 是否配置、`SITE_URL`/`NEXTAUTH_URL` 是否设置、后台是否开启自动发送、请求是否发生在所配置的日期时段。

## 💳 支付问题

**PayPal**：检查 `PAYPAL_ENV`、`PAYPAL_CLIENT_ID`、`PAYPAL_CLIENT_SECRET`。**Stripe**：检查 `STRIPE_SECRET_KEY`、`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`、`STRIPE_WEBHOOK_SECRET`。注意不要把测试密钥和正式密钥混用。

## 🗺️ SEO 问题

- **站点地图/规范标签/邮件链接域名错误**：检查 `SITE_URL` 和 `NEXTAUTH_URL`。
- **站长验证失败**：检查 `GOOGLE_SITE_VERIFICATION` 和 `BING_SITE_VERIFICATION`，修改后重新部署。

## 📤 求助时请提供

具体报错信息 · 问题发生在本地还是生产 · `node -v` 版本 · 出错的模块（登录/许可证/上传/邮件/支付/定时任务/部署）· 相关终端输出（注意脱敏，不要泄露密钥）。
