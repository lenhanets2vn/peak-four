import {encodeStoredJson,decodeStoredJson} from './securityServer';
import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import {
  KnowledgeItem,
  KnowledgeComponentType,
  KnowledgeTaxonomyData,
  TaxonomyProduct,
  TaxonomyCategory,
  TaxonomyComponentType,
  AiTrainingConfig,
} from '../types';
import { DEFAULT_AI_TRAINING_CONFIG } from '../utils/aiConfigDefaults';
import { extractKnowledgeFromDocument } from './geminiServer';

const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(process.cwd(), 'data');
const KNOWLEDGE_FILE = path.join(DATA_DIR, 'knowledge_base.json');
const TAXONOMY_FILE = path.join(DATA_DIR, 'knowledge_taxonomy.json');
const TRAINING_FILE = path.join(DATA_DIR, 'ai_training_config.json');

type PersistenceHealth = 'ok' | 'missing' | 'invalid';
const initialPersistenceHealth: { knowledge: PersistenceHealth; taxonomy: PersistenceHealth; training: PersistenceHealth } = {
  knowledge: 'missing', taxonomy: 'missing', training: 'missing',
};
export function getKnowledgePersistenceHealth() { return { ...initialPersistenceHealth }; }

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// --------------------------------------------------------------------------
// 1. KNOWLEDGE BASE ITEMS
// --------------------------------------------------------------------------

function readKnowledgeFromDisk(): KnowledgeItem[] {
  ensureDataDir();
  try {
    if (fs.existsSync(KNOWLEDGE_FILE)) {
      const content = fs.readFileSync(KNOWLEDGE_FILE, 'utf-8');
      const parsed = decodeStoredJson(content);
      // An existing empty array is authoritative: the administrator may have
      // intentionally deleted every knowledge item. Never re-seed defaults on
      // restart just because the knowledge base is empty.
      if (Array.isArray(parsed)) {
        initialPersistenceHealth.knowledge = 'ok';
        return parsed;
      }
      initialPersistenceHealth.knowledge = 'invalid';
    } else {
      initialPersistenceHealth.knowledge = 'missing';
    }
  } catch (err) {
    initialPersistenceHealth.knowledge = 'invalid';
    console.error('[KnowledgeService] Error reading knowledge base from disk:', err);
  }

  // No bundled/sample knowledge is allowed. An absent file means an empty KB.
  writeKnowledgeToDisk([]);
  return [];
}

let cloudPersistenceHook: (() => void) | null = null;
let localPersistenceHook: (() => void) | null = null;
export function setKnowledgeCloudPersistenceHook(hook: (() => void) | null) { cloudPersistenceHook = hook; }
export function setKnowledgeLocalPersistenceHook(hook: (() => void) | null) { localPersistenceHook = hook; }
function writeKnowledgeToDisk(items: KnowledgeItem[], syncCloud = true) {
  ensureDataDir();
  try {
    const temp = `${KNOWLEDGE_FILE}.${process.pid}.tmp`;
    fs.writeFileSync(temp, encodeStoredJson(items), 'utf-8');
    fs.renameSync(temp, KNOWLEDGE_FILE);
  } catch (err) {
    console.error('[KnowledgeService] Error writing knowledge base to disk:', err);
  }
  localPersistenceHook?.();
  if (syncCloud) cloudPersistenceHook?.();
}
export function replaceKnowledgeDatabase(items: KnowledgeItem[]) { knowledgeDatabase = Array.isArray(items) ? items : []; }

let knowledgeDatabase: KnowledgeItem[] = readKnowledgeFromDisk();

export function getKnowledgeDatabase(): KnowledgeItem[] {
  return knowledgeDatabase;
}

export function saveKnowledgeDatabase(items: KnowledgeItem[]) {
  knowledgeDatabase = items;
  writeKnowledgeToDisk(items);
}

export function getKnowledgeItemById(id: string): KnowledgeItem | undefined {
  return knowledgeDatabase.find((k) => k.id === id);
}

