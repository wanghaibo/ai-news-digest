'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const app=require('../app.js');
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/digests.json'),'utf8'));
test('published X cards and Markdown agree on author metadata, original links and allowed full originals',()=>{
 app.validateData(data);
 for(const digest of data.digests){
  const markdown=fs.readFileSync(path.join(__dirname,'../digests',digest.date+'.md'),'utf8');
  const section=markdown.split('## X 推文精选\n')[1]?.split('\n## ')[0];
  const xItems=digest.items.filter(item=>item.sourceType==='x');
  if(!xItems.length)continue;
  assert.ok(section,digest.date+' X archive section');
  for(const item of xItems){
   if(item.xDisplay==='user-provided') {
    for(const post of item.originalPosts){
     assert.ok(markdown.includes(post.text),post.sourceUrl+' same full original');
     assert.ok(markdown.includes(post.translation),post.sourceUrl+' same full translation');
    }
   } else assert.equal(item.originalPosts,undefined);
   assert.equal(item.title,item.authorName+' · X 原帖');
   assert.ok(markdown.includes(item.authorBackground),item.authorName+' same biography');
   for(const post of item.sourcePosts)assert.ok(markdown.includes(']('+post.url+')'),post.url);
  }
  if(xItems.every(item=>item.xDisplay!=='user-provided'))for(const oldLabel of ['摘要与解读','原文节选翻译','进一步理解','编者解读'])assert.ok(!section.includes(oldLabel),digest.date+' must not retain '+oldLabel);
 }
});
