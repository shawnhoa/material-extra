# 接口配置模板 / API Template

仓库不包含任何生产站点的内部接口、账号、文章、图片或上传资源。`config.js` 默认使用生成的演示内容；`config.example.js` 提供可替换的接口结构。

## 配置

复制配置示例并修改：

```bash
cp config.example.js config.js
```

```js
window.METERIAL_EXTRA_CONFIG = {
  apiBaseUrl: "https://your-api.example.com",
  contentMode: "remote",
  endpoints: {
    posts: "/api/posts",
    post: "/api/posts/:id",
    archive: "/api/archive",
    friends: "/api/friends",
    announcements: "/api/announcements",
    about: "/api/site-meta"
  }
};
```

前端代码只应包含公开客户端配置。密码、数据库地址、私钥、服务端 Token 和内部管理接口不得写入 `config.js`。

## 兼容接口

`src/js/api.js` 提供 `createContentApi()`、`pathFor()` 和以下请求模板：

```text
GET /api/posts
GET /api/posts/:id
GET /api/archive
GET /api/friends
GET /api/announcements
GET /api/site-meta
```

接口和字段可以按后端结构调整；请同步修改 `config.js` 中的路径以及 `src/js/api.js` 的响应适配逻辑。

## 推荐的公开响应结构

### 文章列表

```json
{
  "posts": [
    {
      "id": "story-slug",
      "title": "Story title",
      "summary": "Short summary",
      "category": "design",
      "topics": ["systems"],
      "date": "2026-10-18",
      "minutes": 7,
      "cover": "/public/images/story-cover.webp"
    }
  ],
  "pagination": { "page": 1, "pages": 1 }
}
```

### 友链

```json
{
  "friends": [
    {
      "name": "Example",
      "description": "A public description",
      "url": "https://example.com"
    }
  ]
}
```

### 公告

```json
{
  "announcements": [
    {
      "id": "notice-id",
      "title": "Notice title",
      "body": "Notice body",
      "published_at": "2026-10-20"
    }
  ]
}
```

## 安全边界

- 前端配置只放公开地址和公开客户端参数。
- 图片应由你的公开媒体域名提供，或由后端生成临时公开链接。
- 需要登录的接口使用安全、同站 Cookie 或你自己的短期客户端授权流程。
- 管理接口应留在独立管理域名或单独服务中，不进入公开主题代码。
- 生产部署前请根据后端字段修改 `src/js/api.js`，并移除不需要的生成演示数据。