export function createKnowledgeItem(data: Omit<KnowledgeItem, 'id' | 'createdAt' | 'updatedAt'>): KnowledgeItem {
  const newItem: KnowledgeItem = {
    ...data,
    id: `kb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  knowledgeDatabase.unshift(newItem);
  writeKnowledgeToDisk(knowledgeDatabase, false);
  return newItem;
}

export function updateKnowledgeItem(id: string, updates: Partial<KnowledgeItem>): KnowledgeItem | null {
  const index = knowledgeDatabase.findIndex((k) => k.id === id);
  if (index === -1) return null;

  knowledgeDatabase[index] = {
    ...knowledgeDatabase[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  writeKnowledgeToDisk(knowledgeDatabase, false);
  return knowledgeDatabase[index];
}

export function deleteKnowledgeItem(id: string): boolean {
  const initialLength = knowledgeDatabase.length;
  knowledgeDatabase = knowledgeDatabase.filter((k) => k.id !== id);
  if (knowledgeDatabase.length !== initialLength) {
    writeKnowledgeToDisk(knowledgeDatabase, false);
    return true;
  }
  return false;
}

export function deleteKnowledgeItemsByProduct(productName: string): { deletedCount: number; deletedIds: string[] } {
  const norm = (productName || '').trim().toLowerCase();
  const deletedIds: string[] = [];
  const initialLength = knowledgeDatabase.length;
  knowledgeDatabase = knowledgeDatabase.filter((k) => {
    if ((k.product || '').trim().toLowerCase() === norm) {
      deletedIds.push(k.id);
      return false;
    }
    return true;
  });
  if (deletedIds.length > 0) {
    writeKnowledgeToDisk(knowledgeDatabase, false);
  }
  return { deletedCount: deletedIds.length, deletedIds };
}

export function bulkDeleteKnowledgeItems(ids: string[]): { deletedCount: number; deletedIds: string[] } {
  const idSet = new Set((ids || []).map((id) => String(id || '').trim()).filter(Boolean));
  const deletedIds: string[] = [];
  knowledgeDatabase = knowledgeDatabase.filter((k) => {
    if (idSet.has(k.id)) {
      deletedIds.push(k.id);
      return false;
    }
    return true;
  });
  if (deletedIds.length > 0) {
    writeKnowledgeToDisk(knowledgeDatabase, false);
  }
  return { deletedCount: deletedIds.length, deletedIds };
}

export function resetKnowledgeToDefaults(): KnowledgeItem[] {
  // Reset now means clear all bundled/sample knowledge. No sample data is restored.
  knowledgeDatabase = [];
  writeKnowledgeToDisk(knowledgeDatabase);
  return knowledgeDatabase;
}

export function bulkAddKnowledgeItems(items: Array<Omit<KnowledgeItem, 'id' | 'createdAt' | 'updatedAt'>>): KnowledgeItem[] {
  const now = new Date().toISOString();
  const createdItems: KnowledgeItem[] = items.map((item, idx) => ({
    ...item,
    id: `kb_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
    createdAt: now,
    updatedAt: now,
  }));

  knowledgeDatabase.unshift(...createdItems);
  writeKnowledgeToDisk(knowledgeDatabase);
  return createdItems;
}

// --------------------------------------------------------------------------
// 2. KNOWLEDGE TAXONOMY (PRODUCTS, CATEGORIES, COMPONENT TYPES)
// --------------------------------------------------------------------------

function readTaxonomyFromDisk(): KnowledgeTaxonomyData {
  ensureDataDir();
  try {
    if (fs.existsSync(TAXONOMY_FILE)) {
      const content = fs.readFileSync(TAXONOMY_FILE, 'utf-8');
      const parsed = decodeStoredJson(content);
      if (parsed && Array.isArray(parsed.products) && Array.isArray(parsed.categories) && Array.isArray(parsed.componentTypes)) {
        initialPersistenceHealth.taxonomy = 'ok';
        return parsed;
      }
      initialPersistenceHealth.taxonomy = 'invalid';
    } else {
      initialPersistenceHealth.taxonomy = 'missing';
    }
  } catch (err) {
    initialPersistenceHealth.taxonomy = 'invalid';
    console.error('[KnowledgeService] Error reading taxonomy from disk:', err);
  }

  const empty: KnowledgeTaxonomyData = { products: [], categories: [], componentTypes: [] };
  writeTaxonomyToDisk(empty);
  return empty;
}

