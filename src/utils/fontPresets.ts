export interface FontPreset {
  id: string;
  name: string;
  family: string;
  category: 'sans-serif' | 'serif' | 'display' | 'monospace' | 'system';
  description: string;
  isGoogleFont: boolean;
  weights?: number[];
  vietnameseReady: boolean;
}

export const FONT_PRESETS: FontPreset[] = [
  {id:'JetBrains Mono',name:'JetBrains Mono',family:"'JetBrains Mono', monospace",category:'monospace',description:'Nhãn nhỏ, số thứ tự và chú thích kỹ thuật kiểu biên tập',isGoogleFont:true,weights:[400,500,600,700],vietnameseReady:true},
  {id:'Cormorant Garamond',name:'Cormorant Garamond',family:"'Cormorant Garamond', Georgia, serif",category:'serif',description:'Serif di sản thanh lịch, hỗ trợ tiếng Việt, phù hợp tiêu đề lớn',isGoogleFont:true,weights:[300,400,500,600,700],vietnameseReady:true},
  {
    id: 'Be Vietnam Pro',
    name: 'Be Vietnam Pro',
    family: "'Be Vietnam Pro', sans-serif",
    category: 'sans-serif',
    description: 'Thiết kế riêng tối ưu tiếng Việt có dấu, hiện đại, sắc nét',
    isGoogleFont: true,
    weights: [300, 400, 500, 600, 700, 800],
    vietnameseReady: true,
  },
  {
    id: 'Plus Jakarta Sans',
    name: 'Plus Jakarta Sans',
    family: "'Plus Jakarta Sans', sans-serif",
    category: 'sans-serif',
    description: 'Hiện đại, sang trọng, xu hướng UI tài chính & công nghệ mới',
    isGoogleFont: true,
    weights: [300, 400, 500, 600, 700, 800],
    vietnameseReady: true,
  },
  {
    id: 'Inter',
    name: 'Inter',
    family: "'Inter', sans-serif",
    category: 'sans-serif',
    description: 'Chuẩn giao diện số toàn cầu, trung tính, đọc lướt tuyệt vời',
    isGoogleFont: true,
    weights: [300, 400, 500, 600, 700, 800],
    vietnameseReady: true,
  },
  {
    id: 'Montserrat',
    name: 'Montserrat',
    family: "'Montserrat', sans-serif",
    category: 'sans-serif',
    description: 'Hình học mạnh mẽ, uy quyền, lý tưởng cho tiêu đề & thương hiệu',
    isGoogleFont: true,
    weights: [400, 500, 600, 700, 800],
    vietnameseReady: true,
  },
  {
    id: 'Roboto',
    name: 'Roboto',
    family: "'Roboto', sans-serif",
    category: 'sans-serif',
    description: 'Phổ biến, thân thiện, dễ đọc trên mọi thiết bị di động',
    isGoogleFont: true,
    weights: [300, 400, 500, 700],
    vietnameseReady: true,
  },
  {
    id: 'Lexend',
    name: 'Lexend',
    family: "'Lexend', sans-serif",
    category: 'sans-serif',
    description: 'Khoa học tăng tốc độ đọc, khoảng cách ký tự tối ưu',
    isGoogleFont: true,
    weights: [400, 500, 600, 700],
    vietnameseReady: true,
  },
  {
    id: 'Open Sans',
    name: 'Open Sans',
    family: "'Open Sans', sans-serif",
    category: 'sans-serif',
    description: 'Cân bằng, ấm áp, văn bản dài trang nhã',
    isGoogleFont: true,
    weights: [400, 600, 700],
    vietnameseReady: true,
  },
  {
    id: 'Outfit',
    name: 'Outfit',
    family: "'Outfit', sans-serif",
    category: 'sans-serif',
    description: 'Công nghệ, tròn trịa, hiện đại phong cách startup & AI',
    isGoogleFont: true,
    weights: [400, 500, 600, 700],
    vietnameseReady: true,
  },
  {
    id: 'Nunito',
    name: 'Nunito',
    family: "'Nunito', sans-serif",
    category: 'sans-serif',
    description: 'Mềm mại, bo góc nhẹ, thân thiện và gần gũi',
    isGoogleFont: true,
    weights: [400, 600, 700, 800],
    vietnameseReady: true,
  },
  {
    id: 'Playfair Display',
    name: 'Playfair Display',
    family: "'Playfair Display', serif",
    category: 'serif',
    description: 'Serif sang trọng cổ điển, tiêu đề hoàng gia và uy tín cao',
    isGoogleFont: true,
    weights: [400, 600, 700, 800],
    vietnameseReady: true,
  },
  {
    id: 'Merriweather',
    name: 'Merriweather',
    family: "'Merriweather', serif",
    category: 'serif',
    description: 'Serif trang trọng, cảm giác tài chính và bảo hiểm truyền thống',
    isGoogleFont: true,
    weights: [300, 400, 700],
    vietnameseReady: true,
  },
  {
    id: 'Lora',
    name: 'Lora',
    family: "'Lora', serif",
    category: 'serif',
    description: 'Serif đương đại, thanh lịch, mang tính biên tập báo chí',
    isGoogleFont: true,
    weights: [400, 500, 600, 700],
    vietnameseReady: true,
  },
  { id:'Manrope', name:'Manrope', family:"'Manrope', sans-serif", category:'sans-serif', description:'Tối giản, nét thanh thoát cho tiêu đề và thanh điều hướng', isGoogleFont:true, weights:[300,400,500,600,700,800], vietnameseReady:true },
  { id:'DM Sans', name:'DM Sans', family:"'DM Sans', sans-serif", category:'sans-serif', description:'Cân đối, hiện đại; phù hợp website tài chính', isGoogleFont:true, weights:[300,400,500,600,700,800], vietnameseReady:true },
  { id:'Noto Sans', name:'Noto Sans', family:"'Noto Sans', sans-serif", category:'sans-serif', description:'Dễ đọc, hỗ trợ dấu tiếng Việt rõ ràng', isGoogleFont:true, weights:[300,400,500,600,700,800], vietnameseReady:true },
  { id:'Noto Sans Display', name:'Noto Sans Display', family:"'Noto Sans Display', sans-serif", category:'sans-serif', description:'Dành cho tiêu đề lớn, thanh mảnh và thoáng', isGoogleFont:true, weights:[300,400,500,600,700,800], vietnameseReady:true },
  { id:'IBM Plex Sans', name:'IBM Plex Sans', family:"'IBM Plex Sans', sans-serif", category:'sans-serif', description:'Nét chuyên nghiệp, gọn và dễ đọc', isGoogleFont:true, weights:[300,400,500,600,700], vietnameseReady:true },
  { id:'Source Sans 3', name:'Source Sans 3', family:"'Source Sans 3', sans-serif", category:'sans-serif', description:'Văn bản thân thiện, rõ ràng trên màn hình', isGoogleFont:true, weights:[300,400,500,600,700,800], vietnameseReady:true },
  { id:'Mulish', name:'Mulish', family:"'Mulish', sans-serif", category:'sans-serif', description:'Đường nét mềm, hợp menu và nội dung sản phẩm', isGoogleFont:true, weights:[300,400,500,600,700,800], vietnameseReady:true },
  { id:'Work Sans', name:'Work Sans', family:"'Work Sans', sans-serif", category:'sans-serif', description:'Gọn, hiện đại, dễ dùng cho các khối nội dung', isGoogleFont:true, weights:[300,400,500,600,700,800], vietnameseReady:true },
  { id:'Poppins', name:'Poppins', family:"'Poppins', sans-serif", category:'sans-serif', description:'Hình học, nổi bật cho tiêu đề và CTA', isGoogleFont:true, weights:[300,400,500,600,700,800], vietnameseReady:true },
  { id:'Roboto Condensed', name:'Roboto Condensed', family:"'Roboto Condensed', sans-serif", category:'sans-serif', description:'Chữ gọn hơn, hợp menu có nhiều mục', isGoogleFont:true, weights:[300,400,500,600,700,800], vietnameseReady:true },
  { id:'Figtree', name:'Figtree', family:"'Figtree', sans-serif", category:'sans-serif', description:'Sans-serif mới, sạch và cao cấp cho website hiện đại', isGoogleFont:true, weights:[300,400,500,600,700,800], vietnameseReady:true },
  { id:'Urbanist', name:'Urbanist', family:"'Urbanist', sans-serif", category:'sans-serif', description:'Hiện đại, hình học, phù hợp thương hiệu và trang sản phẩm', isGoogleFont:true, weights:[300,400,500,600,700,800], vietnameseReady:true },
  { id:'Noto Serif', name:'Noto Serif', family:"'Noto Serif', serif", category:'serif', description:'Trang nghiêm, rõ ràng, hỗ trợ tiếng Việt tốt cho nội dung chính thức', isGoogleFont:true, weights:[400,500,600,700], vietnameseReady:true },
  { id:'Source Serif 4', name:'Source Serif 4', family:"'Source Serif 4', serif", category:'serif', description:'Serif chuyên nghiệp, phù hợp báo cáo, tài chính và nội dung dài', isGoogleFont:true, weights:[300,400,500,600,700,800], vietnameseReady:true },
  { id:'Roboto Slab', name:'Roboto Slab', family:"'Roboto Slab', serif", category:'serif', description:'Serif công việc vững chãi, phù hợp tiêu đề doanh nghiệp', isGoogleFont:true, weights:[300,400,500,600,700,800], vietnameseReady:true },
  { id:'IBM Plex Serif', name:'IBM Plex Serif', family:"'IBM Plex Serif', serif", category:'serif', description:'Trang trọng và kỹ thuật, hợp tài chính, bảo hiểm và doanh nghiệp', isGoogleFont:true, weights:[300,400,500,600,700], vietnameseReady:true },
  { id:'Libre Baskerville', name:'Libre Baskerville', family:"'Libre Baskerville', serif", category:'serif', description:'Cổ điển, trang nghiêm và đáng tin cậy cho thương hiệu lâu năm', isGoogleFont:true, weights:[400,700], vietnameseReady:true },
  { id:'EB Garamond', name:'EB Garamond', family:"'EB Garamond', serif", category:'serif', description:'Thanh lịch, sang trọng và giàu tính biên tập', isGoogleFont:true, weights:[400,500,600,700,800], vietnameseReady:true },
  { id:'Bodoni Moda', name:'Bodoni Moda', family:"'Bodoni Moda', serif", category:'display', description:'Phong cách luxury cao cấp cho tiêu đề, chiến dịch và thương hiệu', isGoogleFont:true, weights:[400,500,600,700,800,900], vietnameseReady:true },
  {
    id: 'system-ui',
    name: 'Hệ thống (System UI)',
    family: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    category: 'system',
    description: 'Font mặc định của thiết bị (iOS/macOS/Windows/Android), tải cực nhanh',
    isGoogleFont: false,
    vietnameseReady: true,
  },
  {
    id: 'Arial',
    name: 'Arial',
    family: 'Arial, Helvetica, sans-serif',
    category: 'system',
    description: 'Font hệ thống kinh điển, tương thích 100% mọi trình duyệt',
    isGoogleFont: false,
    vietnameseReady: true,
  },
];

