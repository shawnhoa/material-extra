# Material Extra

![Material Extra Logo](docs/images/IMG_8191.png)

一个基于 Material 3 的个人内容站点模板，包含访客网站、独立管理端和轻量 Python 服务端。首页是一套「品牌舞台」：站点标志被画成舞台中心的小屋，二十四节气与传统／世界节日共 36 套场景围绕它重新编排，小屋会呼吸、眨眼、左右环顾。界面与数据均为该主题框架的演示内容，不包含原部署实例的文章、用户、图片、账号、接口地址或服务器配置。

<p align="center">
  <a href="https://github.com/shawnhoa/material-extra/releases/tag/v0.1.4">下载 v0.1.4</a> ·
  <a href="https://github.com/shawnhoa/material-extra">源代码</a>
</p>

## 预览

线上部署示例：[站点所有者的实例](https://shawnho.top/)。该站点内容与本仓库无关，不会被复制到演示数据中。仓库预览图展示的是该主题架构的演示界面。

![桌面端演示](./docs/images/demo-desktop.png)

![移动端演示](./docs/images/demo-mobile.png)

## 功能

- **品牌舞台首页**：站点标志即舞台小屋，太阳落在屋顶上方，三层山丘、草坪、小径与草丛石子构成前景；36 套节气／节日主题各自拥有独立的天空配色与两侧装饰。
- **角色化动画**：小屋缓慢浮动，双眼定时眨眼（快眨 + 主眨），视线每 14 秒左右环顾一次，笑弧呼吸；太阳光晕、光环自转、山丘极缓横移、小径与草丛各自呼吸。`prefers-reduced-motion` 下全部关闭。
- **无光效的扁平绘制**：小屋只保留纯色块与投影结构，不使用辉光、发光或描边，保证在任何背景下都与插画风格统一。
- **Material 3 访客端**：文章归档、搜索、分类、标签、公告、友链、个人资料页，明暗模式与中英文界面，响应式布局。
- **独立管理端**：文章编辑、站点外观配置、公告维护、评论审核、用户管理、举报与友链申请处理；外观面板可切换圆角、宽度、卡片样式、密度与动效等级，主题预览卡与首页使用同一套渲染逻辑。
- **图标按需子集化**：Material Symbols 从 2.1 MB 裁剪到约 26 KB（按源码实际引用生成），配合字体预加载与「字体就绪前不绘制连字文字」的保护，避免首屏出现图标文字。
- **静态资源缓存**：`send_file` 输出 ETag / Last-Modified / Cache-Control，带版本号的资源一年 immutable，字体一天，其余走 304 协商。
- **轻量服务端**：Python 标准库 HTTP 服务，数据保存在单独的数据目录；图片上传与富文本内容提供服务端校验。
- **部署友好**：Docker Compose 与 Windows、Linux/macOS 启动脚本。

## 快速开始

需要 Python 3.10+（Windows 安装时请勾选 “Add python.exe to PATH”），唯一依赖是 Pillow：

```sh
python -m pip install -r app/requirements.txt
```

Linux / macOS：

```sh
cp .env.example .env
sh run.sh
```

Windows：直接双击 **`run.cmd`**（推荐），或在终端里执行：

```bat
run.cmd
```

`run.cmd` 会自动补一份 `.env`、设置环境变量并启动服务，不依赖 PowerShell 脚本执行策略，因此从压缩包解压到「下载」目录后也能直接运行。

如果你更习惯 PowerShell，脚本文件可能带有“网络来源”标记而被系统策略拦截，此时用：

```powershell
powershell -ExecutionPolicy Bypass -File .\run.ps1
```

访客端默认监听 `http://localhost:8080`，管理端默认监听 `http://localhost:8081/admin`。**首次启动时如果 `.env` 里的 `ADMIN_PASSWORD` 为空或不足 16 位，程序会自动生成一个管理员密码并打印在控制台**，凭据保存在 `data/admin-access.json`；想固定密码，就在 `.env` 中设置 `ADMIN_PASSWORD` 并删除该文件后重启。本地脚本将管理端绑定到回环地址；生产部署应通过 HTTPS 反向代理和访问控制保护管理端。

## Docker

```sh
cp .env.example .env
docker compose up --build -d
```

Compose 将应用数据写入本地 `./data`，并只把管理端映射到本机回环接口。部署前请设置强管理员密码；需要远程管理时，请在反向代理层配置 HTTPS 与访问控制，并为数据目录设置备份和访问权限。

## 配置

环境变量见 [`.env.example`](./.env.example)。管理密码、SMTP 凭据、OAuth 密钥和验证码服务密钥只能放在本地 `.env` 或部署环境中，不能写入前端代码或提交到仓库。模板不配置任何第三方服务账号；未配置时，相应能力保持关闭。

API 路由是此模板前后端配套使用的示例接口。对接自有服务时请从 `app/blog.py`、`app/app.js` 与 `app/admin.js` 中按需修改。

## 主题与动画

```text
app/solar-themes.json    36 套主题：文案、分类、配色、季节
app/solar-calendar.json  节气日期表
app/solar_themes.py      主题选择（手动或按日期自动）
app/solar.js             舞台绘制：山丘、太阳、小屋、主题装饰
app/solar.css            舞台与角色动画的关键帧
```

新增一套主题只需在 `solar-themes.json` 里追加一条记录（`key`、`label`、`palette`、`season`、`category`），并在 `solar.js` 的 `details()` 中为它返回装饰片段。舞台、小屋与角色动画会自动复用，无需另写一套动画。

## 项目结构

```text
app/                 访客端、管理端、主题资源与 Python 服务端
data/                运行时数据目录（不纳入版本控制）
run.sh               Linux/macOS 启动脚本
run.ps1              Windows 启动脚本
compose.yaml         Docker Compose 配置
Dockerfile           容器构建文件
docs/images/         README 预览图
scripts/             语法检查与发布打包脚本
```

## 生产部署实例

本主题的部署实例可由项目所有者自行引用真实站点与截图。该站点仅作为外观和部署参考，任何站点专属文字、接口、图片与用户数据都不属于本模板。

## 故障排查

- **Windows 双击 `run.ps1` 没反应或提示“禁止运行脚本”**：改用 `run.cmd`，或执行 `powershell -ExecutionPolicy Bypass -File .\run.ps1`。下载来的脚本会被系统标记为“网络来源”，属于正常安全限制。
- **启动报 `ModuleNotFoundError: No module named 'PIL'`**：执行 `python -m pip install -r app/requirements.txt`。
- **端口被占用**：在 `.env` 中修改 `PORT` / `ADMIN_PORT` 后重启。
- **记不清管理员密码**：删除 `data/admin-access.json`，在 `.env` 里设置新的 `ADMIN_PASSWORD`（16 位以上）后重启；若 `ADMIN_PASSWORD` 仍为空，程序会重新生成并打印。
- **数据在哪里**：全部位于 `data/blog.json`（容器部署时为挂载的数据目录），升级前请备份该目录。

## 版本

### v0.1.4

- 新增 Windows 启动器 `run.cmd`，避开 PowerShell 脚本执行策略对“网络来源”文件的拦截。
- 首次启动若未设置管理员密码，自动生成并打印，不再直接启动失败。
- `run.ps1` 支持从任意工作目录启动，缺少 `.env` 时自动补全，并在缺少 Python 时给出提示。
- README 补充 Windows 启动方式、首次运行密码行为与故障排查。

### v0.1.3

- 首页改为「品牌舞台」：站点标志作为舞台中心的小屋，36 套节气／节日主题按左右两翼重新编排装饰。
- 新增角色化动画：眨眼、视线环顾、笑弧呼吸，以及太阳、山丘、小径、草丛的分层动效。
- 小屋改为纯扁平绘制，移除辉光、描边与投影；夜间主题改用提亮配色保证轮廓。
- 图标字体按源码引用子集化，2.1 MB → 约 26 KB，并增加字体预加载与连字文字保护。
- 静态文件服务增加 ETag、Last-Modified 与 Cache-Control，支持 304 协商缓存。
- 首页字幕圆角改为跟随全局圆角预设（soft / rounded / expressive）。
- 更新桌面端与移动端演示截图。

### v0.1.2

- 将项目名称统一更正为 Material Extra。
- 串行化状态文件的读取、修改与保存，避免并发请求覆盖站点数据。
- 刷新桌面端与移动端演示截图，使仓库预览与当前模板一致。
- 忽略本地截图与界面审计数据目录，避免运行时文件进入版本控制。

### v0.1.1

- 修复关于页引用缺失角色素材和页脚演示备案资源的问题。
- 刷新桌面端演示截图，并更新发布归档。

### v0.1.0

- 首个公开版本：Material 3 访客端与管理端、Python 标准库服务端、Docker 与启动脚本。

## License

代码采用 MIT License。第三方字体、图标和依赖仍受各自许可约束，详见其上游项目。
