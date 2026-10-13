'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../app.js');
const item = (extra = {}) => ({ title:'Article', summary:'Verified summary', source:'Publisher', category:'技术实践', url:'https://example.com/a', ...extra });
// These tests fail if source-specific presentation is removed or metadata is guessed.
test('presentation recognizes existing WeChat blogs without changing source groups', () => {
 const w=item({sourceType:'blog',source:'微信公众号 / 机器之心',sourceName:'微信公众号 / 机器之心',url:'https://mp.weixin.qq.com/s?id=1'});
 assert.deepEqual(app.sourcePresentation(w), {kind:'wechat',name:'机器之心',label:'微信公众号',mark:'微信',action:'阅读公众号原文'});
 assert.equal(app.sourcePresentation(item({sourceType:'blog',url:'https://mp.weixin.qq.com.evil.example/s'})).kind,'blog');
 assert.equal(app.sourcePresentation(item({sourceType:'blog',source:'微信公众号 / 量子位'})).kind,'wechat');
 assert.equal(app.sourcePresentation(item({sourceType:'x',url:w.url})).kind,'x');
 assert.deepEqual(app.groupItems([w]).map(g=>g.type),['blog']);
});
test('podcast presentation uses known program names and a safe fallback',()=>{
 assert.equal(app.sourcePresentation(item({sourceType:'podcast',sourceName:'The Show'})).name,'The Show');
 assert.equal(app.sourcePresentation(item({sourceType:'podcast'})).name,'Publisher');
 assert.equal(app.sourcePresentation(item({sourceType:'podcast'})).action,'打开本期节目');
});
test('GitHub metadata labels observed gain and retained history, preserving true zero',()=>{
 assert.deepEqual(app.projectFacts(item({language:'Python',starsToday:0,githubStatus:'returning',priorAppearanceCount:2})),['Python','今日增星 +0','历史出现 2 次']);
 assert.deepEqual(app.projectFacts(item({githubStatus:'new'})),['留存历史中新发现']);
 assert.deepEqual(app.projectFacts(item({starsToday:null,language:' ',priorAppearanceCount:0})),[]);
 assert.deepEqual(app.projectFacts(item({starsToday:-1,priorAppearanceCount:Infinity})),[]);
});
class E {
 constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.className='';this.listeners={};this.classList={toggle:()=>{}};this.value='';this._text='';}
 append(...xs){for(const x of xs){if(x.tagName==='fragment')this.children.push(...x.children);else this.children.push(x)}}
 prepend(...xs){this.children.unshift(...xs)}replaceChildren(...xs){this.children=[];this.append(...xs)}
 set textContent(v){this._text=String(v);this.children=[]}get textContent(){return this._text+this.children.map(x=>x.textContent||'').join('')}
 setAttribute(k,v){this[k]=v}removeAttribute(k){delete this[k]}addEventListener(k,f){this.listeners[k]=f}
 querySelectorAll(sel){const out=[];const visit=x=>{if(x.tagName===sel)out.push(x);x.children?.forEach(visit)};this.children.forEach(visit);return out}focus(){}scrollIntoView(){}
}
test('source cards retain visible caveats, safe links, search and no fake audio controls',async t=>{
 const ids={},get=id=>ids[id]??=new E('div');
 global.document={getElementById:get,createElement:t=>new E(t),createTextNode:t=>{const n=new E('text');n.textContent=t;return n},createDocumentFragment:()=>new E('fragment'),querySelectorAll:()=>[]};
 global.window={location:{href:'https://example.com/?date=2026-10-12',search:'?date=2026-10-12'},setTimeout,clearTimeout,history:{pushState:()=>{}},addEventListener:()=>{},matchMedia:()=>({matches:true})};
 const rows=[item({sourceType:'blog',source:'微信公众号 / 机器之心',sourceName:'微信公众号 / 机器之心',url:'https://mp.weixin.qq.com/s?id=1',title:'公众号精选｜A title',originalTitle:'A title',authorBackground:'Verified background',detail:'热度未核实；微信原文页未直读。',additionalSources:[{title:'Evidence',url:'https://example.com/evidence'}]}),item({sourceType:'github',title:'owner/repo',language:'Python',starsToday:20,githubStatus:'new'}),item({sourceType:'podcast',sourceName:'Show',authorBackground:'Known host',detail:'Read transcript, not audio.'})];
 global.fetch=async()=>({ok:true,json:async()=>({schemaVersion:1,digests:[{date:'2026-10-12',title:'Fixture',summary:'Fixture',githubHistory:{newLabel:'首次收录于本日报'},items:rows}]})});
 t.after(()=>{delete global.document;delete global.window;delete global.fetch;});app.start();await new Promise(r=>setImmediate(r));
 const content=get('digest-content'),cards=content.querySelectorAll('article');
 assert.deepEqual(cards.map(n=>n.dataset.presentation),['podcast','wechat','github']);
 const wechat=cards[1];assert.equal((wechat.textContent.match(/机器之心/g)||[]).length,1);
 assert.equal(wechat.querySelectorAll('h4')[0].textContent,'A title');
 assert.equal(wechat.querySelectorAll('p').filter(n=>n.className==='original-title').length,0);
 assert.ok(wechat.children[1].children.filter(n=>n.tagName!=='details').some(n=>n.textContent.includes('热度未核实；微信原文页未直读。')));
 assert.ok(wechat.querySelectorAll('details').some(n=>n.textContent.includes('Evidence')));
 assert.ok(cards[2].textContent.includes('今日增星 +20'));
 assert.ok(cards[2].textContent.includes('首次收录于本日报'));
 assert.ok(content.querySelectorAll('p').some(p=>p.className==='publisher-heading' && p.textContent==='首次收录于本日报'));
 assert.ok(!content.textContent.includes('留存历史中新发现'));
 const repoTitle=cards[2].querySelectorAll('h4')[0];
 assert.equal(repoTitle.translate,'no'); assert.equal(repoTitle.className,'notranslate');
 assert.equal(repoTitle.querySelectorAll('a')[0].translate,'no');
 assert.equal(cards[2].querySelectorAll('h4').length,1);
 assert.equal(cards[2].querySelectorAll('p').find(p=>p.className==='source-summary').translate,undefined);
 assert.ok(cards[0].textContent.includes('Show'));assert.ok(cards[0].textContent.includes('Known host'));
 assert.equal(content.querySelectorAll('audio').length,0);assert.equal(content.querySelectorAll('img').length,0);
 for(const a of content.querySelectorAll('a')){assert.equal(a.target,'_blank');assert.equal(a.rel,'noopener noreferrer');}
 get('search').value='热度未核实';get('search').listeners.input();assert.equal(content.querySelectorAll('article').length,1);
});

test('source-card styles and renderer both use fresh publication cache keys',()=>{
 const html=require('node:fs').readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
 assert.match(html,/href="\.\/style\.css\?v=20261012-sourcecards1"/);
 assert.match(html,/src="\.\/app\.js\?v=20261013-reponames1"/);
});

test('per-edition first-in-digest label does not relabel historical defaults',()=>{
 assert.deepEqual(app.projectFacts(item({githubStatus:'new'}),'首次收录于本日报'),['首次收录于本日报']);
 assert.deepEqual(app.projectFacts(item({githubStatus:'new'})),['留存历史中新发现']);
 const digest={date:'2026-10-13',title:'Fixture',summary:'Fixture',items:[item()],githubHistory:{newLabel:'首次收录于本日报'}};
 assert.doesNotThrow(()=>app.validateData({schemaVersion:1,digests:[digest]}));
 digest.githubHistory.newLabel='首次登上全站榜单';
 assert.throws(()=>app.validateData({schemaVersion:1,digests:[digest]}),/newLabel/);
});
