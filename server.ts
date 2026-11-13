import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import { registerSecret, trustedClientIp, installSecurity, assertSecurityEnvironment, cookieValue, signAccessSession, verifyAccessSession, setAuthCookies, clearSessionCookies, createCsrfToken, sessionSecretVersion, encodeStoredJson, decodeStoredJson } from './src/services/securityServer';
import {
  redisStatus,
  readChatSession as readRedisChatSession,
  readRecentChatSessions as readRedisChatSessions,
  writeChatSession as writeRedisChatSession,
  deleteChatSession as deleteRedisChatSession,
  claimChatSessionOwner,
} from './src/services/redisServer';
import {
  createRefreshTokenFamily,
  rotateRefreshToken,
  readRefreshFamilySession,
  updateRefreshFamilySession,
  revokeRefreshToken,
  revokeRefreshFamily,
  revokePrincipalRefreshFamilies,
  refreshTokenFamilyId,
  authRefreshStatus,
} from './src/services/authRefreshServer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { defaultLandingConfig } from './src/data/defaultConfig';
import { getFormDefinition, normalizeLandingConfig } from './src/utils/configDefaults';
import { resolveChatSupportPhone } from './src/utils/chatContact';
import { publishedSiteSearch, siteSearchSuggestions } from './src/services/siteSearch';
import { initializeCloudPersistence, readCloudState, saveCloudState, flushCloudPersistence, getCloudPersistenceStatus, deleteAIKnowledgeItemFromCloud, deleteAIKnowledgeItemsBulkFromCloud, saveCloudPageTargeted, saveCloudPagesTargeted, saveCloudPublicationTargeted, deleteCloudPageTargeted, saveCloudVersionTargeted, saveCloudSettingsTargeted, saveCloudTaxonomyTargeted, saveCloudTrainingTargeted, saveCloudKnowledgeItemTargeted, enqueueCloudAuditLog, saveCloudLeadTargeted, deleteCloudLeadTargeted, saveCloudAdminAccountTargeted, deleteCloudAdminAccountTargeted, appendAnalyticsBatch, purgeCloudChatSessions, getFirebaseCredentialDiagnostics, startCloudMessageQueue, drainCloudMessageQueue, getCloudWriteQueueStatus, cloudWriteQueueConfigured, retryDeadCloudWriteJobs, purgeDeadCloudWriteJobs } from './src/services/firebaseAdminServer';
import {
  runGeminiSeoOptimizer,
  isGeminiAvailable,
  getGeminiClient,
  runGeminiChat,
  setGeminiModelProvider,
  generateSpeechAudio,
  suggestQuickQuestions,
  extractKnowledgeFromDocument,
  getGeminiApiKeyInfo,
  saveGeminiApiKey,
  clearStoredGeminiApiKey,
  hydrateGeminiApiKeyFromCloud,
  validateAndTestGeminiApiKey,
  callGeminiModelWithResilience,
  getGeminiErrorLogs,
  getActiveQuotaExceededState,
  resetQuotaExceededAlert,
  clearGeminiErrorLogs,
  getChatCacheStats,
  clearChatCache,
  invalidateChatCache,
} from './src/services/geminiServer';
import {
  getKnowledgeDatabase,
  getKnowledgeItemById,
  createKnowledgeItem,
  updateKnowledgeItem,
  deleteKnowledgeItem,
  deleteKnowledgeItemsByProduct,
  bulkDeleteKnowledgeItems,
  resetKnowledgeToDefaults,
  bulkAddKnowledgeItems,
  processAndExtractUpload,
  getTaxonomyData,
  saveTaxonomyData,
  resetTaxonomyToDefaults,
  addTaxonomyProduct,
  updateTaxonomyProduct,
  deleteTaxonomyProduct,
  addTaxonomyCategory,
  updateTaxonomyCategory,
  deleteTaxonomyCategory,
  addTaxonomyComponentType,
  updateTaxonomyComponentType,
  deleteTaxonomyComponentType,
  getAiTrainingConfig,
  saveAiTrainingConfig,
  resetAiTrainingConfig,
  setKnowledgeCloudPersistenceHook,
  setKnowledgeLocalPersistenceHook,
  replaceKnowledgeDatabase,
  saveKnowledgeDatabase,
  replaceTaxonomyData,
  replaceAiTrainingConfig,
  getKnowledgePersistenceHealth,
} from './src/services/knowledgeService';

import { runRebuiltChatbot } from './src/services/chatbotEngine';
import { orchestrateConversationTurn } from './src/services/chatbotConversationOrchestrator';
import { getTelegramLoggerInfo, saveTelegramLoggerConfig, testTelegramConnection, enqueueTelegramLead, sendTelegramLeadNow } from './src/services/telegramChatLogger';
import { resolveProduct, getProductCategory, enrichTaxonomyRelationships, filterKnowledgeByTaxonomy, type ChatRouterResult } from './src/services/chatbotTaxonomyRouter';

setGeminiModelProvider(getAiTrainingConfig);

import {
  AdminRole,
  LandingPageConfig,
  LandingPageRecord,
  LandingPageSummary,
  LeadSubmission,
  AuditLogEntry,
  AuditActionType,
  ConfigVersion,
  SystemBackupPayload,
  FormField,
  AnalyticsEvent,
  AnalyticsCampaignCost,
  KnowledgeItem,
  KnowledgeComponentType,
  AdminPermissions,
  ChatSession,
  ChatMessage,
  NavigationItem,
  NavigationSettings,
  FooterConfig,
} from './src/types';

assertSecurityEnvironment();
const app = express();
const IS_RENDER_RUNTIME = /^(1|true|yes)$/i.test(String(process.env.RENDER || '')) || !!process.env.RENDER_SERVICE_ID || !!process.env.RENDER_INSTANCE_ID || !!process.env.RENDER_EXTERNAL_HOSTNAME || !!process.env.RENDER_SERVICE_NAME;
const IS_PRODUCTION_RUNTIME = String(process.env.NODE_ENV || '').toLowerCase() === 'production' || IS_RENDER_RUNTIME || String(process.env.RENDER_SERVICE_TYPE || '').toLowerCase() === 'web_service';
const PORT = Number(process.env.APP_PORT || process.env.PORT || (IS_PRODUCTION_RUNTIME ? 10000 : 3000));
const ACCESS_TOKEN_DURATION_MS = Math.max(5, Math.min(60, Number(process.env.AUTH_ACCESS_TOKEN_MINUTES || 15))) * 60 * 1000;
const SESSION_DURATION_MS = Math.max(1, Math.min(720, Number(process.env.AUTH_REFRESH_TOKEN_HOURS || 8))) * 60 * 60 * 1000;
const PREVIEW_DURATION_MS = 30 * 60 * 1000;
const AI_STAFF_RESPONSE_TIMEOUT_MS = 15 * 1000;

// Page sync clients poll the authoritative Node API (/api/pages/:id/sync).
// No extra Firestore marker write is needed after Draft Save/Publish.

installSecurity(app);
app.use((req,res,next)=>{const claims=verifyAccessSession(cookieValue(req,'bv_session'));const limit=req.path==='/api/auth/login'?'16kb':claims?'40mb':'256kb';return express.json({limit})(req,res,next);});
app.use(express.urlencoded({ extended: false, limit: '16kb' }));

