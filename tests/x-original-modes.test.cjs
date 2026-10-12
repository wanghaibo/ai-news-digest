'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const app = require('../app.js');
// Synthetic test-only examples. Never copy these into a published digest.
const data = items => ({ schemaVersion: 1, digests: [{ date: '2026-10-12', title: 'Fixture', summary: 'Fixture', items }] });
const row = (mode = 'licensed-original', { id = '123', author = 'example', text = 'One complete test post here', ...extra } = {}) => {
  const url = 'https://x.com/' + author + '/status/' + id;
  const provenance = { authorUrl: 'https://x.com/' + author, verifiedAt: '2026-10-12', evidenceUrl: url, complete: true,
    ...(mode === 'licensed-original' ? { licenseUrl: 'https://example.com/license', licenseScope: 'Reproduction and translation permitted.' } : { sourceWordCount: 5, isLyrics: false }) };
  return { title: 'Example Author · X 原帖', source: 'X / Example Author', authorName: 'Example Author', authorBackground: 'Synthetic software developer background.', sourceType: 'x', xDisplay: mode, category: '技术实践', url, sourcePosts: [{ url }], originalPosts: [{ text, translation: '一则完整测试帖子', sourceUrl: url, provenance }], ...extra };
};
const check = (...rows) => app.validateData(data(rows));

test('licensed originals support complete long text, full translation and search without commentary', () => {
  const item = row('licensed-original', { text: 'Line one\n\n  ' + 'long original '.repeat(100) + '😊' });
  assert.doesNotThrow(() => check(item));
  for (const term of ['long original', '完整测试帖子']) assert.equal(app.filterItems({ items: [item] }, '全部', term).length, 1);
  for (const field of ['summary', 'detail', 'translations', 'analysis']) assert.throws(() => check({ ...item, [field]: 'not allowed' }), /not allowed/);
});

test('new original modes require strict public complete-text provenance and applicable license evidence', () => {
  for (const mode of ['licensed-original', 'short-quotation']) {
    assert.doesNotThrow(() => check(row(mode)));
    const mutations = [p => delete p.provenance, p => p.provenance = {}, p => p.provenance.complete = false,
      p => p.provenance.verifiedAt = '2026-02-30', p => p.provenance.evidenceUrl = 'javascript:alert(1)',
      p => p.provenance.authorUrl = 'https://example.com/profile', p => p.provenance.authorUrl = 'https://x.com/different',
      p => p.provenance.analysis = 'Hidden commentary', p => p.provenance.privatePermission = 'Private message',
      p => p.translation = '', p => p.sourceUrl = 'https://x.com/example/status/999'];
    if (mode === 'licensed-original') mutations.push(p => delete p.provenance.licenseUrl, p => p.provenance.licenseUrl = 'https://secret@example.com/license', p => p.provenance.licenseScope = '');
    else mutations.push(p => delete p.provenance.sourceWordCount, p => p.provenance.sourceWordCount = 1, p => p.provenance.sourceWordCount = 1.5, p => p.provenance.isLyrics = undefined, p => p.provenance.toolWordLimit = 0, p => p.provenance.licenseUrl = 'https://example.com/license');
    for (const mutate of mutations) { const item = row(mode); mutate(item.originalPosts[0]); assert.throws(() => check(item), /provenance|originalPosts/); }
  }
});

test('short quotation budgets include original and translated text in JSON and Markdown', () => {
  assert.doesNotThrow(() => check(row('short-quotation'))); // Five source words × four copies = 20.
  const six = row('short-quotation', { text: 'One two three four five six' }); six.originalPosts[0].provenance.sourceWordCount = 6;
  assert.doesNotThrow(() => check(six));
  const seven = row('short-quotation', { text: 'One two three four five six seven' }); seven.originalPosts[0].provenance.sourceWordCount = 7;
  assert.throws(() => check(seven), /quotation budget/);
  const limited = row('short-quotation'); limited.originalPosts[0].provenance.toolWordLimit = 19;
  assert.throws(() => check(limited), /quotation budget/);
  limited.originalPosts[0].provenance.toolWordLimit = 20; assert.doesNotThrow(() => check(limited));
});

