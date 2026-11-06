export type AdminRole = 'superadmin' | 'marketing_admin' | 'content_editor' | 'viewer';

export interface AdminPermissions {
  allowedTabs?: string[];      // Tabs this account can view
  canEditTabs?: string[];      // Tabs this account can edit
  canPublish?: boolean;        // Can publish live
  canDeleteLeads?: boolean;    // Can delete leads
  canManagePages?: boolean;    // Can create/edit/delete pages
  canTakeoverChat?: boolean;   // Can intervene in AI chat
  canViewAI?: boolean;         // Can view AI Knowledge / AI configuration
  canEditAI?: boolean;         // Can edit AI Knowledge / AI configuration and Gemini credential
}

export interface AdminUser {
  email: string;
  displayName: string;
  role: AdminRole;
  username?: string;
  authMethod?: 'local' | 'google' | 'passcode';
  firebaseLinked?: boolean;
  firebaseEmail?: string;
  firebaseUid?: string;
  firebaseLinkedAt?: string;
  permissions?: AdminPermissions;
}

export interface ManagedAdminAccount {
  id: string;
  username: string;
  email?: string;
  displayName: string;
  role: AdminRole;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  firebaseUid?: string;
  firebaseEmail?: string;
  firebaseLinkedAt?: string;
  firebaseLinked?: boolean;
  permissions?: AdminPermissions;
}

export type CloudConnectionStatus = 'connected' | 'syncing' | 'offline' | 'error' | 'not_configured' | 'unlinked';

export interface CloudStatusState {
  status: CloudConnectionStatus;
  projectId?: string;
  firebaseConfigured: boolean;
  accountLinked: boolean;
  linkedEmail?: string;
  linkedUid?: string;
  lastSyncTime: string | null;
  activeListenersCount: number;
  error?: string | null;
  latencyMs?: number;
  envSource?: string;
  isAutoDetected?: boolean;
  retryAt?: string;
  degraded?: boolean;
  lastWriteOperation?: string;
  lastWriteError?: string | null;
  messageQueue?: {
    enabled: boolean;
    configured: boolean;
    pending: number | null;
    leased: number | null;
    deadLetter: number | null;
    processing?: boolean;
    processedCount?: number;
    failedCount?: number;
    lastProcessedAt?: string | null;
    lastError?: string | null;
  };
}

export type AnalyticsEventType = 'page_view' | 'section_view' | 'click' | 'cta_click' | 'form_start' | 'form_submit' | 'session_ping';
export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  timestamp: string;
  pageId?: string;
  pagePath: string;
  sessionId: string;
  visitorId: string;
  sectionId?: string;
  sectionName?: string;
  eventName?: string;
  target?: string;
  product?: string;
  durationSeconds?: number;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  deviceType?: 'mobile' | 'tablet' | 'desktop';
}

export interface AnalyticsCampaignCost {
  id: string;
  campaign: string;
  source?: string;
  medium?: string;
  spend: number;
  clicks?: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
  updatedAt: string;
}

export type FieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'number'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'multiselect'
  | 'hidden';

export interface FormField {
  id: string;
  name: string; // key in data object e.g. 'company'
  label: string;
  type: FieldType;
  placeholder: string;
  required: boolean;
  options?: string[]; // for select, radio
  order: number;
  googleSheetColumn?: string; // custom column name in Google Sheets
  helpText?: string;
  defaultValue?: string;
  dynamicValue?: string; // e.g. {{product_name}}, {{utm_source}}
  validationPattern?: string;
  validationMessage?: string;
  minLength?: number;
  maxLength?: number;
  visible?: boolean;
  deletedAt?: string;
}

export interface SectionCategory {
  id: string;
  name: string;
  type: SectionType;
  description?: string;
  enabled?: boolean;
  order?: number;
}

export type SectionType =
  | 'hero'
  | 'banner'
  | 'products'
  | 'features'
  | 'stats'
  | 'testimonials'
  | 'gallery'
  | 'video'
  | 'ctaBanner'
  | 'faq'
  | 'form'
  | 'countdown'
  | 'textMedia'
  | 'guarantee'
  | 'productNavigation'
  | 'productShowcase'
  | 'imageContent'
  | 'contentImage'
  | 'productCards'
  | 'trust'
  | 'cta'
  | 'customContent'
  | 'blogPost'
  | 'embed'
  | 'downloads'
  | 'fullImage'
  | 'logoMarquee'
  | 'dualProduct';

export interface SectionImage {
  id?: string;
  url: string;
  mobileUrl?: string;
  alt?: string;
  caption?: string;
  link?: string;
  fit?: 'cover' | 'contain' | 'auto';
  focalPointX?: number;
  focalPointY?: number;
}

export interface SectionItemTypography {
  /** Khi false, nội dung này có font riêng và không thay đổi typography của khối/trang. */
  useGlobal?: boolean;
  title?: TypographyStyle;
  body?: TypographyStyle;
  meta?: TypographyStyle;
}

export interface SectionItem {
  id: string;
  title: string;
  description: string;
  order?: number;
  link?: string;
  value?: string;
  icon?: string; // lucide icon name
  avatar?: string;
  role?: string;
  rating?: number;
  price?: string;
  originalPrice?: string;
  tag?: string;
  features?: string[];
  ctaText?: string;
  ctaLink?: string;
  cta?: CTAConfig;
  imageAlt?: string;
  mobileImage?: string;
  typography?: SectionItemTypography;
  style?: {
    useGlobal?: boolean; presetId?: string; background?: string; textColor?: string; borderColor?: string; borderRadius?: number;
    shadow?: 'none' | 'sm' | 'md' | 'lg'; hoverEffect?: 'none' | 'lift' | 'scale' | 'glow' | 'tilt-3d';
    hoverBackground?: string; hoverTextColor?: string; padding?: number;
  };
  enabled?: boolean;
  deletedAt?: string;

  // Rich Media, Embed & Download fields for item/card
  downloadUrl?: string;
  downloadFileName?: string;
  downloadFileSize?: string;
  downloadFileType?: string;
  downloadButtonText?: string;
  videoUrl?: string;
  videoPoster?: string;
  embedUrl?: string;
  embedDisplayMode?: 'iframe' | 'link' | 'both';
  embedHeight?: number;
}

export type SectionLayout =
  | '1-col'
  | 'zigzag'
  | 'grid-2'
  | 'grid-3'
  | 'grid-4'
  | 'side-left'
  | 'side-right'
  | 'stacked'
  | 'cards'
  | 'masonry'
  | 'editorial-split'
  | 'sticky-story'
  | 'cinematic-feature'
  | 'architecture-grid'
  | 'advisory-stack';

export type SectionBgType =
  | 'white'
  | 'light'
  | 'dark'
  | 'brand-blue'
  | 'gradient'
  | 'image'
  | 'custom';

export type SectionPaddingY = 'compact' | 'normal' | 'spacious';


export type ActionType =
  | 'url'
  | 'internal'
  | 'scroll'
  | 'popup'
  | 'form'
  | 'phone'
  | 'zalo'
  | 'messenger'
  | 'email'
  | 'maps'
  | 'download'
  | 'none';