const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(process.cwd(), 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const PAGES_FILE = path.join(DATA_DIR, 'pages.json');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');
const AUDIT_LOGS_FILE = path.join(DATA_DIR, 'audit_logs.json');
const VERSIONS_FILE = path.join(DATA_DIR, 'versions.json');
const ADMIN_USERS_FILE = path.join(DATA_DIR, 'admin_users.json');
const ANALYTICS_FILE = path.join(DATA_DIR, 'analytics_events.json');
const ANALYTICS_COSTS_FILE = path.join(DATA_DIR, 'analytics_costs.json');
const SYSTEM_STATE_FILE = path.join(DATA_DIR, 'system_state.json');
const FIREBASE_CONFIG_FILE = path.join(DATA_DIR, 'firebase_config.json');
const CHAT_SESSIONS_FILE = path.join(DATA_DIR, 'chat_sessions.json');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function resolveLkgDir(): string {
  const explicit = String(process.env.LKG_DIR || '').trim();
  const candidates = [explicit, '/var/data/lkg', path.join(DATA_DIR, 'lkg')].filter(Boolean);
  for (const candidate of candidates) {
    try {
      const parent = path.dirname(candidate);
      if (candidate === '/var/data/lkg' && !fs.existsSync('/var/data')) continue;
      fs.mkdirSync(parent, { recursive: true });
      fs.mkdirSync(candidate, { recursive: true });
      fs.accessSync(candidate, fs.constants.R_OK | fs.constants.W_OK);
      return candidate;
    } catch {}
  }
  const fallback = path.join(DATA_DIR, 'lkg');
  fs.mkdirSync(fallback, { recursive: true });
  return fallback;
}
const LKG_DIR = resolveLkgDir();
const LKG_CURRENT_FILE = path.join(LKG_DIR, 'current.json');
const LKG_PREVIOUS_FILE = path.join(LKG_DIR, 'previous.json');
const LKG_MANIFEST_FILE = path.join(LKG_DIR, 'manifest.json');

type AdminSession = {
  token: string;
  email: string;
  accountId?: string;
  authMethod?: 'local'|'google'|'passcode';
  displayName: string;
  role: AdminRole;
  createdAt: number;
  expiresAt: number;
  ip: string;
  firebaseLinked?: boolean;
  firebaseUid?: string;
  firebaseEmail?: string;
  firebaseLinkedAt?: string;
  permissions?: AdminPermissions;
  refreshFamilyId?: string;
  authKeyVersion?: string;
};
type PreviewSession = { pageId: string; expiresAt: number };
type StoredAdminAccount = {
  id: string;
  username: string;
  email?: string;
  displayName: string;
  role: AdminRole;
  enabled: boolean;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  firebaseUid?: string;
  firebaseEmail?: string;
  firebaseLinkedAt?: string;
  permissions?: AdminPermissions;
};
type SystemState = {
  migrations?: Record<string, boolean>;
  sharedFooterDraft?: any;
  sharedFooterPublished?: any;
  sharedNavigationDraft?: any;
  sharedNavigationPublished?: any;
  sharedHeaderDraft?: any;
  sharedHeaderPublished?: any;
};
type CustomerFirebaseConfig = { projectId:string; appId:string; apiKey:string; authDomain:string; storageBucket:string; messagingSenderId:string; measurementId?:string; oAuthClientId?:string; recaptchaSiteKey?:string };
const FIREBASE_REQUIRED_KEYS: Array<keyof CustomerFirebaseConfig> = ['projectId','appId','apiKey','authDomain','storageBucket','messagingSenderId'];
function normalizeFirebaseConfig(input:any): CustomerFirebaseConfig {
  const c:any = {};
  for (const key of ['projectId','appId','apiKey','authDomain','storageBucket','messagingSenderId','measurementId','oAuthClientId','recaptchaSiteKey']) {
    if (typeof input?.[key] === 'string') c[key] = input[key].trim();
  }
  return c as CustomerFirebaseConfig;
}
function validateFirebaseConfig(input:any): string[] {
  const c = normalizeFirebaseConfig(input);
  return FIREBASE_REQUIRED_KEYS.filter(k => !c[k]);
}
function getFirebaseEnvironmentSource(): string {
  if (process.env.CUSTOMER_FIREBASE_CONFIG_JSON) return 'CUSTOMER_FIREBASE_CONFIG_JSON (Biến môi trường JSON)';
  if (process.env.FIREBASE_WEB_CONFIG_JSON) return 'FIREBASE_WEB_CONFIG_JSON (Biến môi trường JSON)';
  if (process.env.FIREBASE_CONFIG_JSON) return 'FIREBASE_CONFIG_JSON (Biến môi trường JSON)';
  if (process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID) return 'FIREBASE_PROJECT_ID (Biến môi trường độc lập)';
  if (fs.existsSync(path.join(process.cwd(), 'firebase-applet-config.json'))) return 'firebase-applet-config.json (Tệp cấu hình môi trường)';
  if (fs.existsSync(FIREBASE_CONFIG_FILE)) return 'firebase_config.json (Tệp cấu hình cục bộ)';
  return 'Tự động nhận diện từ môi trường runtime';
}

function loadCustomerFirebaseConfig(): CustomerFirebaseConfig {
  try {
    // Environment is authoritative on Render/Railway/Cloud Run because the local data directory
    // can be ephemeral or contain an old customer config from an earlier deployment.
    const envRaw = String(process.env.CUSTOMER_FIREBASE_CONFIG_JSON || process.env.FIREBASE_WEB_CONFIG_JSON || process.env.FIREBASE_CONFIG_JSON || '').trim();
    if (envRaw) return normalizeFirebaseConfig(JSON.parse(envRaw));

    // Check individual environment variables
    const envProjectId = String(process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || '').trim();
    if (envProjectId) {
      return normalizeFirebaseConfig({
        projectId: envProjectId,
        apiKey: String(process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || 'auto-env-key').trim(),
        authDomain: String(process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN || `${envProjectId}.firebaseapp.com`).trim(),
        storageBucket: String(process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET || `${envProjectId}.appspot.com`).trim(),
        messagingSenderId: String(process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789').trim(),
        appId: String(process.env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID || `1:123456789:web:${envProjectId}`).trim(),
        measurementId: String(process.env.FIREBASE_MEASUREMENT_ID || process.env.VITE_FIREBASE_MEASUREMENT_ID || '').trim(),
      });
    }

    const bundledPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(bundledPath)) return normalizeFirebaseConfig(JSON.parse(fs.readFileSync(bundledPath, 'utf8')));

    if (fs.existsSync(FIREBASE_CONFIG_FILE)) return normalizeFirebaseConfig(decodeStoredJson(fs.readFileSync(FIREBASE_CONFIG_FILE, 'utf8')));
  } catch (error) {
    console.error('[Firebase Config] Không thể đọc cấu hình:', error);
  }
  return {} as CustomerFirebaseConfig;
}
function saveCustomerFirebaseConfig(config:CustomerFirebaseConfig) { writeJson(FIREBASE_CONFIG_FILE, config); }


const activeSessions = new Map<string, AdminSession>();
const previewSessions = new Map<string, PreviewSession>();
const ipSubmissionTimestamps = new Map<string, number[]>();
const ipLoginAttempts = new Map<string, number[]>();
setInterval(()=>{const now=Date.now();for(const [key,value] of activeSessions)if(value.expiresAt<now)activeSessions.delete(key);for(const [key,value] of previewSessions)if(value.expiresAt<now)previewSessions.delete(key);for(const map of [ipSubmissionTimestamps,ipLoginAttempts,ipAnalyticsTimestamps])for(const [key,value] of map)if(!value.some(timestamp=>now-timestamp<3600000))map.delete(key);},60000).unref();
const ipAnalyticsTimestamps = new Map<string, number[]>();
let cachedAdminToken: string | null = null;
let pagesDatabase: LandingPageRecord[] = [];
let leadsDatabase: LeadSubmission[] = [];
let auditLogsDatabase: AuditLogEntry[] = [];
let versionsDatabase: ConfigVersion[] = [];
let adminAccountsDatabase: StoredAdminAccount[] = [];
let analyticsDatabase: AnalyticsEvent[] = [];
let analyticsCostsDatabase: AnalyticsCampaignCost[] = [];
let chatSessionsDatabase: ChatSession[] = [];
let systemState: SystemState = { migrations: {} };
let cloudStartupBlocked = false;
// In production, Firestore must be the authoritative source before any public
// Landing Page is served. This prevents the local/default config from flashing
// during Render/Node startup before the remote published state is hydrated.
let cloudAuthoritativeReady = !IS_PRODUCTION_RUNTIME;

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const nowIso = () => new Date().toISOString();
const clientIp = trustedClientIp;

const cleanSlug = (value: string) => {
  const raw = String(value || '/').trim();
  if (raw === '/' || raw === '') return '/';
  const slug = raw.replace(/^https?:\/\/[^/]+/i, '').split(/[?#]/)[0].replace(/^\/+|\/+$/g, '');
  return `/${slug || ''}`;
};
const slugFromName = (name: string) => {
  const normalized = String(name || 'landing-page')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return cleanSlug(normalized || 'landing-page');
};

function writeJson(file: string, value: unknown) {
  const temp = `${file}.${process.pid}.tmp`;
  const payload = encodeStoredJson(value);
  fs.writeFileSync(temp, payload, { encoding: 'utf-8', mode: 0o600 });
  fs.renameSync(temp, file);
}
function readJson<T>(file: string, fallback: T): T {
  try { return fs.existsSync(file) ? decodeStoredJson(fs.readFileSync(file, 'utf-8')) : fallback; }
  catch (err) { console.error(`Cannot read ${file}:`, err); return fallback; }
}

function createBlankLandingConfig(name: string, slug: string): LandingPageConfig {
  const blank = clone(defaultLandingConfig);
  blank.published = false;
  blank.version = 1;
  blank.lastPublishedAt = undefined;
  blank.brandName = '';
  blank.brandLogoText = '';
  blank.brandLogoUrl = '';
  blank.headerLogoUrl = '';
  blank.footerLogoUrl = '';
  blank.mobileLogoUrl = '';
  blank.hotline = '';
  blank.hotlineDisplay = '';
  blank.headline = '';
  blank.subtitle = '';
  blank.heroBadge = '';
  blank.heroBenefits = [];
  blank.heroImage = '';
  blank.heroImageAlt = '';
  blank.heroImageBadgeText = '';
  blank.heroSocialProofEnabled = false;
  blank.heroRatingText = '';
  blank.heroSocialProofText = '';
  blank.heroSlides = [];
  blank.heroCtaPrimary = '';
  blank.heroCtaSecondary = '';
  blank.heroPrimaryCta = undefined;
  blank.heroSecondaryCta = undefined;
  blank.headerShowCta = false;
  blank.headerCtaText = '';
  blank.headerCtaUrl = '';
  blank.sections = [];
  blank.formFields = [];
  blank.formSettings = { ...blank.formSettings, title: '', subtitle: '' };
  blank.countdown = { ...blank.countdown, enabled: false, showBanner: false, title: '', urgencyBannerText: '', expiredMessage: '' };
  if (blank.footer) {
    blank.footer = { ...blank.footer, columns: [], socialLinks: {}, actionButtons: [], customContactButtons: [] } as any;
  }
  blank.websiteSettings = {
    ...blank.websiteSettings,
    header: { ...(blank.websiteSettings?.header || {}), cta: undefined, banner: { enabled: false, slides: [] } },
    seo: { ...(blank.websiteSettings?.seo || {}), pageTitle: name, slug, ogDescription: '' },
    navigation: {
      ...(blank.websiteSettings?.navigation || {}),
      enabled: true,
      type: 'main',
      sticky: true,
      smoothScroll: true,
      scrollSpy: true,
      items: [],
    },
  };
  return normalizeLandingConfig(blank);
}

// Bootstrap from the original single-page config without breaking backwards compatibility.
const rawConfig = readJson<any>(CONFIG_FILE, {});
const initialDraft = normalizeLandingConfig(rawConfig?.draft || rawConfig || defaultLandingConfig);
const initialPublished = normalizeLandingConfig(rawConfig?.published || rawConfig?.draft || rawConfig || defaultLandingConfig);

const rawPages = readJson<LandingPageRecord[]>(PAGES_FILE, []);
const hadPersistedPagesAtStartup = Array.isArray(rawPages) && rawPages.length > 0;
const hadLegacyConfigAtStartup = Array.isArray(rawConfig?.sections) || Array.isArray(rawConfig?.draft?.sections);
if (Array.isArray(rawPages) && rawPages.length) {
  pagesDatabase = rawPages.map((page) => ({
    ...page,
    slug: cleanSlug(page.slug),
    draft: normalizeLandingConfig(page.draft),
    publishedConfig: normalizeLandingConfig(page.publishedConfig || page.draft),
  }));
} else {
  pagesDatabase = [{
    id: 'page_home',
    name: initialDraft.websiteSettings?.seo?.pageTitle || initialDraft.brandName || 'Landing Page chính',
    slug: cleanSlug(initialDraft.websiteSettings?.seo?.slug || '/'),
    status: 'active',
    published: false,
    version: initialPublished.version || 1,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    lastPublishedAt: undefined,
    draft: initialDraft,
    publishedConfig: initialPublished,
  }];
  writeJson(PAGES_FILE, pagesDatabase);
}
leadsDatabase = readJson<LeadSubmission[]>(LEADS_FILE, []);
auditLogsDatabase = readJson<AuditLogEntry[]>(AUDIT_LOGS_FILE, []);
versionsDatabase = readJson<ConfigVersion[]>(VERSIONS_FILE, []);
systemState = readJson<SystemState>(SYSTEM_STATE_FILE, { migrations: {} });
systemState.migrations = systemState.migrations || {};

function cloneValue<T>(value: T): T { return clone(value); }
function getDefaultSharedNavigation(): NavigationSettings {
  return cloneValue(defaultLandingConfig.websiteSettings!.navigation!);
}
function getSharedFooterDraft(): FooterConfig {
  return cloneValue(systemState.sharedFooterDraft || getHomePage()?.draft?.footer || defaultLandingConfig.footer!);
}
function getSharedFooterPublished(): FooterConfig {
  return cloneValue(systemState.sharedFooterPublished || getHomePage()?.publishedConfig?.footer || getSharedFooterDraft());
}
function getSharedNavigationDraft(): NavigationSettings {
  return cloneValue(systemState.sharedNavigationDraft || getHomePage()?.draft?.websiteSettings?.navigation || getDefaultSharedNavigation());
}
function getSharedNavigationPublished(): NavigationSettings {
  return cloneValue(systemState.sharedNavigationPublished || getHomePage()?.publishedConfig?.websiteSettings?.navigation || getSharedNavigationDraft());
}
function stripSharedHeaderBanner(header:any): any {
  const out=cloneValue(header||{});
  if (out.header) delete out.header.banner;
  return out;
}
function getSharedHeaderDraft(): any {
  const home = getHomePage();
  const cfg = home?.draft || defaultLandingConfig;
  return stripSharedHeaderBanner(systemState.sharedHeaderDraft || {
    brandName: cfg.brandName || '',
    brandLogoText: cfg.brandLogoText || '',
    brandLogoUrl: cfg.brandLogoUrl || '',
    headerLogoUrl: cfg.headerLogoUrl || '',
    headerLogoHeight: cfg.headerLogoHeight,
    mobileLogoUrl: cfg.mobileLogoUrl || '',
    hotline: cfg.hotline || '',
    hotlineDisplay: cfg.hotlineDisplay || '',
    headerCtaText: cfg.headerCtaText || '',
    headerCtaUrl: cfg.headerCtaUrl || '',
    headerShowCta: cfg.headerShowCta,
    header: cloneValue(cfg.websiteSettings?.header || defaultLandingConfig.websiteSettings?.header || {}),
  });
}
function getSharedHeaderPublished(): any {
  return stripSharedHeaderBanner(systemState.sharedHeaderPublished || { ...getSharedHeaderDraft() });
}
function applySharedHeader(config: LandingPageConfig, header: any): LandingPageConfig {
  if (!header) return config;
  const pageBanner=cloneValue(config.websiteSettings?.header?.banner);
  config.brandName = header.brandName || '';
  config.brandLogoText = header.brandLogoText || '';
  config.brandLogoUrl = header.brandLogoUrl || '';
  config.headerLogoUrl = header.headerLogoUrl || '';
  config.headerLogoHeight = header.headerLogoHeight;
  config.mobileLogoUrl = header.mobileLogoUrl || '';
  config.hotline = header.hotline || '';
  config.hotlineDisplay = header.hotlineDisplay || '';
  config.headerCtaText = header.headerCtaText || '';
  config.headerCtaUrl = header.headerCtaUrl || '';
  config.headerShowCta = header.headerShowCta;
  config.websiteSettings = config.websiteSettings || cloneValue(defaultLandingConfig.websiteSettings!);
  config.websiteSettings.header = cloneValue(header.header || defaultLandingConfig.websiteSettings!.header);
  if (pageBanner !== undefined) config.websiteSettings.header.banner = pageBanner;
  return config;
}
function pageNavItemFromPage(page: LandingPageRecord, existing?: NavigationItem, order = 1): NavigationItem {
  const base = existing || ({ id: `page_nav_${page.id}`, label: page.name, order, enabled: true, action: { type: 'internal', target: page.slug } } as NavigationItem);
  return { ...base, id: existing?.id || `page_nav_${page.id}`, pageId: page.id, label: page.name, order, enabled: true, action: { ...(base.action || {}), type: 'internal', target: page.slug } };
}
function buildNavigationForPages(base: NavigationSettings, publishedOnly = false): NavigationSettings {
  const source = pagesDatabase.filter(p => p.id !== 'page_pricing' && !['/tinh-phi','/pricing'].includes(p.slug) && !p.deletedAt && p.status === 'active' && (!publishedOnly || p.published === true));
  const oldItems = (Array.isArray(base.items) ? base.items : []).filter((item:any) => item.id !== 'nav_pricing' && item.pageId !== 'page_pricing' && !['/tinh-phi','/pricing'].includes(String(item.action?.target || '').split('?')[0]));
  const byPage = new Map<string, NavigationItem>();
  oldItems.forEach((item: any) => { if (item.pageId) byPage.set(String(item.pageId), item); });
  const byTarget = new Map<string, NavigationItem>();
  oldItems.forEach((item: any) => { const t = String(item?.action?.target || ''); if (t) byTarget.set(cleanSlug(t), item); });
  const pageItems = source.map((page, index) => {
    const existing = byPage.get(page.id) || byTarget.get(cleanSlug(page.slug));
    return pageNavItemFromPage(page, existing, existing?.order || index + 1);
  });
  const items = pageItems.sort((a,b) => a.order - b.order).map((item,index) => ({ ...item, order:index+1 }));
  return { ...cloneValue(base), enabled:true, type:'main', items };
}
function configFavicon(config:any): string {
  return String(
    config?.websiteSettings?.seo?.faviconUrl ||
    config?.headerLogoUrl ||
    config?.brandLogoUrl ||
    config?.mobileLogoUrl ||
    config?.footerLogoUrl ||
    ''
  ).trim();
}
function homeSeo(published = true): any {
  const home = getHomePage();
  const config = published ? (home?.publishedConfig || home?.draft) : (home?.draft || home?.publishedConfig);
  const seo=cloneValue(config?.websiteSettings?.seo || {});
  return { ...seo, faviconUrl: seo?.faviconUrl || configFavicon(config) };
}
function seoWithGlobalFavicon(seo: any, published = true): any {
  const local = cloneValue(seo || {});
  const global = homeSeo(published);
  return { ...local, faviconUrl: local?.faviconUrl || global?.faviconUrl || '' };
}

function htmlEscape(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char] || char));
}
function publicBaseUrl(): string {
  return String(process.env.APP_PUBLIC_URL || '').replace(/\/+$/,'');
}
function canonicalUrl(pathname: string, explicit?: string): string {
  if (explicit && /^https:\/\//i.test(explicit)) return explicit;
  const base=publicBaseUrl();
  if (!base) return pathname;
  return `${base}${pathname==='/'?'':pathname}`;
}
function publicSeoForPath(pathname: string): any | null {
  const clean=cleanSlug(pathname || '/');
  const page=getPageBySlug(clean);
  if(!page || page.deletedAt || page.status!=='active' || page.published!==true || page.publishedConfig?.published===false) return null;
  const config=page.publishedConfig;
  const seo=seoWithGlobalFavicon(config.websiteSettings?.seo || {}, true);
  const title=seo.seoTitle || seo.pageTitle || page.name || config.brandName || 'Landing Page';
  const description=seo.metaDescription || config.subtitle || config.heroSubtitle || '';
  return { ...seo, pageTitle:seo.pageTitle||page.name, seoTitle:title, metaDescription:description, canonical:canonicalUrl(page.slug,seo.canonical), faviconVersion: page.lastPublishedAt || page.version || 1 };
}
function safeStructuredData(raw?: string): string {
  if(!raw) return '';
  try { return JSON.stringify(JSON.parse(raw)).replace(/</g,'\\u003c'); } catch { return ''; }
}
function injectPublicSeo(indexHtml: string, pathname: string): string {
  const seo=publicSeoForPath(pathname);
  if(!seo) return indexHtml;
  const title=seo.seoTitle || seo.pageTitle || 'Landing Page';
  const description=seo.metaDescription || '';
  const canonical=seo.canonical || canonicalUrl(pathname);
  // v1.0.49: a stable endpoint serves public/favicon.ico first. Firestore/CMS
  // favicon is only a fallback inside that endpoint when no static file exists.
  const faviconHref = `/favicon.ico?cms_favicon_v=${encodeURIComponent(String(seo.faviconVersion || 'static'))}`;
  const ogTitle=seo.ogTitle || title;
  const ogDescription=seo.ogDescription || description;
  const ogImage=seo.ogImage || '';
  const twitterTitle=seo.twitterTitle || ogTitle;
  const twitterDescription=seo.twitterDescription || ogDescription;
  const twitterImage=seo.twitterImage || ogImage;
  let html=indexHtml
    .replace(/<title>[\s\S]*?<\/title>/i,'')
    .replace(/<meta\s+(?:name|property)=["'](?:description|keywords|robots|og:title|og:description|og:image|og:type|og:site_name|og:url|twitter:card|twitter:title|twitter:description|twitter:image)["'][^>]*>\s*/gi,'')
    .replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi,'')
    .replace(/<link\s+[^>]*rel=["'](?:shortcut icon|icon|apple-touch-icon)["'][^>]*>\s*/gi,'');
  const tags=[
    `<title>${htmlEscape(title)}</title>`,
    description?`<meta name="description" content="${htmlEscape(description)}">`:'',
    seo.keywords?`<meta name="keywords" content="${htmlEscape(seo.keywords)}">`:'',
    `<meta name="robots" content="${htmlEscape(seo.robots||'index,follow')}">`,
    canonical?`<link rel="canonical" href="${htmlEscape(canonical)}">`:'',
    `<meta property="og:title" content="${htmlEscape(ogTitle)}">`,
    ogDescription?`<meta property="og:description" content="${htmlEscape(ogDescription)}">`:'',
    ogImage?`<meta property="og:image" content="${htmlEscape(ogImage)}">`:'',
    `<meta property="og:type" content="${htmlEscape(seo.ogType||'website')}">`,
    seo.ogSiteName?`<meta property="og:site_name" content="${htmlEscape(seo.ogSiteName)}">`:'',
    canonical?`<meta property="og:url" content="${htmlEscape(canonical)}">`:'',
    `<meta name="twitter:card" content="${htmlEscape(seo.twitterCard||'summary_large_image')}">`,
    `<meta name="twitter:title" content="${htmlEscape(twitterTitle)}">`,
    twitterDescription?`<meta name="twitter:description" content="${htmlEscape(twitterDescription)}">`:'',
    twitterImage?`<meta name="twitter:image" content="${htmlEscape(twitterImage)}">`:'',
    faviconHref && (/^(?:https:\/\/|\/|data:image\/)/i.test(faviconHref))?`<link rel="icon" data-cms-favicon="true" href="${htmlEscape(faviconHref)}">`:'',
    faviconHref && (/^(?:https:\/\/|\/|data:image\/)/i.test(faviconHref))?`<link rel="shortcut icon" data-cms-favicon="true" href="${htmlEscape(faviconHref)}">`:'',
    safeStructuredData(seo.structuredDataJson)?`<script type="application/ld+json" data-cms-ldjson="true">${safeStructuredData(seo.structuredDataJson)}</script>`:'',
  ].filter(Boolean).join('\n    ');
  return html.replace('</head>',`    ${tags}\n  </head>`);
}

function enforceSharedSiteConfig() {
  // One-time migration: banners are page-scoped. Older builds accidentally copied the Home banner
  // into every Category Page through the shared Header. Clear only the duplicated legacy banner;
  // intentionally unique page banners are preserved.
  if (!systemState.migrations?.categoryPageBannersPerPage) {
    const home = getHomePage();
    const homeBanner = cloneValue(home?.draft?.websiteSettings?.header?.banner);
    for (const page of pagesDatabase) {
      if (!page || page.id === home?.id) continue;
      const pageBanner = page.draft?.websiteSettings?.header?.banner;
      if (homeBanner && JSON.stringify(pageBanner || null) === JSON.stringify(homeBanner || null)) {
        page.draft.websiteSettings = page.draft.websiteSettings || cloneValue(defaultLandingConfig.websiteSettings!);
        page.publishedConfig = page.publishedConfig || cloneValue(page.draft);
        page.publishedConfig.websiteSettings = page.publishedConfig.websiteSettings || cloneValue(defaultLandingConfig.websiteSettings!);
        page.draft.websiteSettings.header = page.draft.websiteSettings.header || {};
        page.publishedConfig.websiteSettings.header = page.publishedConfig.websiteSettings.header || {};
        page.draft.websiteSettings.header.banner = { enabled:false, slides:[] };
        page.publishedConfig.websiteSettings.header.banner = { enabled:false, slides:[] };
      }
    }
    systemState.migrations = { ...(systemState.migrations || {}), categoryPageBannersPerPage:true };
  }
  const draftFooter = getSharedFooterDraft();
  const publishedFooter = getSharedFooterPublished();
  const draftNav = buildNavigationForPages(getSharedNavigationDraft(), false);
  const publishedNav = buildNavigationForPages(getSharedNavigationPublished(), true);
  systemState.sharedFooterDraft = cloneValue(draftFooter);
  systemState.sharedFooterPublished = cloneValue(publishedFooter);
  systemState.sharedNavigationDraft = cloneValue(draftNav);
  systemState.sharedNavigationPublished = cloneValue(publishedNav);
  const draftHeader = getSharedHeaderDraft();
  const publishedHeader = getSharedHeaderPublished();
  systemState.sharedHeaderDraft = cloneValue(draftHeader);
  systemState.sharedHeaderPublished = cloneValue(publishedHeader);
  for (const page of pagesDatabase) {
    page.draft = normalizeLandingConfig(page.draft);
    page.publishedConfig = normalizeLandingConfig(page.publishedConfig || page.draft);
    applySharedHeader(page.draft, draftHeader);
    applySharedHeader(page.publishedConfig, publishedHeader);
    page.draft.footer = cloneValue(draftFooter);
    page.publishedConfig.footer = cloneValue(publishedFooter);
    page.draft.websiteSettings = page.draft.websiteSettings || cloneValue(defaultLandingConfig.websiteSettings!);
    page.publishedConfig.websiteSettings = page.publishedConfig.websiteSettings || cloneValue(defaultLandingConfig.websiteSettings!);
    page.draft.websiteSettings.navigation = cloneValue(draftNav);
    page.publishedConfig.websiteSettings.navigation = cloneValue(publishedNav);
  }
}

adminAccountsDatabase = readJson<StoredAdminAccount[]>(ADMIN_USERS_FILE, []);
analyticsDatabase = readJson<AnalyticsEvent[]>(ANALYTICS_FILE, []);
analyticsCostsDatabase = readJson<AnalyticsCampaignCost[]>(ANALYTICS_COSTS_FILE, []);
// Active chat transcripts are never restored from local disk or Firestore. Redis
// supplies only an encrypted 8-hour active-session window and is hydrated lazily.
chatSessionsDatabase = [];

// Shared site shell: Category Bar is the page switcher; Footer is global and identical across pages.
enforceSharedSiteConfig();

if (!auditLogsDatabase.length) {
  auditLogsDatabase = [{
    id: 'log_init', timestamp: nowIso(), action: 'CONFIG_PUBLISH', actorEmail: 'system@baoviet.internal', actorRole: 'system',
    ipAddress: '127.0.0.1', details: 'Khởi tạo Advanced Customization CMS', status: 'success',
  }];
}
if (!versionsDatabase.length) {
  const home = pagesDatabase[0];
  versionsDatabase = [{
    id: 'ver_init_1', pageId: home.id, pageName: home.name, versionNumber: home.version || 1,
    timestamp: nowIso(), author: 'Hệ thống', note: 'Phiên bản khởi tạo', changeSummary: ['Khởi tạo Landing Page'], config: clone(home.publishedConfig),
  }];
}

function getHomePage() {
  return pagesDatabase.find((p) => p.id === 'page_home' && !p.deletedAt) || pagesDatabase.find((p) => !p.deletedAt) || pagesDatabase[0];
}
function getPageById(id?: string | null) {
  const raw = String(id || '').trim();
  if (!raw || raw === 'home' || raw === 'page_home' || raw === '/') return getHomePage();
  return pagesDatabase.find((p) => p.id === raw);
}
function getPageBySlug(slug?: string | null) {
  const normalized = cleanSlug(slug || '/');
  if (['/tinh-phi','/pricing'].includes(normalized)) return undefined;
  return pagesDatabase.find((p) => p.id !== 'page_pricing' && !p.deletedAt && p.status === 'active' && cleanSlug(p.slug) === normalized) || (normalized === '/' ? getHomePage() : undefined);
}
function syncLegacyConfigFile() {
  const home = getHomePage();
  if (home) writeJson(CONFIG_FILE, { draft: home.draft, published: home.publishedConfig });
}
let cloudSyncTimer: NodeJS.Timeout | null = null;
let analyticsCloudSyncTimer: NodeJS.Timeout | null = null;
let cloudSyncInFlight: Promise<void> = Promise.resolve();
let lastAnalyticsCloudSyncAt = 0;
let pendingAnalyticsEvents: AnalyticsEvent[] = [];
let analyticsCloudReplacePending = false;
const pendingCloudCollections = new Set<'pages'|'leads'|'adminAccounts'|'auditLogs'|'versions'|'analytics'|'analyticsCosts'|'aiKnowledge'|'aiTaxonomy'|'aiTraining'|'chatSessions'|'settings'>();
function cloudSnapshot() {
  const aiTraining = clone(getAiTrainingConfig());
  delete aiTraining.geminiApiKey;
  return {
    pages: clone(pagesDatabase),
    leads: clone(leadsDatabase),
    adminAccounts: clone(adminAccountsDatabase),
    auditLogs: clone(auditLogsDatabase),
    versions: clone(versionsDatabase),
    analytics: clone(analyticsDatabase),
    analyticsCosts: clone(analyticsCostsDatabase),
    aiKnowledge: clone(getKnowledgeDatabase()),
    aiTaxonomy: clone(getTaxonomyData()),
    aiTraining,
    // Step 20: chatSessions are intentionally excluded from persistent cloud snapshots.
    chatSessions: [],
    systemState: clone(systemState),
    firebaseConfig: loadCustomerFirebaseConfig(),
  };
}

type LkgSlot = 'current' | 'previous';
type LkgEnvelope = {
  format: 'baoviet-last-known-good';
  schemaVersion: 1;
  createdAt: string;
  reason: string;
  checksum: string;
  state: {
    pages: LandingPageRecord[];
    versions: ConfigVersion[];
    aiKnowledge: KnowledgeItem[];
    aiTaxonomy: any;
    aiTraining: any;
    systemState: SystemState;
  };
};

const LKG_SENSITIVE_KEY = /(password|secret|token|api.?key|private.?key|service.?account|credential|webhook)/i;
function sanitizeForLkg(value: any): any {
  if (Array.isArray(value)) return value.map(sanitizeForLkg);
  if (!value || typeof value !== 'object') return value;
  const out: any = {};
  for (const [key, child] of Object.entries(value)) {
    if (LKG_SENSITIVE_KEY.test(key)) continue;
    out[key] = sanitizeForLkg(child);
  }
  return out;
}
function lkgStateSnapshot(): LkgEnvelope['state'] {
  const aiTraining = clone(getAiTrainingConfig()) as any;
  delete aiTraining.geminiApiKey;
  return sanitizeForLkg({
    pages: clone(pagesDatabase),
    versions: clone(versionsDatabase.slice(-300)),
    aiKnowledge: clone(getKnowledgeDatabase()),
    aiTaxonomy: clone(getTaxonomyData()),
    aiTraining,
    systemState: clone(systemState),
  });
}
function lkgDigestBase(envelope: Omit<LkgEnvelope, 'checksum'>) {
  // Checksum represents the durable CMS state, not the timestamp/reason metadata.
  // This prevents autosave from rotating current -> previous when nothing changed.
  return JSON.stringify({ schemaVersion: envelope.schemaVersion, state: envelope.state });
}
function lkgChecksum(envelope: Omit<LkgEnvelope, 'checksum'>) {
  return crypto.createHash('sha256').update(lkgDigestBase(envelope)).digest('hex');
}
function readLkgFile(file: string): LkgEnvelope | null {
  try {
    if (!fs.existsSync(file)) return null;
    const parsed = decodeStoredJson(fs.readFileSync(file, 'utf8')) as LkgEnvelope;
    if (parsed?.format !== 'baoviet-last-known-good' || parsed?.schemaVersion !== 1 || !parsed?.state) return null;
    const { checksum, ...base } = parsed;
    if (!checksum || lkgChecksum(base) !== checksum) return null;
    if (!Array.isArray(parsed.state.pages) || parsed.state.pages.length === 0) return null;
    if (!Array.isArray(parsed.state.aiKnowledge)) return null;
    return parsed;
  } catch (error: any) {
    console.warn(`[LKG] Không đọc được ${path.basename(file)}: ${error?.message || error}`);
    return null;
  }
}
function lkgMeta(snapshot: LkgEnvelope | null) {
  if (!snapshot) return null;
  return {
    createdAt: snapshot.createdAt,
    reason: snapshot.reason,
    checksum: snapshot.checksum,
    pages: snapshot.state.pages.length,
    knowledgeItems: snapshot.state.aiKnowledge.length,
    products: Array.isArray(snapshot.state.aiTaxonomy?.products) ? snapshot.state.aiTaxonomy.products.length : 0,
  };
}
function writeLkgManifest() {
  writeJson(LKG_MANIFEST_FILE, {
    format: 'baoviet-lkg-manifest',
    schemaVersion: 1,
    updatedAt: nowIso(),
    directory: LKG_DIR,
    current: lkgMeta(readLkgFile(LKG_CURRENT_FILE)),
    previous: lkgMeta(readLkgFile(LKG_PREVIOUS_FILE)),
  });
}
let lkgSnapshotTimer: NodeJS.Timeout | null = null;
let lkgRestoreInProgress = false;
let lastLkgChecksum = readLkgFile(LKG_CURRENT_FILE)?.checksum || '';
function createLkgSnapshot(reason = 'cms-save'): { created: boolean; checksum?: string; file?: string } {
  if (lkgRestoreInProgress) return { created: false };
  const base: Omit<LkgEnvelope, 'checksum'> = {
    format: 'baoviet-last-known-good',
    schemaVersion: 1,
    createdAt: nowIso(),
    reason,
    state: lkgStateSnapshot(),
  };
  const checksum = lkgChecksum(base);
  if (checksum === lastLkgChecksum && fs.existsSync(LKG_CURRENT_FILE)) return { created: false, checksum, file: LKG_CURRENT_FILE };
  const envelope: LkgEnvelope = { ...base, checksum };
  try {
    const current = readLkgFile(LKG_CURRENT_FILE);
    if (current) writeJson(LKG_PREVIOUS_FILE, current);
    writeJson(LKG_CURRENT_FILE, envelope);
    lastLkgChecksum = checksum;
    writeLkgManifest();
    console.log(`[LKG] Snapshot OK (${reason}) ${checksum.slice(0,12)}… -> ${LKG_CURRENT_FILE}`);
    return { created: true, checksum, file: LKG_CURRENT_FILE };
  } catch (error: any) {
    console.error(`[LKG] Không thể tạo snapshot: ${error?.message || error}`);
    return { created: false };
  }
}
function scheduleLkgSnapshot(reason = 'cms-save') {
  if (lkgRestoreInProgress) return;
  if (lkgSnapshotTimer) clearTimeout(lkgSnapshotTimer);
  lkgSnapshotTimer = setTimeout(() => {
    lkgSnapshotTimer = null;
    createLkgSnapshot(reason);
  }, 900);
}
function applyLkgSnapshot(snapshot: LkgEnvelope, persist = true) {
  lkgRestoreInProgress = true;
  try {
    pagesDatabase = snapshot.state.pages.map((page: any) => ({
      ...page,
      slug: cleanSlug(page.slug),
      draft: normalizeLandingConfig(page.draft),
      publishedConfig: normalizeLandingConfig(page.publishedConfig || page.draft),
    }));
    versionsDatabase = Array.isArray(snapshot.state.versions) ? clone(snapshot.state.versions) : [];
    replaceKnowledgeDatabase(Array.isArray(snapshot.state.aiKnowledge) ? clone(snapshot.state.aiKnowledge) : []);
    replaceTaxonomyData(snapshot.state.aiTaxonomy && typeof snapshot.state.aiTaxonomy === 'object' ? clone(snapshot.state.aiTaxonomy) : { products: [], categories: [], componentTypes: [] });
    replaceAiTrainingConfig(snapshot.state.aiTraining && typeof snapshot.state.aiTraining === 'object' ? clone(snapshot.state.aiTraining) : {});
    systemState = snapshot.state.systemState && typeof snapshot.state.systemState === 'object' ? clone(snapshot.state.systemState) : { migrations: {} };
    enforceSharedSiteConfig();
    if (persist) {
      savePagesToDisk(false);
      writeJson(VERSIONS_FILE, versionsDatabase.slice(-300));
      saveKnowledgeDatabase(getKnowledgeDatabase());
      writeJson(SYSTEM_STATE_FILE, systemState);
    }
  } finally {
    lkgRestoreInProgress = false;
  }
}
function jsonFileHealthy(file: string, kind: 'array' | 'object', requireNonEmpty = false) {
  try {
    if (!fs.existsSync(file)) return false;
    const parsed = decodeStoredJson(fs.readFileSync(file, 'utf8'));
    if (kind === 'array') return Array.isArray(parsed) && (!requireNonEmpty || parsed.length > 0);
    return !!parsed && typeof parsed === 'object' && !Array.isArray(parsed);
  } catch { return false; }
}
function recoverFromLkgIfLocalStateInvalid(): { restored: boolean; slot?: LkgSlot; reason?: string } {
  const knowledgeHealth = getKnowledgePersistenceHealth();
  const localHealthy = jsonFileHealthy(PAGES_FILE, 'array', true)
    && knowledgeHealth.knowledge === 'ok'
    && knowledgeHealth.taxonomy === 'ok'
    && knowledgeHealth.training === 'ok';
  if (localHealthy) return { restored: false };
  const current = readLkgFile(LKG_CURRENT_FILE);
  const previous = readLkgFile(LKG_PREVIOUS_FILE);
  const chosen = current || previous;
  if (!chosen) return { restored: false, reason: 'no-valid-snapshot' };
  const slot: LkgSlot = current ? 'current' : 'previous';
  applyLkgSnapshot(chosen, true);
  console.warn(`[LKG] Local state không hợp lệ; đã khôi phục ${slot} snapshot (${chosen.createdAt}).`);
  return { restored: true, slot, reason: 'local-state-invalid' };
}

setKnowledgeCloudPersistenceHook(() => scheduleCloudSync('aiKnowledge','aiTaxonomy','aiTraining'));
setKnowledgeLocalPersistenceHook(() => scheduleLkgSnapshot('knowledge-save'));
function scheduleCloudSync(...collections: Array<'pages'|'leads'|'adminAccounts'|'auditLogs'|'versions'|'analytics'|'analyticsCosts'|'aiKnowledge'|'aiTaxonomy'|'aiTraining'|'chatSessions'|'settings'>) {
  if (!getCloudPersistenceStatus().ready) return;
  collections.forEach((name) => pendingCloudCollections.add(name));
  const onlyAnalytics = collections.length === 1 && collections[0] === 'analytics';

  // Analytics is high-volume and non-authoritative. Queue events locally and append
  // one batch document to Firestore at most every 5 minutes. Never use a realtime
  // listener and never rewrite the entire analytics history for each event.
  if (onlyAnalytics) {
    if (analyticsCloudSyncTimer) return;
    analyticsCloudSyncTimer = setTimeout(() => {
      analyticsCloudSyncTimer = null;
      if (!getCloudPersistenceStatus().ready) return;
      const replace = analyticsCloudReplacePending;
      const batch = pendingAnalyticsEvents.splice(0, pendingAnalyticsEvents.length);
      analyticsCloudReplacePending = false;
      pendingCloudCollections.delete('analytics');
      lastAnalyticsCloudSyncAt = Date.now();

      if (replace) {
        cloudSyncInFlight = saveCloudState(cloudSnapshot(), ['analytics']).catch((error) => {
          analyticsCloudReplacePending = true;
          console.error('[Cloud Persistence] scheduled analytics replace failed:', error);
        });
      } else if (batch.length) {
        cloudSyncInFlight = appendAnalyticsBatch(batch).catch((error) => {
          pendingAnalyticsEvents = batch.concat(pendingAnalyticsEvents);
          console.error('[Cloud Persistence] scheduled analytics batch failed:', error);
        });
      }
    }, 5 * 60 * 1000);
    return;
  }

  if (cloudSyncTimer) clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(() => {
    cloudSyncTimer = null;
    const dirty = Array.from(pendingCloudCollections);
    pendingCloudCollections.clear();
    const includeAnalytics = dirty.includes('analytics');
    const nonAnalyticsDirty = dirty.filter((name) => name !== 'analytics');
    if (includeAnalytics && analyticsCloudReplacePending) {
      cloudSyncInFlight = saveCloudState(cloudSnapshot(), ['analytics', ...nonAnalyticsDirty]).catch((error) => {
        analyticsCloudReplacePending = true;
        console.error('[Cloud Persistence] scheduled cloud replace failed:', error);
      });
      pendingAnalyticsEvents = [];
      analyticsCloudReplacePending = false;
    } else {
      cloudSyncInFlight = saveCloudState(cloudSnapshot(), nonAnalyticsDirty).catch((error) => {
        console.error('[Cloud Persistence] scheduled sync failed:', error);
      });
      if (includeAnalytics && pendingAnalyticsEvents.length) {
        const batch = pendingAnalyticsEvents.splice(0, pendingAnalyticsEvents.length);
        cloudSyncInFlight = cloudSyncInFlight.then(() => appendAnalyticsBatch(batch)).catch((error) => {
          pendingAnalyticsEvents = batch.concat(pendingAnalyticsEvents);
          console.error('[Cloud Persistence] scheduled analytics batch failed:', error);
        });
      }
    }
  }, 350);
}

async function flushScheduledCloudSync(): Promise<boolean> {
  try {
    if (cloudSyncTimer) {
      clearTimeout(cloudSyncTimer);
      cloudSyncTimer = null;
      const dirty = Array.from(pendingCloudCollections);
      pendingCloudCollections.clear();
      const includeAnalytics = dirty.includes('analytics');
      const nonAnalyticsDirty = dirty.filter((name) => name !== 'analytics');
      if (includeAnalytics && analyticsCloudReplacePending) {
        analyticsCloudReplacePending = false;
        pendingAnalyticsEvents = [];
        cloudSyncInFlight = saveCloudState(cloudSnapshot(), ['analytics', ...nonAnalyticsDirty]);
      } else {
        cloudSyncInFlight = saveCloudState(cloudSnapshot(), nonAnalyticsDirty);
        if (includeAnalytics && pendingAnalyticsEvents.length) {
          const batch = pendingAnalyticsEvents.splice(0, pendingAnalyticsEvents.length);
          cloudSyncInFlight = cloudSyncInFlight.then(() => appendAnalyticsBatch(batch)).catch((error) => {
            pendingAnalyticsEvents = batch.concat(pendingAnalyticsEvents);
            throw error;
          });
        }
      }
    } else if (analyticsCloudSyncTimer && pendingCloudCollections.has('analytics')) {
      clearTimeout(analyticsCloudSyncTimer);
      analyticsCloudSyncTimer = null;
      pendingCloudCollections.delete('analytics');
      lastAnalyticsCloudSyncAt = Date.now();
      const replace = analyticsCloudReplacePending;
      const batch = pendingAnalyticsEvents.splice(0, pendingAnalyticsEvents.length);
      analyticsCloudReplacePending = false;
      if (replace) {
        cloudSyncInFlight = saveCloudState(cloudSnapshot(), ['analytics']);
      } else if (batch.length) {
        cloudSyncInFlight = appendAnalyticsBatch(batch).catch((error) => {
          pendingAnalyticsEvents = batch.concat(pendingAnalyticsEvents);
          throw error;
        });
      }
    }
    await cloudSyncInFlight;
    await flushCloudPersistence();
    return getCloudPersistenceStatus().ready;
  } catch (error: any) {
    console.error('[Cloud Persistence] immediate sync failed:', error);
    return false;
  }
}
function savePagesToDisk(triggerCloudSync = false) {
  // Local disk is the immediate durable fallback; Firestore remains the cloud authority
  // once the sync is confirmed.
  try {
    writeJson(PAGES_FILE, pagesDatabase);
    syncLegacyConfigFile();
    scheduleLkgSnapshot('pages-save');
  } catch (error) {
    console.error('[Local Persistence] Không thể lưu Landing Page config:', error);
  }
  if (triggerCloudSync) {
    scheduleCloudSync('pages','settings');
  }
}
async function persistPageEditorChange(
  res: express.Response,
  previousPages: LandingPageRecord[],
  previousSettings: SystemState,
  write: () => Promise<void>,
): Promise<boolean> {
  try {
    if (canAcceptCloudWrite()) await write();
    else if (IS_PRODUCTION_RUNTIME) throw new Error('Firestore chưa sẵn sàng.');
    else scheduleCloudSync('pages', 'settings');
    return true;
  } catch (error: any) {
    pagesDatabase = previousPages;
    systemState = previousSettings;
    writeJson(SYSTEM_STATE_FILE, systemState);
    savePagesToDisk();
    console.error('[Cloud Persistence] Page editor write failed:', error?.message || error);
    const cloudTimedOut = String(error?.code || '') === 'LOCAL_CLOUD_TIMEOUT';
    res.status(cloudTimedOut ? 504 : 503).json({
      error: cloudTimedOut
        ? 'Firestore phản hồi chậm nên thay đổi chưa được xác nhận. Cloud vẫn được giữ kết nối và hệ thống sẽ tự đối chiếu lại; vui lòng chờ rồi tải lại trước khi sửa tiếp.'
        : 'Không thể ghi thay đổi trang lên Firestore. Thay đổi chưa được lưu.',
      code: cloudTimedOut ? 'CLOUD_WRITE_TIMEOUT' : 'CLOUD_WRITE_FAILED',
    });
    return false;
  }
}
function saveLeadsToDisk() { try { writeJson(LEADS_FILE, leadsDatabase); } catch (error) { console.error('[Local Persistence] Không thể lưu leads:', error); } scheduleCloudSync('leads'); }
function saveAuditLogsToDisk() { auditLogsDatabase = auditLogsDatabase.slice(0, 2000); }
function saveVersionsToDisk() { versionsDatabase = versionsDatabase.slice(0, 300); scheduleCloudSync('versions'); }
function saveAdminAccountsToDisk() { scheduleCloudSync('adminAccounts'); }
function saveAnalyticsToDisk(newEvents: AnalyticsEvent[] = [], replaceCloud = false) {
  analyticsDatabase = analyticsDatabase.slice(-100000);
  if (newEvents.length) pendingAnalyticsEvents.push(...newEvents);
  if (replaceCloud) {
    analyticsCloudReplacePending = true;
    pendingAnalyticsEvents = [];
  }
  scheduleCloudSync('analytics');
}
function saveAnalyticsCostsToDisk() { scheduleCloudSync('analyticsCosts'); }
let chatSessionsLastRedisHydrateAt = 0;
function mergeChatSessionIntoMemory(incoming: ChatSession): ChatSession {
  const existingIndex = chatSessionsDatabase.findIndex((item) => item.id === incoming.id);
  if (existingIndex >= 0) {
    const existing = chatSessionsDatabase[existingIndex];
    const existingTime = new Date(existing.updatedAt || 0).getTime();
    const incomingTime = new Date(incoming.updatedAt || 0).getTime();
    if (incomingTime > existingTime) chatSessionsDatabase[existingIndex] = incoming;
    return chatSessionsDatabase[existingIndex];
  }
  chatSessionsDatabase.unshift(incoming);
  chatSessionsDatabase = chatSessionsDatabase.slice(0, 100);
  return incoming;
}
async function hydrateChatSessionsFromRedis(force = false) {
  // Periodic refresh lets CMS staff on one replica see sessions created on another.
  if (!force && Date.now() - chatSessionsLastRedisHydrateAt < 15000) return;
  const sessions = await readRedisChatSessions(100);
  for (const raw of sessions) {
    if (raw?.id && Array.isArray(raw.messages)) mergeChatSessionIntoMemory(raw as ChatSession);
  }
  chatSessionsDatabase.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  chatSessionsDatabase = chatSessionsDatabase.slice(0, 100);
  chatSessionsLastRedisHydrateAt = Date.now();
}
async function findChatSession(sessionId: string): Promise<ChatSession | undefined> {
  if (!sessionId) return undefined;
  // Prefer the shared Redis copy so staff takeover/state updates performed on a
  // different Node replica are observed immediately. Redis outages fall back to RAM.
  const redisSession = await readRedisChatSession(sessionId);
  if (redisSession?.id && Array.isArray(redisSession.messages)) return mergeChatSessionIntoMemory(redisSession as ChatSession);
  return chatSessionsDatabase.find((item) => item.id === sessionId);
}
async function saveChatSessionsToDisk(changedSession?: ChatSession) {
  // Step 20 privacy model: never write public chat transcripts to disk/Firestore.
  // Redis now keeps only an encrypted, short-lived 8-hour active-session window;
  // RAM remains the hot cache/fallback when Redis is unavailable.
  chatSessionsDatabase = chatSessionsDatabase.slice(0, 100);
  for (const session of chatSessionsDatabase) session.messages = session.messages.slice(-20);
  if (changedSession) await writeRedisChatSession(changedSession);
}
function normalizeUsername(v:any){ return String(v||'').trim().toLowerCase().replace(/\s+/g,''); }
function passwordDigest(password:string,salt:string,strong=false){ return crypto.scryptSync(password,salt,64,strong?{N:32768,r:8,p:3,maxmem:64*1024*1024}:{}).toString('hex'); }
function passwordOk(password:string, account:StoredAdminAccount){ try{ const strong=account.passwordHash.startsWith('scrypt-v2:');const a=Buffer.from(account.passwordHash.replace(/^scrypt-v2:/,''),'hex'); const b=Buffer.from(passwordDigest(password,account.passwordSalt,strong),'hex'); return a.length===b.length && crypto.timingSafeEqual(a,b); }catch{return false;} }
function newPasswordData(password:string){ const salt=crypto.randomBytes(16).toString('hex'); return {passwordSalt:salt,passwordHash:'scrypt-v2:'+passwordDigest(password,salt,true)}; }
function publicAdminAccount(a:StoredAdminAccount){ const {passwordHash,passwordSalt,...safe}=a; return safe; }
function validPassword(v:string){ return v.length>=10 && /[A-Za-z]/.test(v) && /\d/.test(v); }

// Default local Super Admin + one-time credential migration.
// Runs AFTER Cloud restore so a persistent Firestore account is never overwritten by
// the local bootstrap data on a server restart.
const DEFAULT_ADMIN_MIGRATION = 'secure-bootstrap-v1';
function ensureDefaultAdminMigration() {
  if (String(process.env.CMS_SETUP_TOKEN || "").length >= 32 && adminAccountsDatabase.length === 0) return;
  // Disable the previously shipped public default credential; provision a unique backend password.
  for(const account of adminAccountsDatabase){if(account.username==='letrungnhan0410' && passwordOk('letrungnhan0410',account)){const replacement=String(process.env.CMS_BOOTSTRAP_ADMIN_PASSWORD||'');if(validPassword(replacement) && replacement!=='letrungnhan0410')Object.assign(account,newPasswordData(replacement));else account.enabled=false;saveAdminAccountsToDisk();}}
  if (!systemState.migrations?.[DEFAULT_ADMIN_MIGRATION]) {
    const username = normalizeUsername(process.env.CMS_BOOTSTRAP_ADMIN_USERNAME);
    const password = String(process.env.CMS_BOOTSTRAP_ADMIN_PASSWORD || '');
    if (username && validPassword(password)) {
      let account = adminAccountsDatabase.find((a) => a.username === username);
      // Never reset an existing account just because a migration marker is absent.
      if (account) { systemState.migrations![DEFAULT_ADMIN_MIGRATION] = true; return; }
      const pd = newPasswordData(password);
      if (account) {
        account.passwordSalt = pd.passwordSalt;
        account.passwordHash = pd.passwordHash;
        account.role = 'superadmin';
        account.enabled = true;
        account.updatedAt = nowIso();
        if (!account.displayName) account.displayName = 'Super Admin';
      } else {
        account = {
          id: `admin_${crypto.randomBytes(6).toString('hex')}`,
          username,
          email: String(process.env.CMS_BOOTSTRAP_ADMIN_EMAIL || ''),
          displayName: String(process.env.CMS_BOOTSTRAP_ADMIN_NAME || 'Super Admin'),
          role: 'superadmin',
          enabled: true,
          ...pd,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        adminAccountsDatabase.push(account);
      }
      saveAdminAccountsToDisk();
      systemState.migrations![DEFAULT_ADMIN_MIGRATION] = true;
      writeJson(SYSTEM_STATE_FILE, systemState);
      scheduleCloudSync('settings');
    }
  }
}

function sanitizeString(value: any): string {
  if (typeof value !== 'string') return '';
  return value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript\s*:/gi, '').trim();
}
function sanitizeConfig(input: LandingPageConfig): LandingPageConfig {
  const c = normalizeLandingConfig(input);
  if(c.googleSheets)c.googleSheets.webhookUrl=String(c.googleSheets.webhookUrl || '').trim();
  c.brandName = sanitizeString(c.brandName);
  c.headline = sanitizeString(c.headline);
  c.subtitle = sanitizeString(c.subtitle);
  c.sections = c.sections.map((s) => ({
    ...s,
    internalName: sanitizeString(s.internalName || s.title), anchorId: sanitizeString(s.anchorId || `section-${s.id}`).replace(/^#/, ''),
    title: sanitizeString(s.title), subtitle: sanitizeString(s.subtitle), content: s.content ? sanitizeString(s.content) : s.content, overlayText: s.overlayText ? sanitizeString(s.overlayText) : s.overlayText,
    items: (s.items || []).map((i) => ({ ...i, title: sanitizeString(i.title), description: sanitizeString(i.description), tag: i.tag ? sanitizeString(i.tag) : i.tag })),
  }));
  return c;
}
function safePublicConfig(config: LandingPageConfig): LandingPageConfig {
  return {
    ...clone(config),
    adminLoginSettings: {...config.adminLoginSettings, showQuickAdmin: !IS_PRODUCTION_RUNTIME && process.env.CMS_ALLOW_DEV_BYPASS==='true' && config.adminLoginSettings?.showQuickAdmin !== false},
    googleSheets: {
      spreadsheetId: config.googleSheets?.spreadsheetId ? 'configured' : '',
      sheetName: config.googleSheets?.sheetName || 'Leads',
      isConnected: !!config.googleSheets?.isConnected,
      autoSync: !!config.googleSheets?.autoSync,
      connectionMethod: config.googleSheets?.connectionMethod,
      webhookUrl: '',
    },
  };
}

function recordAuditLog(action: AuditActionType, session: Partial<AdminSession> | null, details = '', ip = '127.0.0.1', status: 'success'|'warning'|'error'|'info' = 'success') {
  auditLogsDatabase.unshift({
    id: `log_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`, timestamp: nowIso(), action,
    actorEmail: session?.email || 'system@baoviet.internal', actorRole: session?.role || 'system', ipAddress: ip, details, status,
  });
  saveAuditLogsToDisk();
  // Audit logs are optional telemetry: persist locally immediately and enqueue
  // a single targeted Firestore write without making the CMS edit wait for it.
  enqueueCloudAuditLog(auditLogsDatabase[0]);
}
function sessionOf(req: express.Request): AdminSession | null { return (req as any).adminSession || null; }
function authPrincipal(session: Pick<AdminSession,'accountId'|'email'>): string {
  return session.accountId ? `account:${session.accountId}` : `email:${String(session.email || '').trim().toLowerCase()}`;
}
function authFingerprint(req: express.Request, csrfToken = cookieValue(req,'bv_csrf')): string {
  return crypto.createHash('sha256').update(`${csrfToken}|${String(req.get('user-agent') || '').slice(0,512)}`).digest('hex');
}
function removeActiveFamily(familyId: string) {
  if (!familyId) return;
  for (const [key, value] of activeSessions) if (value.refreshFamilyId === familyId) activeSessions.delete(key);
}
async function issueAuthSession(req: express.Request, res: express.Response, session: AdminSession) {
  session.authKeyVersion=sessionSecretVersion();
  const csrfToken = createCsrfToken();
  const created = await createRefreshTokenFamily(session, authPrincipal(session), SESSION_DURATION_MS, authFingerprint(req, csrfToken));
  session.refreshFamilyId = created.familyId;
  session.expiresAt = created.expiresAt;
  await updateRefreshFamilySession(created.familyId, session);
  activeSessions.set(session.token, session);
  const accessToken = signAccessSession(session.token, created.familyId, ACCESS_TOKEN_DURATION_MS);
  setAuthCookies(res, accessToken, created.refreshToken, ACCESS_TOKEN_DURATION_MS, Math.max(1, created.expiresAt - Date.now()), csrfToken);
  return created;
}
async function resolveAdminSession(req: express.Request): Promise<AdminSession | null> {
  const claims = verifyAccessSession(cookieValue(req,'bv_session'));
  if (!claims) return null;
  let session = activeSessions.get(claims.sessionId) || null;
  if (!session) {
    const stored = await readRefreshFamilySession(claims.familyId);
    if (!stored || stored.token !== claims.sessionId) return null;
    session = stored as AdminSession;
    session.refreshFamilyId = claims.familyId;
    activeSessions.set(session.token, session);
  }
  if (Date.now() > session.expiresAt || session.refreshFamilyId !== claims.familyId || session.authKeyVersion !== sessionSecretVersion()) {
    activeSessions.delete(claims.sessionId);
    return null;
  }
  if(session.accountId){
    const account=adminAccountsDatabase.find(a=>a.id===session!.accountId);
    if(!account||!account.enabled){
      activeSessions.delete(claims.sessionId);
      await revokeRefreshFamily(claims.familyId,'account-disabled');
      return null;
    }
    const changed=session.role!==account.role || session.email!==(account.email||`${account.username}@cms.local`) || session.displayName!==account.displayName || session.permissions!==account.permissions;
    session.role=account.role;session.email=account.email||`${account.username}@cms.local`;session.displayName=account.displayName;session.permissions=account.permissions;
    if(changed) void updateRefreshFamilySession(claims.familyId,session);
  } else if(session.authMethod==='google') {
    const liveRole=roleForEmail(session.email);
    if(!liveRole){activeSessions.delete(claims.sessionId);await revokeRefreshFamily(claims.familyId,'google-access-removed');return null;}
    if(session.role!==liveRole){session.role=liveRole;void updateRefreshFamilySession(claims.familyId,session);}
  }
  return session;
}
type RefreshRequestAuthResult = { session?: AdminSession; code?: string; error?: string; reuse?: boolean; refreshExpiresAt?: number };
async function refreshSessionForRequest(req: express.Request, res: express.Response): Promise<RefreshRequestAuthResult> {
  const refreshToken = cookieValue(req,'bv_refresh');
  const oldCsrf = cookieValue(req,'bv_csrf');
  if(!refreshToken || !oldCsrf)return {code:'REFRESH_TOKEN_MISSING',error:'Phiên làm mới không tồn tại.'};
  const nextCsrf=createCsrfToken();
  const result=await rotateRefreshToken(refreshToken,authFingerprint(req,oldCsrf),authFingerprint(req,nextCsrf),nextCsrf);
  if(result.status==='unavailable')return {code:'AUTH_SESSION_BACKEND_UNAVAILABLE',error:'Kho phiên đăng nhập tạm thời chưa sẵn sàng.'};
  if(result.status==='reuse'){
    if(result.familyId)removeActiveFamily(result.familyId);
    clearSessionCookies(res);
    recordAuditLog('AUTH_LOGOUT',null,'Phát hiện refresh token đã dùng lại; đã thu hồi toàn bộ token family.',clientIp(req),'error');
    return {code:'REFRESH_TOKEN_REUSE_DETECTED',error:'Phát hiện refresh token đã được sử dụng lại. Phiên đã bị thu hồi.',reuse:true};
  }
  if(result.status!=='rotated'){
    if(result.familyId)removeActiveFamily(result.familyId);
    clearSessionCookies(res);
    return {code:'REFRESH_TOKEN_INVALID',error:'Refresh token không hợp lệ, đã hết hạn hoặc đã bị thu hồi.'};
  }
  const session=result.session as AdminSession;
  session.refreshFamilyId=result.familyId;
  if(!session?.token || !session.email || Date.now()>Number(session.expiresAt||0) || session.authKeyVersion!==sessionSecretVersion()){
    await revokeRefreshFamily(result.familyId,'invalid-session');
    clearSessionCookies(res);
    return {code:'REFRESH_TOKEN_INVALID',error:'Phiên quản trị đã hết hạn.'};
  }
  if(session.accountId){
    const account=adminAccountsDatabase.find(a=>a.id===session.accountId);
    if(!account||!account.enabled){
      await revokeRefreshFamily(result.familyId,'account-disabled');
      removeActiveFamily(result.familyId);
      clearSessionCookies(res);
      return {code:'ACCOUNT_DISABLED',error:'Tài khoản quản trị đã bị vô hiệu hóa.'};
    }
    session.role=account.role;session.email=account.email||`${account.username}@cms.local`;session.displayName=account.displayName;session.permissions=account.permissions;
    await updateRefreshFamilySession(result.familyId,session);
  } else if(session.authMethod==='google') {
    const liveRole=roleForEmail(session.email);
    if(!liveRole){await revokeRefreshFamily(result.familyId,'google-access-removed');removeActiveFamily(result.familyId);clearSessionCookies(res);return {code:'ACCOUNT_DISABLED',error:'Tài khoản Google không còn quyền CMS.'};}
    session.role=liveRole;
    await updateRefreshFamilySession(result.familyId,session);
  }
  activeSessions.set(session.token,session);
  const accessToken=signAccessSession(session.token,result.familyId,ACCESS_TOKEN_DURATION_MS);
  setAuthCookies(res,accessToken,result.refreshToken,ACCESS_TOKEN_DURATION_MS,Math.max(1,result.expiresAt-Date.now()),result.csrfToken);
  return {session,refreshExpiresAt:result.expiresAt};
}
function requireAdminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  void (async()=>{
    let session=await resolveAdminSession(req);
    if(!session){
      const refreshed=await refreshSessionForRequest(req,res);
      session=refreshed.session || null;
      if(!session){const status=refreshed.code==='AUTH_SESSION_BACKEND_UNAVAILABLE'?503:401;return res.status(status).json({error:refreshed.error||'Phiên truy cập đã hết hạn hoặc không hợp lệ.',code:refreshed.code||'ACCESS_TOKEN_INVALID'});}
    }
    (req as any).adminSession=session;
    next();
  })().catch(()=>res.status(401).json({ error:'Không thể xác minh phiên quản trị.', code:'ACCESS_TOKEN_INVALID' }));
}
const requireRoles = (...roles: AdminRole[]) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const role = sessionOf(req)?.role;
  if (!role || !roles.includes(role)) return res.status(403).json({ error: 'Tài khoản không có quyền thực hiện thao tác này.' });
  next();
};

function hasAIPermission(session: AdminSession | null, mode: 'view' | 'edit'): boolean {
  if (!session) return false;
  if (session.role === 'superadmin') return true;
  const permissions = session.permissions || {};
  const explicit = mode === 'view' ? permissions.canViewAI : permissions.canEditAI;
  if (typeof explicit === 'boolean') return explicit;

  // Backward-compatible fallback for accounts created before the dedicated AI
  // permissions existed: the existing ai-knowledge/ai-settings tab grants the
  // same level of access that the account already had.
  const tabIds = mode === 'view'
    ? (permissions.allowedTabs || [])
    : (permissions.canEditTabs || []);
  if (tabIds.includes('ai-knowledge') || tabIds.includes('ai-settings')) return true;
  return session.role !== 'viewer';
}

const requireAIAccess = (mode: 'view' | 'edit') => (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const session = sessionOf(req);
  if (!hasAIPermission(session, mode)) {
    return res.status(403).json({ error: mode === 'view' ? 'Tài khoản chưa được cấp quyền Xem AI.' : 'Tài khoản chưa được cấp quyền Sửa AI.', code: mode === 'view' ? 'AI_VIEW_FORBIDDEN' : 'AI_EDIT_FORBIDDEN' });
  }
  next();
};

function canAcceptCloudWrite(cloud = getCloudPersistenceStatus()): boolean {
  if (cloud.ready) return true;
  return cloudWriteQueueConfigured() && cloudAuthoritativeReady && !cloudStartupBlocked;
}

function requireCloudForMutation(req: express.Request, res: express.Response, next: express.NextFunction) {
  const cloud = getCloudPersistenceStatus();
  if (IS_PRODUCTION_RUNTIME && (!cloudAuthoritativeReady || cloudStartupBlocked || !canAcceptCloudWrite(cloud))) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({ error: 'Cloud chưa sẵn sàng và Message Queue chưa thể nhận tác vụ. Thay đổi chưa được lưu.', code: 'CLOUD_PERSISTENCE_UNAVAILABLE' });
  }
  next();
}

function requireCloudForPublished(_req: express.Request, res: express.Response, next: express.NextFunction) {
  if (IS_PRODUCTION_RUNTIME && (!cloudAuthoritativeReady || cloudStartupBlocked)) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({ error: 'Đang khôi phục nội dung đã xuất bản từ Cloud Firestore.', code: 'CLOUD_PERSISTENCE_UNAVAILABLE' });
  }
  next();
}

// An authenticated editor may inspect the neutral, unpublished local draft on
// a first install before Firebase is configured. Public Published APIs remain
// blocked, and production Save/Publish still require durable Cloud persistence.
// If a Cloud project IS configured but unavailable, never expose a possibly
// stale local draft: wait for authoritative Firestore recovery instead.
function requireCloudForAdminDraft(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (IS_PRODUCTION_RUNTIME && getCloudPersistenceStatus().configured) {
    return requireCloudForPublished(req, res, next);
  }
  next();
}

function parseRoleList(name: string) {
  return (process.env[name] || '').split(',').map((v) => v.trim().toLowerCase()).filter(Boolean);
}
function roleForEmail(email: string): AdminRole | null {
  const e = email.toLowerCase();
  if (parseRoleList('CMS_SUPERADMIN_EMAILS').includes(e)) return 'superadmin';
  if (parseRoleList('CMS_MARKETING_EMAILS').includes(e)) return 'marketing_admin';
  if (parseRoleList('CMS_CONTENT_EDITOR_EMAILS').includes(e)) return 'content_editor';
  if (parseRoleList('CMS_VIEWER_EMAILS').includes(e)) return 'viewer';
  // Development remains convenient, production requires an explicit allow-list.
  return !IS_PRODUCTION_RUNTIME ? 'marketing_admin' : null;
}
function roleForPasscode(passcode: string): AdminRole | null {
  const envMap: Array<[string, AdminRole]> = [
    ['CMS_SUPERADMIN_PASSCODE', 'superadmin'], ['CMS_MARKETING_PASSCODE', 'marketing_admin'],
    ['CMS_CONTENT_PASSCODE', 'content_editor'], ['CMS_VIEWER_PASSCODE', 'viewer'],
  ];
  for (const [envKey, role] of envMap) if (process.env[envKey] && passcode === process.env[envKey]) return role;
  return null;
}
async function verifyGoogleAccessToken(token: string): Promise<{email:string; name?:string} | null> {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return null;
    const data: any = await response.json();
    return data?.email ? { email: String(data.email), name: data.name ? String(data.name) : undefined } : null;
  } catch { return null; }
}