test('short quotation aggregation cannot be reset by another card or another source post', () => {
  const one = row('short-quotation', { text: 'One two three four' }); one.originalPosts[0].provenance.sourceWordCount = 4;
  const two = row('short-quotation', { id: '456', author: 'EXAMPLE', text: 'Five six seven eight' }); two.originalPosts[0].provenance.sourceWordCount = 4;
  assert.throws(() => check(one, two), /quotation budget/);
  const grouped = structuredClone(one); grouped.sourcePosts.push(...two.sourcePosts); grouped.originalPosts.push(...two.originalPosts);
  assert.throws(() => check(grouped), /quotation budget/);
  const otherAuthor = row('short-quotation', { id: '999', author: 'another', text: 'Five six seven eight' }); otherAuthor.originalPosts[0].provenance.sourceWordCount = 4;
  assert.doesNotThrow(() => check(one, otherAuthor));
  const samePost = structuredClone(otherAuthor); samePost.url = 'https://twitter.com/another/status/123?s=20'; samePost.sourcePosts[0].url = samePost.url; samePost.originalPosts[0].sourceUrl = samePost.url;
  assert.throws(() => check(one, samePost), /quotation budget/);
});

test('lyrics, mixed author material and stricter tool limits use the smallest applicable budget', () => {
  const lyrics = row('short-quotation', { text: 'Synthetic lyric' }); lyrics.originalPosts[0].provenance = { ...lyrics.originalPosts[0].provenance, sourceWordCount: 2, isLyrics: true };
  assert.doesNotThrow(() => check(lyrics));
  const three = structuredClone(lyrics); three.originalPosts[0].text += ' words'; three.originalPosts[0].provenance.sourceWordCount = 3;
  assert.throws(() => check(three), /quotation budget/);
  const prose = row('short-quotation', { id: '456', text: 'Fixture' }); prose.originalPosts[0].provenance.sourceWordCount = 1;
  assert.throws(() => check(lyrics, prose), /quotation budget/);
  const tools = row('short-quotation', { id: '456', text: 'Fixture' }); tools.originalPosts[0].provenance = { ...tools.originalPosts[0].provenance, sourceWordCount: 1, toolWordLimit: 23 };
  assert.throws(() => check(row('short-quotation'), tools), /quotation budget/);
});

test('measured original counts reject undercounts including unspaced CJK text', () => {
  const item = row('short-quotation', { text: '测试原文' }); item.originalPosts[0].provenance.sourceWordCount = 1;
  assert.throws(() => check(item), /sourceWordCount/);
  item.originalPosts[0].provenance.sourceWordCount = 4; assert.doesNotThrow(() => check(item));
});

class Element {
  constructor(tag) { this.tagName = tag; this.children = []; this.dataset = {}; this.className = ''; this.listeners = {}; this.classList = { toggle() {} }; this.value = ''; this._text = ''; }
  append(...xs) { for (const x of xs) this.children.push(...(x.tagName === 'fragment' ? x.children : [x])); }
  prepend(...xs) { this.children.unshift(...xs); } replaceChildren(...xs) { this.children = []; this.append(...xs); }
  set textContent(v) { this._text = String(v); this.children = []; } get textContent() { return this._text + this.children.map(x => x.textContent || '').join(''); }
  set innerHTML(_) { throw new Error('Untrusted text must never be inserted as HTML'); }
  setAttribute(k, v) { this[k] = v; } removeAttribute(k) { delete this[k]; } addEventListener(k, f) { this.listeners[k] = f; }
  querySelectorAll(tag) { const out = []; const visit = x => { if (x.tagName === tag) out.push(x); x.children?.forEach(visit); }; this.children.forEach(visit); return out; }
  focus() {} scrollIntoView() {}
}
async function render(t, fixture) {
  const ids = {}, get = id => ids[id] ||= new Element('div');
  global.document = { getElementById: get, createElement: tag => new Element(tag), createTextNode: text => { const e = new Element('text'); e.textContent = text; return e; }, createDocumentFragment: () => new Element('fragment'), querySelectorAll: () => [] };
  global.window = { location: { href: 'https://example.com/', search: '' }, setTimeout, clearTimeout, history: { pushState() {} }, addEventListener() {}, matchMedia: () => ({ matches: true }) };
  global.fetch = async () => ({ ok: true, json: async () => fixture });
  t.after(() => { delete global.document; delete global.window; delete global.fetch; });
  app.start(); await new Promise(resolve => setImmediate(resolve)); return get('digest-content');
}

