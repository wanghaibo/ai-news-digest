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
- 非 X 条目的搜索覆盖标题、摘要、来源名称、原题、人物背景与延伸细节；X 搜索只覆盖作者、背景、来源、原帖链接/日期，以及 user-provided、licensed-original、short-quotation 模式下的原文和全文翻译。忽略大小写和常见全角/半角差异。
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

## X 原文与全文翻译

X 条目以逐帖“内容原文 + 完整忠实翻译”为目标，不添加摘要、解读、截断原文、拼接改写或从帖子观点提炼的标题。仅在原文确由用户提供、已核实许可覆盖全文复制和翻译，或完整短帖连同全部交付落在保守引用额度内时复制文字。无法满足这些条件时保留官方嵌入和原帖直链，明确写“本条未提供全文翻译”，不伪装成已交付译文。长帖并非一律禁止：满足用户提供或许可条件的长帖可以全文翻译。

所有 X 条目使用 `sourceType: "x"`，并遵守以下字段：

- `authorName`：已核实作者全名或官方账号名称，非空纯文本，最多 300 字符。
- `authorBackground`：已核实的公司/职位、身份和相关经历，最多 10,000 字符；不夹带本帖观点、意义或分析。
- `backgroundVerifiedAt`：可省略、null、真实日期或带时区时间戳。
- `title`：必须恰好是 `authorName + " · X 原帖"`，不添加解释性标题。
- `source`：必须恰好是 `"X / " + authorName`。保留已有 `category` 供筛选，X 卡不显示主题分类标签。
- `url`：主原帖直链，必须同时存在于 `sourcePosts`。
- `xDisplay`：`user-provided`、`licensed-original`、`short-quotation` 或 `official-embed`。旧 `link-only` 与省略值继续接受，按官方嵌入渲染；无需改写历史数据。
- `sourcePosts`：1–20 个 `{ "url": "https://x.com/author/status/123", "publishedAt": "2026-10-08" }`。使用安全、无内嵌凭据的 X / Twitter 具体 status 直链，同一卡不重复。逐字保留已核实的 URL。日期可省略或为 null，已知时写真实日期/时间，不拿首帖日期代替其他帖子的日期。
- `summary`、`detail`、`translations`、`originalTitle`、`sourceEvidence`、`evidenceNote`、`additionalSources` 对 X 条目一律禁止；不得转存为其他隐藏字段。X 条目仅允许本节字段、`sourceType`、已有 `category`、`publishedAt`；嵌套对象也严格限于列出的字段。

### 三种全文展示模式

`user-provided`、`licensed-original`、`short-quotation` 使用同一原文结构：

- `originalPosts`：1–20 个 `{ "text": "原始文字", "translation": "完整忠实翻译", "sourceUrl": "对应原帖 URL" }`，与 `sourcePosts` 一一对应，无重复。
- `text` 与 `translation` 各为非空纯文本，最多 10,000 字符。保留原文段落、空行、缩进、emoji 和原有链接；以 `textContent` 和 `white-space: pre-wrap` 展示，不解释 HTML。
- 每帖分别展示“原文”“原文全文翻译”、对应直链和该帖已知日期；全文翻译必须忠实、完整、不增加观点。不能为满足字段上限或引用额度而截断原文，也不能仅翻译节选却标为全文。

`user-provided` 仅用于用户实际提供了该原帖文字且用途符合授权及适用要求的情况。给出链接、允许读取 feed 或上传技能均不等于提供原文。抓取所得文字绝不能标记为 user-provided。该模式保留既有字段合同，不新增必填元数据。

另外两种模式的每个 `originalPosts` 对象必须增加 `provenance`：