export interface ActionParameter {
  key: string;
  value: string;
}

export interface ComponentAction {
  type: ActionType;
  target?: string;
  parameters?: ActionParameter[];
  eventName?: string;
  openInNewTab?: boolean;
}

export interface ButtonDesignSettings {
  gradient?: GradientSettings;
  useGlobal?: boolean;
  presetId?: string;
  background?: string;
  hoverBackground?: string;
  textColor?: string;
  hoverTextColor?: string;
  borderColor?: string;
  hoverBorderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  motionStyle?: 'inherit' | 'none' | 'sweep' | 'subtle-lift';
  /** Optional visual treatment. Omitted = original v1.0.60 design. */
  uiVariant?: 'classic' | 'arrow-minimal' | 'navy-outline' | 'soft-glow' | 'depth-3d' | 'premium-gold';
  width?: 'auto' | 'full' | '25' | '33' | '50' | '66' | '75' | '100';
  height?: number;
  paddingX?: number;
  paddingY?: number;
  fontSize?: number;
  fontWeight?: number;
  fontFamily?: string;
  letterSpacing?: number;
  textTransform?: 'none' | 'uppercase' | 'capitalize';
  shape?: 'custom' | 'square' | 'rounded' | 'pill';
}

export interface CTAConfig {
  text?: string;
  icon?: string;
  iconPosition?: 'left' | 'right';
  action?: ComponentAction;
  design?: ButtonDesignSettings;
}

export interface GradientSettings {
  type?: 'linear' | 'radial';
  color1?: string;
  color2?: string;
  direction?: 'left-right' | 'right-left' | 'top-bottom' | 'bottom-top' | 'custom';
  angle?: number;
}

export interface SectionDesignSettings {
  styleVariant?: 'current' | 'minimal-finance' | 'editorial-light' | 'editorial-dark' | 'editorial-warm' | 'editorial-split';
  useGlobal?: boolean;
  presetId?: string;
  backgroundType?: 'solid' | 'gradient' | 'image' | 'video' | 'transparent';
  backgroundColor?: string;
  gradient?: GradientSettings;
  backgroundImage?: string;
  mobileBackgroundImage?: string;
  backgroundVideo?: string;
  backgroundPosition?: 'left' | 'center' | 'right' | 'top' | 'bottom';
  backgroundSize?: 'cover' | 'contain' | 'auto';
  backgroundRepeat?: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';
  overlayColor?: string;
  overlayOpacity?: number;
  textColor?: string;
  accentColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  boxShadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  minHeight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  marginTop?: number;
  marginBottom?: number;
}

export interface SectionTypographySettings {
  useGlobal?: boolean;
  heading?: TypographyStyle;
  body?: TypographyStyle;
}

export interface SectionLayoutSettings {
  widthMode?: 'full' | 'boxed' | 'narrow' | 'custom';
  containerWidth?: number;
  columns?: 1 | 2 | 3 | 4 | 5;
  ratio?: 'equal' | '50-50' | '40-60' | '60-40' | '33-67' | '67-33' | '25-75' | '75-25' | '70-30' | '30-70';
  direction?: 'row' | 'column';
  mediaPosition?: 'left' | 'right' | 'top' | 'bottom';
  contentAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'center' | 'bottom';
  cardsLayout?: 'horizontal' | 'grid' | 'editorial-panel';
  columnGap?: number;
  rowGap?: number;
  imageWidth?: number | string;
  imageHeight?: number | string;
  imageMaxHeight?: number;
  imageAspectRatio?: string;
  imageBorderRadius?: number;
  imageShadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  imageAlignment?: 'left' | 'center' | 'right';
}

export interface BreakpointSettings {
  fontSize?: number;
  headingSize?: number;
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  marginTop?: number;
  marginBottom?: number;
  alignment?: 'left' | 'center' | 'right';
  columns?: 1 | 2 | 3 | 4 | 5;
  imagePosition?: 'left' | 'right' | 'top' | 'bottom' | 'center';
  imageHeight?: number;
  buttonWidth?: 'auto' | 'full';
  sectionHeight?: number;
  visible?: boolean;
}

export interface ResponsiveSettings {
  desktop?: BreakpointSettings;
  tablet?: BreakpointSettings;
  mobile?: BreakpointSettings;
}

export interface TypographyStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  italic?: boolean;
  underline?: boolean;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  tabletSize?: number;
  mobileSize?: number;
}

export interface GlobalColorSettings {
  primary: string;
  secondary: string;
  goldAccent: string;
  backgroundLight: string;
  backgroundDark: string;
  textPrimary: string;
  textSecondary: string;
  buttonPrimary: string;
  buttonHover: string;
  border: string;
}

export interface GlobalTypographySettings {
  h1: TypographyStyle;
  h2: TypographyStyle;
  h3: TypographyStyle;
  h4?: TypographyStyle;
  body: TypographyStyle;
  caption?: TypographyStyle;
  button: TypographyStyle;
}

export interface HeaderBannerSlide {
  id: string;
  imageUrl: string;
  mobileImageUrl?: string;
  alt?: string;
  action?: ComponentAction;
  enabled?: boolean;
  order: number;
}

export interface HeaderBannerSettings {
  enabled?: boolean;
  slides: HeaderBannerSlide[];
  autoplay?: boolean;
  autoplayMs?: number;
  showDots?: boolean;
  showArrows?: boolean;
  fullWidth?: boolean;
  desktopHeight?: number;
  mobileHeight?: number;
  borderRadius?: number;
  objectFit?: 'cover' | 'contain';
}

export interface PageHeaderCtaOverride {
  mode?: 'inherit' | 'hidden' | 'custom';
  cta?: CTAConfig;
}

export interface HeaderSettings {
  desktopEnabled?: boolean;
  mobileEnabled?: boolean;
  enabled?: boolean;
  logoUrl?: string;
  logoLink?: string;
  utilityMessage?: string;
  utilityLinks?: Array<{ id:string; label:string; url:string }>;
  utilityFontFamily?: string;
  mobileLogoUrl?: string;
  logoWidth?: number;
  logoHeight?: number;
  background?: string;
  textColor?: string;
  height?: number;
  hotline?: string;
  zalo?: string;
  sticky?: boolean;
  /** New explicit opt-out. Older documents saved sticky=false as a default; Landing remains pinned. */
  stickyOnScroll?: boolean;
  shadow?: boolean;
  transparent?: boolean;
  showUtilityRow?: boolean;
  visualStyle?: 'current' | 'glass-dark';
  layout?: 'logo-menu-cta' | 'logo-hotline' | 'logo-center';
  mobileLayout?: 'logo-cta' | 'logo-hotline' | 'logo-center';
  mobileHeight?: number;
  mobileLogoWidth?: number;
  mobileLogoHeight?: number;
  mobileBackground?: string;
  mobileTextColor?: string;
  cta?: CTAConfig;
  searchEnabled?: boolean;
  searchPlaceholder?: string;
  /** Search overlay presentation + quick suggestions. */
  searchTitle?: string;
  searchHintText?: string;
  searchSuggestions?: string[];
  searchFontFamily?: string;
  searchSuggestionFontFamily?: string;
  searchBackground?: string;
  searchAccentColor?: string;
  /** Utility row (hotline/login) styling. utilityBackgroundMode='footer' follows the global footer color. */
  utilityBackgroundMode?: 'footer' | 'custom';
  utilityBackground?: string;
  utilityTextColor?: string;
  hotlineBackground?: string;
  hotlineTextColor?: string;
  hotlineBorderColor?: string;
  hotlineBorderWidth?: number;
  hotlineBorderRadius?: number;
  hotlinePaddingX?: number;
  hotlinePaddingY?: number;
  loginIconColor?: string;
  banner?: HeaderBannerSettings;
}

