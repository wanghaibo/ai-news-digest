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
- `summary`：非空中文摘要，最多 10,000 字符。清楚区分事实与观点。
- `category`：仅限 `产品发布`、`技术实践`、`开源项目`、`观点洞察`。
- `source`：非空来源名称，最多 300 字符。
- `url`：具体一手来源的绝对 `https://` 或 `http://` 链接，最多 4,096 字符。推荐 HTTPS。不允许 JavaScript、相对 URL 或含用户名/密码的链接。
- `publishedAt`：可选的来源发布日期或时间。无法确认时写 `null` 或省略字段；只确认日期时写 `YYYY-MM-DD`（例如 `2026-10-07`）。只有原文确实提供精确时间和时区时，才写带时区、含秒的 ISO 8601 字符串，如 `2026-10-07T08:30:00+08:00` 或 `2026-10-07T00:30:00Z`。页面显示来源给出的日历日期，不猜测缺失日期、时间或时区。

- `additionalSources`：可选的补充来源数组，每项为 `{ "title": "来源说明", "url": "https://..." }`。页面在主来源下显示安全的 HTTP(S) 链接；可用于 X API 正文固定存档、官方验证材料等。每条主 `url` 仍保留原始来源。

所有文本均按普通文本呈现，不解释 HTML 或 Markdown。`publishedAt` 不代表本站生成时间。允许附加字段供其他流程使用；前端也显示下文列出的来源分栏、人物背景、原题及 `detail`。`evidenceNote` 等辅助说明可供 Markdown 归档使用，重要日期及来源限制必须写入可见的 `summary` 或 `detail`。索引最多接受 10,000 期。

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
- 搜索覆盖当前期的标题、摘要、来源名称、原题、人物背景与延伸细节，忽略大小写和常见全角/半角差异。
- 无数据、无匹配结果、网络失败分别呈现明确状态。加载失败可手动重试。
- GitHub Pages 的定时采集/生成/提交机制不由本静态页面配置。


## 来源分栏与背景信息

以下都是向后兼容的可选字段，旧文章无需补空值：

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
