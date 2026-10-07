'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { CATEGORIES, isDate, isSafeUrl, isTimestamp, validateData, filterItems, formatDate, selectDigest } = require('../app.js');
// Synthetic test fixtures only. They are never loaded by the public website.
const item = (overrides = {}) => ({ title: '测试条目 Alpha', summary: '这是用于自动化测试的摘要。', category: '技术实践', source: '测试来源', url: 'https://example.com/article', publishedAt: null, ...overrides });
const issue = (date = '2026-10-07', overrides = {}) => ({ date, title: '测试简报', summary: '仅用于测试。', items: [item()], ...overrides });
const payload = (...digests) => ({ schemaVersion: 1, digests });

test('empty public state is valid', () => assert.deepEqual(validateData(payload()), payload()));
test('issues are sorted newest first without changing input', () => {
  const input = payload(issue('2026-10-05'), issue('2026-10-07'));
  assert.deepEqual(validateData(input).digests.map(d => d.date), ['2026-10-07', '2026-10-05']);
  assert.equal(input.digests[0].date, '2026-10-05');
});
test('dates must be real, zero-padded calendar dates', () => {
  for (const value of ['2026-02-29', '2026-02-31', '2026-13-01', '2026-1-01', '../2026-10-07', '', null]) assert.equal(isDate(value), false);
  for (const value of ['2024-02-29', '2026-10-07']) assert.equal(isDate(value), true);
});
test('duplicate issue dates are rejected', () => assert.throws(() => validateData(payload(issue(), issue())), /duplicated/));
test('invalid payload shape and schema are rejected', () => {
  for (const input of [null, [], {}, { schemaVersion: 2, digests: [] }, { schemaVersion: 1, digests: {} }]) assert.throws(() => validateData(input));
});
test('missing required text and articles are rejected', () => {
  for (const bad of [issue(undefined, { title: ' ' }), issue(undefined, { summary: '' }), issue(undefined, { items: [] }), issue(undefined, { items: [item({ source: '' })] })]) assert.throws(() => validateData(payload(bad)));
});
test('all four allowed categories validate and unknown categories fail', () => {
  for (const category of CATEGORIES) assert.doesNotThrow(() => validateData(payload(issue(undefined, { items: [item({ category })] }))));
  assert.throws(() => validateData(payload(issue(undefined, { items: [item({ category: '其他' })] }))), /category/);
});
test('source links only accept absolute HTTP(S) URLs without credentials', () => {
  for (const url of ['https://example.com/a?q=1', 'http://example.com']) assert.equal(isSafeUrl(url), true);
  for (const url of ['javascript:alert(1)', 'data:text/html,<h1>hi</h1>', '//example.com', '/relative', 'https://user:pass@example.com', ' https://example.com', undefined]) assert.equal(isSafeUrl(url), false);
});
test('published timestamps require real dates, times and explicit timezone', () => {
  for (const value of ['2026-10-07T10:20:30Z', '2026-10-07T10:20:30.123+08:00']) assert.equal(isTimestamp(value), true);
  for (const value of ['2026-10-07', '2026-10-07T10:20:30', '2026-02-30T10:20:30Z', '2026-10-07T24:00:00Z', '2026-10-07T10:60:30Z', 'not-a-date', undefined]) assert.equal(isTimestamp(value), false);
});
test('search covers title, summary and source with case and width normalization', () => {
  const digest = issue(undefined, { items: [item(), item({ title: '第二条', category: '产品发布', source: 'OpenAI', summary: '工具箱' })] });
  assert.equal(filterItems(digest, '全部', 'ＡＬＰＨＡ').length, 1);
  assert.equal(filterItems(digest, '全部', 'openai')[0].title, '第二条');
  assert.equal(filterItems(digest, '全部', '工具箱').length, 1);
  assert.equal(filterItems(digest, '全部', '  ').length, 2);
  assert.equal(filterItems(digest, '技术实践', 'openai').length, 0);
  assert.equal(filterItems(digest, '产品发布', '').length, 1);
});
test('date selection defaults to latest and handles missing/invalid dates', () => {
  const digests = validateData(payload(issue('2026-10-05'), issue())).digests;
  assert.equal(selectDigest(digests, '2026-10-05').date, '2026-10-05');
  assert.equal(selectDigest(digests, 'no-such-date').date, '2026-10-07');
  assert.equal(selectDigest(digests, null).date, '2026-10-07');
  assert.equal(selectDigest([], null), null);
});
test('display date does not drift with the machine timezone', () => assert.equal(formatDate('2026-10-07'), '2026年10月7日'));

test('publication metadata accepts omitted, unknown, exact dates and timestamps without inventing precision', () => {
  for (const publishedAt of [undefined, null, '2026-10-07', '2026-10-07T10:20:30Z']) assert.doesNotThrow(() => validateData(payload(issue(undefined, { items: [item({ publishedAt })] }))));
  for (const publishedAt of ['', '2026-02-30', 'yesterday', '2026-10-07T10:20:30']) assert.throws(() => validateData(payload(issue(undefined, { items: [item({ publishedAt })] }))));
});