export interface NavigationMegaLink { id: string; title: string; description?: string; url: string; icon?: string; imageUrl?: string; }
export interface NavigationMegaGroup { id: string; label: string; links: NavigationMegaLink[]; }
export interface NavigationMegaMenu { enabled: boolean; groups: NavigationMegaGroup[]; }

export interface NavigationItem {
  megaMenu?: NavigationMegaMenu;
  id: string;
  /** Stable link to the Landing Page represented by this Category Bar item. */
  pageId?: string;
  label: string;
  icon?: string;
  action: ComponentAction;
  normalColor?: string;
  hoverColor?: string;
  activeColor?: string;
  background?: string;
  activeBackground?: string;
  borderRadius?: number;
  fontWeight?: number;
  enabled?: boolean;
  order: number;
}

export interface NavigationSettings {
  enabled?: boolean;
  type?: 'main' | 'product' | 'anchor' | 'sticky';
  sticky?: boolean;
  smoothScroll?: boolean;
  scrollSpy?: boolean;
  mobileHorizontalScroll?: boolean;
  // Primary / Category Bar appearance. All fields are optional for backward compatibility.
  background?: string;
  mobileBackground?: string;
  textColor?: string;
  mobileTextColor?: string;
  hoverColor?: string;
  hoverBackground?: string;
  activeColor?: string;
  activeBackground?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  backdropBlur?: boolean;
  height?: number;
  mobileHeight?: number;
  containerWidth?: number;
  itemGap?: number;
  itemPaddingX?: number;
  itemPaddingY?: number;
  itemBorderRadius?: number;
  fontFamily?: string;
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
  motionStyle?: 'none' | 'lift' | 'glow' | 'scale' | 'red-line' | 'champagne-line';
  motionDurationMs?: number;
  fontSize?: number;
  mobileFontSize?: number;
  fontWeight?: number;
  letterSpacing?: number;
  textTransform?: 'none' | 'uppercase' | 'capitalize';
  align?: 'left' | 'center' | 'right' | 'space-between';
  activeIndicator?: 'none' | 'underline' | 'pill' | 'top-border' | 'bottom-border';
  activeIndicatorColor?: string;
  activeIndicatorHeight?: number;
  activeIndicatorRadius?: number;
  items: NavigationItem[];
}

export interface PopupConfig {
  contentType?: 'form' | 'image' | 'document';
  id: string;
  name: string;
  headline?: string;
  description?: string;
  image?: string;
  formId?: string;
  documentUrl?: string;
  documentLabel?: string;
  documentHeight?: number;
  width?: number;
  height?: number;
  position?: 'center' | 'top' | 'bottom';
  background?: string;
  overlayColor?: string;
  overlayOpacity?: number;
  closeButton?: boolean;
  animation?: 'fade' | 'scale' | 'slide-up' | 'slide-down';
  enabled: boolean;
  order: number;
  deletedAt?: string;
}

export interface StylePreset {
  id: string;
  name: string;
  target: 'section' | 'card' | 'button';
  sectionDesign?: SectionDesignSettings;
  buttonDesign?: ButtonDesignSettings;
  cardStyle?: SectionItem['style'];
}

export interface ReusableForm {
  id: string;
  name: string;
  settings: FormSettings;
  fields: FormField[];
  enabled: boolean;
  order: number;
  deletedAt?: string;
}

export interface SeoSettings {
  pageTitle?: string;
  faviconUrl?: string;
  slug?: string;
  seoTitle?: string;
  metaDescription?: string;
  keywords?: string;
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogType?: 'website' | 'article' | 'product';
  ogSiteName?: string;
  canonical?: string;
  robots?: 'index' | 'noindex' | 'index,follow' | 'noindex,nofollow' | 'noindex,follow';
  twitterCard?: 'summary' | 'summary_large_image';
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  structuredDataJson?: string;
  fontFamily?: string;
  headingFontFamily?: string;
}

export type VisualThemeMode = 'baoviet-classic' | 'aurelius-motion'; // legacy compatibility only

export interface VisualThemeSettings {
  /** Legacy field retained for saved configs. UX is now controlled by uxEnabled + individual switches. */
  mode?: VisualThemeMode;
  uxEnabled?: boolean;
  bidirectionalReveal?: boolean;
  heroScrollMotion?: boolean;
  categoryBarAutoHide?: boolean;
  sectionParallax?: boolean;
  motionEnabled?: boolean;
  revealDistance?: number;
  revealDurationMs?: number;
  revealStaggerMs?: number;
  parallaxEnabled?: boolean;
  filmGrain?: boolean;
  headerMotion?: boolean;
  categoryBarMotion?: boolean;
  buttonMotion?: boolean;
  cardMotion?: boolean;
  darkSurface?: boolean;
  backgroundColor?: string;
  surfaceColor?: string;
  textColor?: string;
  mutedTextColor?: string;
  accentColor?: string;
  borderColor?: string;
  heroVideoEnabled?: boolean;
  heroVideoUrl?: string;
  heroPosterUrl?: string;
  heroVideoOverlay?: number;
  heroVideoBrightness?: number;
}

export interface UiLibrarySettings {
  /** Only mapped, allow-listed variants. Unset slots follow the curated default. */
  mappings?: Partial<Record<'headerCta'|'heroPrimary'|'heroSecondary'|'productCta'|'sectionCta'|'productCard'|'otherCard'|'siteSearch'|'cmsDensity'|'cmsControls'|'analyticsSurface',string>>;
}

export interface WebsiteSettings {
  uiLibrary?: UiLibrarySettings;
  visualTheme?: VisualThemeSettings;
  colors: GlobalColorSettings;
  typography: GlobalTypographySettings;
  header: HeaderSettings;
  navigation: NavigationSettings;
  popups: PopupConfig[];
  forms?: ReusableForm[];
  stylePresets: StylePreset[];
  seo: SeoSettings;
}

