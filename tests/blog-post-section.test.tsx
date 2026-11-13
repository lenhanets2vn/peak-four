import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { normalizeLandingConfig } from '../src/utils/configDefaults';

test('blog renders outline, sidebar, credits and safe CTA without executable HTML', async () => {
  const dom=new JSDOM('<!doctype html><html><body></body></html>');
  (globalThis as any).window=dom.window;
  (globalThis as any).document=dom.window.document;
  const { BlogPostSection }=await import('../src/components/landing/BlogPostSection');
  const html=renderToStaticMarkup(<BlogPostSection section={{
    id:'story-1',type:'blogPost',title:'Bài viết',subtitle:'Bản tin',order:1,enabled:true,
    blog:{html:'<h2>Quyền lợi</h2><p><strong>Thông tin</strong></p><script>alert(1)</script><img src="x" onerror="alert(2)">',
      author:'Tác giả',publishedAt:'2026-09-29',layout:'two-column',coverImage:'https://example.com/cover.jpg',
      coverCredit:'Tòa soạn',ctaText:'Đọc tiếp',ctaUrl:'/tin-tuc',sidebarItems:[{id:'a',title:'Bài liên quan',image:'https://example.com/a.jpg',imageCredit:'Tư liệu',url:'javascript:alert(1)'}]}
  } as any}/>);
  assert.match(html,/Quyền lợi/);
  assert.match(html,/Nội dung bài viết/);
  assert.match(html,/Nguồn: Tòa soạn/);
  assert.match(html,/Nguồn: Tư liệu/);
  assert.match(html,/href="\/tin-tuc"/);
  assert.doesNotMatch(html,/<script|onerror=|javascript:/i);
  dom.window.close();
});

test('CMS normalization preserves blog content and section motion', () => {
  const input={sections:[{id:'post',type:'blogPost',title:'Tin mới',subtitle:'',order:1,enabled:true,
    blog:{html:'<h2>Thông tin</h2>',layout:'two-column',author:'Nhân'},
    motion:{mode:'custom',effect:'slide-left',durationMs:800}}]} as any;
  const config=normalizeLandingConfig(input);
  assert.equal(config.sections[0].blog?.author,'Nhân');
  assert.equal(config.sections[0].motion?.effect,'slide-left');
});

test('blog typography and colors target article headings and sidebar separately', async () => {
  const dom=new JSDOM('<!doctype html><html><body></body></html>');
  (globalThis as any).window=dom.window;
  (globalThis as any).document=dom.window.document;
  const { BlogPostSection }=await import('../src/components/landing/BlogPostSection');
  const markup=renderToStaticMarkup(<BlogPostSection section={{id:'styled',type:'blogPost',title:'Tiêu đề',subtitle:'',order:1,enabled:true,blog:{html:'<h2>Chương</h2>',layout:'two-column',backgroundColor:'#fffafa',sidebarBackgroundColor:'#f0f0f0',sidebarItems:[{id:'a',title:'Bài khác'}],typography:{title:{fontFamily:'Georgia',fontSize:42,color:'#123456'},h2:{fontFamily:'Arial',fontSize:28,color:'#654321'},sidebarTitle:{fontWeight:800,color:'#876543'}}}} as any}/>);
  assert.match(markup,/background-color:#fffafa/);
  assert.match(markup,/--blog-h2-fontSize:28px/);
  assert.match(markup,/font-family:Georgia;font-size:42px/);
  assert.match(markup,/background-color:#f0f0f0/);
  assert.match(markup,/font-weight:800;color:#876543/);
  dom.window.close();
});

test('blog puts its configured lead form above related posts in the sidebar', async () => {
  const dom=new JSDOM('<!doctype html><html><body></body></html>');
  (globalThis as any).window=dom.window;
  (globalThis as any).document=dom.window.document;
  const { BlogPostSection }=await import('../src/components/landing/BlogPostSection');
  const { CmsConfigProvider }=await import('../src/context/CmsConfigContext');
  const config=normalizeLandingConfig({formFields:[{id:'name',name:'name',label:'Tên',type:'text',required:true,visible:true,order:1} as any]});
  const markup=renderToStaticMarkup(<CmsConfigProvider config={config}><BlogPostSection config={config} section={{id:'article',type:'blogPost',title:'Bài viết',subtitle:'',order:1,enabled:true,blog:{html:'<p>Nội dung</p>',layout:'two-column',showSidebarForm:true,sidebarItems:[{id:'recent',title:'Bài viết mới'}]}} as any}/></CmsConfigProvider>);
  assert.ok(markup.indexOf('cms-blog-sidebar-form')<markup.indexOf('Bài viết mới'));
  dom.window.close();
});
