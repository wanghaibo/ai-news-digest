'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const app=require('../app.js');
const item=(sourceType,extra={})=>({title:'Synthetic article',summary:'Synthetic summary',source:'Synthetic source',category:'技术实践',url:'https://example.com/article',sourceType,...extra});
const xItem=(extra={})=>({title:'Example Author · X 原帖',source:'X / Example Author',authorName:'Example Author',authorBackground:'Example Author is a software developer.',sourceType:'x',xDisplay:'link-only',category:'技术实践',url:'https://x.com/example/status/123',sourcePosts:[{url:'https://x.com/example/status/123',publishedAt:'2026-10-08'}],...extra});
const data=items=>({schemaVersion:1,digests:[{date:'2026-10-09',title:'Fixture',summary:'Fixture',items}]});
test('source groups preserve all articles in editorial order and omit empty sections',()=>{
 const rows=[item('github'),item('blog'),xItem(),item('podcast'),xItem(),item(undefined)];
 const groups=app.groupItems(rows);
 assert.deepEqual(groups.map(g=>g.type),['x','podcast','blog','github','other']);
 assert.equal(groups[0].items.length,2);assert.equal(groups.flatMap(g=>g.items).length,rows.length);
 assert.deepEqual(app.groupItems([rows[0]]).map(g=>g.type),['github']);assert.deepEqual(app.groupItems([]),[]);
});
test('non-X original titles, details and backgrounds remain searchable and validate',()=>{
 const row=item('blog',{authorBackground:'Verified creator background',originalTitle:'Original Source Title',detail:'Mechanism detail'});
 assert.doesNotThrow(()=>app.validateData(data([row])));
 for(const text of ['creator','original source','mechanism'])assert.equal(app.filterItems({items:[row]},'全部',text).length,1);
 for(const field of ['authorBackground','originalTitle','sourceName','detail'])assert.throws(()=>app.validateData(data([item('blog',{[field]:{html:'unsafe'}})])),new RegExp(field));
 assert.throws(()=>app.validateData(data([item('blog',{summary:undefined})])),/summary/);
});
test('link-only X validates without a summary and rejects removed commentary fields',()=>{
 assert.doesNotThrow(()=>app.validateData(data([xItem()])));
 assert.doesNotThrow(()=>app.validateData(data([xItem({xDisplay:undefined})])));
 for(const field of ['summary','detail','translations','originalTitle','sourceEvidence','evidenceNote','additionalSources','originalPosts']){
  assert.throws(()=>app.validateData(data([xItem({[field]:'Removed material'})])),new RegExp(field));
 }
 assert.throws(()=>app.validateData(data([xItem({title:'An explanatory headline'})])),/title/);
 assert.throws(()=>app.validateData(data([xItem({authorBackground:undefined})])),/authorBackground/);
});
test('X source posts retain exact direct URLs and validate safe hosts, dates and uniqueness',()=>{
 const base=xItem();
 for(const sourcePosts of [undefined,[],[{}],[{url:'javascript:alert(1)'}],[{url:'https://example.com/post'}],[{url:base.url,publishedAt:'2026-02-30'}],[{url:base.url},{url:base.url}],[{url:'https://x.com/example/status/456'}]])assert.throws(()=>app.validateData(data([xItem({sourcePosts})])),/sourcePosts/);
 assert.doesNotThrow(()=>app.validateData(data([xItem({sourcePosts:[...base.sourcePosts,{url:'https://twitter.com/example/status/456?s=20'}]})])));
});
test('link-only search never matches stale summaries, excerpts, detail or derived headlines',()=>{
 const row=xItem({title:'Staleheadline',summary:'Stalesummary',detail:'Staledetail',originalTitle:'Staleoriginaltitle',translations:[{text:'Staletranslation',note:'Stalenote'}]});
 for(const term of ['staleheadline','stalesummary','staledetail','staleoriginaltitle','staletranslation','stalenote'])assert.equal(app.filterItems({items:[row]},'全部',term).length,0);
 for(const term of ['example author','developer','x.com/example/status/123'])assert.equal(app.filterItems({items:[row]},'全部',term).length,1);
});
test('user-provided X text requires complete original and translation blocks, without analysis',()=>{
 const original={text:'One line\n\n  indented line 😊',translation:'第一行\n\n  缩进行 😊',sourceUrl:'https://x.com/example/status/123'};
 const row=xItem({xDisplay:'user-provided',originalPosts:[original]});
 assert.doesNotThrow(()=>app.validateData(data([row])));
 assert.equal(app.filterItems({items:[row]},'全部','indented').length,1);assert.equal(app.filterItems({items:[row]},'全部','缩进行').length,1);
 for(const originalPosts of [undefined,[],[{}],[{...original,text:' '}],[{...original,translation:' '}],[{...original,sourceUrl:'https://x.com/example/status/999'}]])assert.throws(()=>app.validateData(data([xItem({xDisplay:'user-provided',originalPosts})])),/originalPosts/);
 assert.throws(()=>app.validateData(data([xItem({xDisplay:'unknown'})])),/xDisplay/);
});
class E {
 constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.className='';this.listeners={};this.classList={toggle:()=>{}};this.value='';this._text='';}
 append(...xs){for(const x of xs){if(x.tagName==='fragment')this.children.push(...x.children);else this.children.push(x)}}
 prepend(...xs){this.children.unshift(...xs)}replaceChildren(...xs){this.children=[];this.append(...xs)}
 set textContent(v){this._text=String(v);this.children=[]}get textContent(){return this._text+this.children.map(x=>x.textContent||'').join('')}
 setAttribute(k,v){this[k]=v}removeAttribute(k){delete this[k]}addEventListener(k,f){this.listeners[k]=f}
 querySelectorAll(sel){const out=[];const visit=x=>{if(x.tagName===sel)out.push(x);x.children?.forEach(visit)};this.children.forEach(visit);return out}
 focus(){}scrollIntoView(){}
}
test('render X links and provided originals separately, keep non-X views and filters',async t=>{
 const ids={},get=id=>ids[id]??=new E('div');
 const filters=['全部','产品发布','技术实践','开源项目','观点洞察'].map(v=>{const n=new E('button');n.dataset.category=v;return n});
 global.document={getElementById:get,createElement:t=>new E(t),createTextNode:t=>{const n=new E('text');n.textContent=t;return n},createDocumentFragment:()=>new E('fragment'),querySelectorAll:()=>filters};
 global.window={location:{href:'https://example.com/?date=2026-10-09',search:'?date=2026-10-09'},setTimeout,clearTimeout,history:{pushState:()=>{}},addEventListener:()=>{},matchMedia:()=>({matches:true})};
 const original={text:'One line\n\n  indented line 😊',translation:'第一行\n\n  缩进行 😊',sourceUrl:'https://x.com/example/status/123'};
 const fixture=data([xItem({sourcePosts:[...xItem().sourcePosts,{url:'https://x.com/example/status/456'}]}),xItem({xDisplay:'user-provided',originalPosts:[original]}),item('blog',{authorBackground:'Verified creator background',originalTitle:'Original title',detail:'A useful mechanism',sourceName:'Official research blog'}),item('github',{githubStatus:'returning',detail:'Historical extended analysis'})]);
 global.fetch=async()=>({ok:true,json:async()=>fixture});
 t.after(()=>{delete global.document;delete global.window;delete global.fetch;});
 app.start();await new Promise(resolve=>setImmediate(resolve));
 const content=get('digest-content');assert.deepEqual(content.querySelectorAll('section').map(x=>x.dataset.sourceType),['x','blog','github']);assert.equal(content.querySelectorAll('article').length,4);
 const xSection=content.querySelectorAll('section')[0],xCards=xSection.querySelectorAll('article');
 assert.ok(xCards[0].textContent.includes('Example Author is a software developer.'));
 assert.ok(!xSection.textContent.includes('摘要与解读'));assert.ok(!xSection.textContent.includes('原文节选翻译'));
 assert.deepEqual(xCards[0].querySelectorAll('a').filter(a=>a.className==='source-link').map(a=>a.href),['https://x.com/example/status/123','https://x.com/example/status/456']);
 assert.equal(xCards[0].querySelectorAll('div').filter(n=>n.className==='tweet-translation').length,0);
 assert.deepEqual(xCards[0].querySelectorAll('div').filter(n=>n.className==='tweet-embed-block').map(n=>n.dataset.postUrl),fixture.digests[0].items[0].sourcePosts.map(p=>p.url));
 assert.equal(xCards[1].querySelectorAll('div').filter(n=>n.className==='tweet-embed-block').length,0);
 const texts=xCards[1].querySelectorAll('p').filter(n=>n.className==='tweet-text').map(n=>n.textContent);assert.deepEqual(texts,[original.text,original.translation]);
 assert.match(xCards[1].textContent,/原文全文翻译/);
 for(const text of ['Verified creator background','Original title','A useful mechanism','Official research blog'])assert.ok(content.textContent.includes(text),text);
 assert.ok(content.querySelectorAll('details').some(x=>x.className==='recurring-analysis'));
 for(const a of content.querySelectorAll('a')){assert.equal(a.target,'_blank');assert.equal(a.rel,'noopener noreferrer')}
 get('search').value='Verified creator';get('search').listeners.input();assert.equal(content.querySelectorAll('article').length,1);
 get('search').value='no-match';get('search').listeners.input();assert.equal(content.querySelectorAll('section').length,0);
 content.querySelectorAll('button')[0].listeners.click();assert.equal(content.querySelectorAll('article').length,4);
});
test('X metadata is allowlisted so hidden nested commentary cannot survive validation',()=>{
 const original={text:'Provided original',translation:'完整译文',sourceUrl:xItem().url};
 for(const row of [xItem({analysis:'Hidden analysis'}),xItem({source:'X / Example Author: an explanatory headline'}),xItem({sourcePosts:[{url:xItem().url,summary:'Hidden post summary'}]}),xItem({xDisplay:'user-provided',originalPosts:[{...original,analysis:'Hidden analysis'}]})])assert.throws(()=>app.validateData(data([row])),/not allowed|source must/);
});
test('X background verification metadata cannot contain hidden prose',()=>{
 for(const backgroundVerifiedAt of [{summary:'Hidden analysis'},'Analysis text','2026-02-30'])assert.throws(()=>app.validateData(data([xItem({backgroundVerifiedAt})])),/backgroundVerifiedAt/);
 for(const backgroundVerifiedAt of [undefined,null,'2026-10-08','2026-10-08T11:30:00Z'])assert.doesNotThrow(()=>app.validateData(data([xItem({backgroundVerifiedAt})])));
});