test('both new modes render safe full original/translation blocks, exact whitespace, backgrounds and direct links', async t => {
  const licensed = row('licensed-original', { text: 'First\n\n  <script>alert(1)</script> & 😊\n' });
  const quoted = row('short-quotation', { id: '456', text: 'Hello\n\n  world 😊\n' }); quoted.originalPosts[0].provenance.sourceWordCount = 3;
  const content = await render(t, data([licensed, quoted]));
  const cards = content.querySelectorAll('article'); assert.equal(cards.length, 2);
  cards.forEach((card, i) => {
    const item = [licensed, quoted][i], post = item.originalPosts[0];
    assert.deepEqual(card.querySelectorAll('p').filter(n => n.className === 'tweet-text').map(n => n.textContent), [post.text, post.translation]);
    assert.ok(card.textContent.includes(item.authorBackground)); assert.ok(card.textContent.includes('原文全文翻译'));
    assert.equal(card.querySelectorAll('script').length, 0); assert.equal(card.querySelectorAll('div').filter(n => n.className === 'tweet-embed-block').length, 0);
    assert.ok(card.querySelectorAll('a').some(n => n.href === post.sourceUrl && n.textContent === '对应原帖 ↗'));
    for (const a of card.querySelectorAll('a')) { assert.equal(a.target, '_blank'); assert.equal(a.rel, 'noopener noreferrer'); }
    for (const forbidden of ['摘要与解读', '原文节选翻译', '进一步理解']) assert.ok(!card.textContent.includes(forbidden));
  });
  assert.match(fs.readFileSync(require('node:path').join(__dirname, '../style.css'), 'utf8'), /\.tweet-text\{white-space:pre-wrap/);
});

test('official, legacy link-only and omitted modes retain embeds and visibly disclose missing full translation', async t => {
  const rows = ['official-embed', 'link-only', undefined].map(mode => { const item = row(); item.xDisplay = mode; delete item.originalPosts; return item; });
  const content = await render(t, data(rows)); const cards = content.querySelectorAll('article'); assert.equal(cards.length, 3);
  for (const card of cards) { assert.match(card.textContent, /本条未提供全文翻译/); assert.equal(card.querySelectorAll('div').filter(n => n.className === 'tweet-embed-block').length, 1); }
});

test('new-mode provenance rejects local, private and non-public evidence destinations', () => {
  const privateUrls = ['http://localhost/private', 'http://127.0.0.1/private', 'http://2130706433/private', 'http://10.0.0.1/private', 'http://192.168.1.2/private', 'http://[::1]/private', 'http://[fc00::1]/private', 'http://intranet/private', 'http://app.local/private', 'http://app.internal/private'];
  for (const url of privateUrls) {
    for (const field of ['evidenceUrl', 'licenseUrl']) { const item = row(); item.originalPosts[0].provenance[field] = url; assert.throws(() => check(item), /provenance/); }
  }
  // Existing non-X and historical URL rules are intentionally unchanged.
  assert.equal(app.isSafeUrl('http://localhost/legacy'), true);
});

test('licensed originals expose safe license attribution and each post retains its own known date', async t => {
  const first = row('licensed-original'); first.sourcePosts[0].publishedAt = '2026-10-10T08:00:00Z';
  first.originalPosts[0].provenance.licenseScope = 'Reproduce and translate with attribution <img src=x onerror=alert(1)>.';
  const second = row('licensed-original', { id: '456' }); second.sourcePosts[0].publishedAt = '2026-10-11';
  first.sourcePosts.push(...second.sourcePosts); first.originalPosts.push(...second.originalPosts);
  const content = await render(t, data([first])); const blocks = content.querySelectorAll('div').filter(n => n.className === 'tweet-original');
  assert.deepEqual(blocks.map(b => b.querySelectorAll('time').map(n => n.dateTime)), [['2026-10-10T08:00:00Z'], ['2026-10-11']]);
  blocks.forEach((block, i) => {
    const proof = first.originalPosts[i].provenance;
    assert.ok(block.textContent.includes(proof.licenseScope)); assert.equal(block.querySelectorAll('img').length, 0);
    const license = block.querySelectorAll('a').find(n => n.textContent === '许可依据 ↗');
    assert.ok(license); assert.equal(license.href, proof.licenseUrl); assert.equal(license.rel, 'noopener noreferrer');
  });
});

test('published HTML refreshes the renderer cache for Chinese embed summaries', () => {
  const html = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
  assert.match(html, /src="\.\/app\.js\?v=20261012-summaries1"/);
});


test('effective embed modes accept optional nonempty summaries with the existing 10000 character limit', () => {
  for (const mode of ['official-embed', 'link-only', undefined]) {
    const item = row(); item.xDisplay = mode; delete item.originalPosts;
    assert.doesNotThrow(() => check(item));
    assert.doesNotThrow(() => check({ ...item, summary: '作者说明了测试方法与适用条件。' }));
    assert.doesNotThrow(() => check({ ...item, summary: '测'.repeat(10000) }));
    for (const summary of ['', '  ', null, 42, {}, [], '测'.repeat(10001)]) {
      assert.throws(() => check({ ...item, summary }), /summary/);
    }
    assert.throws(() => check({ ...item, originalPosts: row().originalPosts }), /originalPosts/);
    for (const field of ['detail', 'translations', 'originalTitle', 'sourceEvidence', 'evidenceNote', 'additionalSources', 'rawText']) {
      assert.throws(() => check({ ...item, [field]: 'unallowed copied text' }), /not allowed/);
    }
  }
});

test('all full-text modes still forbid summaries and exclude them from search', () => {
  for (const mode of ['user-provided', 'licensed-original', 'short-quotation']) {
    const item = row(mode);
    if (mode === 'user-provided') delete item.originalPosts[0].provenance;
    assert.doesNotThrow(() => check(item));
    for (const summary of ['Forbidden commentary', '', null]) assert.throws(() => check({ ...item, summary }), /summary.*not allowed/);
    assert.equal(app.filterItems({ items: [{ ...item, summary: 'Forbidden commentary' }] }, '全部', 'Forbidden commentary').length, 0);
  }
});

test('effective embed summaries render as labeled safe text after background and before official embeds', async t => {
  const rows = ['official-embed', 'link-only', undefined].map(mode => {
    const item = row(); item.xDisplay = mode; delete item.originalPosts;
    item.summary = '作者介绍 Alpha 机制与适用条件。 <script>alert(1)</script> & **原样文字**';
    return item;
  });
  const historical = row(); historical.xDisplay = 'link-only'; delete historical.originalPosts;
  const content = await render(t, data([...rows, historical]));
  assert.match(content.querySelectorAll('p').find(n => n.className === 'source-section-note').textContent, /期内搜索包含本站展示的摘要、原文与译文/);
  const cards = content.querySelectorAll('article'); assert.equal(cards.length, 4);
  cards.slice(0, 3).forEach((card, i) => {
    const item = rows[i], body = card.querySelectorAll('div').find(n => n.className === 'news-body');
    const summary = body.children.find(n => n.className === 'tweet-summary');
    assert.ok(summary); assert.equal(summary.textContent, '中文摘要' + item.summary);
    assert.ok(body.children.indexOf(summary) > body.children.findIndex(n => n.className === 'author-background'));
    assert.ok(body.children.indexOf(summary) < body.children.findIndex(n => n.className === 'original-post-embeds'));
    assert.equal(card.querySelectorAll('script').length, 0);
    assert.match(card.textContent, /本条未提供全文翻译/);
    assert.deepEqual(card.querySelectorAll('div').filter(n => n.className === 'tweet-embed-block').map(n => n.dataset.postUrl), item.sourcePosts.map(p => p.url));
    assert.ok(card.querySelectorAll('a').some(n => n.href === item.url));
    for (const term of ['适用条件', 'ａｌｐｈａ']) assert.equal(app.filterItems({ items: [item] }, '全部', term).length, 1);
  });
  assert.equal(cards[3].querySelectorAll('div').filter(n => n.className === 'tweet-summary').length, 0);
  assert.ok(!cards[3].textContent.includes('中文摘要'));
});
