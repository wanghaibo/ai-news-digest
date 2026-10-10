# 数据格式与发布约定

## 根对象

`data/digests.json` 的 `schemaVersion` 固定为整数 `1`，`digests` 为数组。没有已发布简报时保留空数组，不添加占位新闻。前端按日期倒序展示，不要求文件本身排序。

## 每期简报

- `date`：有效日历日期，格式 `YYYY-MM-DD`，每期唯一。日期由编辑按其发布时区确定，前端不会转换这一天。
- `title`：非空字符串，最多 300 字符。
- `summary`：非空的本期导读，最多 5,000 字符。
- `items`：1–100 条资讯，顺序就是本期阅读顺序。

## 每条资讯

- `title`：非空标题，最多 500 字符。
- `summary`：非 X 条目的必填中文摘要，最多 10,000 字符。清楚区分事实与观点。X 条目不使用此字段，见下方专用合同。
- `category`：仅限 `产品发布`、`技术实践`、`开源项目`、`观点洞察`。
- `source`：非空来源名称，最多 300 字符。
- `url`：具体一手来源的绝对 `https://` 或 `http://` 链接，最多 4,096 字符。推荐 HTTPS。不允许 JavaScript、相对 URL 或含用户名/密码的链接。
- `publishedAt`：可选的来源发布日期或时间。无法确认时写 `null` 或省略字段；只确认日期时写 `YYYY-MM-DD`（例如 `2026-10-07`）。只有原文确实提供精确时间和时区时，才写带时区、含秒的 ISO 8601 字符串，如 `2026-10-07T08:30:00+08:00` 或 `2026-10-07T00:30:00Z`。页面显示来源给出的日历日期，不猜测缺失日期、时间或时区。

- `additionalSources`：可选的补充来源数组，每项为 `{ "title": "来源说明", "url": "https://..." }`。页面在主来源下显示安全的 HTTP(S) 链接；可用于非 X 条目的官方验证材料等。X 条目只使用原帖链接，不使用此字段。每条主 `url` 仍保留原始来源。

所有文本均按普通文本呈现，不解释 HTML 或 Markdown。`publishedAt` 不代表本站生成时间。非 X 条目允许附加字段供其他流程使用；前端也显示下文列出的来源分栏、人物背景、原题及 `detail`。`evidenceNote` 等辅助说明可供 Markdown 归档使用，重要日期及来源限制必须写入可见的 `summary` 或 `detail`。索引最多接受 10,000 期。

## 结构示例（不是新闻，不要发布为真实简报）

```json
{
  "schemaVersion": 1,
  "digests": [
    {
      "date": "2026-10-07",
      "title": "本期标题",
      "summary": "经过核实的本期导读。",
      "items": [
        {
          "title": "经过核实的资讯标题",
          "summary": "准确概述原文，并保留必要的限制条件。",
          "category": "技术实践",
          "source": "一手来源名称",
          "url": "https://example.com/replace-with-verified-source",
          "publishedAt": null
        }
      ]
    }
  ]
}
```

## Markdown 归档

每期必须同时拥有 `digests/YYYY-MM-DD.md`，例如：

```md
# 本期标题

日期：YYYY-MM-DD

本期导读。

## 1. 资讯标题

分类：技术实践

中文摘要。

来源：[来源名称](经过核实的原文链接)
```

发布前运行 `node --test tests/*.test.cjs` 和 `node scripts/validate-data.cjs`。确保来源可读、日期可信、摘要准确，并核对 JSON 和 Markdown 内容。检查通过不等于信息真实性已被自动确认。

## 前端约定

- 日期直达：`?date=YYYY-MM-DD`；不存在时提示并显示最新一期。
- 日期切换清除期内搜索和分类筛选。浏览器前进/后退会恢复对应日期。
- 非 X 条目的搜索覆盖标题、摘要、来源名称、原题、人物背景与延伸细节；X 搜索只覆盖作者、背景、来源、原帖链接/日期，以及用户提供模式下的原文和全文翻译。忽略大小写和常见全角/半角差异。
- 无数据、无匹配结果、网络失败分别呈现明确状态。加载失败可手动重试。
- GitHub Pages 的定时采集/生成/提交机制不由本静态页面配置。


## 来源分栏与背景信息

以下是非 X 条目的向后兼容可选字段，旧文章无需补空值；X 条目的必填项和严格字段范围以最后一节为准：

- item.sourceType：`x`、`podcast`、`blog`、`github`。按此顺序显示有内容的栏目；缺失或未知类型放入“其他资讯”。
- item.authorBackground：人物的已核实身份、相关经历和阅读视角，非空纯文本字符串。
- item.originalTitle：真实原题，非空纯文本字符串；紧邻中文编辑标题显示，并链接同一原始来源。
- item.sourceName：真实博客/出版方名称，非空纯文本字符串，用于博客组内小标题。
- item.detail：补充机制、实例或短引文及必要归因，非空纯文本字符串；页面与 Markdown 都显示。
- 上述 4 个显示字符串最长 10,000 字符，但编辑时应简短；不得在字符串内嵌 HTML 或 Markdown。
- item.language、languageObservedAt、firstIncludedAt、priorAppearanceCount：GitHub 主要语言、其核对日期、本站首次收录日期及本期之前留存榜单记录中的出现次数。需在摘要中保留读者可见的说明，历史出现次数不等于连续上榜天数。
- digest.githubHistory.note、githubRankingNote：GitHub 栏目可见的历史积累与排序/快照说明。
- digest.contentStats：按来源统计的本期数量。digest.sourceNotes：可展开的来源与修订说明。