function writeTaxonomyToDisk(data: KnowledgeTaxonomyData, syncCloud = true) {
  ensureDataDir();
  try {
    const temp = `${TAXONOMY_FILE}.${process.pid}.tmp`;
    fs.writeFileSync(temp, encodeStoredJson(data), 'utf-8');
    fs.renameSync(temp, TAXONOMY_FILE);
  } catch (err) {
    console.error('[KnowledgeService] Error writing taxonomy to disk:', err);
  }
  localPersistenceHook?.();
  if (syncCloud) cloudPersistenceHook?.();
}
export function replaceTaxonomyData(data: KnowledgeTaxonomyData) {
  taxonomyData = data && typeof data === 'object'
    ? {
        products: Array.isArray(data.products) ? data.products : [],
        categories: Array.isArray(data.categories) ? data.categories : [],
        componentTypes: Array.isArray(data.componentTypes) ? data.componentTypes : [],
      }
    : { products: [], categories: [], componentTypes: [] };
  writeTaxonomyToDisk(taxonomyData, false);
}

let taxonomyData: KnowledgeTaxonomyData = readTaxonomyFromDisk();

export function getTaxonomyData(): KnowledgeTaxonomyData {
  return taxonomyData;
}

export function saveTaxonomyData(data: KnowledgeTaxonomyData): KnowledgeTaxonomyData {
  taxonomyData = {
    products: Array.isArray(data.products) ? data.products : [],
    categories: Array.isArray(data.categories) ? data.categories : [],
    componentTypes: Array.isArray(data.componentTypes) ? data.componentTypes : [],
  };
  // The API performs the authoritative targeted Firestore write. Do not schedule
  // a second full taxonomy sync here.
  writeTaxonomyToDisk(taxonomyData, false);
  return taxonomyData;
}

export function resetTaxonomyToDefaults(): KnowledgeTaxonomyData {
  taxonomyData = { products: [], categories: [], componentTypes: [] };
  writeTaxonomyToDisk(taxonomyData);
  return taxonomyData;
}

// Product Helpers
export function addTaxonomyProduct(product: Omit<TaxonomyProduct, 'id'> & { id?: string }): TaxonomyProduct {
  const newProd: TaxonomyProduct = {
    ...product,
    id: product.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
  };
  taxonomyData.products.push(newProd);
  writeTaxonomyToDisk(taxonomyData, false);
  return newProd;
}

export function updateTaxonomyProduct(id: string, updates: Partial<TaxonomyProduct>): TaxonomyProduct | null {
  const idx = taxonomyData.products.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  taxonomyData.products[idx] = { ...taxonomyData.products[idx], ...updates };
  writeTaxonomyToDisk(taxonomyData, false);
  return taxonomyData.products[idx];
}

export function deleteTaxonomyProduct(id: string): boolean {
  const initial = taxonomyData.products.length;
  taxonomyData.products = taxonomyData.products.filter((p) => p.id !== id);
  if (taxonomyData.products.length !== initial) {
    writeTaxonomyToDisk(taxonomyData, false);
    return true;
  }
  return false;
}

// Category Helpers
export function addTaxonomyCategory(cat: Omit<TaxonomyCategory, 'id'> & { id?: string }): TaxonomyCategory {
  const newCat: TaxonomyCategory = {
    ...cat,
    id: cat.id || `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
  };
  taxonomyData.categories.push(newCat);
  writeTaxonomyToDisk(taxonomyData, false);
  return newCat;
}

export function updateTaxonomyCategory(id: string, updates: Partial<TaxonomyCategory>): TaxonomyCategory | null {
  const idx = taxonomyData.categories.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  taxonomyData.categories[idx] = { ...taxonomyData.categories[idx], ...updates };
  writeTaxonomyToDisk(taxonomyData, false);
  return taxonomyData.categories[idx];
}

export function deleteTaxonomyCategory(id: string): boolean {
  const initial = taxonomyData.categories.length;
  taxonomyData.categories = taxonomyData.categories.filter((c) => c.id !== id);
  if (taxonomyData.categories.length !== initial) {
    writeTaxonomyToDisk(taxonomyData, false);
    return true;
  }
  return false;
}

// Component Type Helpers
export function addTaxonomyComponentType(comp: Omit<TaxonomyComponentType, 'id'> & { id?: string }): TaxonomyComponentType {
  const newComp: TaxonomyComponentType = {
    ...comp,
    id: comp.id || comp.code || `comp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
  };
  taxonomyData.componentTypes.push(newComp);
  writeTaxonomyToDisk(taxonomyData, false);
  return newComp;
}

export function updateTaxonomyComponentType(id: string, updates: Partial<TaxonomyComponentType>): TaxonomyComponentType | null {
  const idx = taxonomyData.componentTypes.findIndex((c) => c.id === id || c.code === id);
  if (idx === -1) return null;
  taxonomyData.componentTypes[idx] = { ...taxonomyData.componentTypes[idx], ...updates };
  writeTaxonomyToDisk(taxonomyData, false);
  return taxonomyData.componentTypes[idx];
}