export interface LandingPageSection {
  id: string;
  internalName?: string;
  anchorId?: string;
  status?: 'active' | 'inactive';
  deletedAt?: string;
  type: SectionType;
  title: string;
  subtitle: string;
  content?: string;
  blog?: {
    html: string;
    author?: string;
    publishedAt?: string;
    category?: string;
    coverImage?: string;
    coverAlt?: string;
    coverCaption?: string;
    coverCredit?: string;
    layout?: 'single' | 'two-column';
    showSidebarForm?: boolean;
    sidebarFormId?: string;
    sidebarTitle?: string;
    sidebarItems?: Array<{ id: string; title: string; image?: string; imageAlt?: string; imageCredit?: string; url?: string; ctaText?: string; ctaAction?: ComponentAction }>;
    ctaText?: string;
    ctaUrl?: string;
    ctaAction?: ComponentAction;
    tableColor?: string;
    tableTextColor?: string;
    backgroundColor?: string;
    sidebarBackgroundColor?: string;
    typography?: Partial<Record<'title'|'subtitle'|'meta'|'body'|'h1'|'h2'|'h3'|'sidebarTitle'|'sidebarItem'|'toc', BlogTextStyle>>;
  };
  motion?: {
    mode?: 'inherit' | 'off' | 'custom';
    effect?: 'fade' | 'slide-up' | 'slide-left' | 'slide-right' | 'zoom' | 'soft-rise';
    durationMs?: number;
    delayMs?: number;
    distancePx?: number;
    once?: boolean;
  };
  badge?: string;
  imageUrl?: string;
  imageAlt?: string;
  imagePosition?: 'left' | 'right' | 'center';
  images?: SectionImage[]; // Multiple images for gallery, showcase or comparison
  videoUrl?: string; // YouTube or MP4 video link
  embedUrl?: string; // External website / embed URL for section-level rich media
  embedSourceType?: 'url' | 'landingPage' | 'section';
  embedPageUrl?: string;
  embedSectionId?: string;
  sectionCategoryId?: string;
  embedDisplayMode?: 'iframe' | 'link' | 'both';
  embedHeight?: number;
  embedLinkText?: string;
  downloadUrl?: string;
  downloadFileName?: string;
  downloadFileSize?: string;
  downloadFileType?: string;
  downloadButtonText?: string;
  order: number;
  enabled: boolean;
  ctaText?: string;
  ctaLink?: string;
  layout?: SectionLayout;
  bgType?: SectionBgType;
  bgMode?: 'color' | 'image'; // Toggle between background color or image
  customBgColor?: string; // Custom hex or tailwind class e.g. #003870, #ffffff
  bgImageUrl?: string;
  overlayColor?: string; // e.g. #000000, #003870, #ffffff
  overlayOpacity?: number; // 0 to 100 percentage
  paddingY?: SectionPaddingY;
  textAlign?: 'left' | 'center' | 'right';
  hideOnMobile?: boolean;
  hideOnDesktop?: boolean;
  // Hiển thị form tư vấn ngay cạnh khối để khách hàng vừa xem nội dung vừa nhập thông tin.
  showLeadForm?: boolean;
  leadFormPosition?: 'left' | 'right';
  leadFormWidth?: 'narrow' | 'normal';
  items?: SectionItem[];
  design?: SectionDesignSettings;
  layoutSettings?: SectionLayoutSettings;
  responsiveSettings?: ResponsiveSettings;
  typographySettings?: SectionTypographySettings;
  cta?: CTAConfig;
  mobileImageUrl?: string;
  imageFit?: 'cover' | 'contain' | 'auto';
  imageWidth?: number | string;
  imageHeight?: number | string;
  imageMaxHeight?: number;
  imageAspectRatio?: string;
  imageBorderRadius?: number;
  imageShadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  imageAlignment?: 'left' | 'center' | 'right';
  contentContainerWidth?: number;
  contentWidthMode?: 'full' | 'boxed' | 'narrow' | 'custom';
  imageFocalPoint?: string; // legacy
  imageFocalPointX?: number;
  imageFocalPointY?: number;
  /** Full-image overlay settings. Image keeps its intrinsic ratio and fills the section width. */
  overlayText?: string;
  overlayTextStyle?: TypographyStyle;
  overlayPosition?: 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  overlayMaxWidth?: number;
  marqueeSpeedSeconds?: number;
  marqueeDirection?: 'left' | 'right';
  marqueePauseOnHover?: boolean;
  eventName?: string;
  formId?: string;
  /** Typography riêng cho khu vực Lead Form */
  fontFamily?: string;
  titleFontSize?: number;
  subtitleFontSize?: number;
  labelFontSize?: number;
  inputFontSize?: number;
  helperFontSize?: number;
}

export interface BlogTextStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: 'left'|'center'|'right';
}


export interface CountdownConfig {
  enabled: boolean;
  title: string;
  targetDate: string; // ISO string e.g. 2026-09-30T23:59:59
  urgencyBannerText: string;
  expiredMessage: string;
  showBanner: boolean;
}

export interface FormSettings {
  title: string;
  subtitle: string;
  badge: string;
  submitButtonText: string;
  submittingText: string;
  successHeading: string;
  successMessage: string;
  privacyDisclaimer: string;
  redirectUrl?: string;
  submitButtonDesign?: ButtonDesignSettings;
  submitEventName?: string;
  formId?: string;
  fontFamily?: string;
  titleFontSize?: number;
  subtitleFontSize?: number;
  labelFontSize?: number;
  inputFontSize?: number;
  helperFontSize?: number;
}

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  sheetName: string;
  isConnected: boolean;
  lastSyncedAt?: string;
  autoSync: boolean;
  webhookUrl?: string; // Google Apps Script Webhook URL / Make / Zapier
  connectionMethod?: 'webhook' | 'oauth';
}

// Rich Footer Configuration Types
export type FooterColumnType = 'brand' | 'links' | 'contact' | 'social' | 'custom';

export interface FooterLink {
  id: string;
  label: string;
  url: string;
  openInNewTab?: boolean;
}

export interface FooterColumn {
  id: string;
  type: FooterColumnType;
  title: string;
  order: number;
  enabled: boolean;
  content?: string; // Description or custom content
  links?: FooterLink[];
  showLogo?: boolean;
  showSocials?: boolean;
  contactAddress?: string;
  contactHotline?: string;
  contactEmail?: string;
  contactHours?: string;
}

export type FooterButtonAction = 'call' | 'zalo' | 'form' | 'scroll_top' | 'link';

export interface FooterButton {
  id: string;
  label: string;
  action: FooterButtonAction;
  icon: string; // 'phone' | 'message' | 'mail' | 'form' | 'arrow-up' | 'link' | 'shield' | 'star'
  targetUrl?: string; // tel:..., https://zalo.me/..., or URL
  bgColor?: string;
  textColor?: string;
  order: number;
  enabled: boolean;
  openInNewTab?: boolean;
}

export type ContactButtonPlatform =
  | 'hotline'
  | 'zalo'
  | 'messenger'
  | 'facebook'
  | 'youtube'
  | 'tiktok'
  | 'whatsapp'
  | 'maps'
  | 'email'
  | 'telegram'
  | 'form'
  | 'other';

export type ContactButtonActionType =
  | 'call'
  | 'zalo'
  | 'messenger'
  | 'maps'
  | 'whatsapp'
  | 'email'
  | 'url'
  | 'form'
  | 'scroll_form';

