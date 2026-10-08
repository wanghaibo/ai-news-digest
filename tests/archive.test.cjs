'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const app = require('../app.js');

test('the unique date selector sits below the digest heading and above category filters', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const heading = html.indexOf('id="digest-heading"');
  const select = html.indexOf('id="date-select"');
  const filters = html.indexOf('class="filter-row"');
  assert.ok(heading < select && select < filters, 'Date switching must be available before the news list');
  assert.equal((html.match(/id="date-select"/g) || []).length, 1);
  assert.equal((html.match(/for="date-select"/g) || []).length, 1);
  assert.equal((html.match(/id="archive"/g) || []).length, 1);
  assert.ok(heading < html.indexOf('id="archive"') && html.indexOf('id="archive"') < select, 'Archive navigation must reach the top switcher');
  assert.ok(html.indexOf('id="recent-issues"') > html.indexOf('<aside'), 'Keep the existing recent-issues list');
});

class Element {
  constructor(tag) {
    this.tagName = tag; this.children = []; this.dataset = {}; this.className = '';
    this.listeners = {}; this.classList = { toggle() {} }; this.value = ''; this._text = '';
  }
  append(...nodes) { for (const node of nodes) this.children.push(...(node.tagName === 'fragment' ? node.children : [node])); }
  prepend(...nodes) { this.children.unshift(...nodes); }
  replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(node => node.textContent || '').join(''); }
  setAttribute(name, value) { this[name] = value; }
  removeAttribute(name) { delete this[name]; }
  addEventListener(name, callback) { this.listeners[name] = callback; }
  querySelectorAll(tag) {
    const found = [];
    const visit = node => { if (node.tagName === tag) found.push(node); node.children?.forEach(visit); };
    this.children.forEach(visit); return found;
  }
  focus() {}
  scrollIntoView() {}
}

test('date switching preserves deep links, resets filters, and follows browser history', async t => {
  const ids = {};
  const get = id => ids[id] ||= new Element('div');
  const filters = ['全部', '产品发布', '技术实践', '开源项目', '观点洞察'].map(category => {
    const node = new Element('button'); node.dataset.category = category; return node;
  });
  const events = {};
  const history = ['https://example.com/ai-news-digest/?date=2026-10-07'];
  let position = 0;
  const location = {};
  const navigate = url => { const next = new URL(url); location.href = next.href; location.search = next.search; };
  navigate(history[0]);
  global.document = {
    getElementById: get, createElement: tag => new Element(tag),
    createTextNode: text => { const node = new Element('text'); node.textContent = text; return node; },
    createDocumentFragment: () => new Element('fragment'), querySelectorAll: () => filters
  };
  global.window = {
    location, setTimeout, clearTimeout, matchMedia: () => ({ matches: true }),
    history: { pushState(_state, _title, url) { history.splice(++position); history.push(String(url)); navigate(url); } },
    addEventListener: (name, callback) => { events[name] = callback; }
  };
  const data = { schemaVersion: 1, digests: ['2026-10-08', '2026-10-07'].map(date => ({
    date, title: 'Issue ' + date, summary: 'Summary ' + date,
    items: [{ title: 'Article ' + date, summary: 'Content ' + date, category: '技术实践', source: 'Example', url: 'https://example.com/article' }]
  })) };
  global.fetch = async () => ({ ok: true, json: async () => data });
  t.after(() => { delete global.document; delete global.window; delete global.fetch; });
  const settle = () => new Promise(resolve => setImmediate(resolve));
  app.start(); await settle();
  assert.equal(get('date-select').value, '2026-10-07');
  assert.equal(get('digest-heading').textContent, '往期简报');
  assert.deepEqual(get('date-select').children.map(option => option.value), ['2026-10-08', '2026-10-07']);
  assert.equal(get('archive-count').textContent, '2 期');
  get('search').value = 'unmatched'; get('search').listeners.input(); filters[1].listeners.click();
  get('date-select').listeners.change({ target: { value: '2026-10-08' } });
  assert.equal(location.search, '?date=2026-10-08');
  assert.equal(get('search').value, '');
  assert.equal(get('digest-heading').textContent, '最新简报');
  assert.equal(get('digest-content').querySelectorAll('article').length, 1);
  navigate(history[--position]); events.popstate();
  assert.equal(get('date-select').value, '2026-10-07');
  assert.match(document.title, /^2026-10-07/);
  navigate(history[++position]); events.popstate();
  assert.equal(get('date-select').value, '2026-10-08');
  app.start(); await settle();
  assert.equal(get('date-select').value, '2026-10-08', 'Reload must retain the linked date');
  const older = get('recent-issues').querySelectorAll('a').find(link => link.dataset.date === '2026-10-07');
  assert.equal(older.href, '/ai-news-digest/?date=2026-10-07#digest');
  older.listeners.click({ button: 0, preventDefault() {} });
  assert.equal(get('date-select').value, '2026-10-07');
  assert.equal(location.search, '?date=2026-10-07');
});