function mergeContentEditor(current: LandingPageConfig, incoming: LandingPageConfig): LandingPageConfig {
  // Content Editor is deliberately restricted to copy/image data. Structural, style,
  // action, tracking, responsive, status and global-design settings remain untouched.
  const next = clone(current);
  const copyKeys: Array<keyof LandingPageConfig> = [
    'brandName','brandLogoText','brandLogoUrl','headerLogoUrl','footerLogoUrl','mobileLogoUrl',
    'hotline','hotlineDisplay','headline','subtitle','heroBadge','heroImage','heroImageAlt','heroImageBadgeText','heroSocialProofEnabled','heroRatingText','heroSocialProofText','heroBackgroundImage','headerCtaText'
  ];
  copyKeys.forEach((key) => { if ((incoming as any)[key] !== undefined) (next as any)[key] = clone((incoming as any)[key]); });
  // Preserve Hero structure/actions/design while allowing copy and image replacement.
  next.heroBenefits = (current.heroBenefits || []).map((oldBenefit) => {
    const src = incoming.heroBenefits?.find((benefit) => benefit.id === oldBenefit.id);
    return src ? { ...oldBenefit, title: src.title, text: src.text } : oldBenefit;
  });
  next.heroSlides = (current.heroSlides || []).map((oldSlide, index) => {
    const src = incoming.heroSlides?.find((slide) => slide.id === oldSlide.id) || incoming.heroSlides?.[index];
    return src ? { ...oldSlide, url: src.url, alt: src.alt } : oldSlide;
  });
  // Legacy Hero CTA labels are plain strings; advanced CTA configuration is kept
  // structurally locked for Content Editor while the visible label may be edited.
  if (incoming.heroCtaPrimary !== undefined) next.heroCtaPrimary = sanitizeString(incoming.heroCtaPrimary);
  if (incoming.heroCtaSecondary !== undefined) next.heroCtaSecondary = sanitizeString(incoming.heroCtaSecondary);
  if (current.heroPrimaryCta) {
    next.heroPrimaryCta = {
      ...current.heroPrimaryCta,
      text: incoming.heroPrimaryCta?.text ?? incoming.heroCtaPrimary ?? current.heroPrimaryCta.text,
    };
  }
  if (current.heroSecondaryCta) {
    next.heroSecondaryCta = {
      ...current.heroSecondaryCta,
      text: incoming.heroSecondaryCta?.text ?? incoming.heroCtaSecondary ?? current.heroSecondaryCta.text,
    };
  }

  next.sections = current.sections.map((oldSec) => {
    const src = incoming.sections.find((section) => section.id === oldSec.id);
    if (!src) return oldSec;
    const out = clone(oldSec);
    ['title','subtitle','content','badge','imageUrl','imageAlt','videoUrl','mobileImageUrl'].forEach((key) => {
      if ((src as any)[key] !== undefined) (out as any)[key] = clone((src as any)[key]);
    });
    if (src.images) {
      out.images = src.images.map((img, index) => {
        const old = oldSec.images?.[index] || {} as any;
        return { ...old, id: old.id || img.id, url: img.url, mobileUrl: img.mobileUrl, alt: img.alt, caption: img.caption };
      });
    }
    if (src.items) {
      out.items = (oldSec.items || []).map((oldItem) => {
        const item = src.items?.find((candidate) => candidate.id === oldItem.id);
        if (!item) return oldItem;
        return {
          ...oldItem,
          title: item.title,
          description: item.description,
          avatar: item.avatar,
          imageAlt: item.imageAlt,
          mobileImage: item.mobileImage,
          price: item.price,
          originalPrice: item.originalPrice,
          tag: item.tag,
          features: item.features,
          role: item.role,
          rating: item.rating,
          icon: item.icon,
        };
      });
    }
    return out;
  });

  next.formSettings = {
    ...current.formSettings,
    title: incoming.formSettings.title,
    subtitle: incoming.formSettings.subtitle,
    badge: incoming.formSettings.badge,
    submitButtonText: incoming.formSettings.submitButtonText,
    submittingText: incoming.formSettings.submittingText,
    successHeading: incoming.formSettings.successHeading,
    successMessage: incoming.formSettings.successMessage,
    privacyDisclaimer: incoming.formSettings.privacyDisclaimer,
  };
  next.formFields = current.formFields.map((old) => {
    const src = incoming.formFields.find((field) => field.id === old.id);
    if (!src) return old;
    return { ...old, label: src.label, placeholder: src.placeholder, helpText: src.helpText, options: src.options };
  });

  if (current.footer && incoming.footer) {
    next.footer = {
      ...current.footer,
      copyrightText: incoming.footer.copyrightText,
      disclaimerText: incoming.footer.disclaimerText,
      footerDescription: incoming.footer.footerDescription,
      address: incoming.footer.address,
      hotline: incoming.footer.hotline,
      email: incoming.footer.email,
      workingHours: incoming.footer.workingHours,
      columns: (current.footer.columns || []).map((oldColumn) => {
        const srcColumn = incoming.footer?.columns?.find((column) => column.id === oldColumn.id);
        if (!srcColumn) return oldColumn;
        return {
          ...oldColumn,
          title: srcColumn.title,
          content: srcColumn.content,
          contactAddress: srcColumn.contactAddress,
          contactHotline: srcColumn.contactHotline,
          contactEmail: srcColumn.contactEmail,
          contactHours: srcColumn.contactHours,
          links: (oldColumn.links || []).map((oldLink) => {
            const srcLink = srcColumn.links?.find((link) => link.id === oldLink.id);
            return srcLink ? { ...oldLink, label: srcLink.label } : oldLink;
          }),
        };
      }),
    };
  }
  return normalizeLandingConfig(next);
}
function mergeByRole(role: AdminRole, current: LandingPageConfig, incoming: LandingPageConfig): LandingPageConfig {
  if (role === 'viewer') return current;
  if (role === 'content_editor') return mergeContentEditor(current, incoming);
  const next = sanitizeConfig(incoming);
  next.googleSheets.webhookUrl=String(incoming.googleSheets?.webhookUrl ?? current.googleSheets?.webhookUrl ?? '').trim();
  if (role === 'marketing_admin') {
    next.websiteSettings!.colors = clone(current.websiteSettings!.colors);
    next.websiteSettings!.typography = clone(current.websiteSettings!.typography);
    next.websiteSettings!.stylePresets = clone(current.websiteSettings!.stylePresets);
  }
  return next;
}
function describeChanges(before: LandingPageConfig, after: LandingPageConfig): string[] {
  const summary: string[] = [];
  if (before.headline !== after.headline || before.subtitle !== after.subtitle) summary.push('Cập nhật nội dung Hero');
  if (JSON.stringify(before.sections) !== JSON.stringify(after.sections)) summary.push(`Cập nhật Sections (${after.sections.length} section)`);
  if (JSON.stringify(before.formFields) !== JSON.stringify(after.formFields) || JSON.stringify(before.formSettings) !== JSON.stringify(after.formSettings)) summary.push('Cập nhật Form');
  if (JSON.stringify(before.websiteSettings) !== JSON.stringify(after.websiteSettings)) summary.push('Cập nhật Website Settings / Popup / Navigation');
  if (JSON.stringify(before.footer) !== JSON.stringify(after.footer)) summary.push('Cập nhật Footer');
  return summary.length ? summary : ['Lưu cấu hình'];
}
function uniqueSlug(desired: string, ignoreId?: string) {
  const base = cleanSlug(desired);
  if (!pagesDatabase.some((p) => p.id !== ignoreId && !p.deletedAt && cleanSlug(p.slug) === base)) return base;
  let n = 2; let candidate = `${base === '/' ? '/landing-page' : base}-${n}`;
  while (pagesDatabase.some((p) => p.id !== ignoreId && !p.deletedAt && cleanSlug(p.slug) === candidate)) candidate = `${base === '/' ? '/landing-page' : base}-${++n}`;
  return candidate;
}