搜索也覆盖作者背景、原题与延伸细节。栏目按当前筛选结果重算，没有匹配内容的栏目不会留空标题。链接仍只接受经过验证的 HTTP(S) 地址，所有正文以 textContent 渲染。

## GitHub 留存历史

`data/trending-history.json` 保存 `schemaVersion: 1` 与 `snapshots` 数组。每个快照包含有效 `date`、公开 `owner/repo` 标识列表 `repositories` 及 `coverage`。已迁移的 8 个历史日期不连续，10 月 7 日只记录本期核验入选集合，两者都不代表完整连续全站榜单。

item.isNew 仅表示在本期之前留存的快照中未出现；githubStatus 为 `new` 或 `returning`。priorAppearanceDates 和 priorAppearanceCount 对应那些旧日期，不能称为连续上榜。新项目至多 5 个详述，旧项目简列并可展开已经发布的分析。各组按实际 starsToday 降序，采样时间差异必须公开说明。

## X 官方嵌入与用户提供的原文

自行抓取的第三方 X 帖文在仓库中只保存作者身份、背景、日期与原帖直链；网站通过 X 官方组件逐条显示 sourcePosts 的原帖正文和媒体。不得加入原文、节选、译文、摘要、解读或从帖子观点提炼的标题。Markdown、JSON、搜索和详情遵守同一合同；不能只是隐藏旧字段。

所有 X 条目使用 `sourceType: "x"`，并遵守以下字段：

- `authorName`：已核实作者全名或官方账号名称，非空纯文本，最多 300 字符。
- `authorBackground`：已核实的公司/职位、身份和相关经历，最多 10,000 字符；不夹带本帖观点、意义或分析。
- `title`：必须恰好是 `authorName + " · X 原帖"`，不添加解释性标题。
- `source`：必须恰好是 `"X / " + authorName`，例如 `X / Example Author`。保留已有 `category` 供筛选，X 卡不显示主题分类标签。
- `url`：主原帖直链，必须同时存在于 `sourcePosts`。
- `xDisplay`：`official-embed` 或 `user-provided`。新发布的第三方帖文使用 `official-embed`。旧 `link-only` 与省略值继续接受，网站统一按官方嵌入渲染，不必重写历史数据。
- `sourcePosts`：1–20 个 `{ "url": "https://x.com/author/status/123", "publishedAt": "2026-10-08" }`。URL 必须是安全、无内嵌凭据的 X / Twitter 具体 status 直链，同一卡不重复。逐字保留已核实的原帖 URL。日期可省略或为 null，已知时使用本页规定的真实日期/时间，不能拿首帖日期代替其他帖子的日期。
- `summary`、`detail`、`translations`、`originalTitle`、`sourceEvidence`、`evidenceNote`、`additionalSources` 对 X 条目一律禁止；不得把移除的内容转存到其他隐藏字段。X 条目只允许本节字段、`sourceType`、已有 `category`、`publishedAt` 和 `backgroundVerifiedAt`；嵌套原帖/原文块也只允许列出的字段。

`official-embed`、旧 `link-only` 和省略值都不允许 `originalPosts`。前端逐条加载 X 官方原帖卡片，同时始终保留中性的“原帖 1 / 原帖 2”直链及已知日期。不得复制抓取到的正文、翻译或截图到仓库；不展示 API 全文归档或二手分析链接。X 控制原帖内容与媒体，长帖可能出现 Show more，官方嵌入不自动翻译。组件加载失败或超时显示提示和重试按钮，直链不受影响。期内搜索不检索跨域嵌入正文。

只有用户实际提供了对应原帖的文字，并且用途符合其授权及适用政策时，才使用 `user-provided`。给链接、上传技能或允许读取 feed 都不等于提供了这条原文。此模式增加：

- `originalPosts`：1–20 个 `{ "text": "原始文字", "translation": "完整忠实翻译", "sourceUrl": "对应原帖 URL" }`，与 `sourcePosts` 一一对应，无重复。
- `text` 与 `translation` 各为非空纯文本，最多 10,000 字符。保留原文段落、空行、缩进、emoji 和原有链接；使用 `textContent` 与 `white-space: pre-wrap`，不解释 HTML。
- 每条原帖各有“原文”和“原文全文翻译”块及对应直链，不增加摘要、节选或解读。不得为字段上限截断原文；超限时保留完整稿件并报告限制，不能发布成部分原文。

Markdown 同步保留对应作者、背景、原帖链接和日期；用户提供模式额外逐帖保留相同原文与完整译文。无论模式，都不把 X 观点或分析带进导读、附注或搜索字段。