- `authorUrl`：已核实的规范作者身份 `https://x.com/<handle>`，无尾斜线、查询或片段；handle 不区分大小写。命名作者的原帖 URL 必须与该 handle 一致；`i/web/status` 需编辑核实作者归属。作者改名或多个账号属于同一来源时仍应编辑合并预算，不得用别名重置额度。
- `verifiedAt`：核验发生的真实日期或带时区时间戳。
- `evidenceUrl`：支持所录完整原文核验的公开 HTTP(S) 来源链接，不能含凭据；仅接受公网域名，不接受 IP 字面量、本机地址或内网域名。实际公开可读性仍需编辑检查。
- `complete`：必须为 `true`，表示已实际核对完整文字，而非搜索摘要、截断预览或片段。

`licensed-original` 另需：

- `licenseUrl`：适用于该文字的公开许可或权利依据链接，安全 HTTP(S) 公网域名，无凭据。
- `licenseScope`：非空、最多 2,000 字符的许可范围说明，必须有依据地明确覆盖完整复制及翻译、相应发布渠道，并保留必要的署名条件。不可填帖子内容或分析。若有效许可仅存在于私人授权中且没有可公开的许可依据，不得虚构 licenseUrl 或公开私人消息；保留草稿并报告元数据/发布限制。
- 编辑必须核验许可确实适用、权利来源可靠、翻译及再发布获允许并满足限制。公开可读、API 可取、作者身份或嵌入许可均不自动等于全文复制/翻译许可。

`short-quotation` 另需：

- `sourceWordCount`：完整原帖的保守源文字数证据，1–25 的整数，不得低于验证器的保守测量。验证器分别计算未分词中日韩字符、字母/数字词段和空白词块，采用较大的计数；编辑须上调不确定计数，不能下调。
- `isLyrics`：是否为歌词的布尔值，必须核实。
- `toolWordLimit`：如读取工具标注更严格总额度，填写正整数；不可省略已知的更低上限。
- 每期标准交付按 JSON 与 Markdown 两份计算，每份包括原文及按源文字数等额计入的完整翻译：`sourceWordCount × 2 × 2`。5 源词消耗 20；同作者两帖各 4 源词合计 32，不能同时使用本模式。不得拆卡、换 X/Twitter URL 或重设每帖计数来规避。
- 同一期在所有卡片间，分别按规范作者身份和 status ID 聚合；非歌词上限 25，包含歌词时保守使用 10，已知更严格工具额度取最小值。该上限按作者/来源共享，不能每帖重新获得额度。
- 本合同仅支持完整短帖。原文加完整译文及两份交付超额时，改用具有依据的 licensed-original / user-provided，或 official-embed。不可改为节选。
- 这四份是标准交付的最低计数。如果另有重复粘贴、额外交付、同源其他引文或别名账号，编辑必须合并计算，使用实际更高总量，并满足所有适用工具额度；验证器不会自动读取聊天或其他渠道。

`provenance` 只允许对应模式列出的字段。只写可公开的权利依据、来源和计数，不复制私人授权消息、聊天记录、密钥或其他私密内容。结构/数字校验不能证明文字完整、翻译忠实、来源身份或许可有效；这些始终需要发布前人工核验。许可范围和许可链接在每帖下方单列“许可与署名”，并同步保留在 Markdown，以满足适用许可的署名/链接要求；这些信息不作帖子正文、分析或搜索内容。

### 官方嵌入与历史兼容

`official-embed`、旧 `link-only` 和省略值都不允许 `originalPosts`。这些条目仅保存作者、背景、日期与直链，由 X 官方组件逐条显示原帖与媒体，并可见提示“本条未提供全文翻译”。不得把未经支持的复制正文、译文或截图藏在其他字段。嵌入长帖可能显示 Show more，不自动翻译；失败/超时保留提示、重试和逐帖直链。搜索不进入跨域正文。

Markdown 与 JSON 同步保留作者、背景、原帖链接和日期；三种全文模式另逐帖保留完全相同的原文与完整译文。各模式均不新增或派生 X 摘要、分析并写入导读、附注或搜索字段；三种全文模式下获准展示的原文和完整译文本身仍可搜索。历史 JSON、Markdown 不因增加模式而迁移或重写。