function buildRowValues(lead: LeadSubmission, config: LandingPageConfig) {
  const form = getFormDefinition(config, lead.tracking.formId);
  const fields = [...(form.fields || [])].filter((f) => !f.deletedAt).sort((a,b) => a.order-b.order);
  const values = fields.map((field) => {
    if (field.name === 'name') return lead.name || lead.customResponses?.[field.name] || '';
    if (field.name === 'email') return lead.email || lead.customResponses?.[field.name] || '';
    if (field.name === 'phone') return lead.phone || lead.customResponses?.[field.name] || '';
    const v = lead.customResponses?.[field.name];
    return Array.isArray(v) ? v.join(', ') : typeof v === 'boolean' ? (v ? 'Có' : 'Không') : (v ?? '');
  });
  return [lead.id, new Date(lead.submittedAt).toLocaleString('vi-VN'), ...values,
    lead.tracking.page || '', lead.tracking.section || '', lead.tracking.product || '', lead.tracking.formId || '',
    lead.tracking.utmSource || '', lead.tracking.utmMedium || '', lead.tracking.utmCampaign || '', lead.tracking.utmContent || '', lead.tracking.utmTerm || '',
    lead.tracking.pageUrl || '', lead.tracking.deviceType || '', lead.tracking.userAgent || ''];
}
async function appendToGoogleSheet(spreadsheetId: string, sheetName: string, lead: LeadSubmission, config: LandingPageConfig, token: string) {
  const range = `'${String(sheetName || 'Leads').replace(/'/g,"''")}'!A:A`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
  const response = await fetch(url, { method:'POST', headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'}, body:JSON.stringify({values:[buildRowValues(lead,config)]}) });
  if (!response.ok) { const data:any = await response.json().catch(()=>({})); throw new Error(data.error?.message || `Google Sheets API error ${response.status}`); }
  return response.json();
}
async function sendLeadToWebhook(webhookUrl: string, lead: LeadSubmission, config: LandingPageConfig) {
  const target=new URL(webhookUrl);
  if(target.protocol!=='https:' || !['script.google.com','script.googleusercontent.com'].includes(target.hostname) || target.username || target.password)throw new Error('Webhook cần HTTPS Google Apps Script.');
  const form = getFormDefinition(config, lead.tracking.formId);
  const response = await fetch(target, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({
    id:lead.id, submittedAt:lead.submittedAt, name:lead.name, email:lead.email, phone:lead.phone, customResponses:lead.customResponses,
    tracking:lead.tracking, spreadsheetId:config.googleSheets?.spreadsheetId||'', sheetName:config.googleSheets?.sheetName||'Leads',
    rowValues:buildRowValues(lead,config), headers:(form.fields||[]).filter((f)=>!f.deletedAt).map((f)=>f.googleSheetColumn||f.label),
  }) });
  if (!response.ok) throw new Error(`Webhook HTTP ${response.status}`);
  if (!['script.google.com','script.googleusercontent.com'].includes(new URL(response.url).hostname)) throw new Error('Webhook chuyển hướng sang miền không hợp lệ.');
}

app.use('/api', (req,res,next) => {
  if (['POST','PUT','DELETE'].includes(req.method) && ['/firebase/config','/firebase/config/validate','/ai/config/gemini-key','/ai/config/telegram'].includes(req.path)) return res.status(403).json({error:'Credential chỉ cấu hình qua biến môi trường backend.'});
  next();
});
app.get('/api/security/status', requireAdminAuth, requireRoles('superadmin'), (_req,res) => res.json({redis:redisStatus(),httpsRequired:IS_PRODUCTION_RUNTIME,csrf:true,session:'Short-lived HttpOnly access JWT + rotating single-use HttpOnly refresh token',refresh:authRefreshStatus(),accessTokenMinutes:Math.round(ACCESS_TOKEN_DURATION_MS/60000),refreshTokenHours:Math.round(SESSION_DURATION_MS/3600000),encryptionConfigured:!!process.env.DATA_ENCRYPTION_KEY,oauthConfigured:!!(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET)}));
app.get('/api/auth/history', requireAdminAuth, (req,res) => { const session=sessionOf(req)!; res.json(auditLogsDatabase.filter(log=>['AUTH_LOGIN','AUTH_LOGOUT'].includes(log.action) && (session.role==='superadmin' || log.actorEmail===session.email)).slice(0,200)); });
app.get('/api/pages/:id/sync', requireAdminAuth, (req,res) => {const page=pagesDatabase.find(p=>p.id===req.params.id && !p.deletedAt); if(!page)return res.sendStatus(404); res.json({version:page.version,updatedAt:page.updatedAt});});
app.post('/api/leads/cloud-sync', requireAdminAuth, requireRoles('superadmin','marketing_admin'), async(req,res) => {try { const ids=new Set(Array.isArray(req.body?.ids)?req.body.ids.slice(0,500):[]); const leads=leadsDatabase.filter(l=>ids.has(l.id)); for(const lead of leads)await saveCloudLeadTargeted(lead); res.json({success:true,count:leads.length}); }catch {res.status(503).json({error:'Cloud chưa sẵn sàng.'});}});
// Authorization Code + PKCE; Google credentials and tokens remain server-side.
const oauthAttempts = new Map<string,{verifier:string;nonce:string;expires:number;mode:string;sessionToken?:string}>();
const googleClient = () => new OAuth2Client(process.env.GOOGLE_OAUTH_CLIENT_ID,process.env.GOOGLE_OAUTH_CLIENT_SECRET,process.env.GOOGLE_OAUTH_REDIRECT_URI || `${process.env.APP_PUBLIC_URL}/api/auth/google/callback`);
app.get('/api/auth/google/start', (req,res) => {
  if (!process.env.GOOGLE_OAUTH_CLIENT_ID || !process.env.GOOGLE_OAUTH_CLIENT_SECRET || !process.env.APP_PUBLIC_URL) return res.status(503).json({error:'OAuth Google chưa cấu hình tại backend.'});
  const start = () => {
    for (const [key,value] of oauthAttempts) if(value.expires<Date.now())oauthAttempts.delete(key);
    if(oauthAttempts.size>=500)return res.status(429).json({error:'Quá nhiều yêu cầu OAuth.'});
    const mode=String(req.query.mode||'login');
    if(!['login','link','sheets'].includes(mode))return res.sendStatus(400);
    if(mode==='sheets' && !['superadmin','marketing_admin'].includes(sessionOf(req)?.role || ''))return res.sendStatus(403);
    const state=crypto.randomBytes(32).toString('hex');const verifier=crypto.randomBytes(48).toString('base64url');const nonce=crypto.randomBytes(32).toString('hex');
    oauthAttempts.set(state,{verifier,nonce,expires:Date.now()+5*60000,mode,sessionToken:sessionOf(req)?.token});
    res.cookie('bv_oauth_state',state,{httpOnly:true,secure:IS_PRODUCTION_RUNTIME,sameSite:'lax',path:'/api/auth/google',maxAge:5*60000});
    const options:any={access_type:'offline',prompt:'select_account',scope:['openid','email','profile',...(mode==='sheets'?['https://www.googleapis.com/auth/spreadsheets']:[])],state,nonce,code_challenge:crypto.createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'};
    res.redirect(googleClient().generateAuthUrl(options));
  };
  if(req.query.mode==='link' || req.query.mode==='sheets')return requireAdminAuth(req,res,start);
  return start();
});
app.get('/api/auth/google/callback', async(req,res) => {
  const state=String(req.query.state||'');const attempt=oauthAttempts.get(state);oauthAttempts.delete(state);
  res.clearCookie('bv_oauth_state',{path:'/api/auth/google',secure:IS_PRODUCTION_RUNTIME,sameSite:'lax',httpOnly:true});
  if(!attempt || attempt.expires<Date.now() || cookieValue(req,'bv_oauth_state')!==state || !req.query.code)return res.status(400).send('Phiên OAuth không hợp lệ. Hãy đăng nhập lại.');
  try {
    const client=googleClient();const {tokens}=await client.getToken({code:String(req.query.code),codeVerifier:attempt.verifier});
    if(!tokens.id_token)throw new Error('Missing identity');
    const ticket=await client.verifyIdToken({idToken:tokens.id_token,audience:process.env.GOOGLE_OAUTH_CLIENT_ID});const profile:any=ticket.getPayload();
    if(!profile?.email_verified || profile.nonce!==attempt.nonce)throw new Error('Invalid identity');
    const email=String(profile.email).toLowerCase();const linked=adminAccountsDatabase.find(a=>(a.email?.toLowerCase()===email || a.firebaseUid===profile.sub));
    if(linked && !linked.enabled){recordAuditLog('AUTH_LOGIN',null,'Google OAuth: tài khoản bị vô hiệu hóa',clientIp(req),'error');return res.status(403).send('Tài khoản CMS đã bị vô hiệu hóa.');}
    if(attempt.mode==='login') {
      const role=linked?.role || roleForEmail(email);
      if(!role){recordAuditLog('AUTH_LOGIN',null,'Google OAuth: tài khoản chưa được cấp quyền',clientIp(req),'error');return res.status(403).send('Tài khoản Google chưa được cấp quyền CMS.');}
      const token=`bv_sess_${crypto.randomBytes(32).toString('hex')}`;
      const session:AdminSession={token,email,displayName:profile.name||email,role,accountId:linked?.id,authMethod:'google',createdAt:Date.now(),expiresAt:Date.now()+SESSION_DURATION_MS,ip:clientIp(req),firebaseLinked:true,firebaseUid:profile.sub,firebaseEmail:email,permissions:linked?.permissions};
      await issueAuthSession(req,res,session);recordAuditLog('AUTH_LOGIN',session,'Đăng nhập Google OAuth thành công',clientIp(req));
    } else {
      const session=attempt.sessionToken?activeSessions.get(attempt.sessionToken):null;
      if(!session || session.expiresAt<Date.now())return res.status(401).send('Phiên CMS hết hạn.');
      if(attempt.mode==='sheets') {
        const liveAccount=session.accountId?adminAccountsDatabase.find(a=>a.id===session.accountId):undefined;
        if((session.accountId && !liveAccount?.enabled) || !['superadmin','marketing_admin'].includes(liveAccount?.role || session.role))return res.sendStatus(403);
        cachedAdminToken=tokens.access_token || null;registerSecret(cachedAdminToken);
        recordAuditLog('SHEETS_CONNECT',session,'Liên kết Sheets bằng OAuth backend',clientIp(req));
      } else {
        const account=session.accountId?adminAccountsDatabase.find(a=>a.id===session.accountId):undefined;
        if(!account?.enabled)return res.sendStatus(403);
        if(adminAccountsDatabase.some(a=>a.id!==account.id && (a.firebaseUid===profile.sub || a.email?.toLowerCase()===email)))return res.status(409).send('Google đã liên kết tài khoản khác.');
        account.firebaseUid=profile.sub;account.firebaseEmail=email;account.firebaseLinkedAt=nowIso();session.firebaseLinked=true;session.firebaseUid=profile.sub;session.firebaseEmail=email;session.firebaseLinkedAt=account.firebaseLinkedAt;saveAdminAccountsToDisk();
        if(session.refreshFamilyId)await updateRefreshFamilySession(session.refreshFamilyId,session);
        recordAuditLog('SETTINGS_UPDATE',session,'Liên kết danh tính Google đã xác minh',clientIp(req));
      }
    }
    res.redirect('/oauth-complete');
  }catch {recordAuditLog('AUTH_LOGIN',null,'Google OAuth thất bại',clientIp(req),'error');res.status(401).send('Không thể xác thực Google. Hãy thử lại.');}
});
app.get('/oauth-complete',(_req,res)=>res.type('html').send('<!doctype html><html lang="vi"><meta charset="utf-8"><title>Đăng nhập thành công</title><p>Đăng nhập thành công. Bạn có thể đóng cửa sổ này.</p><script src="/oauth-complete.js"></script></html>'));
app.get('/oauth-complete.js',(_req,res)=>res.type('application/javascript').send("if(window.opener){window.opener.postMessage({type:'cms-oauth-complete'},location.origin);window.close();}else{location.replace('/#admin');}"));

// Public chat polling is restricted to the visitor that owns the session.
const visitorOwners=new Map<string,{visitor:string;expires:number}>();
app.use('/api/ai/chat', async (req,res,next)=>{
  const publicTurn=req.method==='POST' && (req.path==='/' || req.path==='/session-events');
  const match=req.path.match(/^\/sessions\/([^/]+)\/(sync|trigger-ai-timeout)$/);
  if(!publicTurn && !match)return next();
  const admin=await resolveAdminSession(req);
  if(admin)return next();
  let visitor=cookieValue(req,'bv_visitor');
  if(!/^[a-f0-9]{64}$/.test(visitor)){visitor=crypto.randomBytes(32).toString('hex');res.cookie('bv_visitor',visitor,{httpOnly:true,secure:IS_PRODUCTION_RUNTIME,sameSite:'lax',path:'/',maxAge:8*3600000});}
  const sessionId=String(match?.[1] || req.body?.sessionId || `session_${crypto.randomBytes(24).toString('hex')}`);
  if(!/^[a-zA-Z0-9_-]{1,180}$/.test(sessionId))return res.status(400).json({error:'Mã phiên chat không hợp lệ.'});

  for(const [key,value] of visitorOwners)if(value.expires<Date.now())visitorOwners.delete(key);
  const owner=visitorOwners.get(sessionId);
  if(owner && owner.visitor!==visitor)return res.status(403).json({error:'Không có quyền truy cập phiên chat này.'});

  const redisOwnership=await claimChatSessionOwner(sessionId,visitor);
  if(redisOwnership==='conflict')return res.status(403).json({error:'Không có quyền truy cập phiên chat này.'});
  if(redisOwnership===null && !owner && (match || !!req.body?.sessionId || chatSessionsDatabase.some(session=>session.id===sessionId))) {
    // Fail closed when Redis is unavailable and this process cannot prove that
    // the visitor owns an existing/continued session. A brand-new chat without
    // a client-supplied session ID can still start on the RAM fallback.
    return res.status(403).json({error:'Không có quyền truy cập phiên chat này.'});
  }
  if(redisOwnership==='claimed' && (match || !!req.body?.sessionId)) {
    // A caller that already knows a session ID must not be able to re-claim an
    // existing Redis session after its owner record expires. Start a new session
    // instead; this fails closed without exposing another visitor's transcript.
    const existing=await readRedisChatSession(sessionId);
    if(existing)return res.status(403).json({error:'Phiên chat đã hết quyền truy cập. Vui lòng bắt đầu phiên mới.'});
  }
  if(!owner && visitorOwners.size>=5000)return res.status(429).json({error:'Quá nhiều phiên chat.'});
  visitorOwners.set(sessionId,{visitor,expires:Date.now()+8*3600000});
  if(publicTurn)req.body.sessionId=sessionId;
  next();
});
// ---------------- API ----------------
// In production, never accept a mutating request while Firestore persistence is unavailable.
app.use('/api', (req, res, next) => {
  if (['POST','PUT','PATCH','DELETE'].includes(req.method)) {
    if (!['/auth/login','/auth/refresh','/auth/logout','/setup/owner','/sheets/operation','/sheets/save-token','/sheets/disconnect'].includes(req.path)) return requireCloudForMutation(req, res, next);
  }
  next();
});
app.get('/api/firebase/config', (_req,res) => {
  const config = loadCustomerFirebaseConfig();
  const envSource = getFirebaseEnvironmentSource();
  const { apiKey, ...safe } = config;
  res.setHeader('Cache-Control','no-store');
  res.json({
    configured: validateFirebaseConfig(config).length === 0,
    config: { projectId: config.projectId, apiKey: '', authDomain: '', appId: '', storageBucket: '', messagingSenderId: '' },
    envSource,
    isAutoDetected: true,
    systemManaged: true,
    notice: 'Cấu hình Firebase được tự động nhận diện từ biến môi trường (Environment Variables) và tệp cấu hình hệ thống.',
  });
});
app.put('/api/firebase/config', requireAdminAuth, requireRoles('superadmin'), async (req,res) => {
  const config = normalizeFirebaseConfig(req.body?.config || req.body);
  const missing = validateFirebaseConfig(config);
  if (missing.length) return res.status(400).json({ error: `Thiếu trường Firebase bắt buộc: ${missing.join(', ')}` });

  // The server-side Firestore credential is intentionally separate from the public Web config.
  // Re-initialize persistence when the customer switches Firebase projects so the next writes
  // cannot accidentally continue going to the previous customer's project.
  const persistence = await initializeCloudPersistence(config);
  if (!persistence.ready) {
    return res.status(400).json({
      error: `Không thể chuyển Cloud sang Firebase project ${config.projectId}: ${persistence.error || 'thiếu Service Account/ADC phù hợp với project này.'}`,
      persistence,
    });
  }

  saveCustomerFirebaseConfig(config);
  const s = sessionOf(req)!;
  recordAuditLog('SETTINGS_UPDATE', s, `Cập nhật Firebase project ${config.projectId}`, clientIp(req));
  scheduleCloudSync('settings');
  res.json({ success:true, configured:true, config, persistence });
});
app.post('/api/firebase/config/validate', requireAdminAuth, requireRoles('superadmin'), (req,res) => {
  const config = normalizeFirebaseConfig(req.body?.config || req.body);
  const missing = validateFirebaseConfig(config);
  const projectId = config.projectId || '';
  const validProjectId = /^[a-z0-9][a-z0-9-\-]{4,62}$/.test(projectId);
  res.json({ valid: missing.length===0 && validProjectId, missing, projectId, projectIdFormatValid: validProjectId });
});

// One-time first-install owner enrollment. The public button is a SETUP flow, not an
// unauthenticated Super Admin bypass. Even a fresh public deployment requires the
// operator's unpredictable CMS_SETUP_TOKEN (>=32 chars). Never return this token.
const setupAttempts = new Map<string,{count:number;until:number}>();
function firstInstallSetupAvailable() {
  return adminAccountsDatabase.length === 0 && String(process.env.CMS_SETUP_TOKEN || '').length >= 32 && (!getCloudPersistenceStatus().configured || cloudAuthoritativeReady);
}
app.get('/api/setup/status', (_req,res) => {
  res.setHeader('Cache-Control','no-store');
  res.json({setupAvailable:firstInstallSetupAvailable(),setupTokenRequired:true});
});
app.post('/api/setup/owner', async (req,res) => {
  res.setHeader('Cache-Control','no-store');
  if (!firstInstallSetupAvailable()) return res.status(403).json({error:'Thiết lập lần đầu đã khóa hoặc chưa có CMS_SETUP_TOKEN hợp lệ.'});
  const ip=clientIp(req), now=Date.now();
  const attempts=setupAttempts.get(ip);
  if(attempts && attempts.until>now && attempts.count>=5) return res.status(429).json({error:'Vượt số lần thử mã thiết lập. Hãy thử lại sau 15 phút.'});
  const expected=Buffer.from(String(process.env.CMS_SETUP_TOKEN),'utf8');
  const provided=Buffer.from(String(req.body?.setupToken||''),'utf8');
  const valid=provided.length===expected.length && crypto.timingSafeEqual(provided,expected);
  if(!valid){
    setupAttempts.set(ip,{count:(attempts?.until && attempts.until>now ? attempts.count:0)+1,until:now+15*60*1000});
    return res.status(403).json({error:'Mã thiết lập không đúng.'});
  }
  const username=normalizeUsername(req.body?.username), password=String(req.body?.password||'');
  if(!/^[a-z0-9._-]{3,40}$/.test(username) || !validPassword(password)) return res.status(400).json({error:'Tên đăng nhập cần 3–40 ký tự; mật khẩu tối thiểu 10 ký tự gồm chữ và số.'});
  if(adminAccountsDatabase.length!==0)return res.status(409).json({error:'Tài khoản quản trị đã tồn tại.'});
  const pd=newPasswordData(password);
  const account:StoredAdminAccount={id:`admin_${crypto.randomBytes(8).toString('hex')}`,username,email:sanitizeString(req.body?.email),displayName:sanitizeString(req.body?.displayName)||username,role:'superadmin',enabled:true,...pd,createdAt:nowIso(),updatedAt:nowIso()};
  adminAccountsDatabase.push(account);
  saveAdminAccountsToDisk();
  // Marker prevents an environment bootstrap password from overwriting setup.
  systemState.migrations![DEFAULT_ADMIN_MIGRATION]=true;
  writeJson(SYSTEM_STATE_FILE,systemState);
  setupAttempts.clear();
  if(canAcceptCloudWrite()){
    try{await saveCloudAdminAccountTargeted(account);}catch(e:any){console.warn('[First Setup] Could not sync owner to Cloud:',e?.message||e);scheduleCloudSync('adminAccounts');}
  }else scheduleCloudSync('adminAccounts');
  recordAuditLog('ADMIN_ACCOUNT_CREATE',null,'Tạo Super Admin qua thiết lập lần đầu',ip);
  res.json({success:true,setupAvailable:false,message:'Đã tạo tài khoản. Đăng nhập bằng tên và mật khẩu vừa đặt.'});
});
app.post('/api/auth/login', async (req,res) => {
  const ip = clientIp(req); const { passcode, googleToken, email, displayName, username, password, quickAdmin } = req.body || {};
  let role: AdminRole | null = null; let verifiedEmail = String(email || ''); let verifiedName = String(displayName || ''); let verifiedUsername=''; let accountId:string|undefined; let authMethod:'local'|'google'|'passcode'='local';
  let firebaseLinked = false; let firebaseUid: string | undefined; let firebaseEmail: string | undefined; let firebaseLinkedAt: string | undefined;
  if (quickAdmin) {
    if (IS_PRODUCTION_RUNTIME || process.env.CMS_ALLOW_DEV_BYPASS !== 'true') return res.status(403).json({ error: 'Đăng nhập bypass đã tắt. Hãy dùng tài khoản CMS.' });
    const account = adminAccountsDatabase.find(a => a.role === 'superadmin' && a.enabled) || adminAccountsDatabase.find(a => a.enabled);
    if (account) {
      role = account.role;
      verifiedEmail = account.email || `${account.username}@baoviet.internal`;
      verifiedName = account.displayName || 'Quản trị viên Cấp cao';
      verifiedUsername = account.username;
      accountId = account.id;
      authMethod = 'local';
      account.lastLoginAt = nowIso();
      account.updatedAt = account.updatedAt || nowIso();
      if (account.firebaseUid) {
        firebaseLinked = true;
        firebaseUid = account.firebaseUid;
        firebaseEmail = account.firebaseEmail || account.email;
        firebaseLinkedAt = account.firebaseLinkedAt;
      }
      saveAdminAccountsToDisk();
    } else {
      role = 'superadmin';
      verifiedEmail = 'admin@baoviet.internal';
      verifiedName = 'Quản trị viên Cấp cao';
      verifiedUsername = 'admin';
      authMethod = 'local';
    }
  } else if (username && password) {
    const account=adminAccountsDatabase.find(a=>a.username===normalizeUsername(username));
    if(!account || !account.enabled || !passwordOk(String(password),account)){ recordAuditLog('AUTH_LOGIN', null, 'Đăng nhập tài khoản nội bộ thất bại', ip, 'error'); return res.status(401).json({error:'Tên đăng nhập hoặc mật khẩu không đúng.'}); }
    if(!account.passwordHash.startsWith('scrypt-v2:'))Object.assign(account,newPasswordData(String(password)));
    role=account.role; verifiedEmail=account.email||`${account.username}@cms.local`; verifiedName=account.displayName; verifiedUsername=account.username; accountId=account.id; authMethod='local'; account.lastLoginAt=nowIso(); account.updatedAt=account.updatedAt||nowIso();
    if (account.firebaseUid) {
      firebaseLinked = true;
      firebaseUid = account.firebaseUid;
      firebaseEmail = account.firebaseEmail || account.email;
      firebaseLinkedAt = account.firebaseLinkedAt;
    }
    saveAdminAccountsToDisk();
  } else if (googleToken) {
    return res.status(400).json({ error: 'Hãy dùng đăng nhập Google qua backend OAuth.' });
    /* Legacy client-token flow disabled. */
    /*
    const profile = await verifyGoogleAccessToken(String(googleToken));
    if (!profile) { recordAuditLog('AUTH_LOGIN', null, 'Google token không hợp lệ', ip, 'error'); return res.status(401).json({error:'Không thể xác thực tài khoản.'}); }
    verifiedEmail = profile.email; verifiedName = profile.name || verifiedName; role = roleForEmail(verifiedEmail); cachedAdminToken = String(googleToken); authMethod='google';
    firebaseLinked = true;
    firebaseEmail = profile.email;
  */
  } else if (passcode) {
    role = roleForPasscode(String(passcode).trim());
    if (!role) { recordAuditLog('AUTH_LOGIN', null, 'Xác thực quản trị thất bại', ip, 'error'); return res.status(401).json({error:'Không thể xác thực tài khoản quản trị.'}); }
    verifiedEmail = verifiedEmail || `${role}@cms.local`; authMethod='passcode';
  }
  if (!role) return res.status(400).json({error:'Không thể xác thực tài khoản quản trị.'});
  const matchedAccount = accountId ? adminAccountsDatabase.find(a => a.id === accountId) : undefined;
  const userPermissions = matchedAccount?.permissions;
  const token = `bv_sess_${crypto.randomBytes(32).toString('hex')}`;
  const session: AdminSession = { token, email:verifiedEmail, displayName:verifiedName || 'Quản trị CMS', role, accountId, authMethod, createdAt:Date.now(), expiresAt:Date.now()+SESSION_DURATION_MS, ip, firebaseLinked, firebaseUid, firebaseEmail, firebaseLinkedAt, permissions: userPermissions };
  ipLoginAttempts.delete(ip);
  try {
    await issueAuthSession(req,res,session);
  } catch (error:any) {
    console.error('[Auth] Không thể tạo refresh-token family:', error?.message || error);
    return res.status(503).json({error:'Hệ thống phiên đăng nhập tạm thời chưa sẵn sàng. Vui lòng thử lại.',code:'AUTH_SESSION_BACKEND_UNAVAILABLE'});
  }
  recordAuditLog('AUTH_LOGIN', session, `Đăng nhập Admin CMS thành công (${authMethod})`, ip);
  res.json({success:true, token: 'cookie-session', expiresIn:ACCESS_TOKEN_DURATION_MS, refreshExpiresIn:SESSION_DURATION_MS, user:{email:session.email,displayName:session.displayName,role:session.role,username:verifiedUsername||undefined,authMethod,firebaseLinked,firebaseEmail,firebaseUid,firebaseLinkedAt,permissions: userPermissions}});
});
app.post('/api/auth/refresh', async (req,res) => {
  const refreshed=await refreshSessionForRequest(req,res);
  if(!refreshed.session){const status=refreshed.code==='AUTH_SESSION_BACKEND_UNAVAILABLE'?503:401;return res.status(status).json({error:refreshed.error||'Không thể làm mới phiên.',code:refreshed.code||'REFRESH_TOKEN_INVALID'});}
  res.json({success:true,expiresIn:ACCESS_TOKEN_DURATION_MS,refreshExpiresAt:refreshed.refreshExpiresAt});
});
app.get('/api/auth/me', requireAdminAuth, (req,res) => {
  const s=sessionOf(req)!;
  const account=s.accountId?adminAccountsDatabase.find(a=>a.id===s.accountId):undefined;
  const isLinked = !!(s.firebaseLinked || account?.firebaseUid || s.authMethod === 'google');
  const fbEmail = s.firebaseEmail || account?.firebaseEmail || (s.authMethod === 'google' ? s.email : undefined);
  const fbUid = s.firebaseUid || account?.firebaseUid;
  const fbLinkedAt = s.firebaseLinkedAt || account?.firebaseLinkedAt;
  const activePermissions = account?.permissions || s.permissions;
  res.json({
    user:{
      email:s.email,
      displayName:s.displayName,
      role:s.role,
      username:account?.username,
      authMethod:s.authMethod,
      firebaseLinked: isLinked,
      firebaseEmail: fbEmail,
      firebaseUid: fbUid,
      firebaseLinkedAt: fbLinkedAt,
      permissions: activePermissions
    },
    expiresAt:s.expiresAt
  });
});

app.post('/api/auth/link-firebase', requireAdminAuth, (_req,res) => res.status(400).json({ error: 'Liên kết tài khoản cần OAuth backend.' }));
app.post('/api/auth/unlink-firebase', requireAdminAuth, (req, res) => {
  const s = sessionOf(req)!;
  s.firebaseLinked = false;
  delete s.firebaseUid;
  delete s.firebaseEmail;
  delete s.firebaseLinkedAt;

  let accountUsername: string | undefined;
  if (s.accountId) {
    const account = adminAccountsDatabase.find(a => a.id === s.accountId);
    if (account) {
      delete account.firebaseUid;
      delete account.firebaseEmail;
      delete account.firebaseLinkedAt;
      account.updatedAt = nowIso();
      saveAdminAccountsToDisk();
      accountUsername = account.username;
    }
  }
  if(s.refreshFamilyId)void updateRefreshFamilySession(s.refreshFamilyId,s);
  recordAuditLog('SETTINGS_UPDATE' as any, s, 'Hủy liên kết tài khoản Firebase', clientIp(req), 'warning');
  res.json({
    success: true,
    user: {
      email: s.email,
      displayName: s.displayName,
      role: s.role,
      username: accountUsername,
      authMethod: s.authMethod,
      firebaseLinked: false
    }
  });
});

// Local CMS account management. Only Super Admin may manage identities/roles/passwords.
app.get('/api/admin-accounts', requireAdminAuth, requireRoles('superadmin'), (_req,res)=>res.json(adminAccountsDatabase.map(publicAdminAccount)));
app.post('/api/admin-accounts', requireAdminAuth, requireRoles('superadmin'), async (req,res)=>{
  const s=sessionOf(req)!; const username=normalizeUsername(req.body?.username); const password=String(req.body?.password||''); const role=req.body?.role as AdminRole;
  if(!/^[a-z0-9._-]{3,40}$/.test(username)) return res.status(400).json({error:'Tên đăng nhập cần 3-40 ký tự: chữ, số, dấu chấm, gạch dưới hoặc gạch ngang.'});
  if(adminAccountsDatabase.some(a=>a.username===username)) return res.status(409).json({error:'Tên đăng nhập đã tồn tại.'});
  if(!['superadmin','marketing_admin','content_editor','viewer'].includes(role)) return res.status(400).json({error:'Role không hợp lệ.'});
  if(!validPassword(password)) return res.status(400).json({error:'Mật khẩu tối thiểu 10 ký tự, gồm chữ và số.'});
  const pd=newPasswordData(password); const account:StoredAdminAccount={id:`admin_${crypto.randomBytes(8).toString('hex')}`,username,email:sanitizeString(req.body?.email),displayName:sanitizeString(req.body?.displayName)||username,role,enabled:req.body?.enabled!==false,permissions:req.body?.permissions||undefined,...pd,createdAt:nowIso(),updatedAt:nowIso()};
  adminAccountsDatabase.push(account); saveAdminAccountsToDisk();
  const cloudAcc = getCloudPersistenceStatus();
  if (canAcceptCloudWrite(cloudAcc)) {
    try { await saveCloudAdminAccountTargeted(account); }
    catch (cloudError: any) {
      console.warn('[Cloud Persistence] Lưu tài khoản Cloud lỗi, đã lưu local & hẹn sync:', cloudError?.message || cloudError);
      scheduleCloudSync('adminAccounts');
    }
  } else {
    scheduleCloudSync('adminAccounts');
  }
  recordAuditLog('ADMIN_ACCOUNT_CREATE',s,`Tạo tài khoản ${username} (${role})`,clientIp(req)); res.json({success:true,account:publicAdminAccount(account)});
});
app.patch('/api/admin-accounts/:id', requireAdminAuth, requireRoles('superadmin'), async (req,res)=>{
  const s=sessionOf(req)!; const account=adminAccountsDatabase.find(a=>a.id===req.params.id); if(!account)return res.status(404).json({error:'Không tìm thấy tài khoản.'});
  const beforeAccount=clone(account);
  if(req.body?.username!==undefined){const username=normalizeUsername(req.body.username);if(!/^[a-z0-9._-]{3,40}$/.test(username))return res.status(400).json({error:'Tên đăng nhập không hợp lệ.'});if(adminAccountsDatabase.some(a=>a.id!==account.id&&a.username===username))return res.status(409).json({error:'Tên đăng nhập đã tồn tại.'});account.username=username;}
  if(req.body?.displayName!==undefined)account.displayName=sanitizeString(req.body.displayName)||account.username;
  if(req.body?.email!==undefined)account.email=sanitizeString(req.body.email);
  if(req.body?.permissions!==undefined){
    const incoming = req.body.permissions || {};
    account.permissions = {
      ...incoming,
      ...(incoming.canViewAI !== undefined ? { canViewAI: !!incoming.canViewAI } : {}),
      ...(incoming.canEditAI !== undefined ? { canEditAI: !!incoming.canEditAI } : {}),
    };
  }
  const activeSupersBefore=adminAccountsDatabase.filter(a=>a.enabled&&a.role==='superadmin');
  if(s.authMethod!=='google'&&account.enabled&&account.role==='superadmin'&&activeSupersBefore.length<=1&&((req.body?.role!==undefined&&req.body.role!=='superadmin')||(req.body?.enabled!==undefined&&!req.body.enabled)))return res.status(400).json({error:'Không thể hạ quyền hoặc vô hiệu hóa Super Admin nội bộ cuối cùng.'});
  if(req.body?.role!==undefined){if(!['superadmin','marketing_admin','content_editor','viewer'].includes(req.body.role))return res.status(400).json({error:'Role không hợp lệ.'});account.role=req.body.role;}
  if(req.body?.enabled!==undefined)account.enabled=!!req.body.enabled; account.updatedAt=nowIso(); saveAdminAccountsToDisk();
  const cloudAccUpdate = getCloudPersistenceStatus();
  if (canAcceptCloudWrite(cloudAccUpdate)) {
    try { await saveCloudAdminAccountTargeted(account); }
    catch (cloudError: any) {
      console.warn('[Cloud Persistence] Cập nhật tài khoản Cloud lỗi, đã lưu local & hẹn sync:', cloudError?.message || cloudError);
      scheduleCloudSync('adminAccounts');
    }
  } else {
    scheduleCloudSync('adminAccounts');
  }
  if(!account.enabled){for(const [tok,sess] of activeSessions)if(sess.accountId===account.id)activeSessions.delete(tok);await revokePrincipalRefreshFamilies(`account:${account.id}`,'account-disabled');} recordAuditLog('ADMIN_ACCOUNT_UPDATE',s,`Cập nhật tài khoản ${account.username}`,clientIp(req)); res.json({success:true,account:publicAdminAccount(account)});
});
app.post('/api/admin-accounts/:id/password', requireAdminAuth, requireRoles('superadmin'), async (req,res)=>{
 const s=sessionOf(req)!;const account=adminAccountsDatabase.find(a=>a.id===req.params.id);if(!account)return res.status(404).json({error:'Không tìm thấy tài khoản.'});const password=String(req.body?.password||'');if(!validPassword(password))return res.status(400).json({error:'Mật khẩu tối thiểu 10 ký tự, gồm chữ và số.'});Object.assign(account,newPasswordData(password),{updatedAt:nowIso()});saveAdminAccountsToDisk();
 const cloudAccPw = getCloudPersistenceStatus();
 if (canAcceptCloudWrite(cloudAccPw)) {
   try { await saveCloudAdminAccountTargeted(account); }
   catch (cloudError: any) {
     console.warn('[Cloud Persistence] Đổi mật khẩu tài khoản Cloud lỗi, đã lưu local & hẹn sync:', cloudError?.message || cloudError);
     scheduleCloudSync('adminAccounts');
   }
 } else {
   scheduleCloudSync('adminAccounts');
 }
 for(const [tok,sess] of activeSessions)if(sess.accountId===account.id)activeSessions.delete(tok);await revokePrincipalRefreshFamilies(`account:${account.id}`,'password-reset');recordAuditLog('ADMIN_ACCOUNT_PASSWORD_RESET',s,`Đổi mật khẩu ${account.username}`,clientIp(req),'warning');res.json({success:true});
});
app.delete('/api/admin-accounts/:id', requireAdminAuth, requireRoles('superadmin'), async (req,res)=>{
 const s=sessionOf(req)!;const account=adminAccountsDatabase.find(a=>a.id===req.params.id);if(!account)return res.status(404).json({error:'Không tìm thấy tài khoản.'});const activeSupers=adminAccountsDatabase.filter(a=>a.enabled&&a.role==='superadmin');if(s.authMethod!=='google'&&account.role==='superadmin'&&activeSupers.length<=1)return res.status(400).json({error:'Không thể xóa Super Admin nội bộ cuối cùng.'});adminAccountsDatabase=adminAccountsDatabase.filter(a=>a.id!==account.id);saveAdminAccountsToDisk();
 const cloudAccDel = getCloudPersistenceStatus();
 if (canAcceptCloudWrite(cloudAccDel)) {
   try { await deleteCloudAdminAccountTargeted(account.id); }
   catch (cloudError: any) {
     console.warn('[Cloud Persistence] Xóa tài khoản Cloud lỗi, đã lưu local & hẹn sync:', cloudError?.message || cloudError);
     scheduleCloudSync('adminAccounts');
   }
 } else {
   scheduleCloudSync('adminAccounts');
 }
 for(const [tok,sess] of activeSessions)if(sess.accountId===account.id)activeSessions.delete(tok);await revokePrincipalRefreshFamilies(`account:${account.id}`,'account-delete');recordAuditLog('ADMIN_ACCOUNT_DELETE',s,`Xóa tài khoản ${account.username}`,clientIp(req),'warning');res.json({success:true});
});

app.post('/api/auth/logout', async (req,res) => {
  const refreshToken=cookieValue(req,'bv_refresh');
  const familyId=refreshTokenFamilyId(refreshToken) || verifyAccessSession(cookieValue(req,'bv_session'))?.familyId || '';
  let session=await resolveAdminSession(req);
  if(!session && familyId)session=await readRefreshFamilySession(familyId) as AdminSession | null;
  if(refreshToken)await revokeRefreshToken(refreshToken,'logout');
  else if(familyId)await revokeRefreshFamily(familyId,'logout');
  if(familyId)removeActiveFamily(familyId);
  if(session?.token)activeSessions.delete(session.token);
  clearSessionCookies(res);
  recordAuditLog('AUTH_LOGOUT',session,'Đăng xuất Admin CMS; refresh token family đã bị thu hồi.',clientIp(req));
  res.json({success:true});
});

// Public full-site search indexes only published CMS pages.
app.get('/api/search', requireCloudForPublished, (req,res) => {
  const query=String(req.query.q || '').trim().slice(0,120);
  res.setHeader('Cache-Control','no-store, no-cache, must-revalidate');
  const home = getHomePage();
  const homePublished = home?.publishedConfig || home?.draft || defaultLandingConfig;
  const configuredSuggestions = (getSharedHeaderPublished()?.searchSuggestions || homePublished?.websiteSettings?.header?.searchSuggestions || []).filter(Boolean).map(String).slice(0,12);
  if(query.length<2) return res.json({query,results:[],suggestions:configuredSuggestions});
  const pageResults = publishedSiteSearch(query,pagesDatabase.filter(p => p.id !== 'page_pricing' && !['/tinh-phi','/pricing'].includes(p.slug)));
  const results=pageResults.sort((a,b)=>b.score-a.score || a.title.localeCompare(b.title,'vi')).slice(0,30);
  res.json({query,results,suggestions:siteSearchSuggestions(query,results,configuredSuggestions)});
});

// Public page configuration by URL slug.
app.get('/api/config/published', requireCloudForPublished, (req,res) => {
  const requestedSlug = cleanSlug(String(req.query.slug || '/'));
  const page = getPageBySlug(requestedSlug);
  // A draft-only page must never become public just because a Page record exists.
  if (!page || page.deletedAt || page.status !== 'active' || page.published !== true || page.publishedConfig?.published === false) {
    return res.status(404).json({error:'Landing Page không tồn tại hoặc chưa được Publish.'});
  }
  res.setHeader('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate');
  const publicConfig=cloneValue(page.publishedConfig);
  applySharedHeader(publicConfig, getSharedHeaderPublished()); publicConfig.footer = cloneValue(getSharedFooterPublished()); publicConfig.websiteSettings = publicConfig.websiteSettings || cloneValue(defaultLandingConfig.websiteSettings!); publicConfig.websiteSettings.navigation = cloneValue(buildNavigationForPages(getSharedNavigationPublished(), true)); publicConfig.websiteSettings.seo = seoWithGlobalFavicon(publicConfig.websiteSettings?.seo || {}, true); res.json({...safePublicConfig(publicConfig),__pageId:page.id});
});
app.get('/api/config/preview', (req,res) => {
  const token = String(req.query.token || ''); const preview = previewSessions.get(token);
  if (!preview || Date.now() > preview.expiresAt) { if(preview) previewSessions.delete(token); return res.status(401).json({error:'Preview token không hợp lệ hoặc đã hết hạn.'}); }
  const page=getPageById(preview.pageId); if(!page) return res.status(404).json({error:'Không tìm thấy Landing Page.'});
  const previewConfig=cloneValue(page.draft);
  previewConfig.websiteSettings=previewConfig.websiteSettings||cloneValue(defaultLandingConfig.websiteSettings!);
  previewConfig.websiteSettings.seo=seoWithGlobalFavicon(previewConfig.websiteSettings?.seo||{},false);
  res.setHeader('Cache-Control','no-store'); res.json({...safePublicConfig(previewConfig),__pageId:page.id});
});
app.post('/api/preview-token', requireAdminAuth, requireRoles('superadmin','marketing_admin','content_editor'), (req,res) => {
  const page=req.body?.pageId ? getPageById(req.body.pageId) : getHomePage(); if(!page || page.deletedAt) return res.status(404).json({error:'Không tìm thấy Landing Page.'});
  const token=`preview_${crypto.randomBytes(24).toString('hex')}`; previewSessions.set(token,{pageId:page.id,expiresAt:Date.now()+PREVIEW_DURATION_MS});
  recordAuditLog('PREVIEW_CREATE',sessionOf(req),`Tạo Preview URL cho ${page.name}`,clientIp(req));
  const previewPath = page.slug === '/' ? '/' : page.slug;
  res.json({success:true,token,expiresIn:PREVIEW_DURATION_MS,url:`${previewPath}?preview_token=${encodeURIComponent(token)}`});
});

// Page management. Reorder remains inside each page's section list; this is not a visual builder.
app.get('/api/pages', requireAdminAuth, (req,res) => {
  const includeTrash=String(req.query.includeTrash||'false')==='true';
  const summaries=pagesDatabase.filter(p=>p.id !== 'page_pricing' && !['/tinh-phi','/pricing'].includes(p.slug) && (includeTrash||!p.deletedAt)).map(({draft,publishedConfig,...summary})=>summary);
  const navOrder=new Map((getSharedNavigationDraft().items||[]).map((item,index)=>[String(item.pageId),Number(item.order||index+1)]));
  res.json(summaries.sort((a,b)=>Number(a.orderIndex ?? (a.id==='page_home'?0:navOrder.get(a.id)??9999))-Number(b.orderIndex ?? (b.id==='page_home'?0:navOrder.get(b.id)??9999))));
});
app.patch('/api/pages/order', requireAdminAuth, requireRoles('superadmin','marketing_admin'), async (req,res) => {
  const previousPages=clone(pagesDatabase); const previousSettings=clone(systemState);
  const orderedIds=req.body?.orderedIds;
  const expected=pagesDatabase.filter(p=>p.id!=='page_pricing' && !['/tinh-phi','/pricing'].includes(p.slug) && !p.deletedAt).map(p=>p.id);
  if(!Array.isArray(orderedIds)||orderedIds.length!==expected.length||
    new Set(orderedIds).size!==expected.length||orderedIds.some((id:any)=>!expected.includes(id))) {
    return res.status(400).json({error:'Danh sách trang không hợp lệ.'});
  }
  const base=getSharedNavigationDraft();
  const nav=buildNavigationForPages(base);
  const order=new Map<string,number>(orderedIds.map((id:string,index:number)=>[id,index+1]));
  for(const page of pagesDatabase) if(!page.deletedAt && order.has(page.id))page.orderIndex=order.get(page.id);
  const navItems=(nav.items||[]).map(item=>({...item,order:order.get(String(item.pageId))??item.order}));
  systemState.sharedNavigationDraft={...nav,items:navItems.sort((a,b)=>a.order-b.order)};
  enforceSharedSiteConfig();
  writeJson(SYSTEM_STATE_FILE,systemState);savePagesToDisk();
  if (!(await persistPageEditorChange(res,previousPages,previousSettings,()=>saveCloudPublicationTargeted(pagesDatabase.filter(p=>!p.deletedAt),null,systemState,loadCustomerFirebaseConfig())))) return;
  recordAuditLog('PAGE_UPDATE',sessionOf(req),`Sắp xếp trang: ${orderedIds.join(', ')}`,clientIp(req));
  res.json({success:true});
});
app.post('/api/pages', requireAdminAuth, requireRoles('superadmin','marketing_admin'), async (req,res) => {
  const previousPages=clone(pagesDatabase); const previousSettings=clone(systemState);
  const s=sessionOf(req)!; const name=sanitizeString(req.body?.name)||'Landing Page mới';
  const id=`page_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`; const slug=uniqueSlug(req.body?.slug||slugFromName(name)); if (['/tinh-phi','/pricing'].includes(slug)) return res.status(400).json({error:'Đường dẫn này không tồn tại trong phiên bản không Tính phí.'});
  // A new Landing Page is intentionally isolated: it starts from a fresh/blank
  // configuration, never from Home or another existing page. Structural defaults
  // (including the mandatory Primary Navigation Bar) are still present.
  const draft=createBlankLandingConfig(name, slug);
  const page:LandingPageRecord={id,name,slug,status:'active',published:false,version:1,createdAt:nowIso(),updatedAt:nowIso(),draft:clone(draft),publishedConfig:clone(draft)};
  pagesDatabase.push(page); enforceSharedSiteConfig(); savePagesToDisk();
  if (!(await persistPageEditorChange(res,previousPages,previousSettings,()=>saveCloudPageTargeted(page,systemState,loadCustomerFirebaseConfig())))) return;
  recordAuditLog('PAGE_CREATE',s,`Tạo Landing Page ${name} (${slug})`,clientIp(req)); res.json({success:true,page:{...page,draft:undefined,publishedConfig:undefined}});
});
app.post('/api/pages/:id/duplicate', requireAdminAuth, requireRoles('superadmin','marketing_admin'), async (req,res) => {
  const previousPages=clone(pagesDatabase); const previousSettings=clone(systemState);
  const s=sessionOf(req)!; const source=getPageById(req.params.id); if(!source||source.deletedAt)return res.status(404).json({error:'Không tìm thấy Landing Page.'});
  const name=sanitizeString(req.body?.name)||`${source.name} (Bản sao)`; const id=`page_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`; const slug=uniqueSlug(req.body?.slug||slugFromName(name)); if (['/tinh-phi','/pricing'].includes(slug)) return res.status(400).json({error:'Đường dẫn này không tồn tại trong phiên bản không Tính phí.'});
  const draft=clone(source.draft);
  draft.websiteSettings!.navigation = { ...draft.websiteSettings!.navigation, enabled: true, type: 'main', items: (draft.websiteSettings!.navigation?.items?.length ? draft.websiteSettings!.navigation.items : defaultLandingConfig.websiteSettings!.navigation.items).map((item,index)=>({...item,order:item.order||index+1,enabled:true})) };
  draft.websiteSettings!.seo={...draft.websiteSettings!.seo,pageTitle:name,slug}; draft.published=false; draft.version=1;
  const page:LandingPageRecord={id,name,slug,status:'active',published:false,version:1,createdAt:nowIso(),updatedAt:nowIso(),draft,publishedConfig:clone(draft)};
  pagesDatabase.push(page);enforceSharedSiteConfig();savePagesToDisk();
  if (!(await persistPageEditorChange(res,previousPages,previousSettings,()=>saveCloudPageTargeted(page,systemState,loadCustomerFirebaseConfig())))) return;
  recordAuditLog('PAGE_DUPLICATE',s,`Duplicate ${source.name} → ${name}`,clientIp(req));res.json({success:true,page:{...page,draft:undefined,publishedConfig:undefined}});
});
app.patch('/api/pages/:id', requireAdminAuth, requireRoles('superadmin','marketing_admin'), async (req,res) => {
  const previousPages=clone(pagesDatabase); const previousSettings=clone(systemState);
  const s=sessionOf(req)!; const page=getPageById(req.params.id);if(!page||page.deletedAt)return res.status(404).json({error:'Không tìm thấy Landing Page.'});
  const beforeRecord=clone(page);
  if(req.body?.name) page.name=sanitizeString(req.body.name); if(req.body?.slug!==undefined) { const nextSlug=uniqueSlug(req.body.slug,page.id); if (['/tinh-phi','/pricing'].includes(nextSlug)) return res.status(400).json({error:'Đường dẫn này không tồn tại trong phiên bản không Tính phí.'}); page.slug=nextSlug; } if(req.body?.status==='active'||req.body?.status==='inactive')page.status=req.body.status; page.updatedAt=nowIso();
  page.draft.websiteSettings!.seo={...page.draft.websiteSettings!.seo,pageTitle:page.name,slug:page.slug}; enforceSharedSiteConfig(); savePagesToDisk();
  if (!(await persistPageEditorChange(res,previousPages,previousSettings,()=>saveCloudPageTargeted(page,systemState,loadCustomerFirebaseConfig())))) return;
  recordAuditLog('PAGE_UPDATE',s,`Cập nhật Landing Page ${page.name}`,clientIp(req)); res.json({success:true,page:{...page,draft:undefined,publishedConfig:undefined}});
});
app.delete('/api/pages/:id', requireAdminAuth, requireRoles('superadmin','marketing_admin'), async (req,res) => {
  const previousPages=clone(pagesDatabase); const previousSettings=clone(systemState);
  const s=sessionOf(req)!;const page=getPageById(req.params.id);if(!page)return res.status(404).json({error:'Không tìm thấy Landing Page.'});if(page.id==='page_home')return res.status(400).json({error:'Không thể đưa Landing Page chính vào thùng rác.'});
  page.deletedAt=nowIso();page.status='inactive';page.updatedAt=nowIso();enforceSharedSiteConfig();savePagesToDisk();
  if (!(await persistPageEditorChange(res,previousPages,previousSettings,()=>saveCloudPageTargeted(page,systemState,loadCustomerFirebaseConfig())))) return;
  recordAuditLog('PAGE_DELETE',s,`Đưa ${page.name} vào thùng rác`,clientIp(req),'warning');res.json({success:true});
});
app.post('/api/pages/:id/restore', requireAdminAuth, requireRoles('superadmin','marketing_admin'), async (req,res) => {
  const previousPages=clone(pagesDatabase); const previousSettings=clone(systemState);
  const s=sessionOf(req)!;const page=getPageById(req.params.id);if(!page)return res.status(404).json({error:'Không tìm thấy Landing Page.'});
  delete page.deletedAt;page.status='active';page.slug=uniqueSlug(page.slug,page.id);page.updatedAt=nowIso();enforceSharedSiteConfig();savePagesToDisk();
  if (!(await persistPageEditorChange(res,previousPages,previousSettings,()=>saveCloudPageTargeted(page,systemState,loadCustomerFirebaseConfig())))) return;
  recordAuditLog('PAGE_RESTORE',s,`Khôi phục ${page.name}`,clientIp(req));res.json({success:true});
});
app.delete('/api/pages/:id/permanent', requireAdminAuth, requireRoles('superadmin'), async (req,res) => {
  const previousPages=clone(pagesDatabase); const previousSettings=clone(systemState);
  const s=sessionOf(req)!;const page=getPageById(req.params.id);if(!page?.deletedAt)return res.status(400).json({error:'Chỉ có thể xóa vĩnh viễn Page đang ở Thùng rác.'});pagesDatabase=pagesDatabase.filter(p=>p.id!==page.id);enforceSharedSiteConfig();savePagesToDisk();
  if (!(await persistPageEditorChange(res,previousPages,previousSettings,()=>deleteCloudPageTargeted(page.id,systemState)))) return;
  recordAuditLog('PAGE_PERMANENT_DELETE',s,`Xóa vĩnh viễn ${page.name}`,clientIp(req),'warning');res.json({success:true});
});

app.get('/api/config', requireAdminAuth, requireCloudForAdminDraft, (req,res) => {
  const requestedPageId=String(req.query.pageId||''); const page=requestedPageId ? getPageById(requestedPageId) : getHomePage(); if(!page||page.deletedAt)return res.status(404).json({error:'Không tìm thấy Landing Page.'}); res.setHeader('Cache-Control','no-store'); res.json(page.draft);
});
app.post('/api/config', requireAdminAuth, requireRoles('superadmin','marketing_admin','content_editor'), async (req,res) => {
  const s=sessionOf(req)!;const body=req.body||{};const requestedPageId=body.pageId || req.query.pageId as string;const page=requestedPageId?getPageById(String(requestedPageId)):getHomePage();if(!page||page.deletedAt)return res.status(404).json({error:'Không tìm thấy Landing Page.'});
  const incoming:LandingPageConfig=body.config || body; if(!incoming?.sections||!incoming?.formFields)return res.status(400).json({error:'Cấu hình không hợp lệ.'});
  const beforePagesDatabase=clone(pagesDatabase); const beforeSystemState=clone(systemState); const before=clone(page.draft); const beforePageRecord=clone(page); const merged=mergeByRole(s.role,page.draft,incoming); merged.published=false; merged.version=page.version;
  const footerChanged = JSON.stringify(before.footer || null) !== JSON.stringify(merged.footer || null);
  const navigationChanged = JSON.stringify(before.websiteSettings?.navigation || null) !== JSON.stringify(merged.websiteSettings?.navigation || null);
  const headerSignature = (cfg:any) => ({brandName:cfg?.brandName,brandLogoText:cfg?.brandLogoText,brandLogoUrl:cfg?.brandLogoUrl,headerLogoUrl:cfg?.headerLogoUrl,headerLogoHeight:cfg?.headerLogoHeight,mobileLogoUrl:cfg?.mobileLogoUrl,hotline:cfg?.hotline,hotlineDisplay:cfg?.hotlineDisplay,headerShowCta:cfg?.headerShowCta,headerCtaText:cfg?.headerCtaText,headerCtaUrl:cfg?.headerCtaUrl,header:{...(cfg?.websiteSettings?.header||{}),banner:undefined}});
  const headerChanged = JSON.stringify(headerSignature(before)) !== JSON.stringify(headerSignature(merged));
  if (footerChanged && (s.role === 'superadmin' || s.role === 'marketing_admin')) systemState.sharedFooterDraft = cloneValue(merged.footer || defaultLandingConfig.footer!);
  if (navigationChanged && (s.role === 'superadmin' || s.role === 'marketing_admin')) systemState.sharedNavigationDraft = cloneValue(merged.websiteSettings?.navigation || getSharedNavigationDraft());
  if (headerChanged && (s.role === 'superadmin' || s.role === 'marketing_admin')) systemState.sharedHeaderDraft = stripSharedHeaderBanner({brandName:merged.brandName,brandLogoText:merged.brandLogoText,brandLogoUrl:merged.brandLogoUrl,headerLogoUrl:merged.headerLogoUrl,headerLogoHeight:merged.headerLogoHeight,mobileLogoUrl:merged.mobileLogoUrl,hotline:merged.hotline,hotlineDisplay:merged.hotlineDisplay,headerShowCta:merged.headerShowCta,headerCtaText:merged.headerCtaText,headerCtaUrl:merged.headerCtaUrl,header:merged.websiteSettings?.header});
  // Marketing/Super Admin may edit the public slug from Website Settings > SEO. Keep the Page record in sync.
  if (s.role === 'superadmin' || s.role === 'marketing_admin') {
    const requestedSlug = merged.websiteSettings?.seo?.slug;
    if (requestedSlug !== undefined) page.slug = uniqueSlug(requestedSlug || page.slug, page.id);
    merged.websiteSettings = merged.websiteSettings || clone(defaultLandingConfig.websiteSettings!);
    merged.websiteSettings.seo = { ...(merged.websiteSettings.seo || {}), slug: page.slug, pageTitle: merged.websiteSettings.seo?.pageTitle || page.name };
  } else if (merged.websiteSettings?.seo) {
    // Content Editor cannot change routing metadata.
    merged.websiteSettings.seo.slug = page.slug;
  }
  page.draft=merged;page.updatedAt=nowIso();enforceSharedSiteConfig();writeJson(SYSTEM_STATE_FILE, systemState);savePagesToDisk();
  let cloudReceipt:any = { mode:'local' };
  if (canAcceptCloudWrite()) {
    try { cloudReceipt = await saveCloudPageTargeted(page, systemState, loadCustomerFirebaseConfig()); }
    catch (cloudError: any) {
      pagesDatabase=beforePagesDatabase; systemState=beforeSystemState;
      writeJson(SYSTEM_STATE_FILE, systemState); savePagesToDisk();
      console.error('[Cloud Persistence] Lưu nháp thất bại:', cloudError?.message || cloudError);
      return res.status(503).json({error:'Không thể đưa bản nháp vào hàng đợi an toàn hoặc ghi Firestore. Thay đổi chưa được lưu; hãy thử lại.',code:'CLOUD_WRITE_FAILED'});
    }
  } else if (IS_PRODUCTION_RUNTIME) {
    pagesDatabase=beforePagesDatabase; systemState=beforeSystemState;
    writeJson(SYSTEM_STATE_FILE, systemState); savePagesToDisk();
    return res.status(503).json({error:'Cloud/Message Queue chưa sẵn sàng. Thay đổi chưa được lưu.',code:'CLOUD_PERSISTENCE_UNAVAILABLE'});
  }
  recordAuditLog('CONFIG_DRAFT_SAVE',s,`${page.name}: ${describeChanges(before,merged).join('; ')}`,clientIp(req));
  res.json({success:true,config:page.draft,changeSummary:describeChanges(before,merged),persistence:{localSaved:true,cloud:cloudReceipt?.mode==='queued'?'queued':cloudReceipt?.mode==='direct'?'synced':'local',jobId:cloudReceipt?.jobId||null,coalesced:Boolean(cloudReceipt?.coalesced)}});
});
app.post('/api/config/publish', requireAdminAuth, requireRoles('superadmin','marketing_admin'), async (req,res) => {
  const s=sessionOf(req)!;
  const page=req.body?.pageId?getPageById(req.body.pageId):getHomePage();if(!page||page.deletedAt)return res.status(404).json({error:'Không tìm thấy Landing Page.'});
  const beforePagesDatabase=clone(pagesDatabase); const beforeSystemState=clone(systemState); const beforePageRecord=clone(page); const beforeVersions=clone(versionsDatabase); const version=(page.version||0)+1;
  // Publish accepts the current editor snapshot directly: one API request and one
  // targeted Firestore commit instead of Save Draft + Publish + confirmation.
  if (req.body?.config) {
    const incoming:LandingPageConfig = req.body.config;
    if (!incoming?.sections || !incoming?.formFields) return res.status(400).json({error:'Cấu hình không hợp lệ.'});
    const merged=mergeByRole(s.role,page.draft,incoming); merged.published=false; merged.version=page.version;
    const requestedSlug=merged.websiteSettings?.seo?.slug;
    if (requestedSlug !== undefined) page.slug = uniqueSlug(requestedSlug || page.slug, page.id);
    merged.websiteSettings = merged.websiteSettings || clone(defaultLandingConfig.websiteSettings!);
    merged.websiteSettings.seo = { ...(merged.websiteSettings.seo || {}), slug: page.slug, pageTitle: merged.websiteSettings.seo?.pageTitle || page.name };
    const footerChanged = JSON.stringify(page.draft.footer || null) !== JSON.stringify(merged.footer || null);
    const navigationChanged = JSON.stringify(page.draft.websiteSettings?.navigation || null) !== JSON.stringify(merged.websiteSettings?.navigation || null);
    const headerSignature = (cfg:any) => ({brandName:cfg?.brandName,brandLogoText:cfg?.brandLogoText,brandLogoUrl:cfg?.brandLogoUrl,headerLogoUrl:cfg?.headerLogoUrl,headerLogoHeight:cfg?.headerLogoHeight,mobileLogoUrl:cfg?.mobileLogoUrl,hotline:cfg?.hotline,hotlineDisplay:cfg?.hotlineDisplay,headerShowCta:cfg?.headerShowCta,headerCtaText:cfg?.headerCtaText,headerCtaUrl:cfg?.headerCtaUrl,header:{...(cfg?.websiteSettings?.header||{}),banner:undefined}});
    const headerChanged = JSON.stringify(headerSignature(page.draft)) !== JSON.stringify(headerSignature(merged));
    if (footerChanged) systemState.sharedFooterDraft = cloneValue(merged.footer || defaultLandingConfig.footer!);
    if (navigationChanged) systemState.sharedNavigationDraft = cloneValue(merged.websiteSettings?.navigation || getSharedNavigationDraft());
    if (headerChanged) systemState.sharedHeaderDraft = stripSharedHeaderBanner({brandName:merged.brandName,brandLogoText:merged.brandLogoText,brandLogoUrl:merged.brandLogoUrl,headerLogoUrl:merged.headerLogoUrl,headerLogoHeight:merged.headerLogoHeight,mobileLogoUrl:merged.mobileLogoUrl,hotline:merged.hotline,hotlineDisplay:merged.hotlineDisplay,headerShowCta:merged.headerShowCta,headerCtaText:merged.headerCtaText,headerCtaUrl:merged.headerCtaUrl,header:merged.websiteSettings?.header});
    page.draft=merged;
  }
const time=nowIso();const previous=page.publishedConfig;
  enforceSharedSiteConfig();
  systemState.sharedFooterPublished = cloneValue(systemState.sharedFooterDraft || getSharedFooterDraft());
  systemState.sharedHeaderDraft = cloneValue(systemState.sharedHeaderDraft || getSharedHeaderDraft());
  applySharedHeader(page.draft, systemState.sharedHeaderDraft);
  page.publishedConfig={...clone(page.draft),published:true,version,lastPublishedAt:time};
  page.published=true;
  systemState.sharedNavigationPublished = cloneValue(buildNavigationForPages(systemState.sharedNavigationDraft || getSharedNavigationDraft(), true));
  systemState.sharedHeaderPublished = cloneValue(systemState.sharedHeaderDraft || getSharedHeaderDraft());
  for (const p of pagesDatabase) { applySharedHeader(p.publishedConfig, systemState.sharedHeaderPublished); p.publishedConfig.footer = cloneValue(systemState.sharedFooterPublished); p.publishedConfig.websiteSettings = p.publishedConfig.websiteSettings || cloneValue(defaultLandingConfig.websiteSettings!); p.publishedConfig.websiteSettings.navigation = cloneValue(systemState.sharedNavigationPublished); }page.draft=clone(page.publishedConfig);page.version=version;page.lastPublishedAt=time;page.updatedAt=time;enforceSharedSiteConfig();writeJson(SYSTEM_STATE_FILE, systemState);savePagesToDisk();
  const changes=describeChanges(previous,page.publishedConfig);const newVersionRecord={id:`ver_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,pageId:page.id,pageName:page.name,versionNumber:version,timestamp:time,author:s.displayName||s.email,note:sanitizeString(req.body?.note)||'Xuất bản',changeSummary:changes,config:clone(page.publishedConfig)};versionsDatabase.unshift(newVersionRecord);
  const cloudPub = getCloudPersistenceStatus();
  let cloudReceipt:any={mode:'local'};
  if (canAcceptCloudWrite(cloudPub)) {
    try {
      const changedPages=pagesDatabase.filter((candidate:any,index:number)=>JSON.stringify(candidate?.publishedConfig||null)!==JSON.stringify(beforePagesDatabase[index]?.publishedConfig||null));
      cloudReceipt=await saveCloudPublicationTargeted(changedPages.length ? changedPages : [page], newVersionRecord, systemState, loadCustomerFirebaseConfig());
    } catch (cloudError:any) {
      pagesDatabase=beforePagesDatabase; systemState=beforeSystemState; versionsDatabase=beforeVersions;
      writeJson(SYSTEM_STATE_FILE, systemState); savePagesToDisk();
      console.error('[Cloud Persistence] Xuất bản thất bại:', cloudError?.message || cloudError);
      const cloudTimedOut = String(cloudError?.code || '') === 'LOCAL_CLOUD_TIMEOUT';
      return res.status(cloudTimedOut ? 504 : 503).json({
        error: cloudTimedOut
          ? 'Firestore đang phản hồi chậm nên chưa thể xác nhận kết quả Publish. Không bấm Publish liên tục; hệ thống sẽ tự đối chiếu lại Cloud, sau đó hãy tải lại CMS.'
          : 'Không thể đưa bản Publish vào hàng đợi Cloud. Vui lòng thử lại.',
        code: cloudTimedOut ? 'CLOUD_WRITE_TIMEOUT' : 'CLOUD_WRITE_FAILED',
      });
    }
  } else if (IS_PRODUCTION_RUNTIME) {
    pagesDatabase=beforePagesDatabase; systemState=beforeSystemState; versionsDatabase=beforeVersions;
    writeJson(SYSTEM_STATE_FILE, systemState); savePagesToDisk();
    return res.status(503).json({error:'Cloud/Message Queue chưa sẵn sàng. Trang chưa được xuất bản.',code:'CLOUD_PERSISTENCE_UNAVAILABLE'});
  }
  if (!getCloudPersistenceStatus().ready && !IS_PRODUCTION_RUNTIME) saveVersionsToDisk();
  recordAuditLog('CONFIG_PUBLISH',s,`${page.name}: xuất bản. ${changes.join('; ')}`,clientIp(req));res.json({success:true,config:page.publishedConfig,version,persistence:{localSaved:true,cloud:cloudReceipt?.mode==='queued'?'queued':cloudReceipt?.mode==='direct'?'synced':'local',jobId:cloudReceipt?.jobId||null}});
});
app.get('/api/config/versions', requireAdminAuth, (req,res) => {
  const pageId=String(req.query.pageId||getHomePage()?.id||''); res.json(versionsDatabase.filter(v=>!v.pageId||v.pageId===pageId).map(v=>({id:v.id,pageId:v.pageId,pageName:v.pageName,versionNumber:v.versionNumber,timestamp:v.timestamp,author:v.author,note:v.note,changeSummary:v.changeSummary,sectionsCount:v.config?.sections?.length||0})));
});
app.delete('/api/config/versions', requireAdminAuth, requireRoles('superadmin','marketing_admin'), async (req,res) => {
  const s=sessionOf(req)!;
  const pageId=String(req.query.pageId || req.body?.pageId || getHomePage()?.id || '');
  const before=versionsDatabase.length;
  if (pageId) versionsDatabase=versionsDatabase.filter(v=>v.pageId!==pageId); else versionsDatabase=[];
  const deleted=before-versionsDatabase.length;
  saveVersionsToDisk();
  scheduleCloudSync('versions');
  recordAuditLog('CONFIG_VERSIONS_DELETE',s,`Xóa ${deleted} revision của ${pageId || 'toàn hệ thống'}`,clientIp(req),'warning');
  res.json({success:true,deleted});
});
app.post('/api/config/rollback', requireAdminAuth, requireRoles('superadmin','marketing_admin'), async (req,res) => {
  const s=sessionOf(req)!;const target=versionsDatabase.find(v=>v.id===req.body?.versionId);if(!target)return res.status(404).json({error:'Không tìm thấy phiên bản.'});const page=getPageById(req.body?.pageId||target.pageId);if(!page)return res.status(404).json({error:'Không tìm thấy Landing Page.'});
  page.draft=normalizeLandingConfig(clone(target.config));page.updatedAt=nowIso(); page.draft.footer=cloneValue(getSharedFooterDraft()); applySharedHeader(page.draft, getSharedHeaderDraft()); page.draft.websiteSettings!.navigation=cloneValue(getSharedNavigationDraft()); enforceSharedSiteConfig(); writeJson(SYSTEM_STATE_FILE, systemState); savePagesToDisk();
  const cloudRollback = getCloudPersistenceStatus();
  if (canAcceptCloudWrite(cloudRollback)) {
    try { await saveCloudPageTargeted(page, systemState, loadCustomerFirebaseConfig()); }
    catch (cloudError: any) {
      console.warn('[Cloud Persistence] Khôi phục phiên bản Cloud lỗi, đã lưu local & hẹn sync:', cloudError?.message || cloudError);
      scheduleCloudSync('pages', 'settings');
    }
  } else {
    scheduleCloudSync('pages', 'settings');
  }
  recordAuditLog('CONFIG_ROLLBACK',s,`${page.name}: khôi phục bản nháp từ v${target.versionNumber}`,clientIp(req),'warning');res.json({success:true,message:`Đã khôi phục bản nháp từ v${target.versionNumber}. Hãy Publish để đưa lên live.`,config:page.draft});
});
app.get('/api/audit-logs', requireAdminAuth, (_req,res)=>res.json(auditLogsDatabase.slice(0,Math.min(500,Number(_req.query.limit||100)))));

app.get('/api/lkg/status', requireAdminAuth, requireRoles('superadmin'), (_req,res)=>{
  const current = readLkgFile(LKG_CURRENT_FILE);
  const previous = readLkgFile(LKG_PREVIOUS_FILE);
  res.setHeader('Cache-Control','no-store');
  res.json({
    ok: !!current,
    directory: LKG_DIR,
    persistentDiskRecommended: !LKG_DIR.startsWith('/var/data'),
    current: lkgMeta(current),
    previous: lkgMeta(previous),
  });
});
app.post('/api/lkg/create', requireAdminAuth, requireRoles('superadmin'), (req,res)=>{
  const session = sessionOf(req)!;
  const result = createLkgSnapshot(String(req.body?.reason || 'manual-snapshot').slice(0,120));
  recordAuditLog('SETTINGS_UPDATE', session, 'Tạo Last Known Good Snapshot thủ công', clientIp(req), result.created ? 'success' : 'info');
  res.json({ success:true, ...result, current:lkgMeta(readLkgFile(LKG_CURRENT_FILE)), previous:lkgMeta(readLkgFile(LKG_PREVIOUS_FILE)) });
});
app.post('/api/lkg/restore', requireAdminAuth, requireRoles('superadmin'), (req,res)=>{
  const session = sessionOf(req)!;
  const slot: LkgSlot = req.body?.slot === 'previous' ? 'previous' : 'current';
  const file = slot === 'previous' ? LKG_PREVIOUS_FILE : LKG_CURRENT_FILE;
  const snapshot = readLkgFile(file);
  if (!snapshot) return res.status(404).json({ error:`Không có ${slot} Last Known Good Snapshot hợp lệ.` });
  applyLkgSnapshot(snapshot, true);
  scheduleCloudSync('pages','versions','aiKnowledge','aiTaxonomy','aiTraining','settings');
  recordAuditLog('BACKUP_RESTORE', session, `Khôi phục Last Known Good Snapshot ${slot} (${snapshot.createdAt})`, clientIp(req), 'warning');
  res.json({ success:true, slot, restoredAt:nowIso(), snapshot:lkgMeta(snapshot), config:getHomePage().draft });
});

app.get('/api/backup/export', requireAdminAuth, requireRoles('superadmin'), (req,res)=>{
  const s=sessionOf(req)!;recordAuditLog('LEAD_EXPORT',s,'Xuất system backup',clientIp(req));const home=getHomePage();const backup:SystemBackupPayload={version:'2.0.0',exportedAt:nowIso(),config:clone(home.draft),pages:clone(pagesDatabase),leadsCount:leadsDatabase.length,leads:clone(leadsDatabase),auditLogs:clone(auditLogsDatabase.slice(0,500)),versions:clone(versionsDatabase)};res.setHeader('Content-Disposition',`attachment; filename=cms_backup_${Date.now()}.json`);res.type('application/json').send(JSON.stringify(backup,null,2));
});
app.post('/api/backup/restore', requireAdminAuth, requireRoles('superadmin'), async (req,res)=>{
  const s=sessionOf(req)!;const backup=req.body as SystemBackupPayload;if(!backup?.config&&!backup?.pages)return res.status(400).json({error:'Backup không hợp lệ.'});
  if(Array.isArray(backup.pages)&&backup.pages.length)pagesDatabase=backup.pages.map(p=>({...p,draft:normalizeLandingConfig(p.draft),publishedConfig:normalizeLandingConfig(p.publishedConfig||p.draft)}));else{const home=getHomePage();home.draft=normalizeLandingConfig(backup.config);home.publishedConfig=clone(home.draft);}
  if(Array.isArray(backup.leads))leadsDatabase=backup.leads;if(Array.isArray(backup.versions))versionsDatabase=backup.versions;savePagesToDisk(true);saveLeadsToDisk();saveVersionsToDisk();scheduleCloudSync('pages','leads','versions','settings');recordAuditLog('BACKUP_RESTORE',s,`Khôi phục backup ${backup.exportedAt||''}`,clientIp(req),'warning');res.json({success:true,message:'Khôi phục hệ thống thành công.',config:getHomePage().draft});
});

async function backendSheetsToken():Promise<string> {
  if(process.env.GOOGLE_SHEETS_REFRESH_TOKEN){const client=googleClient();client.setCredentials({refresh_token:process.env.GOOGLE_SHEETS_REFRESH_TOKEN});const response=await client.getAccessToken();if(response.token){registerSecret(response.token);return response.token;}}
  if(cachedAdminToken)return cachedAdminToken;
  throw new Error('Kết nối Google Sheets qua OAuth hoặc cấu hình refresh token tại backend.');
}
app.post('/api/sheets/operation',requireAdminAuth,requireRoles('superadmin','marketing_admin'),async(req,res)=>{
  try {
    const {operation,spreadsheetId,sheetName='Leads',fields=[],lead}=req.body||{};
    if(!/^[a-zA-Z0-9_-]{20,100}$/.test(String(spreadsheetId)))return res.status(400).json({error:'Spreadsheet ID không hợp lệ.'});
    if(!['metadata','headers','append-test'].includes(operation))return res.sendStatus(400);
    const token=await backendSheetsToken();
    const sheet=String(sheetName).slice(0,100).replace(/'/g,"''");const base=`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
    let url=base;let method='GET';let body: string|undefined;let columns:string[]=[];
    if(operation==='headers') {columns=['Submission ID','Submitted At',...fields.slice(0,100).map((field:any)=>String(field.googleSheetColumn||field.label||field.name).slice(0,150)),'UTM Source','UTM Medium','UTM Campaign','UTM Content','UTM Term','Landing Page URL','Device Type','User Agent'];url=`${base}/values/${encodeURIComponent(`'${sheet}'!A1`)}?valueInputOption=RAW`;method='PUT';body=JSON.stringify({values:[columns]});}
    if(operation==='append-test') {url=`${base}/values/${encodeURIComponent(`'${sheet}'!A:A`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;method='POST';body=JSON.stringify({values:[['TEST',nowIso(),String(lead?.name||'Kiểm tra').slice(0,200)]]});}
    const response=await fetch(url,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body,signal:AbortSignal.timeout(15000)});const data:any=await response.json();if(!response.ok)return res.status(400).json({error:'Google Sheets từ chối yêu cầu. Kiểm tra quyền truy cập và kết nối OAuth.'});
    if(operation==='metadata')return res.json({title:data.properties?.title||'Google Sheet',sheets:(data.sheets||[]).map((item:any)=>item.properties.title)});
    res.json({success:true,columns,message:'Đã cập nhật Google Sheet.',updatedRange:data.updates?.updatedRange});
  }catch{res.status(503).json({error:'Kết nối Google Sheets chưa sẵn sàng. Hãy kết nối lại OAuth.'});}
});

app.post('/api/sheets/save-token', requireAdminAuth, requireRoles('superadmin','marketing_admin'), (req,res)=>{const s=sessionOf(req)!;if(req.body?.token && req.body.token !== 'server-managed')return res.status(400).json({error:'Token được quản lý tại backend OAuth.'});recordAuditLog('SHEETS_CONNECT',s,'Lưu Google OAuth token tạm thời trên server',clientIp(req));res.json({success:true});});
app.post('/api/sheets/disconnect', requireAdminAuth, requireRoles('superadmin','marketing_admin'), async (req,res)=>{
  const s=sessionOf(req)!;cachedAdminToken=null;
  for(const page of pagesDatabase){
    page.draft.googleSheets.isConnected=false;page.draft.googleSheets.webhookUrl='';
    page.publishedConfig.googleSheets.isConnected=false;page.publishedConfig.googleSheets.webhookUrl='';
  }
  savePagesToDisk(true);
  scheduleCloudSync('pages', 'settings');
  recordAuditLog('SHEETS_DISCONNECT',s,'Ngắt Google Sheets',clientIp(req),'warning');
  res.json({success:true,message:'Đã ngắt kết nối Google Sheets.'});
});
app.post('/api/sheets/test-webhook', requireAdminAuth, requireRoles('superadmin','marketing_admin'), async(req,res)=>{
  const s=sessionOf(req)!;const page=getPageById(req.body?.pageId);const config=page?.draft||getHomePage().draft;const url=String(req.body?.webhookUrl||config.googleSheets.webhookUrl||'').trim();if(!/^https:\/\//i.test(url))return res.status(400).json({error:'Webhook phải dùng HTTPS.'});
  try{
    const lead:LeadSubmission={id:`test_${Date.now()}`,submittedAt:nowIso(),name:'Lead Test CMS',email:'test@example.com',phone:'0900000000',customResponses:{note:'Webhook test'},tracking:{pageUrl:'CMS webhook test',formId:'main'},syncStatus:'pending'};
    const testConfig={...config,googleSheets:{...config.googleSheets,spreadsheetId:sanitizeString(req.body?.spreadsheetId||config.googleSheets.spreadsheetId).slice(0,160),sheetName:sanitizeString(req.body?.sheetName||config.googleSheets.sheetName||'Leads').slice(0,100)}};
    await sendLeadToWebhook(url,lead,testConfig);
    config.googleSheets.webhookUrl=url;config.googleSheets.isConnected=true;config.googleSheets.connectionMethod='webhook';
    config.googleSheets.spreadsheetId=testConfig.googleSheets.spreadsheetId;config.googleSheets.sheetName=testConfig.googleSheets.sheetName;
    savePagesToDisk(true);
    scheduleCloudSync('pages', 'settings');
    recordAuditLog('SHEETS_CONNECT',s,'Test Webhook thành công',clientIp(req));
    res.json({success:true,message:'Webhook hoạt động và đã nhận dòng test.'});
  }catch(err:any){res.status(500).json({error:err.message});}
});

// First-party analytics. No raw IP is stored; visitor/session IDs are random browser identifiers.
app.post('/api/analytics/events', (req,res)=>{
  const ip=clientIp(req);const rateNow=Date.now();const rate=(ipAnalyticsTimestamps.get(ip)||[]).filter(t=>rateNow-t<60000);const raw=Array.isArray(req.body?.events)?req.body.events:[req.body]; if(raw.length>50)return res.status(400).json({error:'Quá nhiều analytics events trong một request.'});if(rate.length+raw.length>300)return res.status(429).json({error:'Analytics rate limit.'});for(let i=0;i<raw.length;i++)rate.push(rateNow);ipAnalyticsTimestamps.set(ip,rate);
  const allowed=new Set(['page_view','section_view','click','cta_click','form_start','form_submit','session_ping']); const now=Date.now();
  const accepted: AnalyticsEvent[] = [];
  for(const e of raw){if(!e||!allowed.has(e.type))continue;const ts=new Date(e.timestamp||now);const evt:AnalyticsEvent={id:`evt_${now}_${crypto.randomBytes(4).toString('hex')}`,type:e.type,timestamp:Number.isFinite(ts.getTime())?ts.toISOString():nowIso(),pageId:sanitizeString(e.pageId),pagePath:sanitizeString(e.pagePath||'/'),sessionId:sanitizeString(e.sessionId).slice(0,100),visitorId:sanitizeString(e.visitorId).slice(0,100),sectionId:sanitizeString(e.sectionId),sectionName:sanitizeString(e.sectionName),eventName:sanitizeString(e.eventName),target:sanitizeString(e.target),product:sanitizeString(e.product),durationSeconds:Math.max(0,Math.min(86400,Number(e.durationSeconds||0))),utmSource:sanitizeString(e.utmSource),utmMedium:sanitizeString(e.utmMedium),utmCampaign:sanitizeString(e.utmCampaign),deviceType:['mobile','tablet','desktop'].includes(e.deviceType)?e.deviceType:undefined};if(evt.sessionId&&evt.visitorId){analyticsDatabase.push(evt);accepted.push(evt);}}
  if (accepted.length) saveAnalyticsToDisk(accepted);
  res.status(202).json({success:true,accepted:accepted.length});
});
function analyticsSummary(days:number,pageId?:string){
 const since=Date.now()-days*86400000;const events=analyticsDatabase.filter(e=>new Date(e.timestamp).getTime()>=since&&(!pageId||e.pageId===pageId));const pageViews=events.filter(e=>e.type==='page_view');const sessions=new Set(pageViews.map(e=>e.sessionId));const visitors=new Set(pageViews.map(e=>e.visitorId));const clicks=events.filter(e=>e.type==='click'||e.type==='cta_click');const ctaClicks=events.filter(e=>e.type==='cta_click');const submits=events.filter(e=>e.type==='form_submit');const leads=leadsDatabase.filter(l=>new Date(l.submittedAt).getTime()>=since&&(!pageId||l.tracking.page===pageId));
 const sessionDuration=new Map<string,number>();const sectionCount=new Map<string,Set<string>>();for(const e of events){if(e.type==='session_ping')sessionDuration.set(e.sessionId,Math.max(sessionDuration.get(e.sessionId)||0,e.durationSeconds||0));if(e.type==='section_view'){if(!sectionCount.has(e.sessionId))sectionCount.set(e.sessionId,new Set());sectionCount.get(e.sessionId)!.add(e.sectionId||e.sectionName||'section');}}
 const durations=[...sessionDuration.values()];const avgSessionDuration=durations.length?durations.reduce((a,b)=>a+b,0)/durations.length:0;const engagedSessions=[...sessions].filter(id=>(sessionDuration.get(id)||0)>=30||(sectionCount.get(id)?.size||0)>=2).length;
 const visitorDays=new Map<string,Set<string>>();for(const e of pageViews){if(!visitorDays.has(e.visitorId))visitorDays.set(e.visitorId,new Set());visitorDays.get(e.visitorId)!.add(e.timestamp.slice(0,10));}const returningVisitors=[...visitorDays.values()].filter(days=>days.size>=2).length;
  // Cohort retention: visitors first observed during the selected period.
  const allPageViews=analyticsDatabase.filter(e=>e.type==='page_view'&&(!pageId||e.pageId===pageId));
  const firstSeen=new Map<string,number>();
  for(const e of allPageViews){
    const t=new Date(e.timestamp).getTime();
    if(!e.visitorId||!Number.isFinite(t))continue;
    const prev=firstSeen.get(e.visitorId);
    if(prev===undefined||t<prev)firstSeen.set(e.visitorId,t);
  }
  const cohortVisitors=[...firstSeen.entries()]
    .filter(([,t])=>t>=since)
    .map(([visitorId,firstSeen])=>({visitorId,firstSeen}));
  const retentionFor=(offsetDays:number)=>{
    const cutoff=offsetDays*86400000;
    const eligible=cohortVisitors.filter(v=>v.firstSeen+cutoff<=Date.now());
    if(!eligible.length)return {rate:null,retained:0,eligible:0};
    const eligibleIds=new Set(eligible.map(v=>v.visitorId));
    const retained=new Set<string>();
    for(const e of allPageViews){
      if(!eligibleIds.has(e.visitorId))continue;
      const t=new Date(e.timestamp).getTime();
      const first=firstSeen.get(e.visitorId);
      if(first!==undefined&&t>=first+cutoff)retained.add(e.visitorId);
    }
    return {rate:retained.size/eligible.length*100,retained:retained.size,eligible:eligible.length};
  };
  const retentionD1=retentionFor(1);
  const retentionD7=retentionFor(7);
  const retentionD30=retentionFor(30);

 const aggregate=(arr:AnalyticsEvent[],key:(e:AnalyticsEvent)=>string)=>{const m=new Map<string,number>();arr.forEach(e=>{const k=key(e)||'(không xác định)';m.set(k,(m.get(k)||0)+1)});return [...m.entries()].map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value).slice(0,20)};
 const campaignRows=analyticsCostsDatabase.map(c=>{const campaignLeads=leads.filter(l=>(l.tracking.utmCampaign||'')===c.campaign).length;const analyticsClicks=c.clicks!=null?c.clicks:clicks.filter(e=>(e.utmCampaign||'')===c.campaign).length;return {...c,conversions:campaignLeads,cpc:analyticsClicks?c.spend/analyticsClicks:null,cpa:campaignLeads?c.spend/campaignLeads:null};});

 // Compute daily trends for charts
 const dayMs = 86400000;
 const nowTs = Date.now();
 const dayBuckets = new Map<string, { views: number; visitors: Set<string>; clicks: number; ctaClicks: number; formStarts: number; formSubmits: number; leads: number }>();
 for (let i = days - 1; i >= 0; i--) {
   const d = new Date(nowTs - i * dayMs);
   const key = d.toISOString().slice(0, 10);
   dayBuckets.set(key, { views: 0, visitors: new Set(), clicks: 0, ctaClicks: 0, formStarts: 0, formSubmits: 0, leads: 0 });
 }
 for (const e of events) {
   const key = e.timestamp ? e.timestamp.slice(0, 10) : '';
   const bucket = dayBuckets.get(key);
   if (!bucket) continue;
   if (e.type === 'page_view') {
     bucket.views++;
     if (e.visitorId) bucket.visitors.add(e.visitorId);
   } else if (e.type === 'click') {
     bucket.clicks++;
   } else if (e.type === 'cta_click') {
     bucket.clicks++;
     bucket.ctaClicks++;
   } else if (e.type === 'form_start') {
     bucket.formStarts++;
   } else if (e.type === 'form_submit') {
     bucket.formSubmits++;
   }
 }
 for (const l of leads) {
   const key = l.submittedAt ? l.submittedAt.slice(0, 10) : '';
   const bucket = dayBuckets.get(key);
   if (bucket) bucket.leads++;
 }
 const dailyTrends: Array<{
   date: string;
   fullDate: string;
   views: number;
   visitors: number;
   clicks: number;
   ctaClicks: number;
   formStarts: number;
   formSubmits: number;
   leads: number;
   ctr: number;
   conversionRate: number;
 }> = [];
 for (const [key, b] of dayBuckets.entries()) {
   const [, m, d] = key.split('-');
   const ctr = b.views > 0 ? (b.ctaClicks / b.views) * 100 : 0;
   const cr = b.views > 0 ? (b.leads / b.views) * 100 : 0;
   dailyTrends.push({
     date: `${d}/${m}`,
     fullDate: key,
     views: b.views,
     visitors: b.visitors.size,
     clicks: b.clicks,
     ctaClicks: b.ctaClicks,
     formStarts: b.formStarts,
     formSubmits: b.formSubmits,
     leads: b.leads,
     ctr: Number(ctr.toFixed(1)),
     conversionRate: Number(cr.toFixed(1)),
   });
 }

 const sectionViewsCount = events.filter(e => e.type === 'section_view').length;
 const formStartsCount = events.filter(e => e.type === 'form_start').length;
 const baseViews = Math.max(1, pageViews.length);
 const funnel = [
   { stage: '1. Xem trang', name: 'Page Views', count: pageViews.length, pct: 100 },
   { stage: '2. Đọc nội dung', name: 'Section Views', count: sectionViewsCount, pct: Number(((sectionViewsCount / baseViews) * 100).toFixed(1)) },
   { stage: '3. Nhấn nút CTA', name: 'CTA Clicks', count: ctaClicks.length, pct: Number(((ctaClicks.length / baseViews) * 100).toFixed(1)) },
   { stage: '4. Bắt đầu Form', name: 'Form Starts', count: formStartsCount, pct: Number(((formStartsCount / baseViews) * 100).toFixed(1)) },
   { stage: '5. Gửi Form', name: 'Form Submits', count: submits.length, pct: Number(((submits.length / baseViews) * 100).toFixed(1)) },
   { stage: '6. Thu Lead', name: 'Leads', count: leads.length, pct: Number(((leads.length / baseViews) * 100).toFixed(1)) },
 ];

 return {
   periodDays: days,
   pageViews: pageViews.length,
   sectionViews: sectionViewsCount,
   uniqueVisitors: visitors.size,
   returningVisitors,
   sessions: sessions.size,
   clicks: clicks.length,
   ctaClicks: ctaClicks.length,
   formStarts: formStartsCount,
   formSubmits: submits.length,
   leads: leads.length,
   ctr: pageViews.length ? ctaClicks.length / pageViews.length * 100 : 0,
   conversionRate: sessions.size ? leads.length / sessions.size * 100 : 0,
   retentionRate: retentionD1.rate ?? 0,
    retentionD1: retentionD1.rate,
    retentionD7: retentionD7.rate,
    retentionD30: retentionD30.rate,
    retentionCohorts: { d1: retentionD1, d7: retentionD7, d30: retentionD30 },
   engagementRate: sessions.size ? engagedSessions / sessions.size * 100 : 0,
   bounceRate: sessions.size ? (sessions.size - engagedSessions) / sessions.size * 100 : 0,
   avgSessionDuration,
   dailyTrends,
   funnel,
   topSections: aggregate(events.filter(e=>e.type==='section_view'),e=>e.sectionName||e.sectionId||''),
   topButtons: aggregate(ctaClicks,e=>e.eventName||e.target||''),
   topPages: aggregate(pageViews,e=>e.pagePath),
   devices: aggregate(pageViews,e=>e.deviceType||'unknown'),
   sources: aggregate(pageViews,e=>e.utmSource||'Direct / None'),
   trafficCampaigns: aggregate(pageViews,e=>e.utmCampaign||'Direct / None'),
   campaigns: campaignRows,
 };
}
app.get('/api/analytics/summary', requireAdminAuth, requireRoles('superadmin','marketing_admin','content_editor','viewer'), (req,res)=>{const days=Math.max(1,Math.min(365,Number(req.query.days||30)));res.json(analyticsSummary(days,req.query.pageId?String(req.query.pageId):undefined));});
app.get('/api/analytics/costs', requireAdminAuth, requireRoles('superadmin','marketing_admin','content_editor','viewer'), (_req,res)=>res.json(analyticsCostsDatabase));
app.put('/api/analytics/costs', requireAdminAuth, requireRoles('superadmin','marketing_admin'), (req,res)=>{const s=sessionOf(req)!;const rows=Array.isArray(req.body?.costs)?req.body.costs:[];analyticsCostsDatabase=rows.slice(0,200).map((r:any)=>({id:sanitizeString(r.id)||`cost_${crypto.randomBytes(6).toString('hex')}`,campaign:sanitizeString(r.campaign),source:sanitizeString(r.source),medium:sanitizeString(r.medium),spend:Math.max(0,Number(r.spend||0)),clicks:r.clicks===''||r.clicks==null?undefined:Math.max(0,Number(r.clicks)),startDate:sanitizeString(r.startDate),endDate:sanitizeString(r.endDate),notes:sanitizeString(r.notes),updatedAt:nowIso()})).filter((r:any)=>r.campaign);saveAnalyticsCostsToDisk();recordAuditLog('ANALYTICS_COST_UPDATE',s,`Cập nhật ${analyticsCostsDatabase.length} campaign cost`,clientIp(req));res.json({success:true,costs:analyticsCostsDatabase});});

app.post('/api/dashboard/reset', requireAdminAuth, requireRoles('superadmin','marketing_admin'), async (req,res)=>{
  const s=sessionOf(req)!;
  const resetAnalytics=req.body?.analytics !== false;
  const resetCampaignCosts=req.body?.campaignCosts !== false;
  const deletedAnalytics=resetAnalytics ? analyticsDatabase.length : 0;
  const deletedCampaignCosts=resetCampaignCosts ? analyticsCostsDatabase.length : 0;
  if(resetAnalytics) analyticsDatabase=[];
  if(resetCampaignCosts) analyticsCostsDatabase=[];
  if(resetAnalytics) saveAnalyticsToDisk([], true);
  if(resetCampaignCosts) saveAnalyticsCostsToDisk();
  const collections:Array<'analytics'|'analyticsCosts'>=[];
  if(resetAnalytics) collections.push('analytics');
  if(resetCampaignCosts) collections.push('analyticsCosts');
  if(collections.length){
    const cloudReset = getCloudPersistenceStatus();
    if (canAcceptCloudWrite(cloudReset)) {
      await flushScheduledCloudSync().catch(() => {});
    }
  }
  recordAuditLog('ANALYTICS_RESET',s,`Reset Dashboard: analytics=${resetAnalytics}, campaignCosts=${resetCampaignCosts}`,clientIp(req),'warning');
  res.json({success:true,deletedAnalytics,deletedCampaignCosts});
});

// Per-page SEO & OpenGraph management
app.get('/api/pages/:id/seo', requireAdminAuth, (req, res) => {
  const page = getPageById(req.params.id);
  if (!page || page.deletedAt) return res.status(404).json({ error: 'Không tìm thấy Landing Page.' });
  const seo = page.draft.websiteSettings?.seo || {};
  res.json({
    pageId: page.id,
    pageName: page.name,
    slug: page.slug,
    published: page.published,
    version: page.version,
    seo: {
      ...seo,
      pageTitle: page.name,
      slug: page.slug, // Page Manager is the source of truth; never return a stale SEO slug.
    },
  });
});

app.put('/api/pages/:id/seo', requireAdminAuth, requireRoles('superadmin', 'marketing_admin', 'content_editor'), async (req, res) => {
  const s = sessionOf(req)!;
  const page = getPageById(req.params.id);
  if (!page || page.deletedAt) return res.status(404).json({ error: 'Không tìm thấy Landing Page.' });
  const beforePage = clone(page);
  const seoPatch = req.body?.seo || {};
  // An explicitly cleared slug means the root path. An absent slug means no change.
  // Only the system home page may own '/', and no two pages may share the same path.
  let nextSeoSlug = page.slug;
  if (Object.prototype.hasOwnProperty.call(seoPatch, 'slug')) {
    if (typeof seoPatch.slug !== 'string') return res.status(400).json({ error: 'Đường dẫn trang phải là chuỗi ký tự.' });
    nextSeoSlug = cleanSlug(seoPatch.slug);
    if (nextSeoSlug === '/' && page.id !== 'page_home') {
      return res.status(400).json({ error: 'Đường dẫn / chỉ dành cho Trang chủ. Vui lòng nhập slug cho Category Page.' });
    }
    if (pagesDatabase.some((other) => other.id !== page.id && !other.deletedAt && cleanSlug(other.slug) === nextSeoSlug)) {
      return res.status(409).json({ error: `Đường dẫn ${nextSeoSlug} đã được sử dụng bởi trang khác.` });
    }
  }
  if (!page.draft.websiteSettings) {
    page.draft.websiteSettings = clone(defaultLandingConfig.websiteSettings!);
  }
  page.draft.websiteSettings.seo = {
    ...(page.draft.websiteSettings.seo || {}),
    ...seoPatch,
  };
  if (seoPatch.pageTitle && typeof seoPatch.pageTitle === 'string' && seoPatch.pageTitle.trim()) {
    page.name = sanitizeString(seoPatch.pageTitle);
  }
  page.slug = nextSeoSlug;
  page.draft.websiteSettings.seo.slug = page.slug;
  page.updatedAt = nowIso();
  savePagesToDisk();
  const cloudSeo = getCloudPersistenceStatus();
  let cloudReceipt:any={mode:'local'};
  if (canAcceptCloudWrite(cloudSeo)) {
    try {
      cloudReceipt=await saveCloudPageTargeted(page, systemState, loadCustomerFirebaseConfig());
    } catch (cloudError: any) {
      Object.assign(page, beforePage); savePagesToDisk();
      console.error('[Cloud Persistence] Lưu SEO thất bại:', cloudError?.message || cloudError);
      return res.status(503).json({error:'Không thể đưa SEO vào hàng đợi Cloud. Thay đổi chưa được lưu.',code:'CLOUD_WRITE_FAILED'});
    }
  } else if (IS_PRODUCTION_RUNTIME) {
    Object.assign(page, beforePage); savePagesToDisk();
    return res.status(503).json({error:'Cloud/Message Queue chưa sẵn sàng. SEO chưa được lưu.',code:'CLOUD_PERSISTENCE_UNAVAILABLE'});
  } else {
    scheduleCloudSync('pages', 'settings');
  }
  recordAuditLog('SETTINGS_UPDATE' as any, s, `Cập nhật SEO & OpenGraph cho trang ${page.name} (${page.slug})`, clientIp(req));
  res.json({
    success: true,
    pageId: page.id,
    pageName: page.name,
    slug: page.slug,
    seo: page.draft.websiteSettings.seo,
    persistence:{localSaved:true,cloud:cloudReceipt?.mode==='queued'?'queued':cloudReceipt?.mode==='direct'?'synced':'local',jobId:cloudReceipt?.jobId||null,coalesced:Boolean(cloudReceipt?.coalesced)},
  });
});

// Gemini Multi-turn Chat & SEO Optimizer endpoints
app.get('/api/gemini/status', (_req, res) => {
  res.json({
    available: isGeminiAvailable(),
    defaultModel: 'gemini-3.8-flash',
    supportedModels: ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.1-pro-preview', 'gemini-3.1-flash-lite'],
  });
});

app.post('/api/gemini/optimize-seo', requireAdminAuth, async (req, res) => {
  try {
    if (!isGeminiAvailable()) {
      return res.status(503).json({
        error: 'Gemini API key chưa được cấu hình trong Firebase Firestore.',
        code: 'GEMINI_KEY_MISSING',
      });
    }
    const { pageTitle, slug, brandName, headline, benefits } = req.body || {};
    const result = await runGeminiSeoOptimizer({
      pageTitle: String(pageTitle || 'Landing Page'),
      slug: String(slug || '/'),
      brandName: String(brandName || 'thương hiệu đang cấu hình'),
      headline: headline ? String(headline) : undefined,
      benefits: benefits ? String(benefits) : undefined,
    });
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[Gemini SEO Optimizer Error]:', err);
    res.status(500).json({ error: err?.message || 'Lỗi khi tối ưu SEO bằng Gemini' });
  }
});

// =========================================================================
// AI PRODUCT KNOWLEDGE & CHATBOT API ENDPOINTS
// =========================================================================
async function confirmAICloudWrite(res: any): Promise<boolean> {
  const cloud = getCloudPersistenceStatus();
  if (canAcceptCloudWrite(cloud)) {
    try {
      await saveCloudTaxonomyTargeted(getTaxonomyData());
      return true;
    } catch (cloudError: any) {
      console.warn('[Cloud Persistence] Lưu taxonomy Cloud lỗi, đã lưu local & hẹn sync:', cloudError?.message || cloudError);
      scheduleCloudSync('aiTaxonomy');
      return true;
    }
  }
  scheduleCloudSync('aiTaxonomy');
  return true;
}


// Knowledge backup / restore. Backup preserves the full structured knowledge hub,
// not just visible text, so taxonomy and component classification can be restored exactly.
app.get('/api/ai/knowledge/backup', requireAdminAuth, requireAIAccess('view'), (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Disposition', `attachment; filename=cms_ai_knowledge_backup_${new Date().toISOString().slice(0,10)}.json`);
  res.json({
    format: 'baoviet-ai-knowledge-backup',
    version: 1,
    exportedAt: nowIso(),
    items: getKnowledgeDatabase(),
    taxonomy: getTaxonomyData(),
  });
});

app.post('/api/ai/knowledge/restore', requireAdminAuth, requireAIAccess('edit'), async (req, res) => {
  try {
    const payload = req.body?.backup || req.body;
    if (payload?.format !== 'baoviet-ai-knowledge-backup' || !Array.isArray(payload?.items)) {
      return res.status(400).json({ error: 'File backup Kho tri thức không hợp lệ.' });
    }
    const mode = req.body?.mode === 'merge' ? 'merge' : 'replace';
    const beforeItems = clone(getKnowledgeDatabase());
    const beforeTaxonomy = clone(getTaxonomyData());
    const incoming = payload.items as KnowledgeItem[];
    const restored = mode === 'merge'
      ? Array.from(new Map([...beforeItems, ...incoming].map((item:any) => [item.id || `${item.product}|${item.title}|${item.componentType}`, item])).values()) as KnowledgeItem[]
      : incoming;
    saveKnowledgeDatabase(restored);
    if (payload.taxonomy && mode === 'replace') saveTaxonomyData(payload.taxonomy);
    else if (payload.taxonomy && mode === 'merge') {
      const mergeByIdOrName = (a:any[]=[], b:any[]=[]) => Array.from(new Map([...a,...b].map((x:any)=>[x.id || x.name, x])).values());
      saveTaxonomyData({
        ...beforeTaxonomy,
        products: mergeByIdOrName(beforeTaxonomy.products, payload.taxonomy.products),
        categories: mergeByIdOrName(beforeTaxonomy.categories, payload.taxonomy.categories),
        componentTypes: mergeByIdOrName(beforeTaxonomy.componentTypes, payload.taxonomy.componentTypes),
      });
    }
    scheduleCloudSync('aiKnowledge','aiTaxonomy');
    await flushScheduledCloudSync().catch(() => {});
    await invalidateChatCache('knowledge_restore');
    const sess = sessionOf(req);
    recordAuditLog('KNOWLEDGE_UPDATE', sess!, `Khôi phục Kho tri thức: ${mode}, ${restored.length} mục`, clientIp(req), 'success');
    res.json({ success:true, mode, count:restored.length });
  } catch (err:any) {
    res.status(500).json({ error: err?.message || 'Không thể khôi phục Kho tri thức.' });
  }
});

// 1. Get Knowledge Items (Public or Admin with filters)
app.get('/api/ai/knowledge', (req, res) => {
  try {
    let items = getKnowledgeDatabase();
    const { product, category, topic, componentType, search, activeOnly } = req.query;

    if (activeOnly === 'true') {
      items = items.filter((i) => i.active !== false);
    }
    if (product && typeof product === 'string') {
      items = items.filter((i) => i.product.toLowerCase().includes(product.toLowerCase()));
    }
    if (category && typeof category === 'string') {
      items = items.filter((i) => i.category.toLowerCase().includes(category.toLowerCase()));
    }
    if (topic && typeof topic === 'string') {
      items = items.filter((i) => i.topic.toLowerCase().includes(topic.toLowerCase()));
    }
    if (componentType && typeof componentType === 'string') {
      items = items.filter((i) => i.componentType === componentType);
    }
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      items = items.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.content.toLowerCase().includes(q) ||
          i.product.toLowerCase().includes(q) ||
          (i.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }

    res.json({
      success: true,
      total: items.length,
      items,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Lỗi khi tải cơ sở tri thức' });
  }
});

// 2. Create Knowledge Item
app.post('/api/ai/knowledge', requireAdminAuth, requireAIAccess('edit'), async (req, res) => {
  try {
    const { title, product, category, topic, componentType, content, tags, active } = req.body || {};
    if (!title || !product || !content) {
      return res.status(400).json({ error: 'Tiêu đề, Tên sản phẩm và Nội dung không được để trống.' });
    }
    const item = createKnowledgeItem({
      title: sanitizeString(title),
      product: sanitizeString(product),
      category: sanitizeString(category || 'Chưa phân loại'),
      topic: sanitizeString(topic || 'Quy tắc & Quyền lợi'),
      componentType: (componentType as KnowledgeComponentType) || 'overview',
      content: String(content || '').trim(),
      tags: Array.isArray(tags) ? tags.map((t) => sanitizeString(t)) : [],
      active: active !== false,
      fileType: 'manual',
    });

    const cloudItem = getCloudPersistenceStatus();
    if (canAcceptCloudWrite(cloudItem)) {
      try { await saveCloudKnowledgeItemTargeted(item); }
      catch (cloudError: any) {
        console.warn('[Cloud Persistence] Lưu mục tri thức Cloud lỗi, đã lưu local & hẹn sync:', cloudError?.message || cloudError);
        scheduleCloudSync('aiKnowledge');
      }
    } else {
      scheduleCloudSync('aiKnowledge');
    }
    await invalidateChatCache('knowledge_create');
    recordAuditLog('KNOWLEDGE_CREATE', (req as any).adminSession, `Tạo mục tri thức: ${item.title} (${item.product})`, clientIp(req), 'success');
    res.json({ success: true, item });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Lỗi khi tạo mục tri thức' });
  }
});

// 3. Update Knowledge Item
app.put('/api/ai/knowledge/:id', requireAdminAuth, requireAIAccess('edit'), async (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body || {};
    const updated = updateKnowledgeItem(id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Không tìm thấy mục tri thức.' });
    }
    const cloudUpdate = getCloudPersistenceStatus();
    if (canAcceptCloudWrite(cloudUpdate)) {
      try { await saveCloudKnowledgeItemTargeted(updated); }
      catch (cloudError: any) {
        console.warn('[Cloud Persistence] Cập nhật mục tri thức Cloud lỗi, đã lưu local & hẹn sync:', cloudError?.message || cloudError);
        scheduleCloudSync('aiKnowledge');
      }
    } else {
      scheduleCloudSync('aiKnowledge');
    }
    await invalidateChatCache('knowledge_update');
    recordAuditLog('KNOWLEDGE_UPDATE', (req as any).adminSession, `Cập nhật mục tri thức: ${updated.title}`, clientIp(req), 'success');
    res.json({ success: true, item: updated });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Lỗi khi cập nhật mục tri thức' });
  }
});

// 4. Delete Knowledge Item
app.delete('/api/ai/knowledge/:id', requireAdminAuth, requireAIAccess('edit'), async (req, res) => {
  const id = String(req.params.id || '').trim();
  try {
    const existing = getKnowledgeItemById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Không tìm thấy mục tri thức.' });
    }

    const session = (req as any).adminSession;
    const auditLog = {
      id: `log_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      timestamp: nowIso(),
      action: 'KNOWLEDGE_DELETE',
      actorEmail: session?.email || 'system@baoviet.internal',
      actorRole: session?.role || 'system',
      ipAddress: clientIp(req),
      details: `Xóa mục tri thức: ${existing.title || id}`,
      status: 'warning',
    };

    const cloudDel = getCloudPersistenceStatus();
    if (canAcceptCloudWrite(cloudDel)) {
      try { await deleteAIKnowledgeItemFromCloud(id, auditLog); }
      catch (cloudError: any) {
        console.warn('[Cloud Persistence] Xóa mục tri thức Cloud lỗi, đã lưu local & hẹn sync:', cloudError?.message || cloudError);
        scheduleCloudSync('aiKnowledge');
      }
    } else {
      scheduleCloudSync('aiKnowledge');
    }

    const deleted = deleteKnowledgeItem(id);
    if (!deleted) {
      console.warn(`[AI Knowledge] Local item ${id} was already absent.`);
    }

    await invalidateChatCache('knowledge_delete');
    auditLogsDatabase.unshift(auditLog as any);
    auditLogsDatabase = auditLogsDatabase.slice(0, 2000);
    res.json({ success: true, deletedId: id, cloudPersisted: true, auditLogged: true });
  } catch (err: any) {
    console.error('[AI Knowledge Delete] Failed:', err);
    res.status(500).json({ error: err?.message || 'Lỗi khi xóa mục tri thức', code: 'KNOWLEDGE_DELETE_FAILED' });
  }
});

// 4.1. Quick Delete All Knowledge Items of a Product (Xóa nhanh mục sản phẩm thay vì xóa từng thành phần)
app.delete(['/api/ai/knowledge/product/:productName', '/api/ai/knowledge/by-product/:productName'], requireAdminAuth, requireAIAccess('edit'), async (req, res) => {
  const productName = decodeURIComponent(String(req.params.productName || '')).trim();
  if (!productName) {
    return res.status(400).json({ error: 'Tên mục sản phẩm không hợp lệ.' });
  }

  try {
    const { deletedCount, deletedIds } = deleteKnowledgeItemsByProduct(productName);
    if (deletedCount === 0) {
      return res.status(404).json({ error: `Không tìm thấy mục tri thức nào thuộc sản phẩm "${productName}".` });
    }

    const session = (req as any).adminSession;
    const auditLog = {
      id: `log_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      timestamp: nowIso(),
      action: 'KNOWLEDGE_PRODUCT_DELETE_BULK',
      actorEmail: session?.email || 'system@baoviet.internal',
      actorRole: session?.role || 'system',
      ipAddress: clientIp(req),
      details: `Xóa nhanh toàn bộ mục sản phẩm: ${productName} (Đã xóa đồng loạt ${deletedCount} mục tri thức thay vì xóa từng thành phần)`,
      status: 'warning',
    };

    const cloudDel = getCloudPersistenceStatus();
    if (canAcceptCloudWrite(cloudDel)) {
      try {
        await deleteAIKnowledgeItemsBulkFromCloud(deletedIds, auditLog);
      } catch (cloudError: any) {
        console.warn('[Cloud Persistence] Xóa nhanh tri thức sản phẩm Cloud lỗi, đã lưu local & hẹn sync:', cloudError?.message || cloudError);
        scheduleCloudSync('aiKnowledge');
      }
    } else {
      scheduleCloudSync('aiKnowledge');
    }

    await invalidateChatCache('knowledge_product_bulk_delete');
    auditLogsDatabase.unshift(auditLog as any);
    auditLogsDatabase = auditLogsDatabase.slice(0, 2000);

    res.json({
      success: true,
      product: productName,
      deletedCount,
      deletedIds,
      cloudPersisted: true,
      auditLogged: true,
      message: `Đã xóa nhanh thành công ${deletedCount} mục tri thức của sản phẩm "${productName}".`,
    });
  } catch (err: any) {
    console.error('[AI Knowledge Product Bulk Delete] Failed:', err);
    res.status(500).json({ error: err?.message || 'Lỗi khi xóa nhanh mục sản phẩm', code: 'PRODUCT_DELETE_FAILED' });
  }
});

// 4.2. Bulk Delete Knowledge Items by IDs (Xóa theo nhóm thành phần hoặc chọn lọc)
app.post('/api/ai/knowledge/bulk-delete', requireAdminAuth, requireAIAccess('edit'), async (req, res) => {
  const { ids, reason, targetName } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Danh sách ID cần xóa không hợp lệ.' });
  }

  try {
    const { deletedCount, deletedIds } = bulkDeleteKnowledgeItems(ids);
    const session = (req as any).adminSession;
    const auditLog = {
      id: `log_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      timestamp: nowIso(),
      action: 'KNOWLEDGE_BULK_DELETE',
      actorEmail: session?.email || 'system@baoviet.internal',
      actorRole: session?.role || 'system',
      ipAddress: clientIp(req),
      details: reason || `Xóa hàng loạt ${deletedCount} mục tri thức ${targetName ? `(${targetName})` : ''}`,
      status: 'warning',
    };

    const cloudDel = getCloudPersistenceStatus();
    if (canAcceptCloudWrite(cloudDel)) {
      try {
        await deleteAIKnowledgeItemsBulkFromCloud(deletedIds, auditLog);
      } catch (cloudError: any) {
        console.warn('[Cloud Persistence] Xóa hàng loạt tri thức Cloud lỗi, đã lưu local & hẹn sync:', cloudError?.message || cloudError);
        scheduleCloudSync('aiKnowledge');
      }
    } else {
      scheduleCloudSync('aiKnowledge');
    }

    await invalidateChatCache('knowledge_bulk_delete');
    auditLogsDatabase.unshift(auditLog as any);
    auditLogsDatabase = auditLogsDatabase.slice(0, 2000);

    res.json({
      success: true,
      deletedCount,
      deletedIds,
      cloudPersisted: true,
      auditLogged: true,
    });
  } catch (err: any) {
    console.error('[AI Knowledge Bulk Delete] Failed:', err);
    res.status(500).json({ error: err?.message || 'Lỗi khi xóa hàng loạt', code: 'BULK_DELETE_FAILED' });
  }
});

// 5. Reset Knowledge Base to Defaults
app.post('/api/ai/knowledge/reset', requireAdminAuth, requireAIAccess('edit'), async (req, res) => {
  try {
    const items = resetKnowledgeToDefaults();
    const cloudReset = getCloudPersistenceStatus();
    if (canAcceptCloudWrite(cloudReset)) {
      try {
        for (const item of items) {
          await saveCloudKnowledgeItemTargeted(item);
        }
      } catch (cloudError: any) {
        console.warn('[Cloud Persistence] Khôi phục tri thức Cloud lỗi, đã lưu local & hẹn sync:', cloudError?.message || cloudError);
        scheduleCloudSync('aiKnowledge');
      }
    } else {
      scheduleCloudSync('aiKnowledge');
    }
    await invalidateChatCache('knowledge_reset');
    recordAuditLog('KNOWLEDGE_RESET', (req as any).adminSession, 'Khôi phục cơ sở tri thức mặc định', clientIp(req), 'warning');
    res.json({ success: true, total: items.length, items });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Lỗi khi khôi phục cơ sở tri thức' });
  }
});

// 5.1. Get Full Knowledge Taxonomy (Products, Categories, Component Types)
app.get('/api/ai/knowledge/taxonomy', requireAdminAuth, requireAIAccess('view'), (req, res) => {
  try {
    const taxonomy = getTaxonomyData();
    res.json({ success: true, taxonomy });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Lỗi khi lấy danh mục nghiệp vụ' });
  }
});

// 5.2. Save Entire Taxonomy
app.post('/api/ai/knowledge/taxonomy', requireAdminAuth, requireAIAccess('edit'), async (req, res) => {
  try {
    const updated = saveTaxonomyData(req.body);
    const cloudTax = getCloudPersistenceStatus();
    if (canAcceptCloudWrite(cloudTax)) {
      try { await saveCloudTaxonomyTargeted(updated); }
      catch (cloudError: any) {
        console.warn('[Cloud Persistence] Lưu danh mục nghiệp vụ Cloud lỗi, đã lưu local & hẹn sync:', cloudError?.message || cloudError);
        scheduleCloudSync('aiTaxonomy');
      }
    } else {
      scheduleCloudSync('aiTaxonomy');
    }
    await invalidateChatCache('taxonomy_update');
    recordAuditLog('TAXONOMY_UPDATE', (req as any).adminSession, 'Cập nhật toàn bộ taxonomy nghiệp vụ tri thức', clientIp(req), 'success');
    res.json({ success: true, taxonomy: updated });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Lỗi khi lưu danh mục nghiệp vụ' });
  }
});

// 5.3. Reset Taxonomy to Defaults
app.post('/api/ai/knowledge/taxonomy/reset', requireAdminAuth, requireAIAccess('edit'), async (req, res) => {
  try {
    const reset = resetTaxonomyToDefaults();
    if (!(await confirmAICloudWrite(res))) return;
    await invalidateChatCache('taxonomy_reset');
    recordAuditLog('TAXONOMY_RESET', (req as any).adminSession, 'Khôi phục cấu trúc taxonomy sản phẩm/danh mục mặc định', clientIp(req), 'warning');
    res.json({ success: true, taxonomy: reset });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Lỗi khi khôi phục danh mục nghiệp vụ' });
  }
});

// 5.4. Product CRUD
app.post('/api/ai/knowledge/taxonomy/products', requireAdminAuth, requireAIAccess('edit'), async (req, res) => {
  try {
    const { name, categoryCode, desc, targetAudience, order } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: 'Tên sản phẩm không được để trống' });
    const product = addTaxonomyProduct({
      name: sanitizeString(name),
      categoryCode: categoryCode ? sanitizeString(categoryCode) : 'other',
      desc: desc ? sanitizeString(desc) : '',
      targetAudience: targetAudience ? sanitizeString(targetAudience) : '',
      order: Number(order) || 99,
      active: true,
    });
    if (!(await confirmAICloudWrite(res))) return;
    await invalidateChatCache('taxonomy_product_add');
    recordAuditLog('TAXONOMY_PRODUCT_ADD', (req as any).adminSession, `Thêm sản phẩm tri thức: ${product.name}`, clientIp(req), 'success');
    res.json({ success: true, product, taxonomy: getTaxonomyData() });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Lỗi khi thêm sản phẩm' });
  }
});