export interface CustomContactButton {
  id: string;
  name: string; // Tên hiển thị (e.g. "Gọi Ngay Hotline 1900 55 88 99", "Chat Zalo 24/7", "Chỉ Đường Trụ Sở")
  platform: ContactButtonPlatform;
  actionType: ContactButtonActionType;
  value: string; // Số điện thoại, URL, địa chỉ bản đồ, email...
  iconType: 'preset' | 'custom_upload';
  presetIcon?: string; // 'phone' | 'zalo' | 'messenger' | 'facebook' | 'youtube' | 'tiktok' | 'whatsapp' | 'maps' | 'email' | 'telegram' | 'globe' | 'star' | 'shield'
  customIconUrl?: string; // URL hoặc Data URL (base64) của icon/logo tự upload
  bgColor?: string;
  textColor?: string;
  showInFooter?: boolean; // Hiển thị trong Footer
  showFloating?: boolean; // Hiển thị nút nổi (Floating Contact Bar)
  showMobileBar?: boolean; // Hiển thị trên thanh Sticky Bar mobile
  order: number;
  enabled: boolean;
  openInNewTab?: boolean;
}

export interface SocialLinksConfig {
  facebook?: string;
  youtube?: string;
  tiktok?: string;
  zalo?: string;
  linkedin?: string;
  instagram?: string;
}

export interface FooterConfig {
  enabled: boolean;
  visualStyle?: 'current' | 'heritage';
  bgType?: 'dark' | 'brand-blue' | 'black' | 'light' | 'white' | 'custom';
  customBgColor?: string;
  textColor?: string; // Màu chữ chính của Footer
  headingColor?: string; // Màu tiêu đề Footer
  mutedTextColor?: string; // Màu chữ phụ/copyright Footer
  fontFamily?: string; // Font chữ nội dung Footer
  headingFontFamily?: string; // Font chữ tiêu đề các cột Footer
  bgImageUrl?: string;
  bgMode?: 'color' | 'image';
  overlayColor?: string;
  overlayOpacity?: number; // 0 to 100
  footerLogoUrl?: string;
  footerLogoLink?: string;
  footerLogoHeight?: number; // px
  footerDescription?: string;
  address?: string;
  hotline?: string;
  email?: string;
  workingHours?: string;
  copyrightText?: string;
  disclaimerText?: string;
  columns: FooterColumn[];
  socialLinks: SocialLinksConfig;
  actionButtons: FooterButton[];
  customContactButtons?: CustomContactButton[]; // Danh sách nút Social & Contact tùy chỉnh động (không hard-code)
  showTopContactBar?: boolean; // Hiển thị thanh nút liên hệ lớn ở đầu Footer
  showFloatingContactBar?: boolean; // Floating call/zalo buttons
  showMobileStickyBar?: boolean; // Mobile bottom sticky bar
}

export interface HeroBenefit {
  id: string;
  title: string;
  text: string;
}

export interface HeroSlide {
  id: string;
  url: string;
  alt?: string;
  link?: string;
  tabLabel?: string;
  enabled?: boolean;
}

export type HeroLayoutMode = 'split' | 'image-form' | 'full-image' | 'cinematic';
export type HeroHeightMode = 'compact' | 'normal' | 'large' | 'screen';

export interface LandingPageConfig {
  published: boolean;
  version: number;
  lastPublishedAt?: string;
  themeColor: 'blue' | 'indigo' | 'emerald' | 'violet' | 'amber';
  brandName: string;
  brandLogoText: string;
  brandLogoUrl?: string;
  headerLogoUrl?: string; // Header specific logo
  headerLogoHeight?: number; // Header logo height in px
  footerLogoUrl?: string; // Footer specific logo
  footerLogoHeight?: number; // Footer logo height in px
  mobileLogoUrl?: string; // Mobile specific logo
  customContactButtons?: CustomContactButton[]; // Global custom contact buttons
  hotline?: string; // Main hotline phone number e.g. "1900 55 88 99"
  hotlineDisplay?: string; // Hotline display label e.g. "1900 55 88 99 (24/7)"
  headline: string;
  subtitle: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroBadge: string;
  heroBenefits?: HeroBenefit[];
  heroImage: string;
  heroImageAlt?: string;
  heroImageBadgeText?: string;
  heroImageLink?: string;
  heroSocialProofEnabled?: boolean;
  heroRatingText?: string;
  heroSocialProofText?: string;
  heroLayoutMode?: HeroLayoutMode; // 'split' = current content + form, 'image-form' = half-image slideshow + form; 'full-image' is legacy
  heroSlides?: HeroSlide[]; // Multiple slides used by image-form Hero mode
  heroAutoplayMs?: number; // Auto-advance interval in milliseconds
  heroShowDots?: boolean;
  heroShowArrows?: boolean;
  heroShowTabs?: boolean; // Horizontal buttons that switch the half-width Hero image
  heroFullImageOverlayOpacity?: number; // 0-100
  heroFullImageShowText?: boolean; // Show optional text/CTA overlay on full-image Hero
  heroHeightMode?: HeroHeightMode;
  heroImageObjectPosition?: 'left' | 'center' | 'right';
  heroTitleFontFamily?: string;
  heroTitleFontSize?: number;
  heroTitleFontWeight?: number;
  heroTitleColor?: string;
  heroSubtitleFontFamily?: string;
  heroSubtitleFontSize?: number;
  heroSubtitleColor?: string;
  heroImageMaxHeight?: number;
  heroImageBorderRadius?: number;
  heroContainerMaxWidth?: number;
  heroBackgroundImage?: string;
  heroBackgroundMode?: 'color' | 'image';
  heroCustomBgColor?: string;
  heroOverlayColor?: string;
  heroOverlayOpacity?: number;
  heroCtaPrimary: string;
  heroCtaSecondary: string;
  heroPrimaryCta?: CTAConfig;
  heroSecondaryCta?: CTAConfig;
  headerShowCta?: boolean;
  headerCtaText?: string;
  headerCtaUrl?: string;
  /** Optional CTA behavior for this page only; shared Header design remains global. */
  pageHeaderCta?: PageHeaderCtaOverride;
  countdown: CountdownConfig;
  formSettings: FormSettings;
  formFields: FormField[];
  sections: LandingPageSection[];
  sectionCategories?: SectionCategory[]; // Admin-customizable categories for newly created content blocks
  footer?: FooterConfig; // Rich configurable footer
  footerText?: string; // Backwards compatibility
  footerDisclaimer?: string; // Backwards compatibility
  googleSheets: GoogleSheetsConfig;
  websiteSettings?: WebsiteSettings;
  deletedSections?: LandingPageSection[];
  adminLoginSettings?: AdminLoginSettings;
  aiChatbot?: AiChatbotConfig;
}

export type LoginBackgroundType = 'color' | 'gradient' | 'image' | 'split';
export type LoginCardPosition = 'center' | 'left' | 'right';
export type LoginThemeMode = 'dark' | 'light' | 'glassmorphism';

