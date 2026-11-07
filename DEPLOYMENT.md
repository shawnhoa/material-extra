# 部署指南 / Deployment Guide

Meterial Extra 是无构建步骤的静态主题。仓库根目录可以直接部署，所有路径都使用相对地址。

## 1. GitHub Pages

仓库已包含 `.github/workflows/deploy-pages.yml`。

1. 打开仓库 **Settings → Pages**。
2. 在 **Build and deployment** 中选择 **GitHub Actions**。
3. 推送到 `main` 分支。
4. 等待 `Deploy demo to GitHub Pages` 工作流完成。

本项目演示地址：

https://shawnhoa.github.io/meterial-extra/

## 2. 普通静态服务器

将整个仓库作为静态目录发布即可：

```bash
python3 -m http.server 8080
```

或使用仓库自带的无依赖服务器：

```bash
npm start
```

不要只上传 `index.html`，还需要同时保留 `src/` 和 `public/`。

## 接口配置

公开仓库只保留接口模板，不包含生产接口、图片、文章和账号数据。请阅读 [API_TEMPLATE.md](API_TEMPLATE.md)，将 `config.example.js` 复制为 `config.js`，再填写自己的公开 API 地址和字段适配逻辑。

## 3. Nginx

```nginx
server {
    listen 80;
    server_name example.com;
    root /var/www/meterial-extra;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    location ~* \.(css|js|svg|png|webp)$ {
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
    }
}
```

更新静态资源版本时，请在链接后添加新的 `?v=` 查询参数，避免浏览器继续使用旧文件。

## 4. Docker

仓库包含 `Dockerfile` 和 `nginx.conf`：

```bash
docker build -t meterial-extra .
docker run --rm -p 8080:80 meterial-extra
```

打开 `http://localhost:8080`。

## 5. 生产部署示例

实际使用 Meterial Extra 的公开站点：

- [ShawnHo 的小屋](https://shawnho.top/)

该链接仅作为成功部署示例。生产站点的文章、账号、图片和服务器配置不属于本开源仓库。

## 发布前检查

```bash
npm run check
npm run visual
```

源码发布包：

```bash
npm run package
```

Windows 下生成 ZIP：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/package-release.ps1
```

若要把主题用于自己的站点：

1. 替换 `src/data/demo.js` 中的演示文章。
2. 替换 `public/assets/logo.svg`。
3. 根据自己的字体授权处理主题名称字标。
4. 更新 GitHub、生产示例和页脚链接。
5. 删除不需要的演示组件和配色。
