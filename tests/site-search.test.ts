import { defaultLandingConfig } from '../src/data/defaultConfig';
import test from 'node:test';
import assert from 'node:assert/strict';
import { publishedSiteSearch } from '../src/services/siteSearch';

const publicConfig:any = {
  published:true,
  headline:'Bảo hiểm sức khỏe toàn diện',
  subtitle:'An tâm viện phí',
  heroBadge:'Bảo Việt',
  heroBenefits:[{id:'b1',title:'Bảo lãnh viện phí',description:'Hỗ trợ tại bệnh viện liên kết'}],
  websiteSettings:{seo:{keywords:'sức khỏe, viện phí'}},
  formSettings:{title:'Đăng ký tư vấn'},
  formFields:[],
  footer:{columns:[]},
  sections:[{
    id:'s1', type:'dualProduct', title:'Hai sản phẩm nổi bật', subtitle:'', content:'', anchorId:'san-pham', order:1, enabled:true,
    items:[{id:'i1',title:'An Gia',description:'Quyền lợi nội trú cao',features:['Bảo lãnh viện phí'],enabled:true},{id:'i2',title:'Thẻ ẩn',description:'Nội dung riêng không được tìm',enabled:false}],
  }],
};

const pages:any[] = [
  {id:'home',name:'Trang chủ',slug:'/',status:'active',published:true,version:1,updatedAt:'x',createdAt:'x',draft:publicConfig,publishedConfig:publicConfig},
  {id:'draft',name:'Trang nháp bí mật',slug:'/draft',status:'active',published:false,version:1,updatedAt:'x',createdAt:'x',draft:publicConfig,publishedConfig:{...publicConfig,headline:'Nội dung chưa publish'}},
];

test('full-site search is accent-insensitive and indexes nested published content', () => {
  assert.ok(publishedSiteSearch('bao lanh vien phi',pages).some(result=>result.pageId==='home'));
  assert.ok(publishedSiteSearch('noi tru cao',pages).some(result=>result.sectionId==='san-pham'));
  assert.ok(publishedSiteSearch('suc khoe',pages).length>0);
});

test('full-site search never exposes draft-only page records', () => {
  const results=publishedSiteSearch('bao hiem',pages);
  assert.equal(results.some(result=>result.pageId==='draft'),false);
});

test('full-site search excludes disabled nested content', () => {
  assert.equal(publishedSiteSearch('noi dung rieng khong duoc tim',pages).length,0);
});


test('fresh CMS default has no published sample search material', () => {
  assert.equal(defaultLandingConfig.published, false);
  assert.deepEqual(defaultLandingConfig.sections, []);
});
