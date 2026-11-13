const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root=path.join(__dirname,'..');
const read=(rel)=>fs.readFileSync(path.join(root,rel),'utf8');

test('Hero zero overlay must never render the number 0 as a React child',()=>{
 const hero=read('src/components/landing/HeroSection.tsx');
 assert.match(hero,/Number\(config\.heroFullImageOverlayOpacity\s*\?\?\s*0\)\s*>\s*0\s*&&/);
 assert.doesNotMatch(hero,/\{config\.heroFullImageOverlayOpacity\s*&&/);
 assert.match(hero,/heroSlides\.map/);
 assert.match(hero,/heroShowArrows/);
});

test('Google Sheets Webhook can be configured and tested from CMS, without Sheets ENV',()=>{
 const panel=read('src/components/admin/GoogleSheetsPanel.tsx');
 const dashboard=read('src/components/admin/AdminDashboard.tsx');
 const server=read('server.ts');
 assert.match(panel,/testWebhookUrl\(webhookUrl,pageId,config\.spreadsheetId,config\.sheetName\)/);
 assert.match(panel,/onChange\(\{\.\.\.config,webhookUrl,isConnected:true,connectionMethod:'webhook',autoSync:true\}\)/);
 assert.match(panel,/Tự đồng bộ Form mới lên Google Sheets/);
 assert.match(dashboard,/pageId=\{currentPageId\}/);
 assert.match(server,/const target=new URL\(webhookUrl\)/);
 assert.match(server,/sendLeadToWebhook\(url,lead,testConfig\)/);
 assert.match(server,/spreadsheetId:sanitizeString\(req\.body\?\.spreadsheetId/);
 assert.doesNotMatch(server,/new URL\(process\.env\.GOOGLE_SHEETS_WEBHOOK_URL/);
 assert.match(server,/incoming\.googleSheets\?\.webhookUrl \?\? current\.googleSheets\?\.webhookUrl/);
 assert.match(server,/test-webhook', requireAdminAuth, requireRoles\('superadmin','marketing_admin'\)/);
});

test('Published form submit uses verified CMS webhook, persists pending leads on failure',()=>{
 const server=read('server.ts');
 assert.match(server,/const config=page\.publishedConfig/);
 assert.match(server,/sheet\?\.webhookUrl\s*&&\s*sheet\?\.autoSync !== false/);
 assert.match(server,/sheet\.connectionMethod === 'webhook' \? !!sheet\.isConnected : !sheet\.connectionMethod/);
 assert.match(server,/await sendLeadToWebhook\(sheet\.webhookUrl,lead,config\)/);
 assert.match(server,/spreadsheetId:config\.googleSheets\?\.spreadsheetId\|\|''/);
 assert.match(server,/sheetName:config\.googleSheets\?\.sheetName\|\|'Leads'/);
 assert.match(server,/lead\.syncStatus='failed';lead\.syncError=e\.message/);
 assert.match(server,/leadsDatabase\.unshift\(lead\)/);
 assert.match(server,/\['script\.google\.com','script\.googleusercontent\.com'\]/);
});

test('Webhook URL is not present in public config and cannot be set by anonymous users',()=>{
 const server=read('server.ts');
 const safe=server.slice(server.indexOf('function safePublicConfig('),server.indexOf('function recordAuditLog('));
 assert.match(safe,/webhookUrl: ''/);
 assert.match(server,/app\.post\('\/api\/sheets\/test-webhook', requireAdminAuth, requireRoles\('superadmin','marketing_admin'\)/);
 assert.match(server,/target\.protocol!=='https:'/);
});

test('Blank fresh install has no default Bao Viet products, form fields, or footer contacts',()=>{
 const def=read('src/data/defaultConfig.ts');
 const knowledge=read('src/data/defaultKnowledge.ts');
 const ai=read('src/utils/aiConfigDefaults.ts');
 const footer=read('src/components/admin/FooterBuilder.tsx');
 const server=read('server.ts');
 assert.match(def,/brandName: ''/);
 assert.match(def,/formFields: \[\]/);
 assert.match(def,/sections: \[\]/);
 assert.match(knowledge,/defaultKnowledgeItems: KnowledgeItem\[\] = \[\]/);
 assert.match(ai,/DEFAULT_TAXONOMY_PRODUCTS: TaxonomyProduct\[\] = \[\]/);
 assert.match(ai,/enabled: false,\s*botName: 'Trợ lý AI'/);
 assert.doesNotMatch(footer,/baovietcare@baoviet\.com\.vn|baovietinsurance|Số\+35\+Hai\+Bà/);
 assert.doesNotMatch(server,/BUNDLED_SAMPLE_PRODUCT_NAMES|cleanupBundledSampleProductData/);
 assert.match(server,/if \(remote\.exists\) \{/);
 assert.match(server,/applyCloudStateToMemory\(remote\)/);
});
