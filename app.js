/* No dependencies. Shared validation is also used by the publishing checks. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof document !== 'undefined') {
    root.DigestApp = api;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', api.start, { once: true });
    else api.start();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const CATEGORIES = ['产品发布', '技术实践', '开源项目', '观点洞察'];
  const ALL = '全部';

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }
  function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }
  function isDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value + 'T12:00:00Z');
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }
  function isSafeUrl(value) {
    try {
      if (typeof value !== 'string' || value.length > 4096 || value !== value.trim()) return false;
      const url = new URL(value);
      return /^https?:$/.test(url.protocol) && !url.username && !url.password;
    } catch (_) { return false; }
  }
  function isTimestamp(value) {
    return typeof value === 'string' && isDate(value.slice(0, 10)) &&
      /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value) &&
      !Number.isNaN(Date.parse(value));
  }
  function requireText(value, path, max) {
    assert(typeof value === 'string' && value.trim().length > 0 && value.length <= max, path + ' must be a non-empty string (max ' + max + ' characters).');
  }
  function validateData(data) {
    assert(isObject(data), 'The data must be a JSON object.');
    assert(data.schemaVersion === 1, 'schemaVersion must equal 1.');
    assert(Array.isArray(data.digests) && data.digests.length <= 10000, 'digests must be an array of at most 10000 issues.');
    const dates = new Set();
    for (const [index, digest] of data.digests.entries()) {
      const path = 'digests[' + index + ']';
      assert(isObject(digest), path + ' must be an object.');
      assert(isDate(digest.date), path + '.date must be a real YYYY-MM-DD date.');
      assert(!dates.has(digest.date), path + '.date is duplicated: ' + digest.date);
      dates.add(digest.date);
      requireText(digest.title, path + '.title', 300);
      requireText(digest.summary, path + '.summary', 5000);
      assert(Array.isArray(digest.items) && digest.items.length > 0 && digest.items.length <= 100, path + '.items must contain 1–100 articles.');
      for (const [itemIndex, item] of digest.items.entries()) {
        const itemPath = path + '.items[' + itemIndex + ']';
        assert(isObject(item), itemPath + ' must be an object.');
        requireText(item.title, itemPath + '.title', 500);
        requireText(item.summary, itemPath + '.summary', 10000);
        requireText(item.source, itemPath + '.source', 300);
        for (const field of ['authorBackground', 'originalTitle', 'sourceName', 'detail']) {
          if (item[field] !== undefined) requireText(item[field], itemPath + '.' + field, 10000);
        }
        if (item.translations !== undefined) {
          assert(Array.isArray(item.translations) && item.translations.length > 0 && item.translations.length <= 20, itemPath + '.translations must contain 1–20 translation blocks.');
          for (const [translationIndex, translation] of item.translations.entries()) {
            const translationPath = itemPath + '.translations[' + translationIndex + ']';
            assert(isObject(translation), translationPath + ' must be an object.');
            requireText(translation.text, translationPath + '.text', 10000);
            assert(['excerpt', 'full'].includes(translation.scope), translationPath + '.scope must be excerpt or full.');
            assert(isSafeUrl(translation.sourceUrl), translationPath + '.sourceUrl must be a safe absolute HTTP(S) URL.');
            if (translation.note !== undefined) requireText(translation.note, translationPath + '.note', 2000);
          }
        }
        assert(CATEGORIES.includes(item.category), itemPath + '.category must be one of: ' + CATEGORIES.join(', '));
        assert(isSafeUrl(item.url), itemPath + '.url must be an absolute HTTP(S) URL without embedded credentials.');
        assert(item.publishedAt === undefined || item.publishedAt === null || isDate(item.publishedAt) || isTimestamp(item.publishedAt), itemPath + '.publishedAt must be omitted, null, a YYYY-MM-DD date, or an ISO 8601 timestamp with a timezone.');
      }
    }
    return { schemaVersion: 1, digests: [...data.digests].sort((a, b) => b.date.localeCompare(a.date)) };
  }
  function supplementalSources(item) {
    if (!Array.isArray(item.additionalSources)) return [];
    return item.additionalSources.filter(source => isObject(source) &&
      typeof source.title === 'string' && source.title.trim() && source.title.length <= 300 && isSafeUrl(source.url));
  }
  function filterItems(digest, category, query) {
    const term = String(query || '').normalize('NFKC').trim().toLocaleLowerCase('zh-CN');
    return digest.items.filter(item => (category === ALL || item.category === category) &&
      (!term || [item.title, item.summary, item.source, item.originalTitle, item.authorBackground, item.detail, ...(item.translations || []).flatMap(translation => [translation.text, translation.note])].join(' ').normalize('NFKC').toLocaleLowerCase('zh-CN').includes(term)));
  }
  function groupItems(items) {
    const sections = [['x', 'X 推文精选'], ['podcast', '播客'], ['blog', '官方博客与研究'], ['github', 'GitHub AI 项目'], ['other', '其他资讯']];
    const known = new Set(sections.slice(0, 4).map(([type]) => type));
    return sections.map(([type, title]) => ({ type, title,
      items: items.filter(item => (known.has(item.sourceType) ? item.sourceType : 'other') === type)
    })).filter(group => group.items.length);
  }
  function formatDate(value) {
    return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(value + 'T12:00:00Z'));
  }
  function selectDigest(digests, date) {
    return digests.find(digest => digest.date === date) || digests[0] || null;
  }

  function start() {
    const byId = id => document.getElementById(id);
    const elements = {
      content: byId('digest-content'), intro: byId('digest-intro'), heading: byId('digest-heading'),
      select: byId('date-select'), search: byId('search'), recent: byId('recent-issues'),
      count: byId('issue-count'), archiveCount: byId('archive-count'), edition: byId('edition-label'),
      status: byId('result-status'), filters: Array.from(document.querySelectorAll('[data-category]'))
    };
    if (!elements.content) return;
    let digests = [], selected = null, category = ALL, controller = null, sequence = 0;

    function el(tag, className, text) {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    }
    function externalLink(url, className, label) {
      const link = el('a', className, label);
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      return link;
    }
    function emptyState(title, description, symbol) {
      const panel = el('div', 'empty-state');
      const icon = el('span', 'empty-symbol', symbol || '✳');
      icon.setAttribute('aria-hidden', 'true');
      panel.append(icon, el('h3', '', title), el('p', '', description));
      return panel;
    }
    function setControls(enabled) {
      elements.select.disabled = !enabled;
      elements.search.disabled = !enabled;
      elements.filters.forEach(button => { button.disabled = !enabled; });
    }
    function updateFilterButtons() {
      elements.filters.forEach(button => {
        const active = button.dataset.category === category;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
    }
    function renderArticles() {
      elements.content.replaceChildren();
      if (!selected) return;
      const items = filterItems(selected, category, elements.search.value);
      elements.count.textContent = items.length + ' / ' + selected.items.length + ' 条资讯';
      elements.status.textContent = formatDate(selected.date) + '，找到 ' + items.length + ' 条资讯。';
      if (!items.length) {
        const empty = emptyState('换个关键词，再找找。', '本期没有符合当前筛选条件的资讯。试试其他分类，或清除搜索词。', '⌕');
        const clear = el('button', '', '清除筛选');
        clear.type = 'button';
        clear.addEventListener('click', () => {
          elements.search.value = '';
          category = ALL;
          updateFilterButtons();
          renderArticles();
          elements.search.focus();
        });
        empty.append(clear);
        elements.content.append(empty);
        return;
      }
      const fragment = document.createDocumentFragment();
      for (const group of groupItems(items)) {
        const section = el('section', 'source-section');
        section.dataset.sourceType = group.type;
        section.append(el('h3', 'source-section-title', group.title));
        if (group.type === 'github') {
          if (typeof selected.githubHistory?.note === 'string') section.append(el('p', 'source-section-note', selected.githubHistory.note));
          if (typeof selected.githubRankingNote === 'string') section.append(el('p', 'source-section-note', selected.githubRankingNote));
        }
        let publisher = null, githubStatus = null;
        for (const item of group.items) {
        if (group.type === 'blog' && item.sourceName && item.sourceName !== publisher) {
          publisher = item.sourceName;
          section.append(el('p', 'publisher-heading', publisher));
        }
        if (group.type === 'github' && item.githubStatus && item.githubStatus !== githubStatus) {
          githubStatus = item.githubStatus;
          section.append(el('p', 'publisher-heading', githubStatus === 'returning' ? '持续热门｜历史记录中已出现' : '新发现｜留存历史中未出现'));
        }
        const article = el('article', item.githubStatus === 'returning' ? 'news-card recurring-card' : 'news-card');
        const number = el('span', 'news-number', String(selected.items.indexOf(item) + 1).padStart(2, '0'));
        number.setAttribute('aria-hidden', 'true');
        const body = el('div', 'news-body');
        const meta = el('div', 'news-meta');
        meta.append(el('span', 'category-tag', item.category), el('span', '', item.source));
        if (item.publishedAt) {
          const time = el('time', '', item.publishedAt.slice(0, 10));
          time.dateTime = item.publishedAt;
          time.title = '来源发布日期：' + item.publishedAt;
          meta.append(time);
        }
        const title = el('h4');
        title.append(externalLink(item.url, '', item.title));
        const source = externalLink(item.url, 'source-link', '阅读原文 ↗');
        source.setAttribute('aria-label', '阅读原文：' + item.title + '（在新标签页打开）');
        body.append(meta, title);
        if (item.originalTitle) {
          const original = el('p', 'original-title', '原题：');
          original.append(externalLink(item.url, '', item.originalTitle));
          body.append(original);
        }
        if (item.authorBackground) body.append(el('p', 'author-background', item.authorBackground));
        if (item.translations?.length) {
          for (const translation of item.translations) {
            const block = el('div', 'tweet-translation');
            block.append(el('p', 'translation-label', translation.scope === 'full' ? '原文翻译' : '原文节选翻译'));
            block.append(el('p', 'translation-text', translation.text));
            if (translation.note) block.append(el('p', 'translation-note', translation.note));
            block.append(externalLink(translation.sourceUrl, 'source-link', '对应原帖 ↗'));
            body.append(block);
          }
          body.append(el('p', 'analysis-label', '摘要与解读'));
        }
        body.append(el('p', '', item.summary));
        if (item.detail) {
          if (item.githubStatus === 'returning') {
            const expansion = el('details', 'recurring-analysis');
            expansion.append(el('summary', '', '展开项目分析'), el('p', 'article-detail', item.detail));
            body.append(expansion);
          } else body.append(el('p', 'article-detail', '进一步理解：' + item.detail));
        }
        body.append(source);
        const additional = supplementalSources(item);
        if (additional.length) {
          const links = el('div', 'additional-sources');
          for (const entry of additional) {
            const link = externalLink(entry.url, 'source-link', entry.title + ' ↗');
            link.setAttribute('aria-label', entry.title + '（在新标签页打开）');
            links.append(link, document.createTextNode(' '));
          }
          body.append(links);
        }
        article.append(number, body);
        section.append(article);
        }
        fragment.append(section);
      }
      if (Array.isArray(selected.sourceNotes) && selected.sourceNotes.some(note => typeof note === 'string')) {
        const notes = el('details', 'source-notes');
        notes.append(el('summary', '', '来源与修订说明'));
        const list = el('ul');
        for (const note of selected.sourceNotes) if (typeof note === 'string') list.append(el('li', '', note));
        notes.append(list);
        fragment.append(notes);
      }
      elements.content.append(fragment);
    }
    function renderSelection() {
      elements.intro.replaceChildren();
      elements.intro.hidden = !selected;
      if (!selected) return;
      elements.heading.textContent = selected === digests[0] ? '最新简报' : '往期简报';
      elements.edition.textContent = formatDate(selected.date) + ' · AI 资讯简报';
      elements.select.value = selected.date;
      document.title = selected.date + ' · ' + selected.title + ' · AI 资讯简报';
      elements.intro.append(el('h3', '', selected.title), el('p', '', selected.summary));
      const markdown = el('a', '', '查看本期 Markdown ↗');
      markdown.href = './digests/' + selected.date + '.md';
      elements.intro.append(markdown);
      for (const link of elements.recent.querySelectorAll('a')) {
        if (link.dataset.date === selected.date) link.setAttribute('aria-current', 'date');
        else link.removeAttribute('aria-current');
      }
      const requested = new URLSearchParams(window.location.search).get('date');
      if (requested && requested !== selected.date) {
        elements.intro.prepend(el('p', 'notice', '该日期尚无简报，已显示最新一期。'));
      }
      updateFilterButtons();
      renderArticles();
    }
    function chooseDate(date, updateHistory) {
      selected = selectDigest(digests, date);
      category = ALL;
      elements.search.value = '';
      if (updateHistory && selected) {
        const url = new URL(window.location.href);
        url.searchParams.set('date', selected.date);
        window.history.pushState({ date: selected.date }, '', url);
      }
      renderSelection();
    }
    function renderArchive() {
      elements.select.replaceChildren();
      elements.recent.replaceChildren();
      elements.archiveCount.textContent = digests.length + ' 期';
      if (!digests.length) {
        const option = el('option', '', '暂无已发布简报');
        option.value = '';
        elements.select.append(option);
        return;
      }
      for (const digest of digests) {
        const option = el('option', '', formatDate(digest.date));
        option.value = digest.date;
        elements.select.append(option);
      }
      for (const digest of digests.slice(0, 5)) {
        const row = el('li');
        const link = el('a');
        const url = new URL(window.location.href);
        url.searchParams.set('date', digest.date);
        url.hash = 'digest';
        link.href = url.pathname + url.search + url.hash;
        link.dataset.date = digest.date;
        link.title = digest.title;
        link.append(el('span', '', digest.date), el('span', '', digest.items.length + ' 条 ↗'));
        link.addEventListener('click', event => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
          event.preventDefault();
          chooseDate(digest.date, true);
          byId('digest').scrollIntoView({ block: 'start' });
        });
        row.append(link);
        elements.recent.append(row);
      }
    }
    async function loadData() {
      if (controller) controller.abort();
      controller = new AbortController();
      const activeController = controller;
      const current = ++sequence;
      const timeout = window.setTimeout(() => activeController.abort(), 15000);
      setControls(false);
      elements.content.setAttribute('aria-busy', 'true');
      elements.content.replaceChildren(emptyState('正在读取简报', '马上就好。', '⋯'));
      elements.status.textContent = '正在读取简报。';
      try {
        const response = await fetch('./data/digests.json', { signal: activeController.signal, cache: 'no-cache' });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = validateData(await response.json());
        if (current !== sequence) return;
        digests = data.digests;
        renderArchive();
        setControls(digests.length > 0);
        if (!digests.length) {
          selected = null;
          elements.intro.hidden = true;
          elements.edition.textContent = '等待首期发布';
          elements.heading.textContent = '最新简报';
          elements.count.textContent = '0 条资讯';
          const empty = emptyState('第一期简报，尚未发布。', '这里将收录经过整理的 AI 动态。你可以先从下方的一手信息入口，探索感兴趣的方向。');
          empty.append(el('p', 'empty-subnote', '有来源的摘要 · 可回看的归档'));
          elements.content.replaceChildren(empty);
          elements.status.textContent = '暂无已发布简报。';
        } else {
          chooseDate(new URLSearchParams(window.location.search).get('date'), false);
        }
      } catch (error) {
        if (current !== sequence) return;
        elements.edition.textContent = '暂时无法读取';
        elements.count.textContent = '—';
        elements.intro.hidden = true;
        const empty = emptyState('简报暂时没有加载成功。', '请检查网络后重试。如果问题仍然存在，可以到 GitHub 查看原始归档。', '!');
        const retry = el('button', 'retry-button', '重新加载');
        retry.type = 'button';
        retry.addEventListener('click', loadData);
        const archive = externalLink('https://github.com/wanghaibo/ai-news-digest/tree/main/digests', 'empty-subnote', '查看 GitHub 归档 ↗');
        empty.append(retry, archive);
        elements.content.replaceChildren(empty);
        elements.status.textContent = '加载失败，可以重新加载或查看 GitHub 归档。';
        console.error('Digest load failed:', error);
      } finally {
        window.clearTimeout(timeout);
        if (current === sequence) elements.content.setAttribute('aria-busy', 'false');
      }
    }
    elements.select.addEventListener('change', event => chooseDate(event.target.value, true));
    elements.search.addEventListener('input', renderArticles);
    elements.filters.forEach(button => button.addEventListener('click', () => {
      category = button.dataset.category;
      updateFilterButtons();
      renderArticles();
    }));
    window.addEventListener('popstate', () => {
      if (digests.length) chooseDate(new URLSearchParams(window.location.search).get('date'), false);
    });
    byId('back-to-top').addEventListener('click', event => {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
    loadData();
  }
  return { CATEGORIES, isDate, isSafeUrl, isTimestamp, validateData, filterItems, formatDate, selectDigest, supplementalSources, groupItems, start };
});