app.put('/api/ai/knowledge/taxonomy/products/:id', requireAdminAuth, requireAIAccess('edit'), async (req, res) => {
  try {
    const id = req.params.id;
    const updated = updateTaxonomyProduct(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
    if (!(await confirmAICloudWrite(res))) return;
    await invalidateChatCache('taxonomy_product_update');
    recordAuditLog('TAXONOMY_PRODUCT_UPDATE', (req as any).adminSession, `Cập nhật sản phẩm: ${updated.name}`, clientIp(req), 'success');
    res.json({ success: true, product: updated, taxonomy: getTaxonomyData() });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Lỗi khi cập nhật sản phẩm' });
  }
});

app.delete('/api/ai/knowledge/taxonomy/products/:id', requireAdminAuth, requireAIAccess('edit'), async (req, res) => {
  try {
    const id = req.params.id;
    const success = deleteTaxonomyProduct(id);
    if (!success) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
    if (!(await confirmAICloudWrite(res))) return;
    await invalidateChatCache('taxonomy_product_delete');
    recordAuditLog('TAXONOMY_PRODUCT_DELETE', (req as any).adminSession, `Xóa sản phẩm ID: ${id}`, clientIp(req), 'info');
    res.json({ success: true, taxonomy: getTaxonomyData() });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Lỗi khi xóa sản phẩm' });
  }
});

// 5.5. Category CRUD
app.post('/api/ai/knowledge/taxonomy/categories', requireAdminAuth, requireAIAccess('edit'), async (req, res) => {
  try {
    const { name, code, desc, order } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: 'Tên danh mục không được để trống' });
    const category = addTaxonomyCategory({
      name: sanitizeString(name),
      code: code ? sanitizeString(code) : `cat_${Date.now()}`,
      desc: desc ? sanitizeString(desc) : '',
      order: Number(order) || 99,
      active: true,
    });
    if (!(await confirmAICloudWrite(res))) return;
    await invalidateChatCache('taxonomy_category_add');
    recordAuditLog('TAXONOMY_CATEGORY_ADD', (req as any).adminSession, `Thêm danh mục tri thức: ${category.name}`, clientIp(req), 'success');
    res.json({ success: true, category, taxonomy: getTaxonomyData() });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Lỗi khi thêm danh mục' });
  }
});

