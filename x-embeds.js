/* Official X widgets only: no fetched post text is copied into this site. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof document !== 'undefined') root.XEmbeds = api.createController(root, document);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function createController(win, doc) {
    let scriptPromise = null, generation = 0, cleanups = [];
    function widgets() {
      if (win.twttr?.widgets?.createTweet) return Promise.resolve(win.twttr.widgets);
      if (scriptPromise) return scriptPromise;
      scriptPromise = new Promise((resolve, reject) => {
        const script = doc.createElement('script');
        script.src = 'https://platform.x.com/widgets.js';
        script.async = true;
        script.charset = 'utf-8';
        let timer;
        function fail() {
          win.clearTimeout(timer);
          script.remove();
          scriptPromise = null;
          reject(new Error('X widgets unavailable'));
        }
        script.onerror = fail;
        script.onload = () => {
          win.clearTimeout(timer);
          if (win.twttr?.widgets?.createTweet) resolve(win.twttr.widgets);
          else fail();
        };
        timer = win.setTimeout(fail, 15000);
        doc.head.append(script);
      });
      return scriptPromise;
    }
    function render(root) {
      const current = ++generation;
      cleanups.forEach(fn => fn());
      cleanups = [];
      for (const block of root.querySelectorAll('.tweet-embed-block')) {
        let attempt = 0;
        function load() {
          const request = ++attempt;
          const target = doc.createElement('div');
          target.className = 'tweet-embed-target';
          const status = doc.createElement('p');
          status.className = 'tweet-embed-status';
          status.setAttribute('role', 'status');
          status.textContent = '正在加载 X 官方原帖…';
          const retry = doc.createElement('button');
          retry.className = 'tweet-embed-retry';
          retry.type = 'button';
          retry.textContent = '重新加载原帖';
          retry.hidden = true;
          retry.addEventListener('click', load);
          block.replaceChildren(target, status, retry);
          block.dataset.embedState = 'loading';
          let timer;
          const active = () => current === generation && request === attempt && block.isConnected;
          function failed() {
            if (!active()) return;
            block.dataset.embedState = 'failed';
            status.hidden = false;
            status.textContent = '未能加载 X 原帖。可重试，或使用下方原帖链接查看。';
            retry.hidden = false;
          }
          try {
            const url = new URL(block.dataset.postUrl);
            const match = url.pathname.match(/^\/(?:[^/]+\/status|i\/web\/status)\/(\d+)\/?$/);
            if (!/^https?:$/.test(url.protocol) || url.username || url.password || !/^(www\.)?(x|twitter)\.com$/.test(url.hostname) || !match) throw new Error('Invalid post');
            timer = win.setTimeout(failed, 20000);
            cleanups.push(() => win.clearTimeout(timer));
            widgets().then(api => {
              if (!active()) return null;
              return api.createTweet(match[1], target, { theme: 'light', dnt: true, align: 'left', conversation: 'none' });
            }).then(embed => {
              win.clearTimeout(timer);
              if (!active()) return;
              if (!embed) { failed(); return; }
              block.dataset.embedState = 'ready';
              status.hidden = true;
              retry.hidden = true;
            }).catch(() => { win.clearTimeout(timer); failed(); });
          } catch (_) { failed(); }
        }
        load();
      }
    }
    return { render };
  }
  return { createController };
});