export function deleteTaxonomyComponentType(id: string): boolean {
  const initial = taxonomyData.componentTypes.length;
  taxonomyData.componentTypes = taxonomyData.componentTypes.filter((c) => c.id !== id && c.code !== id);
  if (taxonomyData.componentTypes.length !== initial) {
    writeTaxonomyToDisk(taxonomyData, false);
    return true;
  }
  return false;
}

// --------------------------------------------------------------------------
// 3. AI TRAINING & PERSONA CONFIGURATION
// --------------------------------------------------------------------------

function readTrainingConfigFromDisk(): AiTrainingConfig {
  ensureDataDir();
  try {
    if (fs.existsSync(TRAINING_FILE)) {
      const content = fs.readFileSync(TRAINING_FILE, 'utf-8');
      const parsed = decodeStoredJson(content);
      if (parsed && typeof parsed === 'object') {
        initialPersistenceHealth.training = 'ok';
        return { ...DEFAULT_AI_TRAINING_CONFIG, ...parsed, strictKnowledgeOnly: true, useSearchGrounding: false };
      }
      initialPersistenceHealth.training = 'invalid';
    } else {
      initialPersistenceHealth.training = 'missing';
    }
  } catch (err) {
    initialPersistenceHealth.training = 'invalid';
    console.error('[KnowledgeService] Error reading training config from disk:', err);
  }

  writeTrainingConfigToDisk(DEFAULT_AI_TRAINING_CONFIG);
  return { ...DEFAULT_AI_TRAINING_CONFIG };
}

function writeTrainingConfigToDisk(cfg: AiTrainingConfig, syncCloud = true) {
  ensureDataDir();
  try {
    const safe = { ...cfg } as any;
    delete safe.geminiApiKey;
    const temp = `${TRAINING_FILE}.${process.pid}.tmp`;
    fs.writeFileSync(temp, encodeStoredJson(safe), 'utf-8');
    fs.renameSync(temp, TRAINING_FILE);
  } catch (err) {
    console.error('[KnowledgeService] Error writing AI training config to disk:', err);
  }
  localPersistenceHook?.();
  if (syncCloud) cloudPersistenceHook?.();
}
export function replaceAiTrainingConfig(cfg: AiTrainingConfig) {
  trainingConfigState = {
    ...DEFAULT_AI_TRAINING_CONFIG,
    ...(cfg || {}),
    // Product/contract facts must come only from the approved Knowledge Base.
    strictKnowledgeOnly: true,
    useSearchGrounding: false,
  };
  writeTrainingConfigToDisk(trainingConfigState, false);
}

let trainingConfigState: AiTrainingConfig = readTrainingConfigFromDisk();

export function getAiTrainingConfig(): AiTrainingConfig {
  return trainingConfigState;
}

export function saveAiTrainingConfig(cfg: Partial<AiTrainingConfig>): AiTrainingConfig {
  for (const field of ['modelName','fallbackModelName'] as const) {
    const model = cfg[field];
    if (model !== undefined && model !== '' && (typeof model !== 'string' || !/^[a-zA-Z][a-zA-Z0-9._-]{2,100}$/.test(model))) {
      throw new Error(`Model ID ${field} không hợp lệ.`);
    }
  }
  trainingConfigState = {
    ...DEFAULT_AI_TRAINING_CONFIG,
    ...trainingConfigState,
    ...cfg,
    // These two controls are security boundaries, not optional persona settings.
    // The customer chatbot may never use the web or a non-KB source for product facts.
    strictKnowledgeOnly: true,
    useSearchGrounding: false,
  };
  // The API performs the authoritative targeted Firestore write. Do not schedule
  // a second full taxonomy sync here.
  writeTrainingConfigToDisk(trainingConfigState, false);
  return trainingConfigState;
}

export function resetAiTrainingConfig(): AiTrainingConfig {
  trainingConfigState = { ...DEFAULT_AI_TRAINING_CONFIG };
  writeTrainingConfigToDisk(trainingConfigState);
  return trainingConfigState;
}

/**
 * Parses raw file buffer/base64 into clean text:
 * Supports DOCX, XLSX, XLS, CSV, TXT, MD, JSON
 */