export type LoginCardIcon = 'lock' | 'shield' | 'shieldCheck' | 'key' | 'fingerprint' | 'building' | 'sparkles' | 'userCheck' | 'award';

export interface AdminLoginSettings {
  enabled?: boolean;
  title?: string;
  subtitle?: string;
  badgeText?: string;
  logoUrl?: string;
  logoWidth?: number;
  logoHeight?: number;
  // Font chữ
  fontFamily?: string;
  headingFontFamily?: string;
  // Background màn hình đăng nhập
  backgroundType: LoginBackgroundType;
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundGradient?: {
    from: string;
    to: string;
    via?: string;
    direction?: string;
  };
  backgroundOverlayColor?: string;
  backgroundOverlayOpacity?: number;
  backgroundBlur?: number;
  // Khung đăng nhập (Card)
  themeMode: LoginThemeMode;
  cardPosition: LoginCardPosition;
  cardBackground?: string;
  cardBorderColor?: string;
  cardBorderRadius?: number;
  cardShadow?: 'none' | 'md' | 'xl' | '2xl' | 'colored';
  cardHeadingColor?: string;
  cardTextColor?: string;
  cardSubtextColor?: string;
  accentColor?: string;
  // Icon đầu khung
  cardIcon?: LoginCardIcon;
  cardIconColor?: string;
  cardIconBgColor?: string;
  // Nội dung & nhãn form
  usernameLabel?: string;
  usernamePlaceholder?: string;
  passwordLabel?: string;
  passwordPlaceholder?: string;
  submitButtonText?: string;
  // Bật/tắt & tùy biến Bypass
  showQuickAdmin?: boolean;
  quickAdminLabel?: string;
  bypassSubtitle?: string;
  bypassButtonColor?: string;
  bypassButtonTextColor?: string;
  // Tiện ích đăng nhập khác
  showGoogleLogin?: boolean;
  showBackToLanding?: boolean;
  backToLandingText?: string;
  supportContact?: string;
  copyrightText?: string;
  announcement?: {
    enabled?: boolean;
    text?: string;
    type?: 'info' | 'warning' | 'success';
  };
  splitBannerTitle?: string;
  splitBannerSubtitle?: string;
  splitBannerImage?: string;
  splitBannerBenefits?: string[];
}

export interface LeadTracking {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  pageUrl: string;
  referrer?: string;
  userAgent?: string;
  ipHash?: string;
  deviceType?: 'mobile' | 'desktop' | 'tablet';
  page?: string;
  section?: string;
  product?: string;
  eventName?: string;
  formId?: string;
}

export interface LeadSubmission {
  id: string;
  submittedAt: string;
  name: string;
  email: string;
  phone: string;
  customResponses: Record<string, any>;
  tracking: LeadTracking;
  syncStatus: 'synced' | 'pending' | 'failed';
  syncError?: string;
  syncedAt?: string;
  googleSheetRowNumber?: number;
}

export interface LeadFilters {
  searchQuery: string;
  dateRange: 'all' | 'today' | '7days' | '30days' | 'custom';
  startDate?: string;
  endDate?: string;
  campaign?: string;
  syncStatus: 'all' | 'synced' | 'pending' | 'failed';
}

export interface SheetsSetupResult {
  success: boolean;
  message: string;
  columns?: string[];
  spreadsheetTitle?: string;
}

export type AuditActionType =
  | 'AUTH_LOGIN'
  | 'AUTH_LOGOUT'
  | 'LEAD_VIEW'
  | 'LEAD_DELETE'
  | 'LEAD_SYNC'
  | 'LEAD_EXPORT'
  | 'CONFIG_DRAFT_SAVE'
  | 'CONFIG_PUBLISH'
  | 'CONFIG_ROLLBACK'
  | 'SHEETS_CONNECT'
  | 'SHEETS_DISCONNECT'
  | 'BACKUP_RESTORE'
  | 'PAGE_CREATE'
  | 'PAGE_UPDATE'
  | 'PAGE_DUPLICATE'
  | 'PAGE_DELETE'
  | 'PAGE_RESTORE'
  | 'PAGE_PERMANENT_DELETE'
  | 'PREVIEW_CREATE'
  | 'SETTINGS_UPDATE'
  | 'ADMIN_ACCOUNT_CREATE'
  | 'ADMIN_ACCOUNT_UPDATE'
  | 'ADMIN_ACCOUNT_DELETE'
  | 'ADMIN_ACCOUNT_PASSWORD_RESET'
  | 'ANALYTICS_COST_UPDATE'
  | 'ANALYTICS_RESET'
  | 'KNOWLEDGE_CREATE'
  | 'KNOWLEDGE_UPDATE'
  | 'KNOWLEDGE_DELETE'
  | 'KNOWLEDGE_AUTO_EXTRACT'
  | 'KNOWLEDGE_RESET'
  | 'TAXONOMY_UPDATE'
  | 'TAXONOMY_RESET'
  | 'TAXONOMY_PRODUCT_ADD'
  | 'TAXONOMY_PRODUCT_UPDATE'
  | 'TAXONOMY_PRODUCT_DELETE'
  | 'TAXONOMY_CATEGORY_ADD'
  | 'TAXONOMY_CATEGORY_UPDATE'
  | 'TAXONOMY_CATEGORY_DELETE'
  | 'TAXONOMY_COMPONENT_ADD'
  | 'TAXONOMY_COMPONENT_UPDATE'
  | 'TAXONOMY_COMPONENT_DELETE'
  | 'AI_TRAINING_UPDATE'
  | 'AI_TRAINING_RESET'
  | 'AI_CONFIG_UPDATE'
  | 'CONFIG_VERSIONS_DELETE';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: AuditActionType;
  actorEmail?: string;
  actorRole?: 'superadmin' | 'marketing_admin' | 'content_editor' | 'viewer' | 'admin' | 'system';
  ipAddress?: string;
  details?: string;
  status: 'success' | 'warning' | 'error' | 'info';
}

export interface ConfigVersion {
  id: string;
  pageId?: string;
  pageName?: string;
  versionNumber: number;
  timestamp: string;
  author: string;
  note?: string;
  changeSummary?: string[];
  config: LandingPageConfig;
}


export interface LandingPageSummary {
  id: string;
  orderIndex?: number;
  name: string;
  slug: string;
  status: 'active' | 'inactive';
  published: boolean;
  version: number;
  updatedAt: string;
  lastPublishedAt?: string;
  deletedAt?: string;
  system?: boolean;
  kind?: 'landing';
}

export interface LandingPageRecord extends LandingPageSummary {
  createdAt: string;
  draft: LandingPageConfig;
  publishedConfig: LandingPageConfig;
}

export interface SystemBackupPayload {
  version: string;
  exportedAt: string;
  config: LandingPageConfig;
  pages?: LandingPageRecord[];
  leadsCount: number;
  leads?: LeadSubmission[];
  auditLogs?: AuditLogEntry[];
  versions?: ConfigVersion[];
}

