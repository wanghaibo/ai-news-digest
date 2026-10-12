'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const app=require('../app.js');
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/digests.json'),'utf8'));
const originalMode=item=>['user-provided','licensed-original','short-quotation'].includes(item.xDisplay);
function verifyXArchive(digest, markdown) {
 const section=markdown.split('## X 推文精选\n')[1]?.split('\n## ')[0];
 const xItems=digest.items.filter(item=>item.sourceType==='x');
 if(!xItems.length)return;
 assert.ok(section,digest.date+' X archive section');
 // Literal originals may contain Markdown headings; do not treat them as archive boundaries.
 const archiveText=xItems.some(originalMode)?markdown:section;
 for(const item of xItems){
  if(originalMode(item)) {
   for(const post of item.originalPosts){
    assert.ok(archiveText.includes(post.text),post.sourceUrl+' same full original');
    assert.ok(archiveText.includes(post.translation),post.sourceUrl+' same full translation');
    if(item.xDisplay==='licensed-original'){
     assert.ok(archiveText.includes(post.provenance.licenseScope),post.sourceUrl+' license scope and attribution');
     assert.ok(archiveText.includes(']('+post.provenance.licenseUrl+')'),post.sourceUrl+' license link');
    }
   }
  } else {
   assert.equal(item.originalPosts,undefined);
   if(item.summary!==undefined)assert.ok(archiveText.includes(item.summary),item.authorName+' same Chinese summary');
  }
  assert.equal(item.title,item.authorName+' · X 原帖');
  assert.ok(archiveText.includes(item.authorBackground),item.authorName+' same biography');
  for(const post of item.sourcePosts)assert.ok(archiveText.includes(']('+post.url+')'),post.url);
 }
 if(xItems.every(item=>!originalMode(item)))for(const oldLabel of ['摘要与解读','原文节选翻译','进一步理解','编者解读'])assert.ok(!section.includes(oldLabel),digest.date+' must not retain '+oldLabel);
}
test('published X cards and Markdown agree on author metadata, original links and allowed full originals',()=>{
 app.validateData(data);
 for(const digest of data.digests)verifyXArchive(digest,fs.readFileSync(path.join(__dirname,'../digests',digest.date+'.md'),'utf8'));
});
test('synthetic new-mode Markdown checks catch missing or mismatched full text, translation and license attribution',()=>{
 for(const mode of ['licensed-original','short-quotation']){
  const url='https://x.com/example/status/123';
  const proof={authorUrl:'https://x.com/example',verifiedAt:'2026-10-12',evidenceUrl:url,complete:true,...(mode==='licensed-original'?{licenseUrl:'https://example.com/license',licenseScope:'Reproduction and translation permitted.'}:{sourceWordCount:6,isLyrics:false})};
  const item={title:'Example Author · X 原帖',source:'X / Example Author',authorName:'Example Author',authorBackground:'Synthetic author background.',sourceType:'x',xDisplay:mode,category:'技术实践',url,sourcePosts:[{url}],originalPosts:[{text:'Synthetic\n## Heading inside original\noriginal',translation:'测试完整译文',sourceUrl:url,provenance:proof}]};
  const digest={date:'2026-10-12',title:'Fixture',summary:'Fixture',items:[item]};
  app.validateData({schemaVersion:1,digests:[digest]});
  const markdown='## X 推文精选\n'+item.authorBackground+'\n'+item.originalPosts[0].text+'\n测试完整译文\n[对应原帖]('+url+')\n'+(mode==='licensed-original'?proof.licenseScope+'\n[许可依据]('+proof.licenseUrl+')':'');
  assert.doesNotThrow(()=>verifyXArchive(digest,markdown));
  for(const text of [item.originalPosts[0].text,'测试完整译文',item.authorBackground,']('+url+')',...(mode==='licensed-original'?[proof.licenseScope,']('+proof.licenseUrl+')']:[])])assert.throws(()=>verifyXArchive(digest,markdown.replace(text,'MISMATCH')));
 }
});

test('synthetic embedded summaries must also appear unchanged in the Markdown archive',()=>{
 const url='https://x.com/example/status/123';
 const item={title:'Example Author · X 原帖',source:'X / Example Author',authorName:'Example Author',authorBackground:'Synthetic author background.',sourceType:'x',xDisplay:'official-embed',category:'技术实践',url,sourcePosts:[{url}],summary:'作者概述了测试机制，并说明适用条件。'};
 const digest={date:'2026-10-12',title:'Fixture',summary:'Fixture',items:[item]};
 const markdown='## X 推文精选\n'+item.authorBackground+'\n中文摘要：'+item.summary+'\n[原帖]('+url+')\n';
 assert.doesNotThrow(()=>verifyXArchive(digest,markdown));
 assert.throws(()=>verifyXArchive(digest,markdown.replace(item.summary,'Different summary')),/same Chinese summary/);
});