const SYSTEM_FONT_NAMES = new Set(['system-ui', 'arial', 'helvetica', 'sans-serif', 'serif', 'monospace', 'times new roman', 'georgia']);

export function cleanFontName(family: string | undefined): string {
  if (!family) return '';
  // Remove outer quotes and fallback declarations like ", sans-serif"
  const firstPart = family.split(',')[0].trim();
  return firstPart.replace(/^['"]|['"]$/g, '').trim();
}

export function loadGoogleFont(fontFamily: string | undefined): void {
  if (typeof document === 'undefined' || !fontFamily) return;
  const name = cleanFontName(fontFamily);
  if (!name || SYSTEM_FONT_NAMES.has(name.toLowerCase())) return;

  const fontId = `gf-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  if (document.getElementById(fontId)) return;

  try {
    const encodedName = encodeURIComponent(name).replace(/%20/g, '+');
    const preset = FONT_PRESETS.find(font=>font.id.toLowerCase()===name.toLowerCase());
    const weights = preset?.weights || [400,700];
    const link = document.createElement('link');
    link.id = fontId;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodedName}:wght@${weights.join(';')}&display=swap`;
    document.head.appendChild(link);
  } catch (err) {
    console.warn('Failed to load Google Font:', name, err);
  }
}

export function loadAllConfigFonts(config: any): void {
  if (!config) return;
  const fonts = new Set<string>();

  const add = (f: string | undefined) => {
    if (f) fonts.add(f);
  };

  // SEO & Website Settings
  add(config.websiteSettings?.seo?.fontFamily);
  add(config.websiteSettings?.seo?.headingFontFamily);

  // Typography Settings
  const typo = config.websiteSettings?.typography;
  if (typo) {
    add(typo.body?.fontFamily);
    add(typo.h1?.fontFamily);
    add(typo.h2?.fontFamily);
    add(typo.h3?.fontFamily);
    add(typo.h4?.fontFamily);
    add(typo.button?.fontFamily);
    add(typo.caption?.fontFamily);
  }

  // Hero typography
  add(config.heroTitleFontFamily);
  add(config.heroSubtitleFontFamily);
  add(config.websiteSettings?.navigation?.fontFamily);
  add(config.websiteSettings?.header?.utilityFontFamily);
  add(config.websiteSettings?.header?.searchFontFamily);
  add(config.websiteSettings?.header?.searchSuggestionFontFamily);
  add(config.formSettings?.fontFamily);
  config.websiteSettings?.forms?.forEach((form:any)=>add(form.settings?.fontFamily));

  // Footer
  add(config.footer?.fontFamily);
  add(config.footer?.headingFontFamily);
  if (config.footer?.visualStyle === 'heritage') add('JetBrains Mono');

  // Admin Login Settings
  add(config.adminLoginSettings?.fontFamily);
  add(config.adminLoginSettings?.headingFontFamily);

  // AI Chatbot
  add(config.aiChatbot?.fontFamily);

  // Sections
  if (Array.isArray(config.sections)) {
    config.sections.forEach((sec: any) => {
      if (sec.design?.styleVariant?.startsWith('editorial-')) add('JetBrains Mono');
      if (sec.typographySettings?.heading?.fontFamily) add(sec.typographySettings.heading.fontFamily);
      if (sec.typographySettings?.body?.fontFamily) add(sec.typographySettings.body.fontFamily);
      Object.values(sec.blog?.typography || {}).forEach((style: any) => add(style?.fontFamily));
    });
  }

  fonts.forEach((f) => loadGoogleFont(f));
}