export type KnowledgeComponentType =
  | 'overview'           // Tổng quan sản phẩm & Đối tượng tham gia
  | 'benefits'           // Quyền lợi & Phạm vi bảo hiểm chi tiết
  | 'pricing_rules'      // Biểu phí, cách tính phí & điều kiện khấu trừ
  | 'exclusions'         // Điều khoản loại trừ & điểm không bồi thường
  | 'claim_procedure'    // Quy trình bồi thường & thủ tục hồ sơ
  | 'hospitals_garages'  // Danh bạ bảo lãnh viện phí / gara liên kết
  | 'faq'                // Câu hỏi thường gặp & xử lý tình huống
  | 'sales_pitch'        // Mẹo tư vấn, điểm độc đáo & chốt hợp đồng
  | 'custom'             // Tài liệu bổ trợ khác
  | string;              // Cho phép bộ phận cấu thành mở rộng do người dùng tự tạo

export interface TaxonomyProduct {
  id: string;
  name: string;
  aliases?: string[];
  tags?: string[];
  keywords?: string[];
  normalizedName?: string;
  category?: string;
  categoryId?: string;
  categoryCode?: string;
  desc?: string;
  description?: string;
  targetAudience?: string;
  order?: number;
  active?: boolean;
  isDefault?: boolean;
}

export interface TaxonomyCategory {
  id: string;
  name: string;
  aliases?: string[];
  tags?: string[];
  keywords?: string[];
  normalizedName?: string;
  code?: string;
  desc?: string;
  description?: string;
  order?: number;
  active?: boolean;
  isDefault?: boolean;
}

export interface TaxonomyComponentType {
  id: string;
  code: string;
  label: string;
  name?: string;
  aliases?: string[];
  tags?: string[];
  keywords?: string[];
  normalizedName?: string;
  color?: string;
  badgeColor?: string;
  desc?: string;
  icon?: string;
  order?: number;
  active?: boolean;
  isDefault?: boolean;
}

export interface KnowledgeTaxonomyData {
  products: TaxonomyProduct[];
  categories: TaxonomyCategory[];
  componentTypes: TaxonomyComponentType[];
}

export interface KnowledgeItem {
  id: string;
  title: string;
  product: string;              // Tên sản phẩm (e.g. Bảo hiểm Xe ô tô, Bảo Việt An Gia, v.v.)
  productId?: string;
  category: string;
  categoryId?: string;             // Danh mục (e.g. Bảo hiểm Xe cơ giới, Bảo hiểm Sức khỏe, v.v.)
  topic: string;                // Chủ đề (e.g. Quyền lợi & Phạm vi, Biểu phí, v.v.)
  componentType: KnowledgeComponentType; // Bộ phận cấu thành nội dung
  componentId?: string;
  content: string;              // Nội dung tài liệu chi tiết (Markdown/Text)
  tags: string[];               // Từ khóa tìm kiếm và gợi ý
  sourceFileName?: string;      // Tên tệp nội bộ đã upload
  fileType?: string;            // 'docx' | 'xlsx' | 'pdf' | 'txt' | 'manual'
  fileSize?: number;            // Kích thước byte
  active: boolean;              // Bật/tắt cho AI khai thác
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system' | 'staff';
  senderName?: string;
  text: string;
  timestamp: string;
  createdAt?: number | string;
  sources?: Array<{
    id: string;
    title: string;
    product: string;
    topic: string;
    componentType: string;
  }> | string[];
  quickReplies?: string[];
  suggestedAction?: {
    type: 'quote_form' | 'call_hotline' | 'zalo' | 'select_product';
    label: string;
    payload?: string;
  };
  capturedLead?: {
    name: string;
    phone: string;
    product?: string;
  };
}

export interface AiTrainingConfig {
  botName?: string;
  /** Server-side Gemini API key override. Never returned to normal client config payloads. */
  geminiApiKey?: string;

  // Cấu hình Mô hình AI & Tham số sinh (Model & Inference Parameters)
  modelName?: string;            // Ví dụ: 'gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.5-pro'
  fallbackModelName?: string;    // Ví dụ: 'gemini-3.1-flash-lite', 'gemini-flash-latest'
  temperature?: number;          // 0.0 - 1.0 (mặc định 0.4 cho độ chính xác cao)
  maxOutputTokens?: number;      // 512 - 4096 (mặc định 2048)
  topKRetrieval?: number;        // Số lượng mục tri thức liên quan trích xuất đưa vào context (mặc định 5)
  useSearchGrounding?: boolean;  // Bật/tắt Google Search Grounding
  strictKnowledgeOnly?: boolean; // Chỉ trả lời dựa trên tri thức nội bộ đã duyệt, cấm phỏng đoán
  alwaysUseGemini?: boolean;     // Mọi lượt chat đều phải đi qua Gemini; Knowledge chỉ làm context/grounding
  systemPromptPrefix?: string;   // Chỉ thị tối cao hệ thống bổ sung

  // Khuôn mẫu lịch sự & Tác phong chuẩn mực
  politenessLevel: 'formal' | 'warm_polite' | 'expert_respectful';
  openingGreeting: string;       // Lời chào mở đầu chuẩn mực
  closingWish: string;           // Lời chúc & cảm ơn kết thúc
  complaintEtiquette: string;    // Quy tắc & khuôn mẫu khi khách hàng khiếu nại / thắc mắc căng thẳng
  outOfScopeResponse: string;    // Khuôn mẫu từ chối lịch sự khi ngoài phạm vi bảo hiểm

  // Cách xưng hô & Cách nói chuyện
  aiPronoun: string;             // Cách xưng hô của AI: 'Em', 'Tôi', 'Trợ lý AI Bảo Việt', 'Chuyên viên tư vấn'
  customerPronoun: string;       // Cách gọi khách hàng: 'Quý khách', 'Anh/Chị', 'Quý đối tác'
  conversationTone: 'enthusiastic' | 'professional' | 'concise' | 'empathetic' | 'advisor';
  responseLength: 'concise' | 'balanced' | 'detailed';
  useBulletPoints: boolean;
  useEmoji: 'none' | 'subtle' | 'lively';

  // Kịch bản phản hồi tình huống (Response Playbooks)
  pricingPlaybook: string;       // Kịch bản phản hồi khi khách hỏi giá/phí
  claimPlaybook: string;         // Kịch bản giải thích bồi thường minh bạch & cam kết
  hesitationPlaybook: string;    // Kịch bản khi khách do dự / từ chối
  leadCaptureTrigger: string;    // Lời dẫn khéo léo xin SĐT để nhận ưu đãi & minh họa chi tiết
  customBehaviorPrompt: string;  // Chỉ thị huấn luyện chuyên biệt khác
}

