/** Curated, allow-listed UI mapping. References are attribution links, not loaded code. */
import type { WebsiteSettings } from '../types';
export type UiSlot = 'headerCta'|'heroPrimary'|'heroSecondary'|'productCta'|'sectionCta'|'productCard'|'otherCard'|'siteSearch'|'cmsDensity'|'cmsControls'|'analyticsSurface';
export type UiOption = {id:string; label:string; source:string; url:string};
export type UiSlotDefinition = {id:UiSlot; label:string; group:string; note:string; defaultValue:string; choices:UiOption[]};
const ui=(id:string,label:string,source:string,url:string):UiOption=>({id,label,source,url});
const ctaOptions:UiOption[]=[
 ui('classic','Classic · truyền thống','CMS',''),
 ui('arrow-minimal','Minimal Arrow','Uiverse / satyamchaudharydev','https://uiverse.io/satyamchaudharydev/dry-sloth-51'),
 ui('navy-outline','Navy Outline','Uiverse / NorthFishHasNa','https://uiverse.io/NorthFishHasNa/soft-turtle-49'),
 ui('soft-glow','Blue Glow','Uiverse / fabiodevbr','https://uiverse.io/fabiodevbr/shy-termite-9'),
 ui('depth-3d','3D Button','Uiverse / zymantas-katinas','https://uiverse.io/zymantas-katinas/little-puma-84'),
 ui('premium-gold','Premium Gold','Uiverse / Yaya12085','https://uiverse.io/Yaya12085/plastic-quail-42'),
];
const hoverOptions=[ui('none','Không hiệu ứng','CMS',''),ui('lift','Nâng nhẹ','CSS',''),ui('scale','Phóng nhẹ','CSS',''),ui('glow','Viền sáng','Uiverse','https://uiverse.io/elements'),ui('tilt-3d','Nghiêng 3D nhẹ','Uiverse / Praashoo7','https://uiverse.io/Praashoo7/black-lizard-62')];
export const UI_SLOTS:UiSlotDefinition[]=[
 {id:'headerCta',label:'CTA Header',group:'Landing / CTA',note:'Áp dụng khi nút chưa có mẫu riêng.',defaultValue:'arrow-minimal',choices:ctaOptions},
 {id:'heroPrimary',label:'Hero · Nút chính & Mobile Sticky',group:'Landing / CTA',note:'Mobile Sticky dùng kiểu nút Hero chính.',defaultValue:'soft-glow',choices:ctaOptions},
 {id:'heroSecondary',label:'Hero · Nút phụ',group:'Landing / CTA',note:'Đổi style không đổi URL/Section.',defaultValue:'navy-outline',choices:ctaOptions},
 {id:'productCta',label:'CTA Card sản phẩm',group:'Landing / CTA',note:'Kế thừa thiết kế riêng của từng card nếu có.',defaultValue:'navy-outline',choices:ctaOptions},
 {id:'sectionCta',label:'CTA Section / Blog',group:'Landing / CTA',note:'Áp dụng cho các CTA Section và Blog.',defaultValue:'arrow-minimal',choices:ctaOptions},
 {id:'productCard',label:'Card sản phẩm · Hover',group:'Landing / Card',note:'Card có hoverEffect đã lưu vẫn ưu tiên.',defaultValue:'tilt-3d',choices:hoverOptions},
 {id:'otherCard',label:'Card nội dung · Hover',group:'Landing / Card',note:'Các card nội dung khác.',defaultValue:'lift',choices:hoverOptions},
 {id:'siteSearch',label:'Ô tìm kiếm website',group:'Tìm kiếm',note:'Không thay đổi công cụ tìm kiếm hoặc kết quả.',defaultValue:'floating',choices:[ui('floating','Floating Search','Uiverse / joe-watson-sbf','https://uiverse.io/joe-watson-sbf/shy-snake-4'),ui('compact','Compact Search','shadcn/ui','https://ui.shadcn.com/docs/components/command')]},
 {id:'cmsDensity',label:'Mật độ CMS Dashboard',group:'CMS Admin',note:'Chỉ thay đổi khoảng cách hiển thị.',defaultValue:'comfortable',choices:[ui('comfortable','Thoáng & gọn','shadcn/ui Dashboard','https://ui.shadcn.com/blocks'),ui('compact','Gọn tối đa','shadcn/ui Dashboard','https://ui.shadcn.com/blocks')]},
 {id:'cmsControls',label:'Checkbox & Switch CMS',group:'CMS Admin',note:'Giữ nguyên input/onChange và quyền truy cập.',defaultValue:'rounded',choices:[ui('rounded','Bo tròn hiện đại','shadcn/ui Switch','https://ui.shadcn.com/docs/components/switch'),ui('square','Vuông tối giản','shadcn/ui Checkbox','https://ui.shadcn.com/docs/components/checkbox')]},
 {id:'analyticsSurface',label:'Khung biểu đồ Analytics',group:'CMS Admin',note:'Chỉ style; không thêm số liệu, không đổi API.',defaultValue:'soft',choices:[ui('soft','Surface sáng','shadcn/ui Chart','https://ui.shadcn.com/docs/components/chart'),ui('outlined','Viền rõ nét','shadcn/ui Chart','https://ui.shadcn.com/docs/components/chart')]},
];
export const UI_SLOT_MAP = Object.fromEntries(UI_SLOTS.map(s=>[s.id,s])) as Record<UiSlot,UiSlotDefinition>;
export function getUiMapping(settings:WebsiteSettings|undefined,slot:UiSlot):string {
 const def=UI_SLOT_MAP[slot];const configured=settings?.uiLibrary?.mappings?.[slot];
 return def.choices.some(o=>o.id===configured)?configured!:def.defaultValue;
}
/** Metadata only; no remote stylesheet/script is fetched into the application. */
export const UI_REFERENCE_CATALOG=[
 {group:'CMS / TailAdmin',label:'TailAdmin Free HTML · layout / design reference',url:'https://github.com/TailAdmin/tailadmin-free-tailwind-dashboard-template',mapped:false},
 {group:'CMS / TailAdmin',label:'TailAdmin React Free · adapted CMS workspace',url:'https://github.com/TailAdmin/free-react-tailwind-admin-dashboard',mapped:true},
 {group:'Button / CTA',label:'Button / CTA • fabiodevbr',url:'https://uiverse.io/fabiodevbr/shy-termite-9',mapped:true},
 {group:'Button / CTA',label:'Minimal Arrow • satyamchaudharydev',url:'https://uiverse.io/satyamchaudharydev/dry-sloth-51',mapped:true},
 {group:'Button / CTA',label:'3D Button • zymantas-katinas',url:'https://uiverse.io/zymantas-katinas/little-puma-84',mapped:true},
 {group:'Button / CTA',label:'Premium • Yaya12085',url:'https://uiverse.io/Yaya12085/plastic-quail-42',mapped:true},
 {group:'Button / CTA',label:'Button • karthik092726122003',url:'https://uiverse.io/karthik092726122003/clever-crab-26',mapped:false},
 {group:'Button / CTA',label:'Navy • NorthFishHasNa',url:'https://uiverse.io/NorthFishHasNa/soft-turtle-49',mapped:true},
 {group:'Form / Search',label:'Search • joe-watson-sbf',url:'https://uiverse.io/joe-watson-sbf/shy-snake-4',mapped:true},
 {group:'Form / Search',label:'Switch • alexruix',url:'https://uiverse.io/alexruix/silent-otter-72',mapped:false},
 {group:'Form / Search',label:'Checkbox • vishnupprajapat',url:'https://uiverse.io/vishnupprajapat/wicked-catfish-29',mapped:false},
 {group:'Form / Search',label:'Heart Switch • barisdogansutcu',url:'https://uiverse.io/barisdogansutcu/smart-panda-14',mapped:false},
 {group:'Loading / Feedback',label:'Loader • mobinkakei',url:'https://uiverse.io/mobinkakei/pink-deer-76',mapped:false},
 {group:'Loading / Feedback',label:'Cookie consent • vinodjangid07',url:'https://uiverse.io/vinodjangid07/lazy-rattlesnake-93',mapped:false},
 {group:'Cards / Social',label:'3D Card • Praashoo7',url:'https://uiverse.io/Praashoo7/black-lizard-62',mapped:true},
 {group:'Cards / Social',label:'Social • david-mohseni',url:'https://uiverse.io/david-mohseni/brave-shrimp-86',mapped:false},
 {group:'CMS / shadcn',label:'Dashboard Blocks',url:'https://ui.shadcn.com/blocks',mapped:true},
 {group:'CMS / shadcn',label:'Sidebar',url:'https://ui.shadcn.com/docs/components/sidebar',mapped:false},
 {group:'CMS / shadcn',label:'Data Table',url:'https://ui.shadcn.com/docs/components/data-table',mapped:false},
 {group:'CMS / shadcn',label:'Command',url:'https://ui.shadcn.com/docs/components/command',mapped:true},
 {group:'CMS / shadcn',label:'Charts',url:'https://ui.shadcn.com/docs/components/chart',mapped:true},
 {group:'Figma tham khảo',label:'Analytics Dashboard Cross-Filtering',url:'https://www.figma.com/fr-fr/communaute/file/1537413152279687159/analytics-dashboard-with-cross-filtering',mapped:false},
 {group:'Figma tham khảo',label:'Payment Successful Page',url:'https://www.figma.com/fr-fr/communaute/file/1548596948524312132/payment-successful-page',mapped:false},
 {group:'Figma tham khảo',label:'SaaS Landing Design System',url:'https://www.figma.com/fr-fr/communaute/file/1537644803055414287/design-system-saas-landing-page',mapped:false},
] as const;
