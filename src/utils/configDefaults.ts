import { LandingPageConfig, ReusableForm } from '../types';
import { defaultLandingConfig } from '../data/defaultConfig';
import { normalizeAiChatbotConfig } from './aiConfigDefaults';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

export function normalizeLandingConfig(input?: Partial<LandingPageConfig> | null): LandingPageConfig {
  const base = clone(defaultLandingConfig);
  const source = (input || {}) as Partial<LandingPageConfig>;
  const website = source.websiteSettings || {} as any;
  const baseWebsite = base.websiteSettings!;

  const normalized: LandingPageConfig = {
    ...base,
    ...source,
    countdown: { ...base.countdown, ...(source.countdown || {}) },
    formSettings: { ...base.formSettings, ...(source.formSettings || {}) },
    formFields: (source.formFields !== undefined ? source.formFields : base.formFields).map((f, index) => ({
      ...f,
      order: f.order || index + 1,
      visible: f.visible !== false,
    })),
    sectionCategories: source.sectionCategories !== undefined ? source.sectionCategories : (base.sectionCategories || []),
    sections: (source.sections !== undefined ? source.sections : base.sections).map((s, index) => ({
      ...s,
      // Migrate the brief page-wide option from v1.0.36 to individual blocks.
      ...((website.visualTheme as any)?.pageStyle === 'minimal-finance' && !s.design?.styleVariant ? {design:{...s.design,styleVariant:'minimal-finance' as const}} : {}),
      order: s.order || index + 1,
      status: s.status || (s.enabled === false ? 'inactive' : 'active'),
      enabled: s.enabled !== false && s.status !== 'inactive',
      internalName: s.internalName || s.title || `Section ${index + 1}`,
      anchorId: (s.anchorId || `section-${s.id}`).replace(/^#/, ''),
      items: (s.items || []).map((item) => ({ ...item, enabled: item.enabled !== false })),
    })),
    deletedSections: source.deletedSections !== undefined ? source.deletedSections : [],
    googleSheets: { ...base.googleSheets, ...(source.googleSheets || {}) },
    adminLoginSettings: {
      ...base.adminLoginSettings,
      ...(source.adminLoginSettings || {} as any),
      backgroundGradient: {
        ...(base.adminLoginSettings?.backgroundGradient || { from: '#06132b', to: '#0f2744', direction: 'to-br' }),
        ...(source.adminLoginSettings?.backgroundGradient || {}),
      },
      announcement: {
        ...(base.adminLoginSettings?.announcement || { enabled: false, text: '', type: 'info' }),
        ...(source.adminLoginSettings?.announcement || {}),
      },
      splitBannerBenefits: source.adminLoginSettings?.splitBannerBenefits !== undefined ? source.adminLoginSettings.splitBannerBenefits : (base.adminLoginSettings?.splitBannerBenefits || []),
    },
    websiteSettings: {
      ...baseWebsite,
      ...website,
      colors: { ...baseWebsite.colors, ...(website.colors || {}) },
      typography: {
        ...baseWebsite.typography,
        ...(website.typography || {}),
        h1: { ...baseWebsite.typography.h1, ...(website.typography?.h1 || {}) },
        h2: { ...baseWebsite.typography.h2, ...(website.typography?.h2 || {}) },
        h3: { ...baseWebsite.typography.h3, ...(website.typography?.h3 || {}) },
        h4: { ...(baseWebsite.typography.h4 || {}), ...(website.typography?.h4 || {}) },
        body: { ...baseWebsite.typography.body, ...(website.typography?.body || {}) },
        caption: { ...(baseWebsite.typography.caption || {}), ...(website.typography?.caption || {}) },
        button: { ...baseWebsite.typography.button, ...(website.typography?.button || {}) },
      },
      header: {
        ...baseWebsite.header,
        ...(website.header || {}),
        utilityLinks: (website.header?.utilityLinks !== undefined ? website.header.utilityLinks : baseWebsite.header?.utilityLinks || [])
          .filter(item => !['/tinh-phi','/pricing'].includes(String(item.url||'').split('?')[0])),
        banner: {
          ...(baseWebsite.header.banner || { slides: [] }),
          ...(website.header?.banner || {}),
          slides: website.header?.banner?.slides || baseWebsite.header.banner?.slides || [],
        },
      },
      navigation: {
        ...baseWebsite.navigation,
        ...(website.navigation || {}),
        // An explicitly empty list is a saved CMS choice, including for a new page.
        // Only legacy documents with no navigation list inherit initial defaults.
        enabled: website.navigation?.enabled !== false,
        type: 'main',
        items: (website.navigation?.items !== undefined ? website.navigation.items : baseWebsite.navigation.items || [])
          .filter(item => item.id !== 'nav_pricing' && item.pageId !== 'page_pricing' && !['/tinh-phi','/pricing'].includes(String(item.action?.target || '').split('?')[0]))
          .map((item,index) => ({...item,order:index+1,enabled:item.enabled!==false})),
      },
      visualTheme: (() => {
        const merged:any = { ...(baseWebsite.visualTheme || {}), ...(website.visualTheme || {}) };
        // v1.0.21 migration: Aurelius is no longer a theme. Keep only UX toggles.
        if (merged.uxEnabled === undefined) merged.uxEnabled = merged.mode === 'aurelius-motion' ? true : (baseWebsite.visualTheme?.uxEnabled ?? true);
        const bundled = ['/themes/aurelius/hero-wealth.mp4','/themes/aurelius/legacy.mp4','/themes/aurelius/hero-twilight-skyline.png'];
        if (bundled.includes(String(merged.heroVideoUrl || ''))) { merged.heroVideoUrl=''; merged.heroVideoEnabled=false; }
        if (bundled.includes(String(merged.heroPosterUrl || ''))) merged.heroPosterUrl='';
        delete merged.pageStyle;
        return merged;
      })(),
      popups: website.popups !== undefined ? website.popups : (baseWebsite.popups || []),
      forms: website.forms !== undefined ? website.forms : (baseWebsite.forms || []),
      stylePresets: (() => {
        const rows = website.stylePresets !== undefined ? [...website.stylePresets] : [...(baseWebsite.stylePresets || [])];
        const system:any[] = []; // no bundled UI presets; CMS presets are user-defined
        for (const preset of system) if (!rows.some((p:any) => p.id === preset.id)) rows.push(preset as any);
        return rows;
      })(),
      seo: { ...baseWebsite.seo, ...(website.seo || {}) },
    },
  };

  if (source.footer || base.footer) {
    normalized.footer = {
      ...(base.footer || {} as any),
      ...(source.footer || {}),
      columns: source.footer?.columns !== undefined ? source.footer.columns : (base.footer?.columns || []),
      socialLinks: { ...(base.footer?.socialLinks || {}), ...(source.footer?.socialLinks || {}) },
      actionButtons: source.footer?.actionButtons !== undefined ? source.footer.actionButtons : (base.footer?.actionButtons || []),
      customContactButtons: source.footer?.customContactButtons !== undefined ? source.footer.customContactButtons : (base.footer?.customContactButtons || []),
    } as any;
  }

  normalized.aiChatbot = normalizeAiChatbotConfig(source.aiChatbot || base.aiChatbot);

  // v1.0.46 font migration: v1.0.45 and older used Inter as the untouched global default.
  // Switch only when ALL global typography still carries that legacy default, so an editor's custom choice is preserved.
  const typographyRows = ['h1','h2','h3','h4','body','caption','button'].map((key:any)=>(normalized.websiteSettings?.typography as any)?.[key]?.fontFamily).filter(Boolean);
  const legacyDefaultOnly = typographyRows.length > 0 && typographyRows.every((family:any)=>/^(?:['"]?Inter['"]?)(?:,\s*system-ui)?(?:,\s*sans-serif)?$/i.test(String(family).trim()));
  if (legacyDefaultOnly) {
    for (const key of ['h1','h2','h3','h4','body','caption','button']) {
      const row:any=(normalized.websiteSettings!.typography as any)[key];
      if (row) row.fontFamily="'Be Vietnam Pro', sans-serif";
    }
    const nav:any=normalized.websiteSettings?.navigation;
    if (!nav?.fontFamily || /Inter/i.test(String(nav.fontFamily))) nav.fontFamily="'Be Vietnam Pro', sans-serif";
  }

  // Retire the old calculator settings rather than carrying a hidden pricingPage
  // field forward from legacy Firestore documents into subsequent CMS saves.
  delete (normalized as any).pricingPage;
  return normalized;
}

export function getFormDefinition(config?: Partial<LandingPageConfig> | null, formId?: string): ReusableForm {
  const cfg = config?.formFields ? (config as LandingPageConfig) : normalizeLandingConfig(config);
  const id = formId || 'main';
  const defaultFields = cfg.formFields || defaultLandingConfig.formFields || [];
  if (id === 'main') {
    return {
      id: 'main',
      name: 'Form chính',
      settings: { ...(cfg.formSettings || defaultLandingConfig.formSettings), formId: 'main' },
      fields: defaultFields,
      enabled: true,
      order: 0,
    };
  }
  const found = (cfg.websiteSettings?.forms || []).find((f) => f.id === id && !f.deletedAt);
  if (found) return found;
  return {
    id: 'main',
    name: 'Form chính',
    settings: { ...(cfg.formSettings || defaultLandingConfig.formSettings), formId: 'main' },
    fields: defaultFields,
    enabled: true,
    order: 0,
  };
}
