'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const server = fs.readFileSync('server.ts', 'utf8');
const seoUi = fs.readFileSync('src/components/admin/SeoManager.tsx', 'utf8');
const routeStart = server.indexOf("app.put('/api/pages/:id/seo'");
const routeEnd = server.indexOf('// Gemini Multi-turn Chat & SEO Optimizer endpoints', routeStart);
assert.ok(routeStart > 0 && routeEnd > routeStart, 'SEO route must be found');
const routeCode = server.slice(routeStart, routeEnd);

const cleanSlug = (value) => {
  const raw = String(value || '/').trim();
  if (raw === '/' || raw === '') return '/';
  const slug = raw.replace(/^https?:\/\/[^/]+/i, '').split(/[?#]/)[0].replace(/^\/+|\/+$/g, '');
  return `/${slug || ''}`;
};
function buildHarness(others = []) {
  const page = { id:'page_home', name:'Trang chủ', slug:'/vi', updatedAt:'', draft:{websiteSettings:{seo:{slug:'/vi',seoTitle:'Keep title'}}}, publishedConfig:{websiteSettings:{seo:{slug:'/vi'}}}};
  const pagesDatabase = [page, ...others];
  let handler;
  let saves = 0;
  const app = {put: (_route, ...args) => {handler=args.at(-1);}};
  const context = {
    app, pagesDatabase, requireAdminAuth:()=>{}, requireRoles:()=>{},
    sessionOf:()=>({email:'admin@example.com'}),
    getPageById:(id)=>pagesDatabase.find(p=>p.id===id),
    clone:(obj)=>JSON.parse(JSON.stringify(obj)),
    defaultLandingConfig:{websiteSettings:{seo:{}}},
    cleanSlug, sanitizeString:(str)=>str, nowIso:()=> '2026-10-13T12:00:00Z',
    savePagesToDisk:()=>{saves++;},
    getCloudPersistenceStatus:()=>({}), canAcceptCloudWrite:()=>false,
    IS_PRODUCTION_RUNTIME:false, scheduleCloudSync:()=>{},
    recordAuditLog:()=>{}, clientIp:()=>'',
    console
  };
  const js = ts.transpileModule(routeCode, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  vm.runInNewContext(js, context, {timeout:1000});
  async function invoke(id, seo) {
    let response = null;
    const res = {status(code){this.statusCode=code;return this;},json(payload){response={status:this.statusCode||200,data:payload}; return this;}};
    await handler({params:{id},body:{seo}},res);
    return response;
  }
  return {page,pagesDatabase,invoke,getSaves:()=>saves};
}

test('clearing homepage SEO slug changes both page record and draft SEO to /',async()=>{
  const h=buildHarness();
  const r=await h.invoke('page_home',{slug:''});
  assert.equal(r.status,200);
  assert.equal(r.data.slug,'/');
  assert.equal(r.data.seo.slug,'/');
  assert.equal(h.page.slug,'/');
  assert.equal(h.page.draft.websiteSettings.seo.slug,'/');
  assert.equal(h.page.draft.websiteSettings.seo.seoTitle,'Keep title');
  assert.equal(h.page.publishedConfig.websiteSettings.seo.slug,'/vi','Published page is unchanged until explicit Publish');
  assert.equal(h.getSaves(),1);
});

test('if slug field is absent, keep existing page slug',async()=>{
  const h=buildHarness();
  const r=await h.invoke('page_home',{seoTitle:'Updated title'});
  assert.equal(r.status,200);
  assert.equal(h.page.slug,'/vi');
  assert.equal(r.data.seo.slug,'/vi');
});

test('reject changing category page slug to root and do not write',async()=>{
  const category={id:'page_category',name:'Category',slug:'/my-page',draft:{websiteSettings:{seo:{slug:'/my-page'}}}};
  const h=buildHarness([category]);
  const r=await h.invoke('page_category',{slug:''});
  assert.equal(r.status,400);
  assert.equal(category.slug,'/my-page');
  assert.equal(h.getSaves(),0);
});

test('reject duplicate slug without mutating homepage',async()=>{
  const category={id:'page_other',name:'Other',slug:'/taken',draft:{websiteSettings:{seo:{slug:'/taken'}}}};
  const h=buildHarness([category]);
  const r=await h.invoke('page_home',{slug:'taken'});
  assert.equal(r.status,409);
  assert.equal(h.page.slug,'/vi');
  assert.equal(h.getSaves(),0);
});

test('reject conflicting root slug before allowing homepage reset',async()=>{
  const category={id:'page_other',name:'Other',slug:'/',draft:{websiteSettings:{seo:{slug:'/'}}}};
  const h=buildHarness([category]);
  const r=await h.invoke('page_home',{slug:''});
  assert.equal(r.status,409);
  assert.equal(h.page.slug,'/vi');
  assert.equal(h.getSaves(),0);
});

test('API returns canonical record slug, never stale SEO slug',()=>{
  assert.match(server,/seo:\s*\{\s*\.\.\.seo,\s*pageTitle:\s*page.name,\s*slug:\s*page.slug,/s);
});

test('SEO manager explains home empty slug and reads saved canonical slug',()=>{
  assert.match(seoUi,/Để trống để dùng \/'/);
  assert.match(seoUi,/savedSeoResult\?\.slug !== undefined/);
});
