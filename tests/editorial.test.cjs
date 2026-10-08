'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const app=require('../app.js');
const item=(sourceType,extra={})=>({title:'Synthetic article',summary:'Synthetic summary',source:'Synthetic source',category:'技术实践',url:'https://example.com/article',sourceType,...extra});
test('source groups preserve all articles in editorial order and omit empty sections',()=>{
 const rows=[item('github'),item('blog'),item('x'),item('podcast'),item('x'),item(undefined)];
 const groups=app.groupItems(rows);
 assert.deepEqual(groups.map(g=>g.type),['x','podcast','blog','github','other']);
 assert.equal(groups[0].items.length,2);assert.equal(groups.flatMap(g=>g.items).length,rows.length);
 assert.deepEqual(app.groupItems([rows[0]]).map(g=>g.type),['github']);
 assert.deepEqual(app.groupItems([]),[]);
});
test('search includes original titles and author backgrounds',()=>{
 const digest={items:[item('x',{authorBackground:'Claude Code 创建者',originalTitle:'Original Source Title'})]};
 assert.equal(app.filterItems(digest,'全部','创建者').length,1);
 assert.equal(app.filterItems(digest,'全部','original source').length,1);
});
test('optional editorial display strings validate without changing legacy data',()=>{
 const data=i=>({schemaVersion:1,digests:[{date:'2026-10-07',title:'Fixture',summary:'Fixture',items:[i]}]});
 assert.doesNotThrow(()=>app.validateData(data(item(undefined))));
 for(const field of ['authorBackground','originalTitle','sourceName','detail']){
  assert.throws(()=>app.validateData(data(item('x',{[field]:{html:'unsafe'}}))),new RegExp(field));
 }
});
test('translation text and source context are searchable',()=>{
 const digest={items:[item('x',{translations:[{text:'忠实译文专用词',scope:'excerpt',sourceUrl:'https://example.com/post',note:'依据固定归档节选'}]})]};
 assert.equal(app.filterItems(digest,'全部','忠实译文专用词').length,1);
 assert.equal(app.filterItems(digest,'全部','固定归档').length,1);
});
test('translation blocks validate scope, text, source URL and remain optional',()=>{
 const data=translations=>({schemaVersion:1,digests:[{date:'2026-10-07',title:'Fixture',summary:'Fixture',items:[item('x',{translations})]}]});
 const good={text:'忠实译文',scope:'excerpt',sourceUrl:'https://example.com/post'};
 assert.doesNotThrow(()=>app.validateData(data(undefined)));
 for(const scope of ['excerpt','full'])assert.doesNotThrow(()=>app.validateData(data([{...good,scope}])));
 for(const bad of [null,{},[],[{}],[{...good,text:' '}],[{...good,scope:'summary'}],[{...good,sourceUrl:'javascript:alert(1)'}],[{...good,note:5}],Array(21).fill(good)])assert.throws(()=>app.validateData(data(bad)),/translations/);
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
test('rendering shows source sections, biography, original title, details and safe links; filters omit empty groups',async()=>{
 const ids={},get=id=>ids[id]??=new E('div');
 const filters=['全部','产品发布','技术实践','开源项目','观点洞察'].map(v=>{const n=new E('button');n.dataset.category=v;return n});
 global.document={getElementById:get,createElement:t=>new E(t),createTextNode:t=>{const n=new E('text');n.textContent=t;return n},createDocumentFragment:()=>new E('fragment'),querySelectorAll:()=>filters};
 global.window={location:{href:'https://example.com/?date=2026-10-07',search:'?date=2026-10-07'},setTimeout,clearTimeout,history:{pushState:()=>{}},addEventListener:()=>{},matchMedia:()=>({matches:true})};
 const data={schemaVersion:1,digests:[{date:'2026-10-07',title:'Fixture',summary:'Fixture',githubHistory:{note:'First issue history note'},githubRankingNote:'Mixed timestamp ranking note',sourceNotes:['Source limitation note'],items:[item('x',{authorBackground:'Verified creator background',originalTitle:'Original title',detail:'A useful mechanism',translations:[{text:'A faithful excerpt translation',scope:'excerpt',sourceUrl:'https://example.com/post/1',note:'Via a verified archive'},{text:'User supplied full text translation',scope:'full',sourceUrl:'https://example.com/post/2'}],additionalSources:[{title:'Biography source',url:'https://example.com/bio'}]}),item('blog',{sourceName:'Official research blog'}),item('github',{githubStatus:'returning',detail:'Historical extended analysis'})]}]};
 global.fetch=async()=>({ok:true,json:async()=>data});app.start();await new Promise(resolve=>setImmediate(resolve));
 const content=get('digest-content');assert.deepEqual(content.querySelectorAll('section').map(x=>x.dataset.sourceType),['x','blog','github']);
 assert.equal(content.querySelectorAll('article').length,3);
 assert.ok(content.textContent.includes('持续热门'));
 assert.ok(content.querySelectorAll('details').some(x=>x.className==='recurring-analysis'));
 for(const text of ['Verified creator background','Original title','A useful mechanism','Official research blog','First issue history note','Mixed timestamp ranking note','Source limitation note'])assert.ok(content.textContent.includes(text),text);
 const translationBlocks=content.querySelectorAll('div').filter(n=>n.className==='tweet-translation');assert.equal(translationBlocks.length,2);assert.ok(translationBlocks[0].textContent.includes('原文节选翻译'));assert.ok(translationBlocks[1].textContent.includes('原文翻译'));assert.ok(translationBlocks[0].textContent.includes('A faithful excerpt translation'));assert.ok(translationBlocks[0].textContent.includes('Via a verified archive'));assert.equal(translationBlocks[0].querySelectorAll('a')[0].href,'https://example.com/post/1');assert.ok(content.textContent.indexOf('A faithful excerpt translation') < content.textContent.indexOf('摘要与解读'));assert.equal(content.querySelectorAll('div').filter(n=>n.className==='tweet-translation').length,2);
 for(const a of content.querySelectorAll('a')){assert.equal(a.target,'_blank');assert.equal(a.rel,'noopener noreferrer')}
 get('search').value='Verified creator';get('search').listeners.input();assert.equal(content.querySelectorAll('article').length,1);assert.equal(content.querySelectorAll('section').length,1);
 get('search').value='no-match';get('search').listeners.input();assert.equal(content.querySelectorAll('section').length,0);
 const button=content.querySelectorAll('button')[0];button.listeners.click();assert.equal(content.querySelectorAll('article').length,3);
 delete global.document;delete global.window;delete global.fetch;
});