app.put('/api/ai/knowledge/taxonomy/categories/:id', requireAdminAuth, requireAIAccess('edit'), async (req, res) => {
  try {
    const id = req.params.id;
    const updated = updateTaxonomyCategory(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Không tìm thấy danh mục' });
    if (!(await confirmAICloudWrite(res))) return;
    await invalidateChatCache('taxonomy_category_update');
    recordAuditLog('TAXONOMY_CATEGORY_UPDATE', (req as any).adminSession, `Cập nhật danh mục: ${updated.name}`, clientIp(req), 'success');
    res.json({ success: true, category: updated, taxonomy: getTaxonomyData() });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Lỗi khi cập nhật danh mục' });
  }
});

app.delete('/api/ai/knowledge/taxonomy/categories/:id', requireAdminAuth, requireAIAccess('edit'), async (req, res) => {
  try {
    const id = req.params.id;
    const success = deleteTaxonomyCategory(id);
    if (!success) return res.status(404).json({ error: 'Không tìm thấy danh mục' });
    if (!(await confirmAICloudWrite(res))) return;
    await invalidateChatCache('taxonomy_category_delete');
    recordAuditLog('TAXONOMY_CATEGORY_DELETE', (req as any).adminSession, `Xóa danh mục ID: ${id}`, clientIp(req), 'info');
    res.json({ success: true, taxonomy: getTaxonomyData() });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Lỗi khi xóa danh mục' });
  }
});

// 5.6. Component Type CRUD (Bộ phận cấu thành nội dung)
app.post('/api/ai/knowledge/taxonomy/components', requireAdminAuth, requireAIAccess('edit'), async (req, res) => {
  try {
    const { code, label, desc, icon, badgeColor, order } = req.body || {};
    if (!code || !code.trim() || !label || !label.trim()) {
      return res.status(400).json({ error: 'Mã bộ phận (code) và Tên hiển thị (label) không được để trống' });
    }
    const component = addTaxonomyComponentType({
      code: sanitizeString(code).toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      label: sanitizeString(label),
      desc: desc ? sanitizeString(desc) : '',
      icon: icon ? sanitizeString(icon) : 'FileText',
      badgeColor: badgeColor ? sanitizeString(badgeColor) : 'bg-slate-100 text-slate-700',
      order: Number(order) || 99,
      active: true,
    });
    if (!(await confirmAICloudWrite(res))) return;
    await invalidateChatCache('taxonomy_component_add');
    recordAuditLog('TAXONOMY_COMPONENT_ADD', (req as any).adminSession, `Thêm bộ phận cấu thành: ${component.label} (${component.code})`, clientIp(req), 'success');
    res.json({ success: true, component, taxonomy: getTaxonomyData() });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Lỗi khi thêm bộ phận cấu thành' });
  }
});

app.put('/api/ai/knowledge/taxonomy/components/:id', requireAdminAuth, requireAIAccess('edit'), async (req, res) => {
  try {
    const id = req.params.id;
    const updated = updateTaxonomyComponentType(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Không tìm thấy bộ phận cấu thành' });
    if (!(await confirmAICloudWrite(res))) return;
    await invalidateChatCache('taxonomy_component_update');
    recordAuditLog('TAXONOMY_COMPONENT_UPDATE', (req as any).adminSession, `Cập nhật bộ phận cấu thành: ${updated.label}`, clientIp(req), 'success');
    res.json({ success: true, component: updated, taxonomy: getTaxonomyData() });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Lỗi khi cập nhật bộ phận cấu thành' });
  }
});

app.delete('/api/ai/knowledge/taxonomy/components/:id', requireAdminAuth, requireAIAccess('edit'), async (req, res) => {
  try {
    const id = req.params.id;
    const success = deleteTaxonomyComponentType(id);
    if (!success) return res.status(404).json({ error: 'Không tìm thấy bộ phận cấu thành' });
    if (!(await confirmAICloudWrite(res))) return;
    await invalidateChatCache('taxonomy_component_delete');
    recordAuditLog('TAXONOMY_COMPONENT_DELETE', (req as any).adminSession, `Xóa bộ phận cấu thành ID: ${id}`, clientIp(req), 'info');
    res.json({ success: true, taxonomy: getTaxonomyData() });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Lỗi khi xóa bộ phận cấu thành' });
  }
});

// 5.7. AI Training Configuration (Politeness, Tone, Pronouns, Playbooks)
app.get('/api/ai/knowledge/training', requireAdminAuth, requireAIAccess('view'), (req, res) => {
  try {
    const training = { ...getAiTrainingConfig() }; delete (training as any).geminiApiKey;
    res.json({ success: true, training });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Lỗi khi lấy cấu hình huấn luyện AI' });
  }
});

app.post('/api/ai/knowledge/training', requireAdminAuth, requireAIAccess('edit'), async (req, res) => {
  try {
    const updated = saveAiTrainingConfig(req.body);
    const cloudTrain = getCloudPersistenceStatus();
    if (canAcceptCloudWrite(cloudTrain)) {
      try { await saveCloudTrainingTargeted(updated); }
      catch (cloudError: any) {
        console.warn('[Cloud Persistence] Lưu cấu hình huấn luyện AI Cloud lỗi, đã lưu local & hẹn sync:', cloudError?.message || cloudError);
        scheduleCloudSync('aiTraining');
      }
    } else {
      scheduleCloudSync('aiTraining');
    }
    await invalidateChatCache('ai_training_update');
    recordAuditLog('AI_TRAINING_UPDATE', (req as any).adminSession, 'Cập nhật cấu hình huấn luyện AI (xưng hô, lịch sự, văn phong)', clientIp(req), 'success');
    const safeTraining:any = { ...updated }; delete safeTraining.geminiApiKey;
    res.json({ success: true, training: safeTraining });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Lỗi khi lưu cấu hình huấn luyện AI' });
  }
});

app.post('/api/ai/knowledge/training/reset', requireAdminAuth, requireAIAccess('edit'), async (req, res) => {
  try {
    const reset = resetAiTrainingConfig();
    const cloudResetTrain = getCloudPersistenceStatus();
    if (canAcceptCloudWrite(cloudResetTrain)) {
      try { await saveCloudTrainingTargeted(reset); }
      catch (cloudError: any) {
        console.warn('[Cloud Persistence] Khôi phục cấu hình huấn luyện AI Cloud lỗi, đã lưu local & hẹn sync:', cloudError?.message || cloudError);
        scheduleCloudSync('aiTraining');
      }
    } else {
      scheduleCloudSync('aiTraining');
    }
    await invalidateChatCache('ai_training_reset');
    recordAuditLog('AI_TRAINING_RESET', (req as any).adminSession, 'Khôi phục chuẩn mực huấn luyện AI mặc định', clientIp(req), 'warning');
    const safeTraining:any = { ...reset }; delete safeTraining.geminiApiKey;
    res.json({ success: true, training: safeTraining });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Lỗi khi khôi phục cấu hình huấn luyện AI' });
  }
});

// Step 21. Telegram lead/form alerts only (no chatbot transcript/history)
app.get('/api/ai/config/telegram', requireAdminAuth, requireAIAccess('view'), (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ success:true, ...getTelegramLoggerInfo() });
});
app.post('/api/ai/config/telegram', requireAdminAuth, requireAIAccess('edit'), (req, res) => {
  try {
    const botToken = String(req.body?.botToken || '').trim();
    const chatId = String(req.body?.chatId || '').trim();
    const enabled = req.body?.enabled !== false;
    if (!botToken || !chatId) return res.status(400).json({ success:false, error:'Cần Bot Token và Chat ID.' });
    const info = saveTelegramLoggerConfig({ botToken, chatId, enabled });
    res.json({ success:true, ...info });
  } catch (err:any) { res.status(400).json({ success:false, error:err?.message || 'Không thể lưu cấu hình Telegram.' }); }
});
app.post('/api/ai/config/telegram/test', requireAdminAuth, requireAIAccess('view'), async (req, res) => {
  try { await testTelegramConnection(); res.json({ success:true }); }
  catch (err:any) { res.status(400).json({ success:false, error:err?.message || 'Kết nối Telegram thất bại.' }); }
});

