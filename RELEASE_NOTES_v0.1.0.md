# Meterial Extra v0.1.0

首个可配置的网站布局与功能模板版本。

## 本版本包含

- 响应式桌面与移动端布局
- 首页、全部文章、归档、友链、公告、关于、组件和配色页面
- 中英文界面、深浅模式、圆角和主题切换
- 搜索、分类、话题筛选、统计与导航交互
- API 请求封装、配置示例和接口契约
- GitHub Pages、Nginx 和 Docker 部署配置
- Windows / Linux 运行脚本
- 可免费商用的 Big John 字体文件及直接字体渲染
- ZIP 与 TAR.GZ 源码运行包

## 本版本不包含

- 生产站点内部接口或管理端点
- 数据库、账号、密码、会话和密钥
- 原始文章、私有图片或用户上传资源
- 任何生产服务器私密配置

`https://shawnho.top/` 仅作为公开生产部署链接示例。用户应阅读 `API_TEMPLATE.md`，通过 `config.example.js` 和 `src/js/api.js` 连接自己的服务。

## 运行

```bash
npm start
```

或在 Windows 运行 `run.ps1`，Linux/macOS 运行 `sh run.sh`。

## 发布包

- `meterial-extra-0.1.0.zip`
- `meterial-extra-0.1.0.tar.gz`