export interface AiChatbotConfig {
  enabled?: boolean;
  // Nhận diện & Tên
  botName?: string;              // Tên trợ lý (mặc định: 'Trợ lý AI Bảo Việt')
  botSubtitle?: string;          // Dòng phụ đề (mặc định: 'Tư vấn nghiệp vụ & biểu phí 24/7')
  botAvatarType?: 'bot' | 'shield' | 'sparkles' | 'headphones' | 'userCheck' | 'custom';
  customAvatarUrl?: string;
  launcherVisual?: 'icon' | 'mascot'; // Chỉ đổi nút mở chat; avatar trong hội thoại giữ riêng.
  mascotId?: string;             // Nhân vật trong bộ page-mascot đi kèm ứng dụng
  mascotRandomPerVisit?: boolean;
  mascotAllowVisitorChange?: boolean;
  mascotAllowedIds?: string[];
  mascotSize?: number;           // Kích thước nhân vật trên nút nổi (40–180 px)
  mascotBubbleColor?: string;    // Màu nền của nút mascot
  mascotBubbleOpacity?: number;  // 0–100%; mặc định 0 (trong suốt)
  welcomeMessage?: string;
  placeholderText?: string;
  defaultProduct?: string;
  supportPhone?: string; // SĐT/Hotline chính thức mà chatbot được phép cung cấp cho khách hàng

  // Vị trí icon nổi & Kích thước cửa sổ
  floatingPosition?: 'bottom-right' | 'bottom-left';
  floatingMarginBottom?: number; // px (mặc định 20)
  floatingMarginSide?: number;   // px (mặc định 40)
  chatWindowWidth?: number;      // px (mặc định 420)
  chatWindowHeight?: number;     // px (mặc định 580)

  // Màu sắc & Giao diện (Theme)
  primaryColor?: string;         // Mã màu Hex hoặc tên màu (mặc định '#005baa' - Bảo Việt blue)
  headerGradientStart?: string;  // '#005baa'
  headerGradientEnd?: string;    // '#003e75'
  botBubbleBgColor?: string;     // '#ffffff'
  botBubbleTextColor?: string;   // '#1e293b'
  userBubbleBgColor?: string;    // '#005baa'
  userBubbleTextColor?: string;  // '#ffffff'

  // Huy hiệu nổi bên ngoài icon
  showFloatingBadge?: boolean;   // Bật/tắt huy hiệu động "AI Tư vấn..."
  floatingBadgeText?: string;    // Nội dung chữ trên badge
  floatingBadgeTextShadowColor?: string; // Màu bóng đổ cho chữ huy hiệu
  launcherText?: string;         // Chữ nằm cạnh icon ở nút mở chatbot

  // Bật/tắt tính năng tương tác
  enableVoiceInput?: boolean;    // Voice STT (Microphone)
  enableVoiceOutput?: boolean;   // Voice TTS (Loa phát âm)
  enableGoogleSearch?: boolean;  // Google Search Grounding
  showQuickCallbackForm?: boolean; // Form yêu cầu gọi lại trong chat
  suggestedQuestions?: string[]; // Danh sách câu hỏi gợi ý nhanh

  // Font chữ & Cỡ chữ Chatbot
  fontFamily?: string;           // Tùy chỉnh font chữ riêng cho chatbot
  fontSize?: 'sm' | 'md' | 'lg' | string; // Kích thước chữ hiển thị

  // Cấu hình Huấn luyện Tác phong & Xưng hô
  training?: AiTrainingConfig;
}

export interface ChatSession {
  id: string;
  visitorId?: string;
  visitorName?: string;
  visitorPhone?: string;
  customerName?: string;
  customerPhone?: string;
  pageUrl?: string;
  pageTitle?: string;
  currentProduct?: string;
  currentProductId?: string;
  currentCategory?: string;
  currentCategoryId?: string;
  currentComponent?: string;
  currentComponentId?: string;
  lastIntent?: string;
  productSelectionConfirmed?: boolean;
  /** Selection hand-off state so typed text and UI product suggestions behave identically. */
  awaitingProductSelection?: boolean;
  pendingIntent?: string;
  pendingComponentId?: string;
  pendingCategoryId?: string;
  conversationEntities?: { occupation?: string; age?: number; gender?: 'male' | 'female'; relationship?: string; healthContext?: string; eventContext?: string };
  activeConversationSubject?: 'self' | 'spouse' | 'child' | 'parent' | 'other';
  conversationSubjectProfiles?: Partial<Record<'self' | 'spouse' | 'child' | 'parent' | 'other', { occupation?: string; age?: number; gender?: 'male' | 'female'; relationship?: string; healthContext?: string; eventContext?: string }>>;
  lastContextualQuestion?: string;
  topicStack?: Array<{ id:string; productId?:string; productName?:string; componentId?:string; componentName?:string; intent?:string; subjectId?:'self'|'spouse'|'child'|'parent'|'other'; label:string; createdAt:number; updatedAt:number }>;
  activeTopicIndex?: number;
  createdAt: string;
  updatedAt: string;
  lastCustomerMessageAt?: number;
  lastStaffMessageAt?: number;
  status: 'ai_active' | 'staff_takeover' | 'waiting_staff' | 'closed';
  aiDropped?: boolean;
  aiResumeTimeoutAt?: number; // ms timestamp: after 15s of customer message without staff activity, AI can resume
  messages: ChatMessage[];
  unreadByStaff?: boolean;
}

export type GeminiApiErrorType =
  | 'QUOTA_EXCEEDED_429'
  | 'HIGH_DEMAND_503'
  | 'NOT_FOUND_404'
  | 'AUTH_INVALID_400'
  | 'NETWORK_OR_UNKNOWN';

export interface GeminiApiErrorRecord {
  id: string;
  timestamp: string;
  statusCode: number | string;
  errorType: GeminiApiErrorType;
  model: string;
  endpoint: string;
  message: string;
  apiKeyMasked: string;
  queryPreview?: string;
  recoveredViaFallback?: boolean;
  fallbackModelUsed?: string;
}

export interface ActiveQuotaExceededState {
  active: boolean;
  detectedAt?: string;
  apiKeyMasked?: string;
  model?: string;
  statusCode: number;
  message?: string;
}

export interface GeminiChatCacheEntry {
  id: string;
  queryNormalized: string;
  rawQuery: string;
  product?: string;
  reply: string;
  sources?: string[];
  quickReplies?: string[];
  modelUsed: string;
  createdAt: string;
  lastAccessedAt: string;
  hitCount: number;
}

export interface GeminiHealthSummary {
  activeQuotaExceeded?: ActiveQuotaExceededState;
  quotaState?: ActiveQuotaExceededState;
  totalErrors?: number;
  count429?: number;
  count503?: number;
  count404?: number;
  count400?: number;
  recentErrors?: GeminiApiErrorRecord[];
  errorLogs?: GeminiApiErrorRecord[];
  cacheStats?: {
    totalEntries: number;
    totalHits: number;
    savedApiCalls: number;
    lastSavedAt?: string;
    entries?: GeminiChatCacheEntry[];
  };
  keyInfo?: {
    configured: boolean;
    masked: string;
    source: string;
  };
  apiKeyInfo?: {
    configured: boolean;
    masked: string;
    source: string;
  };
  configuredModels?: {
    primary: string;
    fallback: string;
  };
  activeModel?: string;
  fallbackModel?: string;
}
