# AI 资讯简报

面向 AI 创造者的中文静态资讯站。暖色浅色界面，支持按日期浏览、来源分栏、人物背景、X 作者背景与官方原帖卡片（用户提供原文时保留原文和全文翻译）、分类筛选、期内搜索、一手来源与 Markdown 归档。无需构建、数据库或第三方字体。X 原帖卡片使用 X 官方 widgets.js。

## 发布状态

首期真实简报已发布：[2026-10-07](digests/2026-10-07.md)。站点读取 `data/digests.json`，并保留每期 Markdown 归档。本仓库自身不运行自动采集或定时生成程序；内容发布与外部调度分开管理。

## 本地预览

在仓库根目录运行：

```sh
python3 -m http.server 8000
```

然后打开 <http://localhost:8000>。不要直接用 `file://` 打开，浏览器通常会阻止读取 JSON。

## GitHub Pages

仓库：`wanghaibo/ai-news-digest`。

在仓库 Settings → Pages 中选择 **Deploy from a branch → main → / (root)**。`.nojekyll` 让静态文件直接发布。启用后地址为 `https://wanghaibo.github.io/ai-news-digest/`；实际启用状态以仓库设置和部署结果为准。站点使用相对资源路径，可运行在项目子路径。

## 新增一期

1. 将经过核实的简报加入 `data/digests.json`，每个日期仅一条记录。
2. 同时保存 `digests/YYYY-MM-DD.md`，正文与站点内容保持一致，保留原文链接。
3. 运行下方检查，再提交文件。

```sh
node --test tests/*.test.cjs
node scripts/validate-data.cjs
```

检查仅需 Node.js 18 或更新版本；网站访问者无需 Node.js。脚本校验字段、实际日期、唯一日期、类别、来源 URL、时间戳，以及每一期对应的 Markdown 文件是否存在且非空。内容真实性和 Markdown 与 JSON 的语义一致性仍需人工核实。

详见 [数据格式与发布约定](docs/data-format.md)。日期直达链接：`?date=YYYY-MM-DD`。未知日期会退回最新一期并显示提示。搜索只针对当前一期。

## 文件结构

- `index.html` / `style.css` / `app.js`：静态页面、样式与交互
- `data/digests.json`：简报索引及完整内容
- `digests/`：每期 Markdown 原文
- `scripts/validate-data.cjs`：发布前检查
- `tests/app.test.cjs`：无依赖单元测试

## 隐私与安全

本站无登录、站内埋点或广告。X 栏目会连接 X，加载其官方脚本、原帖和媒体；已设置 dnt 选项，但不代表没有对 X 的网络请求或完全匿名。第三方服务可能设置 Cookie，受 X 隐私政策约束。长帖可能由 X 折叠，嵌入不自动翻译；X 不可达、原帖删除或保护时显示提示、重试按钮和原帖直链。新闻字段通过 `textContent` 渲染，不作为 HTML 执行。来源仅接受不含内嵌凭据的绝对 HTTP(S) 链接；新标签页链接带 `noopener noreferrer`。浏览器仍会正常向提供静态站点的托管服务请求页面与数据。




## X 官方原帖展示

网站逐条嵌入 sourcePosts，包括往期保留的 link-only 数据；仓库不存储自行抓取的第三方帖文正文或翻译。Markdown 继续保存作者、背景、日期与链接。搜索不会进入 X 的跨域卡片。

官方说明：[嵌入帖子](https://help.x.com/en/using-x/how-to-embed-a-post)、[开发者协议](https://developer.x.com/overview/terms/agreement)、[开发者政策](https://developer.x.com/overview/terms/policy)、[X 隐私政策](https://x.com/en/privacy)。
