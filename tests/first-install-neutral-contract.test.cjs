const fs=require('node:fs');const assert=require('node:assert/strict');const test=require('node:test');
const read=file=>fs.readFileSync(file,'utf8');
test('new install starts without published Bảo Việt marketing content',()=>{
 const def=read('src/data/defaultConfig.ts');assert.match(def,/published: false/);assert.match(def,/sections: \[\]/);assert.match(def,/formFields: \[\]/);assert.match(def,/brandName: ''/);assert.doesNotMatch(def,/Bảo Việt|BẢO VIỆT/);
});
test('fresh homepage is draft; pricing engine is absent',()=>{
 const s=read('server.ts');assert.match(s,/id: 'page_home',[\s\S]*?published: false/);assert.ok(!fs.existsSync('rc_backend'));assert.ok(!fs.existsSync('src/components/landing/PricingPage.tsx'));
});
test('first-time bootstrap requires server secret and no accounts',()=>{
 const s=read('server.ts');assert.match(s,/adminAccountsDatabase.length === 0/);assert.match(s,/CMS_SETUP_TOKEN/);assert.match(s,/timingSafeEqual/);assert.match(s,/setupAttempts/);assert.match(s,/setup\/owner/);
});
test('bootstrap path exempted only from cloud write guard; normal writes stay guarded',()=>{
 const s=read('server.ts');assert.match(s,/\/setup\/owner/);assert.match(s,/requireCloudForMutation/);assert.match(s,/saveAdminAccountsToDisk\(\)/);
});
test('new owner replaces quick bypass on public login',()=>{
 const a=read('src/components/admin/AdminLogin.tsx'),d=read('src/data/defaultConfig.ts');assert.match(a,/Thiết lập CMS lần đầu/);assert.match(a,/createFirstOwner/);assert.match(d,/showQuickAdmin: false/);
});
test('neutral static metadata and AI defaults',()=>{
 assert.doesNotMatch(read('index.html'),/Bảo Việt|BẢO VIỆT/);
 assert.doesNotMatch(read('src/utils/aiConfigDefaults.ts'),/Bảo Việt|BẢO VIỆT/);
});