// 5.8. Gemini API Key management (server-side only)
app.get('/api/ai/config/gemini-key', requireAdminAuth, requireAIAccess('view'), async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    // Reload from Firestore so a server restart never falls back to a local file/env key.
    await hydrateGeminiApiKeyFromCloud();
    const info = getGeminiApiKeyInfo();
    const quotaState = getActiveQuotaExceededState();
    const reveal = String(req.query.reveal || '').toLowerCase() === 'true';
    const payload: any = {
      success: true,
      configured: info.configured,
      masked: info.masked,
      source: info.source,
      quotaExceeded: quotaState,
    };
    // Credentials never leave the server, including reveal requests.
    res.json(payload);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Không thể đọc Gemini API key từ Firebase.' });
  }
});

app.post('/api/ai/config/gemini-key', requireAdminAuth, requireAIAccess('edit'), async (req, res) => {
  try {
    const { apiKey } = req.body || {};
    const normalized = String(apiKey || '').trim();
    if (!normalized) return res.status(400).json({ success: false, error: 'Gemini API key không được để trống.' });
    if (normalized.length < 20) return res.status(400).json({ success: false, error: 'Gemini API key có vẻ không hợp lệ (quá ngắn).' });

    const session = (req as any).adminSession;
    const auditEntry: AuditLogEntry = {
      id: `log_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      timestamp: nowIso(),
      action: 'AI_CONFIG_UPDATE',
      actorEmail: session?.email || 'system@baoviet.internal',
      actorRole: session?.role || 'system',
      ipAddress: clientIp(req),
      details: 'Thay đổi Gemini API key cho AI Knowledge; credential được xác thực và lưu trong Firebase Firestore server-side.',
      status: 'warning',
    };

    // saveGeminiApiKey runs validateAndTestGeminiApiKey with multi-model fallback and 503 high-demand resilience.
    const currentTraining = getAiTrainingConfig();
    const info = await saveGeminiApiKey(normalized, auditEntry, [currentTraining.modelName || '', currentTraining.fallbackModelName || '']);
    auditLogsDatabase.unshift(auditEntry);
    auditLogsDatabase = auditLogsDatabase.slice(0, 2000);

    // A credential update must preserve the administrator's model choices.
    const updatedTraining = currentTraining;
    const cloudTrain = getCloudPersistenceStatus();
    if (canAcceptCloudWrite(cloudTrain)) {
      try { await saveCloudTrainingTargeted(updatedTraining); }
      catch (e: any) { scheduleCloudSync('aiTraining'); }
    } else {
      scheduleCloudSync('aiTraining');
    }

    const safeTraining: any = { ...updatedTraining };
    delete safeTraining.geminiApiKey;

    const safeInfo = {
      configured: info.configured,
      masked: info.masked,
      source: 'firebase',
      warning: info.warning,
      modelTested: info.modelTested,
      training: safeTraining,
      autoConfiguredModel: updatedTraining.modelName,
      autoConfiguredFallback: updatedTraining.fallbackModelName,
    };
    res.json({ success: true, ...safeInfo, auditRecorded: true });
  } catch (err: any) {
    console.error('[GeminiKey] Validation/cloud-save failed:', err?.message || err);
    res.status(400).json({ success: false, error: err?.message || 'Không thể xác thực hoặc lưu Gemini API key vào Firebase.' });
  }
});

app.post('/api/ai/config/test-key', requireAdminAuth, requireAIAccess('view'), async (req, res) => {
  try {
    const { apiKey } = req.body || {};
    const targetKey = apiKey ? String(apiKey).trim() : (getGeminiApiKeyInfo().apiKey || '');
    if (!targetKey) {
      return res.status(400).json({ success: false, error: 'Chưa có Gemini API key nào để kiểm tra.' });
    }
    const result = await validateAndTestGeminiApiKey(targetKey);
    res.json({
      success: true,
      valid: result.valid,
      modelTested: result.modelTested,
      latencyMs: result.latencyMs,
      warning: result.warning,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err?.message || 'Kiểm tra API Key thất bại',
    });
  }
});

app.delete('/api/ai/config/gemini-key', requireAdminAuth, requireAIAccess('edit'), async (req, res) => {
  try {
    const session = (req as any).adminSession;
    const auditEntry: AuditLogEntry = {
      id: `log_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      timestamp: nowIso(),
      action: 'AI_CONFIG_UPDATE',
      actorEmail: session?.email || 'system@baoviet.internal',
      actorRole: session?.role || 'system',
      ipAddress: clientIp(req),
      details: 'Xóa Gemini API key khỏi Firebase Firestore; credential không được lưu local.',
      status: 'warning',
    };
    const info = await clearStoredGeminiApiKey(auditEntry);
    auditLogsDatabase.unshift(auditEntry);
    auditLogsDatabase = auditLogsDatabase.slice(0, 2000);
    res.json({ success: true, configured: info.configured, masked: info.masked, auditRecorded: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Không thể xóa Gemini API key khỏi Firebase' });
  }
});

// 5.8. Full AI Configuration & Diagnostics Overview (View & Edit)
app.get('/api/ai/config/overview', requireAdminAuth, requireAIAccess('view'), async (req, res) => {
  try {
    await hydrateGeminiApiKeyFromCloud();
    const training = { ...getAiTrainingConfig() }; delete (training as any).geminiApiKey;
    const knowledgeItems = getKnowledgeDatabase();
    const taxonomy = getTaxonomyData();
    const available = isGeminiAvailable();
    const apiKeyInfo = getGeminiApiKeyInfo();

    const stats = {
      totalKnowledgeItems: knowledgeItems.length,
      activeKnowledgeItems: knowledgeItems.filter(k => k.active).length,
      productsCount: taxonomy.products?.length || 0,
      categoriesCount: taxonomy.categories?.length || 0,
      componentTypesCount: taxonomy.componentTypes?.length || 0,
    };

    res.json({
      success: true,
      status: available ? 'ready' : 'missing_key',
      geminiAvailable: available,
      apiKeyConfigured: apiKeyInfo.configured,
      apiKeyMasked: apiKeyInfo.masked,
      apiKeySource: apiKeyInfo.source,
      modelName: training.modelName || 'gemini-3.8-flash',
      fallbackModelName: training.fallbackModelName || 'gemini-3.1-flash-lite',
      temperature: typeof training.temperature === 'number' ? training.temperature : 0.4,
      maxOutputTokens: training.maxOutputTokens || 2048,
      topKRetrieval: training.topKRetrieval || 5,
      useSearchGrounding: training.useSearchGrounding ?? true,
      strictKnowledgeOnly: training.strictKnowledgeOnly ?? false,
      systemPromptPrefix: training.systemPromptPrefix || '',
      training,
      stats,
      serverTime: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Lỗi khi lấy thông tin tổng quan cấu hình AI' });
  }
});

// 5.9. AI Key Health, Error History & Redis Chat Cache API
app.get('/api/ai/health-summary', requireAdminAuth, requireAIAccess('view'), async (req, res) => {
  try {
    const errorLogs = getGeminiErrorLogs(100);
    const quotaState = getActiveQuotaExceededState();
    const cacheStats = getChatCacheStats();
    const apiKeyInfo = getGeminiApiKeyInfo();
    const training = getAiTrainingConfig();

    res.json({
      success: true,
      health: {
        errorLogs,
        quotaState,
        cacheStats,
        apiKeyInfo,
        activeModel: training?.modelName || 'gemini-3.8-flash',
        fallbackModel: training?.fallbackModelName || 'gemini-3.1-flash-lite',
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Lỗi khi lấy dữ liệu giám sát sức khỏe AI' });
  }
});

app.post('/api/ai/clear-error-logs', requireAdminAuth, requireAIAccess('edit'), (req, res) => {
  try {
    clearGeminiErrorLogs();
    res.json({ success: true, message: 'Đã xóa sạch lịch sử lỗi gọi API.' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Lỗi khi xóa lịch sử lỗi' });
  }
});

app.post('/api/ai/reset-quota-alert', requireAdminAuth, requireAIAccess('edit'), (req, res) => {
  try {
    resetQuotaExceededAlert();
    res.json({ success: true, message: 'Đã thiết lập lại cảnh báo giới hạn Quota.' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Lỗi khi đặt lại trạng thái Quota' });
  }
});

app.post('/api/ai/clear-chat-cache', requireAdminAuth, requireAIAccess('edit'), async (req, res) => {
  try {
    await clearChatCache('manual_admin_clear');
    res.json({ success: true, message: 'Đã vô hiệu hóa bộ nhớ đệm phản hồi Gemini trên Redis.' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Lỗi khi xóa cache' });
  }
});

app.post('/api/ai/config/save', requireAdminAuth, requireAIAccess('edit'), async (req, res) => {
  try {
    const incoming = req.body || {};
    const updated = saveAiTrainingConfig(incoming);
    const cloudCfg = getCloudPersistenceStatus();
    if (canAcceptCloudWrite(cloudCfg)) {
      try { await saveCloudTrainingTargeted(updated); }
      catch (cloudError: any) {
        console.warn('[Cloud Persistence] Lưu cấu hình AI Cloud lỗi, đã lưu local & hẹn sync:', cloudError?.message || cloudError);
        scheduleCloudSync('aiTraining');
      }
    } else {
      scheduleCloudSync('aiTraining');
    }
    await invalidateChatCache('ai_config_update');
    recordAuditLog(
      'AI_CONFIG_UPDATE',
      (req as any).adminSession,
      `Cập nhật toàn diện cấu hình AI (Model: ${updated.modelName || 'gemini-3.8-flash'}, Temp: ${updated.temperature})`,
      clientIp(req),
      'success'
    );
    const safeConfig:any = { ...updated }; delete safeConfig.geminiApiKey;
    res.json({ success: true, config: safeConfig });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Lỗi khi lưu cấu hình AI' });
  }
});

app.post('/api/ai/config/test-ping', requireAdminAuth, requireAIAccess('view'), async (req, res) => {
  const startTime = Date.now();
  try {
    const { prompt, modelName, temperature } = req.body || {};
    const training = getAiTrainingConfig();
    const primaryTarget = modelName || training.modelName || 'gemini-3.8-flash';
    const client = getGeminiClient();

    // The test must probe the requested model exactly, without silent fallback.
    const candidateModels = [primaryTarget];
    const resPayload = await callGeminiModelWithResilience(client, candidateModels, (m) =>
      client.models.generateContent({
        model: m,
        contents: prompt || 'Hãy trả lời ngắn gọn trong một câu: Bạn là trợ lý gì và có thể giúp người dùng như thế nào?',
        config: {
          systemInstruction: `Bạn là ${training.botName || 'Trợ lý AI'}. Xưng là ${training.aiPronoun || 'Em'} và gọi khách là ${training.customerPronoun || 'Quý khách'}. Trả lời ngắn gọn, lịch sự, thân thiện.`,
          temperature: typeof temperature === 'number' ? temperature : (training.temperature || 0.4),
        },
      })
    );

    const durationMs = Date.now() - startTime;
    res.json({
      success: true,
      reply: resPayload.response.text || '(Không nhận được phản hồi văn bản)',
      modelUsed: resPayload.modelUsed,
      durationMs,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err?.message || 'Không thể kết nối với Gemini API',
      durationMs: Date.now() - startTime,
    });
  }
});

// 6. Upload & Process Internal Document (PDF, DOCX, XLSX, TXT)
app.post('/api/ai/knowledge/upload', requireAdminAuth, requireAIAccess('edit'), async (req, res) => {
  try {
    const { fileBase64, fileName, mimeType, defaultProduct, defaultCategory, autoSave } = req.body || {};
    if (!fileBase64 || !fileName) {
      return res.status(400).json({ error: 'Vui lòng cung cấp dữ liệu file (fileBase64) và tên file (fileName).' });
    }

    const buffer = Buffer.from(fileBase64, 'base64');
    const result = await processAndExtractUpload({
      buffer,
      fileName: sanitizeString(fileName),
      mimeType,
      defaultProduct: defaultProduct ? sanitizeString(defaultProduct) : undefined,
      defaultCategory: defaultCategory ? sanitizeString(defaultCategory) : undefined,
      autoSave: autoSave !== false,
      taxonomy: enrichTaxonomyRelationships(getTaxonomyData()),
    });

    if (result.savedItems && result.savedItems.length) {
      const cloudUpload = getCloudPersistenceStatus();
      if (canAcceptCloudWrite(cloudUpload)) {
        try {
          for (const item of result.savedItems) {
            await saveCloudKnowledgeItemTargeted(item);
          }
        } catch (cloudError: any) {
          console.warn('[Cloud Persistence] Lưu tài liệu tri thức Cloud lỗi, đã lưu local & hẹn sync:', cloudError?.message || cloudError);
          scheduleCloudSync('aiKnowledge');
        }
      } else {
        scheduleCloudSync('aiKnowledge');
      }
    }
    if (result.savedItems && result.savedItems.length) await invalidateChatCache('knowledge_upload');
    recordAuditLog(
      'KNOWLEDGE_AUTO_EXTRACT',
      (req as any).adminSession,
      `Tải lên & bóc tách tài liệu: ${fileName} (${result.extractedItems.length} mục tri thức)`,
      clientIp(req),
      'success'
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error('[Upload Knowledge Error]:', err);
    res.status(500).json({ error: err?.message || 'Lỗi khi xử lý tải lên tài liệu' });
  }
});

// 7. Auto-Extract Knowledge from Raw Text
app.post('/api/ai/knowledge/auto-extract', requireAdminAuth, requireAIAccess('edit'), async (req, res) => {
  try {
    const { text, defaultProduct, defaultCategory } = req.body || {};
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập nội dung văn bản để bóc tách.' });
    }

    const taxonomy = getTaxonomyData();
    const items = await extractKnowledgeFromDocument({
      documentText: text,
      defaultProduct: defaultProduct ? sanitizeString(defaultProduct) : undefined,
      defaultCategory: defaultCategory ? sanitizeString(defaultCategory) : undefined,
      taxonomy,
    });

    res.json({
      success: true,
      extractedItems: items,
    });
  } catch (err: any) {
    console.error('[Auto Extract Knowledge Error]:', err);
    res.status(500).json({ error: err?.message || 'Lỗi khi tự động bóc tách tri thức' });
  }
});

async function resolveTaxonomyWithAI(
  message: string,
  taxonomy: ReturnType<typeof enrichTaxonomyRelationships>,
): Promise<Partial<ChatRouterResult> | null> {
  if (!isGeminiAvailable()) return null;
  try {
    const client = getGeminiClient();
    if (!client) return null;
    const candidates = {
      products: taxonomy.products.filter((p) => p.active !== false).map((p) => ({
        id: p.id, name: p.name, aliases: p.aliases || [], tags: p.tags || [], keywords: p.keywords || [],
      })),
      categories: taxonomy.categories.filter((c) => c.active !== false).map((c) => ({
        id: c.id, name: c.name, aliases: c.aliases || [], tags: c.tags || [], keywords: c.keywords || [],
      })),
      components: taxonomy.componentTypes.filter((c) => c.active !== false).map((c) => ({
        id: c.id, name: c.name || c.label, code: c.code, aliases: c.aliases || [], tags: c.tags || [], keywords: c.keywords || [],
      })),
    };
    const prompt = `Resolve the user's intent/entities ONLY against this CMS taxonomy. Return JSON only.
User: ${message}
Taxonomy: ${JSON.stringify(candidates)}
Schema: {"intent":"GENERAL_QUESTION|PRODUCT_BENEFIT|PRODUCT_EXCLUSION|PRODUCT_PREMIUM|PRODUCT_PROCEDURE|PRODUCT_OVERVIEW","productId":string|null,"categoryId":string|null,"componentId":string|null}`;
    const response = await callGeminiModelWithResilience(
      client,
      ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-flash-latest'],
      (model) => client.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { temperature: 0, maxOutputTokens: 500 },
      }),
      { endpoint: '/api/ai/chat/taxonomy-resolver', queryPreview: message },
    );
    const raw = String(response.response?.text || '').replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(raw);
    const product = parsed.productId ? taxonomy.products.find((p) => p.id === parsed.productId && p.active !== false) : null;
    const category = parsed.categoryId ? taxonomy.categories.find((c) => c.id === parsed.categoryId && c.active !== false) : null;
    const component = parsed.componentId ? taxonomy.componentTypes.find((c) => c.id === parsed.componentId && c.active !== false) : null;
    return {
      intent: parsed.intent || 'GENERAL_QUESTION',
      confidence: product || category || component ? 0.9 : 0,
      product: product ? { id: product.id, name: product.name, matchedBy: 'keyword' } : null,
      category: category ? { id: category.id, name: category.name, matchedBy: 'keyword' } : null,
      component: component ? { id: component.id, name: component.name || component.label, matchedBy: 'keyword' } : null,
    };
  } catch (error) {
    console.warn('[Chatbot Taxonomy AI Resolver] fallback to deterministic router:', error);
    return null;
  }
}

// Public chatbot taxonomy snapshot. This endpoint exposes only routing metadata,
// never internal knowledge content or source URLs.
app.get('/api/ai/taxonomy', (_req, res) => {
  const taxonomy = enrichTaxonomyRelationships(getTaxonomyData());
  res.json({
    products: taxonomy.products.filter((p) => p.active !== false).map((p) => ({
      id: p.id,
      name: p.name,
      aliases: p.aliases || [],
      tags: p.tags || [],
      keywords: p.keywords || [],
      normalizedName: p.normalizedName,
      categoryId: p.categoryId,
    })),
    categories: taxonomy.categories.filter((c) => c.active !== false),
    componentTypes: taxonomy.componentTypes.filter((c) => c.active !== false),
  });
});

// 8. Multi-turn AI Chat with Knowledge Base RAG, Auto Lead Capture, Session Tracking & Staff Takeover
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, history, productFilter, useSearchGrounding, pageContext, trainingConfig, botName, sessionId, customerName, customerPhone, selectedProductId } = req.body || {};
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Nội dung tin nhắn không được để trống.' });
    }

    const cleanMsg = sanitizeString(message);
    const timeNow = nowIso();
    const timeNum = Date.now();
    const requestedTimeZone = sanitizeString(pageContext?.clientTimeZone || 'Asia/Ho_Chi_Minh');
    let clientTimeZone = 'Asia/Ho_Chi_Minh';
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: requestedTimeZone }).format(new Date());
      clientTimeZone = requestedTimeZone;
    } catch {
      // Keep Vietnam time as the safe default for this landing page.
    }

    // Find or initialize ChatSession
    let session = await findChatSession(String(sessionId || ''));
    if (!session) {
      session = {
        id: sessionId || `session_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        customerName: customerName ? sanitizeString(customerName) : undefined,
        customerPhone: customerPhone ? sanitizeString(customerPhone) : undefined,
        pageUrl: pageContext?.pageUrl || '/',
        pageTitle: pageContext?.pageTitle || 'Landing Page',
        currentProduct: undefined,
        productSelectionConfirmed: false,
        status: 'ai_active',
        aiDropped: false,
        unreadByStaff: false,
        createdAt: timeNow,
        updatedAt: timeNow,
        messages: [],
      };
      chatSessionsDatabase.unshift(session);
    }

    // Append customer message
    const userMsg: ChatMessage = {
      id: `msg_u_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
      role: 'user',
      text: cleanMsg,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: timeNum,
    };
    session.messages.push(userMsg);
    session.lastCustomerMessageAt = timeNum;
    session.updatedAt = timeNow;
    if (customerName) session.customerName = sanitizeString(customerName);
    if (customerPhone) session.customerPhone = sanitizeString(customerPhone);
    if (pageContext?.pageUrl) session.pageUrl = pageContext.pageUrl;
    if (pageContext?.pageTitle) session.pageTitle = pageContext.pageTitle;
    // Never seed/overwrite product context from page props. Product context is confirmed only
    // when the customer explicitly names/selects a product in this chat session.

    // Taxonomy is the single routing source of truth. Never seed product context
    // from landing-page props, the first database row, or an AI-generated name.
    const taxonomy = enrichTaxonomyRelationships(getTaxonomyData());
    const taxonomyProducts = taxonomy.products.filter((p:any) => p.active !== false);

    // Backward-compatible hydration for old sessions: only an already persisted
    // currentProduct can restore an existing conversation state; a new session
    // remains product-null until the customer explicitly resolves a product.
    if (!session.currentProductId && session.currentProduct && session.productSelectionConfirmed) {
      const restored = resolveProduct(session.currentProduct, taxonomy);
      if (restored) {
        session.currentProductId = restored.entity.id;
        const restoredCategory = getProductCategory(restored.entity, taxonomy);
        session.currentCategoryId = restoredCategory?.id;
        session.currentCategory = restoredCategory?.name;
      }
    }

    // Step 14: a single canonical orchestration pipeline owns routing + semantic
    // conversation-state mutation for this turn. server.ts no longer invokes the
    // individual intelligence services independently, preventing order conflicts.
    const orchestration = await orchestrateConversationTurn({
      message: cleanMsg,
      session,
      taxonomy,
      knowledgeItems: getKnowledgeDatabase(),
      forcedProductId: selectedProductId ? sanitizeString(selectedProductId) : undefined,
    });
    const { router, conversationReasoning, scopedKnowledge } = orchestration;
    const activeProductId = orchestration.activeProductId;
    const activeProduct = activeProductId ? taxonomyProducts.find((p) => p.id === activeProductId) : null;
    const activeCategory = activeProduct ? getProductCategory(activeProduct, taxonomy) : null;

    // Gemini-first mode: orchestration may still produce deterministic routing
    // metadata (for example product options), but it is no longer allowed to
    // answer the customer directly. The routing result becomes context for Gemini
    // so every normal chatbot turn passes through the same AI response layer.
    const directRoutingContext = orchestration.directResponse?.reply || '';

    console.log('[Chatbot Orchestrator]', JSON.stringify({
      sessionId:session.id,
      intent:router.intent,
      conversationMode:router.conversationMode,
      productId:activeProductId || null,
      categoryId:activeCategory?.id || null,
      componentId:session.currentComponentId || null,
      subjectId:session.activeConversationSubject || 'self',
      knowledgeCount:scopedKnowledge.length,
    }));

    // Check staff takeover & AI drop state:
    // If AI was dropped and staff intervened recently, customer message enters waiting_staff state with a 15-second window
    if (session.aiDropped) {
      const timeSinceLastStaff = session.lastStaffMessageAt ? timeNum - session.lastStaffMessageAt : Number.POSITIVE_INFINITY;
      const isWithinTimeout = timeSinceLastStaff < AI_STAFF_RESPONSE_TIMEOUT_MS;
      if (session.lastStaffMessageAt && isWithinTimeout) {
        session.status = 'waiting_staff';
        session.unreadByStaff = true;
        session.aiResumeTimeoutAt = timeNum + AI_STAFF_RESPONSE_TIMEOUT_MS;
        const waitingReply = 'Chuyên viên tư vấn đang kết nối hỗ trợ trực tiếp. Nếu sau 15 giây chưa có nhân viên hoạt động/phản hồi, Trợ lý AI sẽ tự động tiếp tục giải đáp ngay!';
        session.messages.push({
          id: `msg_ai_wait_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
          role: 'model',
          text: waitingReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          createdAt: Date.now(),
        });
        session.updatedAt = nowIso();
        await saveChatSessionsToDisk(session);
        return res.json({
          success: true,
          sessionId: session.id,
          waitingForStaff: true,
          aiDropped: true,
          aiResumeTimeoutAt: session.aiResumeTimeoutAt,
          reply: waitingReply,
          sessionStatus: 'waiting_staff',
        });
      } else {
        // 15 seconds have elapsed with no staff response -> AI resumes automatically!
        session.aiDropped = false;
        session.status = 'ai_active';
        delete session.aiResumeTimeoutAt;
      }
    }

    // Gemini-first chatbot orchestration:
    // - EVERY normal customer turn is sent through Gemini.
    // - Taxonomy + CMS Knowledge provide routing/grounding context.
    // - Product facts remain Knowledge-grounded; Gemini supplies conversation,
    //   explanation and reasoning for both in-scope and out-of-scope questions.
    // The public client cannot override the CMS-owned model and safety settings.
    const activeTraining = getAiTrainingConfig();
    let result:any = null;
    // Product knowledge is owned by the Landing/CMS Knowledge Base.
    // Chatbot answers must
    // come from scoped CMS knowledge and the rebuilt chatbot orchestration.
    if (!result) result = await runRebuiltChatbot({
      message: cleanMsg,
      // Server session history is canonical. Client history is intentionally not
      // trusted as conversation state because it may be stale/tampered and would
      // defeat Redis session continuity across restarts/replicas.
      history: session.messages
        // The current customer message was appended above for session/audit state,
        // but Gemini already receives it separately as `message`. Exclude that one
        // message here so first-turn requests remain cache-eligible and the model
        // never sees the same customer question twice.
        .filter((m) => (m.role === 'user' || m.role === 'model') && m.id !== userMsg.id)
        .slice(-8)
        .map((m) => ({ role: m.role as 'user' | 'model', text: m.text })),
      router,
      taxonomy,
      knowledgeItems: scopedKnowledge,
      activeProductId,
      activeProductName: activeProduct?.name,
      activeProductNames: router.conversationMode === 'MULTI_PRODUCT'
        ? router.products.map((p) => p.name)
        : activeProduct?.name ? [activeProduct.name] : [],
      conversationMode: router.conversationMode,
      activeCategoryId: activeCategory?.id,
      activeComponentId: session.currentComponentId,
      conversationReasoning,
      orchestrationContext: directRoutingContext,
      pageContext: {
        ...(pageContext || {}),
        phone: sanitizeString(resolveChatSupportPhone(getHomePage()?.draft)),
        clientTimeZone,
      },
      trainingConfig: activeTraining,
      botName: botName ? sanitizeString(botName) : activeTraining?.botName,
      useSearchGrounding: !!useSearchGrounding,
    });

    // Lead capture must work on Knowledge/Taxonomy replies as well as AI replies.
    if (!result.capturedLead) {
      const phone = cleanMsg.match(/(?:0\d{9,10}|\+84\d{9,10})/);
      if (phone) result.capturedLead = {
        name: session.customerName || 'Khách hàng quan tâm qua AI Chatbot',
        phone: phone[0], product: activeProduct?.name,
      };
    }

    // Save AI response into session messages
    const modelMsg: ChatMessage = {
      id: `msg_ai_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
      role: 'model',
      text: result.reply,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sources: result.sources,
      quickReplies: result.quickReplies,
      createdAt: Date.now(),
    };
    session.messages.push(modelMsg);
    session.status = 'ai_active';
    session.updatedAt = nowIso();

    // If customer provided lead info in chat, automatically record lead into Leads Database
    let createdLeadId: string | undefined;
    if (result.capturedLead && result.capturedLead.phone) {
      try {
        const lead: LeadSubmission = {
          id: `lead_ai_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
          submittedAt: nowIso(),
          name: sanitizeString(result.capturedLead.name || 'Khách hàng quan tâm qua AI Chatbot'),
          email: '',
          phone: sanitizeString(result.capturedLead.phone),
          customResponses: {
            interestedProduct: sanitizeString(result.capturedLead.product || session.currentProduct || 'Thông tin cần hỗ trợ'),
            source: 'AI Chatbot Landing Page',
            consultationNote: `Khách hàng để lại thông tin qua Chatbot AI khi hỏi: "${cleanMsg}"`,
          },
          tracking: {
            utmSource: 'ai_chatbot',
            pageUrl: pageContext?.pageUrl || '/',
            deviceType: 'mobile',
            page: sanitizeString(pageContext?.pageTitle || 'Landing Page'),
            product: sanitizeString(result.capturedLead.product || session.currentProduct || 'Thông tin cần hỗ trợ'),
            formId: 'ai_chatbot',
          },
          syncStatus: 'pending',
        };
        leadsDatabase.unshift(lead);
        saveLeadsToDisk();
        createdLeadId = lead.id;
        if (!session.customerName && result.capturedLead.name) session.customerName = sanitizeString(result.capturedLead.name);
        if (!session.customerPhone && result.capturedLead.phone) session.customerPhone = sanitizeString(result.capturedLead.phone);
      } catch (e) {
        console.error('[Auto Lead Capture Error]:', e);
      }
    }

    await saveChatSessionsToDisk(session);

    res.json({
      success: true,
      sessionId: session.id,
      sessionStatus: session.status,
      aiDropped: session.aiDropped,
      reply: result.reply,
      // Return the canonical server message id. The public widget may receive the
      // same message first through its 2.5s session sync; using one id lets the UI
      // upsert instead of rendering the same AI answer twice.
      messageId: modelMsg.id,
      messageCreatedAt: modelMsg.createdAt,
      sources: result.sources,
      quickReplies: result.quickReplies,
      capturedLead: result.capturedLead ? { ...result.capturedLead, leadId: createdLeadId } : undefined,
      fromCache: !!(result as any).fromCache,
      cacheHitCount: (result as any).cacheHitCount,
      quotaExceeded: !!(result as any).quotaExceeded,
      modelUsed: (result as any).modelUsed,
      needsProductSelection: !!orchestration.directResponse?.needsProductSelection,
      productOptions: orchestration.directResponse?.productOptions,
      currentProduct: session.currentProduct || null,
      productId: session.currentProductId || null,
      categoryId: session.currentCategoryId || null,
      componentId: session.currentComponentId || null,
    });
  } catch (err: any) {
    console.error('[AI Chat Error]:', err);
    res.status(500).json({
      error: err?.message || 'Có lỗi xảy ra trong quá trình tư vấn AI.',
    });
  }
});

// Persist deterministic/local chatbot events (e.g. Pricing Engine UI) into the same
// CMS ChatSession. This keeps one history record per conversation flow, not per message.
app.post('/api/ai/chat/session-events', async (req, res) => {
  const { sessionId, messages, customerName, customerPhone, pageContext, currentProduct } = req.body || {};
  const incoming = Array.isArray(messages) ? messages.slice(0, 10) : [];
  if (!incoming.length) return res.status(400).json({ error: 'Không có tin nhắn để lưu.' });
  const timeNow = nowIso();
  let session = await findChatSession(String(sessionId || ''));
  if (!session) {
    session = {
      id: sessionId || `session_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      customerName: customerName ? sanitizeString(customerName) : undefined,
      customerPhone: customerPhone ? sanitizeString(customerPhone) : undefined,
      pageUrl: pageContext?.pageUrl || '/', pageTitle: pageContext?.pageTitle || 'Landing Page',
      currentProduct: currentProduct ? sanitizeString(currentProduct) : undefined,
      productSelectionConfirmed: !!currentProduct,
      status: 'ai_active', aiDropped: false, unreadByStaff: false,
      createdAt: timeNow, updatedAt: timeNow, messages: [],
    };
    chatSessionsDatabase.unshift(session);
  }
  for (const raw of incoming) {
    const text = sanitizeString(raw?.text || '');
    if (!text) continue;
    const role = raw?.role === 'model' ? 'model' : 'user';
    session.messages.push({
      id: `msg_local_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      role, text,
      timestamp: new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }),
      createdAt: Date.now(),
    });
  }
  if (customerName) session.customerName = sanitizeString(customerName);
  if (customerPhone) session.customerPhone = sanitizeString(customerPhone);
  if (currentProduct) {
    const taxonomy = enrichTaxonomyRelationships(getTaxonomyData());
    const resolved = resolveProduct(sanitizeString(currentProduct), taxonomy);
    if (resolved) {
      const category = getProductCategory(resolved.entity, taxonomy);
      session.currentProductId = resolved.entity.id;
      session.currentProduct = resolved.entity.name;
      session.productSelectionConfirmed = true;
      session.currentCategoryId = category?.id;
      session.currentCategory = category?.name;
    }
  }
  session.updatedAt = nowIso();
  await saveChatSessionsToDisk(session);
  res.json({ success:true, sessionId:session.id });
});

// Admin Chat Sessions API
app.get('/api/ai/chat/sessions', requireAdminAuth, async (req, res) => {
  await hydrateChatSessionsFromRedis();
  const query = sanitizeString(String(req.query.q || '')).toLowerCase();
  const status = String(req.query.status || 'all');
  let list = [...chatSessionsDatabase];

  if (status !== 'all') {
    list = list.filter(s => s.status === status);
  }
  if (query) {
    list = list.filter(s =>
      (s.customerName && s.customerName.toLowerCase().includes(query)) ||
      (s.customerPhone && s.customerPhone.includes(query)) ||
      (s.currentProduct && s.currentProduct.toLowerCase().includes(query)) ||
      s.messages.some(m => m.text.toLowerCase().includes(query))
    );
  }

  list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  res.json(list);
});

app.get('/api/ai/chat/sessions/:id', requireAdminAuth, async (req, res) => {
  const session = await findChatSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Không tìm thấy phiên chat.' });
  session.unreadByStaff = false;
  await saveChatSessionsToDisk(session);
  res.json(session);
});

// Public sync for AiChatbotWidget to receive staff responses in real-time
app.get('/api/ai/chat/sessions/:id/sync', async (req, res) => {
  const session = await findChatSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Không tìm thấy phiên chat.' });
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    success: true,
    sessionId: session.id,
    status: session.status,
    aiDropped: session.aiDropped,
    aiResumeTimeoutAt: session.aiResumeTimeoutAt,
    messages: session.messages,
  });
});

// Staff sends message into chat
app.post('/api/ai/chat/sessions/:id/messages', requireAdminAuth, async (req, res) => {
  const s = sessionOf(req)!;
  const canChat = s.role === 'superadmin' || s.role === 'marketing_admin' || s.role === 'content_editor' || s.permissions?.canTakeoverChat === true || s.permissions?.allowedTabs?.includes('ai-knowledge');
  if (!canChat) return res.status(403).json({ error: 'Bạn không có quyền gửi tin nhắn tư vấn.' });

  const session = await findChatSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Không tìm thấy phiên chat.' });

  const text = sanitizeString(req.body?.text || '');
  if (!text) return res.status(400).json({ error: 'Nội dung tin nhắn không được để trống.' });

  const senderName = sanitizeString(req.body?.senderName) || s.displayName || 'Chuyên viên Tư vấn';
  const staffMsg: ChatMessage = {
    id: `msg_staff_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
    role: 'staff',
    senderName,
    text,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdAt: Date.now(),
  };

  session.messages.push(staffMsg);
  session.lastStaffMessageAt = Date.now();
  session.status = 'staff_takeover';
  session.aiDropped = true; // Staff takes over and AI is dropped
  session.unreadByStaff = false;
  delete session.aiResumeTimeoutAt;
  session.updatedAt = nowIso();

  await saveChatSessionsToDisk(session);
  recordAuditLog('CHAT_STAFF_REPLY' as any, s, `Nhân viên trả lời chat khách hàng: ${session.customerName || session.id}`, clientIp(req));
  res.json({ success: true, message: staffMsg, session });
});

// Toggle AI dropped state (Manual drop or resume)
app.post('/api/ai/chat/sessions/:id/toggle-ai', requireAdminAuth, async (req, res) => {
  const s = sessionOf(req)!;
  const session = await findChatSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Không tìm thấy phiên chat.' });

  const aiDropped = req.body?.aiDropped !== undefined ? !!req.body.aiDropped : !session.aiDropped;
  session.aiDropped = aiDropped;
  session.status = aiDropped ? 'staff_takeover' : 'ai_active';
  if (!aiDropped) delete session.aiResumeTimeoutAt;
  session.updatedAt = nowIso();

  await saveChatSessionsToDisk(session);
  recordAuditLog('CHAT_AI_TOGGLE' as any, s, `${aiDropped ? 'Ngắt AI' : 'Bật lại AI'} cho phiên ${session.customerName || session.id}`, clientIp(req));
  res.json({ success: true, session });
});

// Trigger 15s timeout automatic AI resume
app.post('/api/ai/chat/sessions/:id/trigger-ai-timeout', async (req, res) => {
  try {
    const session = await findChatSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'Không tìm thấy phiên chat.' });

    // AI resumes automatically after 15s with no staff response
    session.aiDropped = false;
    session.status = 'ai_active';
    delete session.aiResumeTimeoutAt;

    // Find the latest user message to answer
    const lastUserMsg = [...session.messages].reverse().find(m => m.role === 'user');
    let aiReplyText = '';

    if (lastUserMsg && isGeminiAvailable()) {
      const taxonomy = enrichTaxonomyRelationships(getTaxonomyData());
      const activeProduct = session.currentProductId ? taxonomy.products.find((p) => p.id === session.currentProductId) : (session.currentProduct ? resolveProduct(session.currentProduct, taxonomy)?.entity : null);
      const activeCategory = activeProduct ? getProductCategory(activeProduct, taxonomy) : null;
      const scopedKnowledge = filterKnowledgeByTaxonomy(
        getKnowledgeDatabase(),
        taxonomy,
        activeProduct?.id,
        session.currentComponentId,
        activeCategory?.id,
      );
      const activeTraining = getAiTrainingConfig();
      const result = await runGeminiChat({
        message: lastUserMsg.text,
        history: session.messages
          .filter(m => m.role === 'user' || m.role === 'model')
          .map(m => ({ role: m.role as 'user' | 'model', text: m.text }))
          .slice(-8),
        knowledgeItems: scopedKnowledge,
        productFilter: activeProduct?.name,
        trainingConfig: activeTraining,
      });

      aiReplyText = result.reply;
      const modelMsg: ChatMessage = {
        id: `msg_ai_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
        role: 'model',
        text: result.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: result.sources,
        quickReplies: result.quickReplies,
        createdAt: Date.now(),
      };
      session.messages.push(modelMsg);
    } else {
      aiReplyText = 'Dạ Trợ lý AI đã tự động quay lại hỗ trợ Quý khách! Quý khách cần tra cứu thêm quyền lợi hoặc thủ tục nào ạ?';
      session.messages.push({
        id: `msg_ai_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
        role: 'model',
        text: aiReplyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: Date.now(),
      });
    }

    session.updatedAt = nowIso();
    await saveChatSessionsToDisk(session);
    res.json({ success: true, session, reply: aiReplyText });
  } catch (err: any) {
    console.error('[AI Timeout Resume Error]:', err);
    res.status(500).json({ error: err?.message || 'Lỗi khi tự động tiếp tục AI' });
  }
});

// Delete chat session
app.delete('/api/ai/chat/sessions/:id', requireAdminAuth, async (req, res) => {
  const s = sessionOf(req)!;
  chatSessionsDatabase = chatSessionsDatabase.filter(item => item.id !== req.params.id);
  await deleteRedisChatSession(req.params.id);
  recordAuditLog('CHAT_SESSION_DELETE' as any, s, `Xóa phiên chat: ${req.params.id}`, clientIp(req), 'warning');
  res.json({ success: true });
});

// 9. Text-to-Speech (TTS)
app.post('/api/ai/tts', async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Thiếu nội dung văn bản.' });
    }
    const audioBase64 = await generateSpeechAudio(text);
    res.json({ success: !!audioBase64, audioBase64 });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Lỗi chuyển đổi giọng nói' });
  }
});

// 10. Suggest Quick Questions
app.get('/api/ai/suggest-questions', async (req, res) => {
  try {
    const requestedProduct = String(req.query.product || '').trim();
    const taxonomy = enrichTaxonomyRelationships(getTaxonomyData());
    const resolved = requestedProduct ? resolveProduct(requestedProduct, taxonomy) : null;
    // Suggestion generation is also taxonomy-scoped. Never let the page/default
    // product become an implicit product for a new conversation.
    const product = resolved?.entity?.name || '';
    const questions = await suggestQuickQuestions(product);
    res.json({ success: true, questions, product: product || null });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Lỗi khi gợi ý câu hỏi' });
  }
});

app.post('/api/leads', async(req,res)=>{
  const ip=clientIp(req);if(req.body?.website_trap)return res.json({success:true,leadId:'lead_bot_drop',message:'Submitted',synced:false});
  const now=Date.now();const history=(ipSubmissionTimestamps.get(ip)||[]).filter(t=>now-t<60000);if(history.length>=5||history.some(t=>now-t<3000))return res.status(429).json({error:'Vui lòng chờ trước khi gửi lại.'});history.push(now);ipSubmissionTimestamps.set(ip,history);
  const tracking=req.body?.tracking||{};const page=(tracking.page?getPageById(tracking.page):undefined) || getPageBySlug(new URL(String(tracking.pageUrl||'http://local/'), 'http://local').pathname) || getHomePage();const config=page.publishedConfig;const form=getFormDefinition(config,tracking.formId);if(!form.enabled||form.deletedAt)return res.status(400).json({error:'Form hiện không hoạt động.'});
  const custom:any={...(req.body?.customResponses||{})};for(const [k,v] of Object.entries(custom)){if(typeof v==='string')custom[k]=sanitizeString(v);if(Array.isArray(v))custom[k]=v.map(x=>sanitizeString(x));}
  let name=sanitizeString(req.body?.name)||'Khách hàng';let email=sanitizeString(req.body?.email).toLowerCase();let phone=sanitizeString(req.body?.phone);
  const fields=(form.fields||[]).filter(f=>f.visible!==false&&!f.deletedAt);
  if(!email){const f=fields.find(x=>x.type==='email'||/email/i.test(x.name));if(f)email=String(custom[f.name]||'').trim().toLowerCase();}
  if(!phone){const f=fields.find(x=>x.type==='tel'||/phone|thoai|sđt/i.test(`${x.name} ${x.label}`));if(f)phone=String(custom[f.name]||'').trim();}
  if(name==='Khách hàng'){const f=fields.find(x=>/name|tên|họ/i.test(`${x.name} ${x.label}`));if(f&&custom[f.name])name=String(custom[f.name]).trim();}
  for(const field of fields){const value=custom[field.name] ?? (field.name==='name'?name:field.name==='phone'?phone:field.name==='email'?email:undefined);if(field.required&&(value===undefined||value===null||value===''||(Array.isArray(value)&&!value.length)))return res.status(400).json({error:`Vui lòng nhập trường '${field.label}'.`});if(field.type==='email'&&value&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value)))return res.status(400).json({error:`${field.label} không hợp lệ.`});if(field.type==='tel'&&value&&String(value).replace(/\D/g,'').length<8)return res.status(400).json({error:`${field.label} không hợp lệ.`});if(field.minLength&&String(value||'').length<field.minLength)return res.status(400).json({error:field.validationMessage||`${field.label} cần tối thiểu ${field.minLength} ký tự.`});if(field.maxLength&&String(value||'').length>field.maxLength)return res.status(400).json({error:field.validationMessage||`${field.label} vượt quá ${field.maxLength} ký tự.`});if(field.validationPattern&&value){try{if(!new RegExp(field.validationPattern).test(String(value)))return res.status(400).json({error:field.validationMessage||`${field.label} không đúng định dạng.`});}catch{}}
  }
  const lead:LeadSubmission={id:`lead_bv_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,submittedAt:nowIso(),name,email,phone,customResponses:custom,tracking:{utmSource:sanitizeString(tracking.utmSource),utmMedium:sanitizeString(tracking.utmMedium),utmCampaign:sanitizeString(tracking.utmCampaign),utmContent:sanitizeString(tracking.utmContent),utmTerm:sanitizeString(tracking.utmTerm),pageUrl:sanitizeString(tracking.pageUrl||req.headers.referer),userAgent:String(req.headers['user-agent']||''),ipHash:crypto.createHash('sha256').update(ip+'bv_salt').digest('hex').slice(0,12),deviceType:['mobile','desktop','tablet'].includes(tracking.deviceType)?tracking.deviceType:'mobile',page:page.id,section:sanitizeString(tracking.section),product:sanitizeString(tracking.product),eventName:sanitizeString(tracking.eventName),formId:form.id},syncStatus:'pending'};
  let synced=false;const sheet=config.googleSheets;
  if(sheet?.webhookUrl && sheet?.autoSync !== false && (sheet.connectionMethod === 'webhook' ? !!sheet.isConnected : !sheet.connectionMethod)){try{await sendLeadToWebhook(sheet.webhookUrl,lead,config);lead.syncStatus='synced';lead.syncedAt=nowIso();synced=true;}catch(e:any){lead.syncStatus='failed';lead.syncError=e.message;}}
  if(!synced&&sheet?.isConnected&&sheet?.autoSync !== false&&sheet?.connectionMethod !== 'webhook'&&sheet?.spreadsheetId&&cachedAdminToken){try{await appendToGoogleSheet(sheet.spreadsheetId,sheet.sheetName||'Leads',lead,config,cachedAdminToken);lead.syncStatus='synced';lead.syncedAt=nowIso();synced=true;}catch(e:any){lead.syncStatus='failed';lead.syncError=e.message;}}
  leadsDatabase.unshift(lead);
  saveLeadsToDisk();
  // Cloud sync is optional. Never hold the customer's form response while Firestore is offline.
  void saveCloudLeadTargeted(lead).catch((cloudErr) => {
    console.warn('[Cloud Persistence] Lead write:', cloudErr);
  });
  // Telegram is a lead notification channel only. Never forward chatbot transcript/history.
  // CMS Lead remains authoritative. No RC pricing/lead mirror is started in this edition.
  // Customer lead notifications are independent from Firestore and Google Sheets.
  // Telegram failure must never make the public form fail; it is logged for diagnosis.
  let telegramSent = false;
  let telegramError = '';
  try {
    const tg = await sendTelegramLeadNow({
      id: lead.id, submittedAt: lead.submittedAt, name: lead.name, phone: lead.phone, email: lead.email,
      customResponses: lead.customResponses, tracking: lead.tracking as any,
      fieldLabels: Object.fromEntries(fields.map(field=>[field.name,field.label||field.name])),
    });
    telegramSent = tg.sent === true;
    if (telegramSent) console.log('[Telegram Lead Alert] sent:', tg.messageId || 'ok', lead.id);
  } catch (telegramErr:any) {
    telegramError = String(telegramErr?.message || telegramErr || 'Telegram send failed');
    console.warn('[Telegram Lead Alert] direct send failed:', telegramError);
  }
  res.json({success:true,leadId:lead.id,message:form.settings.successMessage||'Gửi yêu cầu thành công!',synced,telegramSent,telegramError:telegramError||undefined});
});
app.get('/api/leads', requireAdminAuth, requireRoles('superadmin','marketing_admin','viewer'), (_req,res)=>{
  try {
    res.setHeader('Cache-Control','no-store');
    return res.status(200).json(Array.isArray(leadsDatabase) ? leadsDatabase : []);
  } catch (error:any) {
    console.error('[GET /api/leads] failed:', error?.stack || error?.message || error);
    return res.status(200).json([]);
  }
});
app.delete('/api/leads/:id', requireAdminAuth, async (req, res) => {
  const s = sessionOf(req)!;
  const canDelete = s.role === 'superadmin' || s.role === 'marketing_admin' || s.permissions?.canDeleteLeads === true || (s.permissions?.allowedTabs?.includes('leads') && s.permissions?.canEditTabs?.includes('leads'));
  if (!canDelete) {
    return res.status(403).json({ error: 'Bạn không có quyền xóa dữ liệu khách hàng (Leads).' });
  }
  const lead = leadsDatabase.find(l => l.id === req.params.id);
  if (!lead) return res.status(404).json({ error: 'Không tìm thấy lead.' });
  leadsDatabase = leadsDatabase.filter(l => l.id !== lead.id);
  saveLeadsToDisk();
  const cloudLeadDel = getCloudPersistenceStatus();
  if (canAcceptCloudWrite(cloudLeadDel)) {
    try {
      await deleteCloudLeadTargeted(lead.id);
    } catch (err: any) {
      console.warn('[Cloud Persistence] Xóa lead Cloud lỗi, đã lưu local & hẹn sync:', err?.message || err);
      scheduleCloudSync('leads');
    }
  } else {
    scheduleCloudSync('leads');
  }
  recordAuditLog('LEAD_DELETE', s, `Xóa lead ${lead.name} (${lead.phone})`, clientIp(req), 'warning');
  res.json({ success: true, message: 'Đã xóa lead thành công.' });
});
app.delete('/api/leads', requireAdminAuth, async (req, res) => {
  const s = sessionOf(req)!;
  const canDelete = s.role === 'superadmin' || s.role === 'marketing_admin' || s.permissions?.canDeleteLeads === true || (s.permissions?.allowedTabs?.includes('leads') && s.permissions?.canEditTabs?.includes('leads'));
  if (!canDelete) {
    return res.status(403).json({ error: 'Bạn không có quyền xóa danh sách khách hàng (Leads).' });
  }
  const deletedCount = leadsDatabase.length;
  leadsDatabase = [];
  saveLeadsToDisk();
  const cloudLeadsClear = getCloudPersistenceStatus();
  if (canAcceptCloudWrite(cloudLeadsClear)) {
    flushScheduledCloudSync().catch((err) => {
      console.warn('[Cloud Persistence] Leads clear sync:', err);
    });
  } else {
    scheduleCloudSync('leads');
  }
  recordAuditLog('LEAD_DELETE', s, `Xóa toàn bộ danh sách lead (${deletedCount} bản ghi)`, clientIp(req), 'warning');
  res.json({ success: true, deletedCount });
});
app.post('/api/leads/sync-all', requireAdminAuth, requireRoles('superadmin','marketing_admin'), async(req,res)=>{
  const s=sessionOf(req)!;const page=getPageById(req.body?.pageId)||getHomePage();const config=page.draft;const webhook=String(req.body?.webhookUrl||config.googleSheets.webhookUrl||'').trim();const googleToken=await backendSheetsToken().catch(()=>'');const sheetId=String(req.body?.spreadsheetId||config.googleSheets.spreadsheetId||'');const sheetName=String(req.body?.sheetName||config.googleSheets.sheetName||'Leads');let syncedCount=0;const errors:string[]=[];
  for(const lead of leadsDatabase.filter(l=>l.syncStatus!=='synced')){try{const leadPage=getPageById(lead.tracking.page)||page;const leadConfig=leadPage.draft;if(webhook)await sendLeadToWebhook(webhook,lead,leadConfig);else{if(!sheetId||!googleToken)throw new Error('Thiếu Google Sheet ID hoặc OAuth token.');await appendToGoogleSheet(sheetId,sheetName,lead,leadConfig,googleToken);}lead.syncStatus='synced';lead.syncedAt=nowIso();delete lead.syncError;syncedCount++;}catch(e:any){lead.syncStatus='failed';lead.syncError=e.message;errors.push(`${lead.name}: ${e.message}`);}}
  saveLeadsToDisk();recordAuditLog('LEAD_SYNC',s,`Đồng bộ ${syncedCount} lead`,clientIp(req),errors.length?'warning':'success');res.json({success:true,syncedCount,totalPending:leadsDatabase.filter(l=>l.syncStatus!=='synced').length,method:webhook?'webhook':'oauth',errors});
});

function applyCloudStateToMemory(state: Awaited<ReturnType<typeof readCloudState>>) {
  if (!state.exists) return;
  if (Array.isArray(state.pages)) {
    pagesDatabase = state.pages.map((page: any) => ({
      ...page,
      slug: cleanSlug(page.slug),
      draft: normalizeLandingConfig(page.draft),
      publishedConfig: normalizeLandingConfig(page.publishedConfig || page.draft),
    }));
  }
  if (Array.isArray(state.leads)) leadsDatabase = state.leads;
  if (Array.isArray(state.adminAccounts)) adminAccountsDatabase = state.adminAccounts;
  if (Array.isArray(state.auditLogs)) auditLogsDatabase = state.auditLogs;
  if (Array.isArray(state.versions)) versionsDatabase = state.versions;
  if (Array.isArray(state.analytics)) analyticsDatabase = state.analytics.slice(-100000);
  if (Array.isArray(state.analyticsCosts)) analyticsCostsDatabase = state.analyticsCosts;
  if (state.aiInitialized) {
    // Cloud state is authoritative when it has been successfully restored. Each
    // restored AI setting is also written to the local durable store so a subsequent
    // restart has the same latest configuration even if Firestore is temporarily unavailable.
    if (Array.isArray(state.aiKnowledge)) replaceKnowledgeDatabase(state.aiKnowledge);
    if (state.aiTaxonomy && typeof state.aiTaxonomy === 'object') replaceTaxonomyData(state.aiTaxonomy);
    if (state.aiTraining && typeof state.aiTraining === 'object') replaceAiTrainingConfig(state.aiTraining);
    // Chat transcripts are intentionally not hydrated from Firestore; active sessions come from Redis.
  }
  if (state.systemState) systemState = state.systemState;
  enforceSharedSiteConfig();
  if (state.firebaseConfig?.projectId) saveCustomerFirebaseConfig(state.firebaseConfig);
  savePagesToDisk(false);
  writeJson(SYSTEM_STATE_FILE, systemState);
}


function mergeLegacyProductKnowledgeIntoCms(): boolean {
  // Product knowledge/contact content must be
  // uploaded and managed through the original Landing/CMS Knowledge Base.
  // Keep this no-op for migration-call compatibility; never seed RC product data.
  return false;
}

async function initializePersistentCloud(){
  cloudAuthoritativeReady = !IS_PRODUCTION_RUNTIME;
  const localFirebaseConfig = loadCustomerFirebaseConfig();
  const production = IS_PRODUCTION_RUNTIME;
  let cloud: Awaited<ReturnType<typeof initializeCloudPersistence>> = await initializeCloudPersistence(localFirebaseConfig);

  // Never hammer Firestore during a quota condition. RESOURCE_EXHAUSTED is not a
  // transient network error; retrying it immediately only makes the outage worse.
  for (let attempt = 1; !cloud.ready && attempt <= 3; attempt++) {
    const message = String(cloud.error || '');
    if (/RESOURCE_EXHAUSTED|quota exceeded|quota\/rate/i.test(message)) break;
    console.warn(`[Cloud Persistence] Khởi tạo Firestore chưa sẵn sàng (${attempt}/3): ${cloud.error || 'unknown'}`);
    await new Promise((resolve) => setTimeout(resolve, Math.min(2000 * attempt, 6000)));
    cloud = await initializeCloudPersistence(localFirebaseConfig);
  }

  if (!cloud.ready) {
    cloudStartupBlocked = production;
    console.error(`[Cloud Persistence] ${cloud.error || 'không thể kết nối Firestore'}`);
    return;
  }

  // v1.0.55: replay durable writes that survived a Render restart BEFORE Firestore
  // is hydrated back into Node memory. Otherwise an old remote snapshot can overwrite
  // newer local edits that were already acknowledged and safely queued in Redis.
  startCloudMessageQueue();
  const replayedQueuedWrites = await drainCloudMessageQueue(2000, 90000).catch((error:any) => {
    console.warn('[Message Queue] Startup replay chưa hoàn tất:', error?.message || error);
    return 0;
  });
  if (replayedQueuedWrites > 0) console.log(`[Message Queue] Startup replay: ${replayedQueuedWrites} job đã được ghi Cloud trước khi hydrate.`);
  const queueAfterReplay:any = await getCloudWriteQueueStatus().catch(() => null);
  if (production && queueAfterReplay && (Number(queueAfterReplay.pending || 0) > 0 || Number(queueAfterReplay.leased || 0) > 0)) {
    cloudStartupBlocked = true;
    console.warn(`[Message Queue] Còn ${Number(queueAfterReplay.pending || 0)} pending / ${Number(queueAfterReplay.leased || 0)} leased; tạm hoãn hydrate Firestore để không ghi đè bản Save mới hơn.`);
    return;
  }

  try {
    // Step 20: remove any legacy transcript collection once connected. New chat turns are never persisted.
    try { await purgeCloudChatSessions(); } catch (e:any) { console.warn('[Chat Privacy] Legacy chat purge failed:', e?.message || e); }
    const remote = await readCloudState();
    if (remote.exists) {
      if (!remote.pages?.length) throw new Error('Firestore có metadata nhưng không có Landing Page; đã chặn fallback.');
      applyCloudStateToMemory(remote);
      const importedLegacyProductKnowledge = mergeLegacyProductKnowledgeIntoCms();
      cloudAuthoritativeReady = true;
      if (importedLegacyProductKnowledge || !remote.aiInitialized || Number(remote.schemaVersion || 1) < 4) {
        await saveCloudState(cloudSnapshot(), ['aiKnowledge','aiTaxonomy','aiTraining','settings']);
      }
      console.log(`[Cloud Persistence] Đã khôi phục dữ liệu từ Firestore (${remote.updatedAt || 'unknown'}).`);
      try {
        await hydrateGeminiApiKeyFromCloud();
        console.log('[GeminiKey] Đã hydrate credential từ Firebase Firestore; không sử dụng local storage.');
      } catch (keyError: any) {
        console.warn(`[GeminiKey] Không thể hydrate credential từ Firebase: ${keyError?.message || keyError}`);
      }
    } else {
      if (production && !hadPersistedPagesAtStartup && !hadLegacyConfigAtStartup) {
        // Confirmed empty Firestore project: the new default source contains
        // only an unpublished, brand-neutral homepage (no product/sample data).
        // It is safe to initialize this draft after a successful remote read.
        console.log('[Cloud Persistence] Khởi tạo bản nháp CMS trung tính trên Firestore mới.');
      }
      ensureDefaultAdminMigration();
      mergeLegacyProductKnowledgeIntoCms();
      await saveCloudState(cloudSnapshot());
      try {
        await hydrateGeminiApiKeyFromCloud();
        console.log('[GeminiKey] Đã kiểm tra credential trong Firebase Firestore; không sử dụng local storage.');
      } catch (keyError: any) {
        console.warn(`[GeminiKey] Không thể hydrate credential từ Firebase: ${keyError?.message || keyError}`);
      }
      cloudAuthoritativeReady = true;
      console.log('[Cloud Persistence] Firestore chưa có dữ liệu; đã migrate dữ liệu hiện tại lên Cloud.');
    }
  } catch (error: any) {
    cloudStartupBlocked = production;
    console.error(`[Cloud Persistence] KHÔNG khôi phục được Cloud state: ${error?.message || error}`);
    if (!production) ensureDefaultAdminMigration();
    return;
  }

  cloudStartupBlocked = false;
  if (!cloudAuthoritativeReady) cloudAuthoritativeReady = true;
  // Firestore remote onSnapshot is intentionally disabled on Spark. Draft/publish already
  // return authoritative API responses; background full-state listeners can amplify reads.
  if (!(await flushScheduledCloudSync())) { cloudStartupBlocked = production; return; }
}

let cloudRecoveryTimer: NodeJS.Timeout | null = null;
function startCloudRecoveryLoop() {
  if (cloudRecoveryTimer) return;
  cloudRecoveryTimer = setInterval(async () => {
    const current = getCloudPersistenceStatus();
    if (current.ready && !current.degraded && cloudAuthoritativeReady) return;
    const retryAt = current.retryAt ? Date.parse(current.retryAt) : 0;
    if (retryAt && Date.now() < retryAt) return;
    const config = loadCustomerFirebaseConfig();
    if (!config.projectId) return;
    try {
      const recovered = await initializeCloudPersistence(config);
      if (!recovered.ready) return;
      startCloudMessageQueue();
      await drainCloudMessageQueue(2000, 90000);
      const queueState:any = await getCloudWriteQueueStatus().catch(() => null);
      if (queueState && (Number(queueState.pending || 0) > 0 || Number(queueState.leased || 0) > 0)) return;
      const remote = await readCloudState();
      if (!remote.exists || !remote.pages?.length) return;
      applyCloudStateToMemory(remote);
      cloudAuthoritativeReady = true;
      cloudStartupBlocked = false;
      console.log(`[Cloud Persistence] Recovery thành công (${remote.updatedAt || 'unknown'}).`);
    } catch (error: any) {
      console.warn(`[Cloud Persistence] Recovery chưa thành công: ${error?.message || error}`);
    }
  }, 60000);
}

async function startServer(){
  const lkgRecovery = recoverFromLkgIfLocalStateInvalid();
  if (!readLkgFile(LKG_CURRENT_FILE)) createLkgSnapshot(lkgRecovery.restored ? 'startup-recovered' : 'startup-baseline');
  console.log(`[LKG] Directory: ${LKG_DIR}${LKG_DIR.startsWith('/var/data') ? ' (persistent-disk path)' : ' (local runtime path; mount /var/data for deploy durability)'}`);
  // Register diagnostics before cloud initialization. The HTTP listener is also started
  // before the Firestore retry loop so Render health checks never wait on cloud startup.
  app.get('/api/health', (_req,res) => {
    const cloud = getCloudPersistenceStatus();
    const cloudMode = cloud.ready ? (cloud.degraded ? 'firestore-degraded' : 'firestore-authoritative') : 'blocked';
    res.setHeader('Cache-Control','no-store');
    res.json({ status:'ok', mode: cloudMode, pages:pagesDatabase.filter(p=>!p.deletedAt).length, leadsCount:leadsDatabase.length, analyticsEvents:analyticsDatabase.length, activeSessionsCount:activeSessions.size, cloudPersistence:{...cloud,startupBlocked:cloudStartupBlocked} });
  });
  app.get('/api/cloud/status', async (_req,res)=>{
    const cloud = getCloudPersistenceStatus();
    const cloudMode = cloud.ready ? (cloud.degraded ? 'firestore-degraded' : 'firestore-authoritative') : 'blocked';
    res.setHeader('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma','no-cache');
    res.setHeader('Expires','0');
    res.json({
      configured: cloud.configured,
      ready: cloud.ready,
      degraded: Boolean(cloud.degraded),
      projectId: cloud.projectId || null,
      lastSyncAt: cloud.lastSyncAt || null,
      error: cloud.ready ? undefined : cloud.error || 'Firestore chưa sẵn sàng.',
      retryAt: cloud.retryAt || null,
      startupBlocked: cloudStartupBlocked,
      mode: cloudMode,
      lastWrite: cloud.lastWriteOperation ? {
        operation: cloud.lastWriteOperation,
        at: cloud.lastWriteAt || null,
        error: cloud.lastWriteError || null,
      } : null,
      messageQueue: await getCloudWriteQueueStatus(),
    });
  });

  app.get('/api/cloud/persistence-status', requireAdminAuth, (_req,res)=>{
    res.json(getCloudPersistenceStatus());
  });
  app.get('/api/cloud/queue-status', requireAdminAuth, requireRoles('superadmin','marketing_admin'), async (_req,res)=>{
    res.setHeader('Cache-Control','no-store');
    res.json(await getCloudWriteQueueStatus());
  });
  app.post('/api/cloud/queue/retry-dead', requireAdminAuth, requireRoles('superadmin'), async (req,res)=>{
    const count = await retryDeadCloudWriteJobs(Number(req.body?.limit || 50));
    res.json({ success:true, requeued:count, queue:await getCloudWriteQueueStatus() });
  });
  app.delete('/api/cloud/queue/dead', requireAdminAuth, requireRoles('superadmin'), async (req,res)=>{
    const count = await purgeDeadCloudWriteJobs(Number(req.query.limit || 200));
    res.json({ success:true, purged:count, queue:await getCloudWriteQueueStatus() });
  });
  app.get('/api/cloud/diagnostics', requireAdminAuth, requireRoles('superadmin'), (_req,res)=>{
    const config = loadCustomerFirebaseConfig();
    const credential = getFirebaseCredentialDiagnostics();
    res.setHeader('Cache-Control','no-store');
    res.json({
      ok: getCloudPersistenceStatus().ready,
      webProjectId: config.projectId || null,
      credential: {
        presentEnvNames: credential.present,
        resolvedSource: credential.resolvedSource || null,
        resolvedProjectId: credential.resolvedProjectId || null,
        error: credential.error || null,
      },
      persistence: getCloudPersistenceStatus(),
      note: 'Endpoint này chỉ hiển thị tên biến/trạng thái; không trả secret/private key.',
    });
  });
  app.get('/favicon.ico', (_req,res)=>{
    // v1.0.49 static-first favicon contract:
    // 1) public/favicon.ico -> copied by Vite to dist/favicon.ico in production
    // 2) CMS/Firestore favicon -> compatibility fallback only
    const staticCandidates = [
      { path:path.join(process.cwd(),'dist','favicon.ico'), type:'image/x-icon' },
      { path:path.join(process.cwd(),'dist','favicon.png'), type:'image/png' },
      { path:path.join(process.cwd(),'dist','favicon.webp'), type:'image/webp' },
      { path:path.join(process.cwd(),'public','favicon.ico'), type:'image/x-icon' },
      { path:path.join(process.cwd(),'public','favicon.png'), type:'image/png' },
      { path:path.join(process.cwd(),'public','favicon.webp'), type:'image/webp' },
    ];
    for (const candidate of staticCandidates) {
      try {
        if (fs.existsSync(candidate.path) && fs.statSync(candidate.path).isFile()) {
          res.setHeader('Cache-Control','no-store, max-age=0');
          res.type(candidate.type);
          return fs.createReadStream(candidate.path).pipe(res);
        }
      } catch {}
    }
    const home=getHomePage();
    const config=home?.publishedConfig || home?.draft || defaultLandingConfig;
    const favicon=configFavicon(config);
    if (!favicon) return res.status(204).end();
    if (/^data:image\/(?:png|jpe?g|webp|gif|x-icon|vnd\.microsoft\.icon);base64,/i.test(favicon)) {
      const match=favicon.match(/^data:(image\/[^;]+);base64,(.+)$/i);
      if (!match) return res.status(204).end();
      try {
        const data=Buffer.from(match[2],'base64');
        res.setHeader('Cache-Control','no-store, max-age=0');
        return res.type(match[1]).send(data);
      } catch { return res.status(204).end(); }
    }
    if (/^https:\/\//i.test(favicon) || favicon.startsWith('/')) return res.redirect(302,favicon);
    return res.status(204).end();
  });
  app.all(['/tinh-phi','/tinh-phi/*','/pricing','/pricing/*','/api/rc/pricing','/api/rc/pricing/*','/rc4-static','/rc4-static/*'], (_req,res) => res.status(404).json({error:'Tính năng này không tồn tại.'}));
  app.get('/robots.txt', (_req,res)=>{
    const base=publicBaseUrl();
    res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /api/\n${base?`Sitemap: ${base}/sitemap.xml\n`:''}`);
  });
  app.get('/sitemap.xml', (_req,res)=>{
    const base=publicBaseUrl();
    if(!base)return res.status(503).type('text/plain').send('APP_PUBLIC_URL chưa cấu hình.');
    const rows=pagesDatabase.filter(page=>page.id!=='page_pricing'&&!['/tinh-phi','/pricing'].includes(page.slug)&&!page.deletedAt&&page.status==='active'&&page.published===true&&page.publishedConfig?.published!==false)
      .map(page=>({loc:`${base}${page.slug==='/'?'':page.slug}`,lastmod:page.lastPublishedAt||page.updatedAt}));
    const body=rows.map(row=>`  <url><loc>${htmlEscape(row.loc)}</loc>${row.lastmod?`<lastmod>${htmlEscape(String(row.lastmod).slice(0,10))}</lastmod>`:''}</url>`).join('\n');
    res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`);
  });
  if(!IS_PRODUCTION_RUNTIME){
    const vite=await createViteServer({server:{middlewareMode:true},appType:'spa'});app.use(vite.middlewares);
  } else {
    const distPath=path.join(process.cwd(),'dist');
    const indexPath=path.join(distPath,'index.html');
    const indexTemplate=fs.readFileSync(indexPath,'utf8');
    app.use(express.static(distPath,{index:false}));
    app.get('*',(req,res)=>{
      const pathname=cleanSlug(String(req.path||'/'));
      res.type('html').send(injectPublicSeo(indexTemplate,pathname));
    });
  }

  const server = app.listen(PORT,process.env.APP_HOST || (process.env.APP_PORT ? '127.0.0.1' : '0.0.0.0'),()=>console.log(`[Startup] CMS listening on http://0.0.0.0:${PORT}`));
  // Render can briefly proxy a request while the Node process is recycling.
  // Keep-alive/request timeouts are intentionally generous for AI/document endpoints
  // and reduce avoidable 502/504 errors during long-lived connections.
  server.keepAliveTimeout = 120000;
  server.headersTimeout = 125000;
  server.requestTimeout = 120000;
  server.timeout = 120000;
  server.on('error', (error: any) => {
    console.error('[Startup] HTTP server error:', error?.stack || error?.message || error);
  });

  // Do not block the HTTP listener while Firestore retries. Until ready, the published
  // route and mutation guard return 503 instead of exposing or overwriting local defaults.
  // HOTFIX3: Product Knowledge must be usable by CMS even when Firestore is offline.
  // Remote state remains authoritative when available: initializePersistentCloud()
  // hydrates it and re-merges by stable IDs, so this local bootstrap is idempotent.
  mergeLegacyProductKnowledgeIntoCms();

  try {
    await initializePersistentCloud();
    startCloudRecoveryLoop();
  } catch (error: any) {
    console.error('[Cloud Persistence] Startup initialization failed:', error?.stack || error?.message || error);
    if (IS_PRODUCTION_RUNTIME) cloudStartupBlocked = true;
    startCloudRecoveryLoop();
  }
  startCloudMessageQueue();
  if (cloudWriteQueueConfigured()) console.log('[Message Queue] Redis durable Cloud write queue enabled.');
}

void startServer().catch((error: any) => {
  console.error('[Startup] Fatal server initialization error:', error?.stack || error?.message || error);
  process.exitCode = 1;
});
