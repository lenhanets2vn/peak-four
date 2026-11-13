import type { LandingPageSection } from '../types';

// Only presentation fields belong in Copy/Paste Style. Content, links, media,
// metadata and identifiers stay with the target section.
const visualFields = [
  'design', 'layoutSettings', 'responsiveSettings', 'typographySettings',
  'layout', 'imagePosition', 'bgType', 'bgMode', 'customBgColor',
  'bgImageUrl', 'overlayColor', 'overlayOpacity', 'paddingY', 'textAlign',
  'motion', 'hideOnMobile', 'hideOnDesktop', 'imageFit',
] as const;

type VisualField = typeof visualFields[number];
export type SectionVisualStyle = Partial<Pick<LandingPageSection, VisualField>> & {
  blogStyle?: Pick<NonNullable<LandingPageSection['blog']>, 'backgroundColor' | 'sidebarBackgroundColor' | 'tableColor' | 'tableTextColor' | 'typography'>;
};

export function copySectionVisualStyle(source: LandingPageSection): SectionVisualStyle {
  const style: SectionVisualStyle = {};
  for (const field of visualFields) {
    // Store missing fields too, so pasting clears an older conflicting style.
    (style as Record<string, unknown>)[field] = structuredClone(source[field]);
  }
  if (source.type === 'blogPost') {
    const blog = source.blog;
    style.blogStyle = structuredClone({
      backgroundColor: blog?.backgroundColor,
      sidebarBackgroundColor: blog?.sidebarBackgroundColor,
      tableColor: blog?.tableColor,
      tableTextColor: blog?.tableTextColor,
      typography: blog?.typography,
    });
  }
  return style;
}

export function pasteSectionVisualStyle(target: LandingPageSection, style: SectionVisualStyle): LandingPageSection {
  const { blogStyle, ...sectionStyle } = structuredClone(style);
  return {
    ...target,
    ...sectionStyle,
    ...(target.type === 'blogPost' && blogStyle ? { blog: { html: '', ...target.blog, ...blogStyle } } : {}),
  };
}