export async function parseDocumentBuffer(
  buffer: Buffer,
  fileName: string,
  mimeType?: string
): Promise<{ text: string; fileType: string; isPdf?: boolean }> {
  const ext = path.extname(fileName).toLowerCase().replace('.', '');

  // 1. Word Document (.docx)
  if (ext === 'docx' || mimeType?.includes('wordprocessingml')) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return { text: result.value || '', fileType: 'docx' };
    } catch (err) {
      console.error('[parseDocumentBuffer] Error extracting docx:', err);
      return { text: '', fileType: 'docx' };
    }
  }

  // 2. Excel Spreadsheets (.xlsx, .xls, .csv)
  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv' || mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetTexts: string[] = [];

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        if (csv.trim()) {
          sheetTexts.push(`### Trang tính: ${sheetName}\n${csv}`);
        }
      }

      return { text: sheetTexts.join('\n\n'), fileType: ext === 'csv' ? 'csv' : 'xlsx' };
    } catch (err) {
      console.error('[parseDocumentBuffer] Error extracting excel:', err);
      return { text: '', fileType: 'xlsx' };
    }
  }

  // 3. PDF
  if (ext === 'pdf' || mimeType?.includes('pdf')) {
    return { text: '', fileType: 'pdf', isPdf: true };
  }

  // 4. Plain Text / Markdown / JSON
  try {
    const text = buffer.toString('utf-8');
    return { text, fileType: ext || 'txt' };
  } catch (err) {
    return { text: '', fileType: ext || 'unknown' };
  }
}

/**
 * Processes an uploaded file and uses Gemini to auto-extract structured product knowledge
 */
export async function processAndExtractUpload(params: {
  buffer: Buffer;
  fileName: string;
  mimeType?: string;
  defaultProduct?: string;
  defaultCategory?: string;
  autoSave?: boolean;
  taxonomy?: KnowledgeTaxonomyData;
}): Promise<{
  extractedItems: Array<{
    title: string;
    product: string;
    category: string;
    topic: string;
    componentType: KnowledgeComponentType;
    content: string;
    tags: string[];
  }>;
  parsedText: string;
  fileType: string;
  savedItems?: KnowledgeItem[];
}> {
  const parsed = await parseDocumentBuffer(params.buffer, params.fileName, params.mimeType);

  let extractedItems: Array<{
    title: string;
    product: string;
    category: string;
    topic: string;
    componentType: KnowledgeComponentType;
    content: string;
    tags: string[];
  }> = [];

  if (parsed.isPdf) {
    // Pass PDF base64 directly to Gemini
    const base64 = params.buffer.toString('base64');
    extractedItems = await extractKnowledgeFromDocument({
      fileData: { mimeType: 'application/pdf', base64 },
      sourceFileName: params.fileName,
      defaultProduct: params.defaultProduct,
      defaultCategory: params.defaultCategory,
      taxonomy: params.taxonomy,
    });
  } else if (parsed.text.trim()) {
    extractedItems = await extractKnowledgeFromDocument({
      documentText: parsed.text,
      sourceFileName: params.fileName,
      defaultProduct: params.defaultProduct,
      defaultCategory: params.defaultCategory,
      taxonomy: params.taxonomy,
    });
  } else {
    // Fallback item if no text could be extracted
    extractedItems = [
      {
        title: `Tài liệu: ${params.fileName}`,
        product: params.defaultProduct || '',
        category: params.defaultCategory || '',
        topic: 'Tài liệu nội bộ đã upload',
        componentType: 'overview',
        content: `Tài liệu tải lên từ file: ${params.fileName}`,
        tags: ['tai-lieu', 'noi-bo'],
      },
    ];
  }

  let savedItems: KnowledgeItem[] | undefined;
  if (params.autoSave && extractedItems.length > 0) {
    const taxonomy = params.taxonomy;
    const validProducts = Array.isArray(taxonomy?.products) ? taxonomy!.products.filter((p) => p.active !== false) : [];
    const safeItems = extractedItems.filter((item) => {
      if (!item.product) return false;
      return validProducts.some((p) => p.id === (item as any).productId || p.name === item.product);
    });
    savedItems = safeItems.length > 0 ? bulkAddKnowledgeItems(
      safeItems.map((item) => ({
        ...item,
        sourceFileName: params.fileName,
        fileType: parsed.fileType,
        fileSize: params.buffer.length,
        active: true,
      }))
    ) : [];
  }

  return {
    extractedItems,
    parsedText: parsed.text,
    fileType: parsed.fileType,
    savedItems,
  };
}
