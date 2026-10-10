'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs');
const app = require('../app.js');
test('official-embed schema accepts link metadata without copied third-party text', () => {
 const data=JSON.parse(fs.readFileSync('data/digests.json','utf8'));
 for(const d of data.digests)for(const i of d.items)if(i.sourceType==='x')i.xDisplay='official-embed';
 assert.doesNotThrow(()=>app.validateData(data));
});
class Node {
 constructor(){this.children=[];this.dataset={};this.isConnected=true;this.listeners={};}
 append(...nodes){this.children.push(...nodes)} replaceChildren(...nodes){this.children=nodes}
 setAttribute(k,v){this[k]=v} addEventListener(k,fn){this.listeners[k]=fn} remove(){this.removed=true}
}
function fixture(api){
 const scripts=[],timers=new Map();let id=0;
 const win={twttr:api,setTimeout:fn=>{timers.set(++id,fn);return id},clearTimeout:n=>timers.delete(n)};
 const doc={createElement:()=>new Node(),head:{append:n=>scripts.push(n)}};
 const block=new Node();block.dataset.postUrl='https://x.com/example/status/123?s=20';
 const root={querySelectorAll:()=>[block]};
 return {win,doc,block,root,scripts,timers};
}
const tick=()=>new Promise(r=>setImmediate(r));
test('official factory renders post ID, preserves media and respects privacy option',async()=>{
 const calls=[];const f=fixture({widgets:{createTweet:async(...args)=>{calls.push(args);return new Node()}}});
 require('../x-embeds.js').createController(f.win,f.doc).render(f.root);await tick();
 assert.equal(calls.length,1);assert.equal(calls[0][0],'123');assert.equal(calls[0][2].dnt,true);assert.equal(calls[0][2].cards,undefined);
 assert.equal(f.block.dataset.embedState,'ready');
});
test('one shared official script loads, repeated rendering never mutates obsolete cards',async()=>{
 const f=fixture();const c=require('../x-embeds.js').createController(f.win,f.doc);c.render(f.root);c.render(f.root);
 assert.equal(f.scripts.length,1);assert.equal(f.scripts[0].src,'https://platform.x.com/widgets.js');
 let calls=0;f.win.twttr={widgets:{createTweet:async()=>{calls++;return new Node()}}};f.scripts[0].onload();await tick();
 assert.equal(calls,1);assert.equal(f.block.dataset.embedState,'ready');
});
test('blocked script shows actionable failure and supports retry',async()=>{
 const f=fixture();const c=require('../x-embeds.js').createController(f.win,f.doc);c.render(f.root);f.scripts[0].onerror();await tick();
 assert.equal(f.block.dataset.embedState,'failed');assert.match(f.block.children[1].textContent,/未能加载/);
 f.block.children[2].listeners.click();assert.equal(f.scripts.length,2);
 f.win.twttr={widgets:{createTweet:async()=>undefined}};f.scripts[1].onload();await tick();assert.equal(f.block.dataset.embedState,'failed');
});
test('stalled requests time out and invalid post URLs never load scripts',async()=>{
 const f=fixture({widgets:{createTweet:()=>new Promise(()=>{})}});const c=require('../x-embeds.js').createController(f.win,f.doc);c.render(f.root);await tick();
 for(const fn of [...f.timers.values()])fn();assert.equal(f.block.dataset.embedState,'failed');
 f.block.dataset.postUrl='https://evil.example/status/123';c.render(f.root);await tick();assert.equal(f.scripts.length,0);assert.equal(f.block.dataset.embedState,'failed');
});
