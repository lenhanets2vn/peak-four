import React, { useState, useEffect, useRef } from 'react';
import {
  Brain,
  Upload,
  Download,
  FileText,
  Plus,
  Trash2,
  Edit,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Bot,
  Send,
  Volume2,
  Eye,
  FileSpreadsheet,
  FileCode,
  Tag,
  BookOpen,
  HelpCircle,
  ShieldCheck,
  Zap,
  Layers,
  ChevronDown,
  X,
  ExternalLink,
  FolderTree,
  HeartHandshake,
  Palette,
  Package,
  Sliders,
  Activity,
} from 'lucide-react';
import {
  KnowledgeItem,
  KnowledgeComponentType,
  LandingPageConfig,
  KnowledgeTaxonomyData,
  AiChatbotConfig,
  AiTrainingConfig,
} from '../../types';
import { getAuthHeaders, authFetch } from '../../services/api';
import { TaxonomySettings } from './knowledge/TaxonomySettings';
import { AiPersonaTraining } from './knowledge/AiPersonaTraining';
import { AiChatbotCustomizer } from './knowledge/AiChatbotCustomizer';
import { AiSettingsOverviewEditor } from './knowledge/AiSettingsOverviewEditor';
import { AiHealthAndCacheDashboard } from './knowledge/AiHealthAndCacheDashboard';

interface Props {
  role?: string;
  config?: LandingPageConfig;
  onConfigChange?: (newConfig: LandingPageConfig) => void;
  onNavigateTab?: (tab: string) => void;
  initialTab?: 'settings' | 'knowledge' | 'taxonomy' | 'training' | 'chatbot' | 'health';
  canViewAI?: boolean;
  canEditAI?: boolean;
}

const COMPONENT_TYPE_LABELS: Record<KnowledgeComponentType, { label: string; color: string; desc: string }> = {
  overview: { label: 'Tổng quan & Đối tượng', color: 'bg-blue-50 text-blue-700 border-blue-200', desc: 'Mô tả chung, điều kiện tham gia, phạm vi cơ bản' },
  benefits: { label: 'Quyền lợi & Chi trả', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', desc: 'Bảng quyền lợi, hạn mức đền bù, bảo vệ toàn diện' },
  pricing_rules: { label: 'Biểu phí & Tính phí', color: 'bg-amber-50 text-amber-700 border-amber-200', desc: 'Công thức tính, tỷ lệ phí %, mức khấu trừ, ưu đãi' },
  exclusions: { label: 'Điểm loại trừ & Chờ', color: 'bg-rose-50 text-rose-700 border-rose-200', desc: 'Trường hợp không bồi thường, thời gian chờ bệnh' },
  claim_procedure: { label: 'Quy trình Bồi thường', color: 'bg-purple-50 text-purple-700 border-purple-200', desc: 'Hồ sơ yêu cầu, thời hạn thông báo, các bước giám định' },
  hospitals_garages: { label: 'Bệnh viện & Gara', color: 'bg-cyan-50 text-cyan-700 border-cyan-200', desc: 'Mạng lưới bảo lãnh viện phí, gara chính hãng' },
  faq: { label: 'Câu hỏi thường gặp', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', desc: 'Giải đáp thắc mắc phổ biến của khách hàng' },
  sales_pitch: { label: 'Kịch bản & Lợi thế', color: 'bg-orange-50 text-orange-700 border-orange-200', desc: 'Mẹo chốt sale, so sánh thế mạnh với đối thủ' },
  custom: { label: 'Nội dung khác', color: 'bg-neutral-100 text-neutral-700 border-neutral-300', desc: 'Tài liệu nghiệp vụ bổ trợ' },
};

const COMMON_PRODUCTS: string[] = [];
const COMMON_CATEGORIES: string[] = [];

export const KnowledgeManager: React.FC<Props> = ({ role = 'admin', config, onConfigChange, onNavigateTab, initialTab, canViewAI = true, canEditAI = true }) => {
  const [mainTab, setMainTab] = useState<'settings' | 'knowledge' | 'taxonomy' | 'training' | 'chatbot' | 'health'>(initialTab || 'settings');

  useEffect(() => {
    if (initialTab) {
      setMainTab(initialTab);
    }
  }, [initialTab]);
  const [taxonomy, setTaxonomy] = useState<KnowledgeTaxonomyData>({
    products: [],
    categories: [],
    componentTypes: [],
  });

  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedComponentType, setSelectedComponentType] = useState<string>('all');
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [deletingGroupKey, setDeletingGroupKey] = useState<string | null>(null);
  const [quickDeleteModal, setQuickDeleteModal] = useState<{
    product: string;
    count: number;
    componentCount: number;
    items: KnowledgeItem[];
    taxonomyProductId?: string;
  } | null>(null);
  const [deleteTaxonomyTogether, setDeleteTaxonomyTogether] = useState<boolean>(false);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [expandedComponentGroups, setExpandedComponentGroups] = useState<Set<string>>(new Set());

  // Upload modal & State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadDefaultProduct, setUploadDefaultProduct] = useState(COMMON_PRODUCTS[0]);
  const [uploadDefaultCategory, setUploadDefaultCategory] = useState(COMMON_CATEGORIES[0]);
  const [autoSaveUpload, setAutoSaveUpload] = useState(true);
  const [extractedPreview, setExtractedPreview] = useState<any[] | null>(null);

  // Manual Raw Text Ingestion Trainer
  const [showTextTrainer, setShowTextTrainer] = useState(false);
  const [rawText, setRawText] = useState('');
  const [extractingText, setExtractingText] = useState(false);

  // Edit / Create Item Modal
  const [editingItem, setEditingItem] = useState<Partial<KnowledgeItem> | null>(null);
  const [tagsInputValue, setTagsInputValue] = useState('');
  const [savingItem, setSavingItem] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setTagsInputValue(Array.isArray(editingItem.tags) ? editingItem.tags.join(', ') : '');
    } else {
      setTagsInputValue('');
    }
  }, [editingItem?.id, editingItem === null]);

  // Interactive Live Chat Test Panel
  const [showChatTester, setShowChatTester] = useState(false);
  const [testMessages, setTestMessages] = useState<Array<{ role: 'user' | 'model'; text: string; sources?: string[] }>>([
    {
      role: 'model',
      text: 'Xin chào! Tôi là Trợ lý AI Bảo Việt. Bạn có thể đặt câu hỏi về quyền lợi, biểu phí hoặc quy trình bồi thường để kiểm tra độ hiểu biết sản phẩm của tôi.',
    },
  ]);
  const [testInput, setTestInput] = useState('');
  // One CMS test panel flow = one ChatSession. Reset only when the tester explicitly clears it.
  const [testSessionId, setTestSessionId] = useState<string | null>(null);
  const [testChatting, setTestChatting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  const handleExportKnowledgeBackup = async () => {
    try {
      const res = await authFetch('/api/ai/knowledge/backup', { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Không thể xuất backup');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `baoviet_ai_knowledge_backup_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      setNotice({ text:'Đã xuất file backup đầy đủ Kho tri thức.', type:'success' });
    } catch (err:any) { setNotice({ text:err?.message || 'Không thể xuất backup.', type:'error' }); }
  };

  const handleRestoreKnowledgeBackup = async (file: File) => {
    try {
      const backup = JSON.parse(await file.text());
      if (backup?.format !== 'baoviet-ai-knowledge-backup' || !Array.isArray(backup?.items)) throw new Error('File không đúng định dạng backup Kho tri thức.');
      const merge = window.confirm(`File có ${backup.items.length} mục tri thức.\n\nOK = GỘP với dữ liệu hiện tại.\nCancel = KHÔNG nhập (để tránh vô tình ghi đè).`);
      if (!merge) return;
      const res = await authFetch('/api/ai/knowledge/restore', { method:'POST', headers:{...getAuthHeaders(),'Content-Type':'application/json'}, body:JSON.stringify({backup, mode:'merge'}) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Khôi phục thất bại');
      await Promise.all([loadKnowledge(), loadTaxonomy()]);
      setNotice({ text:`Đã khôi phục/gộp Kho tri thức. Hiện có ${data.count} mục.`, type:'success' });
    } catch (err:any) { setNotice({ text:err?.message || 'Không thể nhập backup.', type:'error' }); }
    finally { if (backupInputRef.current) backupInputRef.current.value=''; }
  };

  const loadTaxonomy = async () => {
    try {
      const res = await authFetch('/api/ai/knowledge/taxonomy', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success && data.taxonomy) {
        setTaxonomy(data.taxonomy);
        if (data.taxonomy.products?.length > 0 && !uploadDefaultProduct) {
          setUploadDefaultProduct(data.taxonomy.products[0].name);
        }
        if (data.taxonomy.categories?.length > 0 && !uploadDefaultCategory) {
          setUploadDefaultCategory(data.taxonomy.categories[0].name);
        }
      }
    } catch (err) {
      console.warn('Error loading taxonomy:', err);
    }
  };

  const loadKnowledge = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/ai/knowledge', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        setItems(data.items);
      }
    } catch (err) {
      console.error('Error fetching knowledge:', err);
      setNotice({ text: 'Không thể tải danh sách tri thức.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKnowledge();
    loadTaxonomy();
  }, []);

  const handleDeleteItem = async (id: string, title: string) => {
    if (deletingItemId) return;
    if (!window.confirm(`Xóa mục tri thức: "${title}"?\n\nMục này sẽ được xóa khỏi cơ sở tri thức và Firestore. Thao tác này không thể hoàn tác.`)) return;

    setDeletingItemId(id);
    setNotice({ text: `Đang xóa “${title}” khỏi Kho tri thức và Firestore...`, type: 'info' });
    try {
      const res = await authFetch(`/api/ai/knowledge/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setNotice({
          text: data.error || 'Không thể xóa mục tri thức. Firestore chưa xác nhận nên dữ liệu được giữ nguyên.',
          type: 'error',
        });
        return;
      }

      setItems((prev) => prev.filter((i) => i.id !== id));
      setNotice({ text: `Đã xóa mục tri thức “${title}” khỏi CMS, Firestore và đã ghi Audit Log.`, type: 'success' });
    } catch (err: any) {
      setNotice({
        text: err?.message || 'Không thể kết nối máy chủ để xóa mục tri thức.',
        type: 'error',
      });
    } finally {
      setDeletingItemId(null);
    }
  };

  // Xóa nhanh mục sản phẩm (thay vì xóa từng thành phần)
  const handleOpenQuickDeleteProduct = (product: string, productItems: KnowledgeItem[]) => {
    const taxProd = (taxonomy.products || []).find(
      (p) => p.name.trim().toLowerCase() === product.trim().toLowerCase()
    );
    const componentGroups = getProductComponentGroups(productItems);
    setQuickDeleteModal({
      product,
      count: productItems.length,
      componentCount: componentGroups.length,
      items: productItems,
      taxonomyProductId: taxProd?.id,
    });
    setDeleteTaxonomyTogether(Boolean(taxProd));
  };

  const handleConfirmQuickDeleteProduct = async () => {
    if (!quickDeleteModal) return;
    const { product, count, taxonomyProductId } = quickDeleteModal;
    setDeletingProductId(product);
    setNotice({
      text: `Đang xóa nhanh toàn bộ ${count} mục tri thức của sản phẩm “${product}”...`,
      type: 'info',
    });

    try {
      // 1. Gọi backend xóa đồng loạt toàn bộ tri thức của mục sản phẩm này
      const res = await authFetch(`/api/ai/knowledge/product/${encodeURIComponent(product)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setNotice({
          text: data.error || `Không thể xóa mục sản phẩm "${product}".`,
          type: 'error',
        });
        setDeletingProductId(null);
        return;
      }

      // 2. Nếu người dùng chọn xóa luôn khỏi Cấu Trúc Nghiệp Vụ (Taxonomy)
      if (deleteTaxonomyTogether && taxonomyProductId) {
        try {
          await authFetch(`/api/ai/knowledge/taxonomy/products/${taxonomyProductId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
          });
          setTaxonomy((prev) => ({
            ...prev,
            products: (prev.products || []).filter((p) => p.id !== taxonomyProductId),
          }));
        } catch (tErr) {
          console.warn('Lỗi khi xóa sản phẩm khỏi taxonomy:', tErr);
        }
      }

      // 3. Cập nhật state tri thức cục bộ ngay lập tức
      const norm = product.trim().toLowerCase();
      setItems((prev) => prev.filter((i) => (i.product || '').trim().toLowerCase() !== norm));
      setExpandedProducts((prev) => {
        const next = new Set(prev);
        next.delete(product);
        return next;
      });

      setNotice({
        text: `Đã xóa nhanh thành công mục sản phẩm “${product}” (${data.deletedCount || count} mục tri thức)!`,
        type: 'success',
      });
      setQuickDeleteModal(null);
    } catch (err: any) {
      setNotice({
        text: err?.message || `Lỗi kết nối khi xóa nhanh mục sản phẩm "${product}".`,
        type: 'error',
      });
    } finally {
      setDeletingProductId(null);
    }
  };

  // Xóa nhanh toàn bộ mục trong một thành phần / bộ phận cấu thành
  const handleQuickDeleteComponentGroup = async (
    product: string,
    componentType: string,
    compLabel: string,
    componentItems: KnowledgeItem[]
  ) => {
    const groupKey = `${product}::${componentType}`;
    if (deletingGroupKey) return;

    if (
      !window.confirm(
        `Xác nhận xóa nhanh thành phần "${compLabel}" của sản phẩm "${product}"?\n\nToàn bộ ${componentItems.length} mục tri thức trong thành phần này sẽ bị xóa khỏi hệ thống và Firestore. Thao tác này không thể hoàn tác.`
      )
    ) {
      return;
    }

    setDeletingGroupKey(groupKey);
    setNotice({
      text: `Đang xóa ${componentItems.length} mục trong thành phần “${compLabel}”...`,
      type: 'info',
    });

    try {
      const ids = componentItems.map((i) => i.id);
      const res = await authFetch('/api/ai/knowledge/bulk-delete', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids,
          reason: `Xóa nhanh thành phần ${compLabel} của sản phẩm ${product}`,
          targetName: `${product} - ${compLabel}`,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setNotice({
          text: data.error || `Không thể xóa thành phần "${compLabel}".`,
          type: 'error',
        });
        return;
      }

      const idSet = new Set(ids);
      setItems((prev) => prev.filter((i) => !idSet.has(i.id)));
      setNotice({
        text: `Đã xóa nhanh ${componentItems.length} mục trong thành phần “${compLabel}” thành công!`,
        type: 'success',
      });
    } catch (err: any) {
      setNotice({
        text: err?.message || `Lỗi khi xóa thành phần "${compLabel}".`,
        type: 'error',
      });
    } finally {
      setDeletingGroupKey(null);
    }
  };

  const handleToggleActive = async (item: KnowledgeItem) => {
    try {
      const updatedActive = !item.active;
      const res = await authFetch(`/api/ai/knowledge/${item.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ active: updatedActive }),
      });
      const data = await res.json();
      if (data.success) {
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, active: updatedActive } : i)));
      }
    } catch (err) {
      console.error('Toggle active error:', err);
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.title || !editingItem?.product || !editingItem?.content) {
      alert('Vui lòng điền đầy đủ Tiêu đề, Sản phẩm và Nội dung.');
      return;
    }

    setSavingItem(true);
    try {
      const mapped = resolveCategoryForProduct(editingItem.product);
      const normalizedItem: Partial<KnowledgeItem> = {
        ...editingItem,
        productId: mapped?.productId || editingItem.productId,
        category: mapped?.category || editingItem.category || '',
        categoryId: mapped?.categoryId || editingItem.categoryId,
        topic: getComponentLabel(editingItem.componentType),
        componentId:
          availableComponentTypes.find((c) => c.code === editingItem.componentType)?.id || editingItem.componentId,
      };
      const isNew = !editingItem.id;
      const url = isNew ? '/api/ai/knowledge' : `/api/ai/knowledge/${editingItem.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await authFetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(normalizedItem),
      });
      const data = await res.json();
      if (data.success) {
        setNotice({
          text: isNew ? 'Thêm mới mục tri thức thành công.' : 'Cập nhật tri thức thành công.',
          type: 'success',
        });
        setEditingItem(null);
        loadKnowledge();
      } else {
        alert(data.error || 'Có lỗi xảy ra.');
      }
    } catch (err) {
      alert('Lỗi khi lưu mục tri thức.');
    } finally {
      setSavingItem(false);
    }
  };

  // Upload handler
  const handleFileUpload = async () => {
    if (!uploadFile) {
      alert('Vui lòng chọn một file tài liệu.');
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const res = await authFetch('/api/ai/knowledge/upload', { method: 'POST', headers: getAuthHeaders(),
          body: JSON.stringify({
            fileBase64: base64,
            fileName: uploadFile.name,
            mimeType: uploadFile.type,
            defaultProduct: uploadDefaultProduct,
            defaultCategory: uploadDefaultCategory,
            autoSave: autoSaveUpload,
          }),
        });

        const data = await res.json();
        if (data.success) {
          if (autoSaveUpload) {
            setNotice({
              text: `AI đã phân tích và lưu thành công ${data.extractedItems?.length || 0} đơn vị kiến thức!`,
              type: 'success',
            });
            setShowUploadModal(false);
            setUploadFile(null);
            loadKnowledge();
          } else {
            setExtractedPreview(data.extractedItems);
          }
        } else {
          alert(data.error || 'Lỗi khi tải file lên.');
        }
        setUploading(false);
      };
      reader.readAsDataURL(uploadFile);
    } catch (err) {
      console.error('Upload error:', err);
      alert('Lỗi tải file lên.');
      setUploading(false);
    }
  };

  // Raw text training
  const handleExtractFromText = async () => {
    if (!rawText.trim()) {
      alert('Vui lòng dán văn bản tài liệu.');
      return;
    }

    setExtractingText(true);
    try {
      const res = await authFetch('/api/ai/knowledge/auto-extract', { method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({
          text: rawText,
          defaultProduct: uploadDefaultProduct,
          defaultCategory: uploadDefaultCategory,
        }),
      });
      const data = await res.json();
      if (data.success && data.extractedItems) {
        setExtractedPreview(data.extractedItems);
        setShowTextTrainer(false);
      } else {
        alert(data.error || 'Không thể bóc tách nội dung.');
      }
    } catch (err) {
      alert('Lỗi xử lý nội dung văn bản.');
    } finally {
      setExtractingText(false);
    }
  };

  // Save extracted preview items
  const handleSavePreviewItems = async () => {
    if (!extractedPreview || extractedPreview.length === 0) return;
    setLoading(true);
    try {
      for (const item of extractedPreview) {
        await authFetch('/api/ai/knowledge', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ ...item, active: true }),
        });
      }
      setNotice({ text: `Đã lưu ${extractedPreview.length} mục tri thức vào hệ thống!`, type: 'success' });
      setExtractedPreview(null);
      loadKnowledge();
    } catch (err) {
      alert('Lỗi lưu các mục tri thức.');
    } finally {
      setLoading(false);
    }
  };

  // Live test chat
  const handleSendTestChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!testInput.trim() || testChatting) return;

    const userQuery = testInput.trim();
    setTestInput('');
    setTestMessages((prev) => [...prev, { role: 'user', text: userQuery }]);
    setTestChatting(true);

    try {
      const res = await authFetch('/api/ai/chat', { method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({
          message: userQuery,
          history: testMessages.map((m) => ({ role: m.role, text: m.text })),
          sessionId: testSessionId || undefined,
          customerName: 'CMS AI Knowledge Test',
          pageContext: {
            pageTitle: 'Test Hub - Bảo Việt Insurance',
            currentProduct: selectedProduct !== 'all' ? selectedProduct : undefined,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.sessionId) setTestSessionId(String(data.sessionId));
        setTestMessages((prev) => [
          ...prev,
          {
            role: 'model',
            text: data.reply,
            sources: data.sources?.map((s: any) => `${s.product} › ${s.title}`),
          },
        ]);
      } else {
        setTestMessages((prev) => [
          ...prev,
          { role: 'model', text: `⚠️ [Lỗi AI]: ${data.error || 'Không nhận được phản hồi'}` },
        ]);
      }
    } catch (err) {
      setTestMessages((prev) => [
        ...prev,
        { role: 'model', text: '⚠️ [Lỗi kết nối]: Không thể liên lạc với máy chủ AI.' },
      ]);
    } finally {
      setTestChatting(false);
    }
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    if (selectedProduct !== 'all' && item.product !== selectedProduct) return false;
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (selectedComponentType !== 'all' && item.componentType !== selectedComponentType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchContent = item.content.toLowerCase().includes(q);
      const matchTopic = item.topic.toLowerCase().includes(q);
      const matchTags = (item.tags || []).some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchContent && !matchTopic && !matchTags) return false;
    }
    return true;
  });

  const availableProducts =
    taxonomy.products && taxonomy.products.length > 0
      ? taxonomy.products.map((p) => p.name)
      : COMMON_PRODUCTS;

  const availableCategories =
    taxonomy.categories && taxonomy.categories.length > 0
      ? taxonomy.categories.map((c) => c.name)
      : COMMON_CATEGORIES;

  const availableComponentTypes =
    taxonomy.componentTypes && taxonomy.componentTypes.length > 0
      ? taxonomy.componentTypes
      : [];

  const getComponentLabel = (code?: string) => {
    if (!code) return '';
    const fromTaxonomy = (taxonomy.componentTypes || []).find((c) => c.code === code);
    return fromTaxonomy?.label || (COMPONENT_TYPE_LABELS as any)[code]?.label || code;
  };

  const resolveCategoryForProduct = (productName?: string) => {
    if (!productName) return null;
    const normalized = productName.trim().toLowerCase();
    const product = (taxonomy.products || []).find((p) => p.name.trim().toLowerCase() === normalized);
    if (!product) return null;

    const category = (taxonomy.categories || []).find((c) =>
      (product.categoryId && c.id === product.categoryId) ||
      (product.categoryCode && c.code === product.categoryCode) ||
      (product.category && c.name.trim().toLowerCase() === product.category.trim().toLowerCase())
    );

    return {
      productId: product.id,
      category: category?.name || product.category || '',
      categoryId: category?.id || product.categoryId || '',
    };
  };

  const buildKnowledgeTitleSuggestion = (productName?: string, componentType?: string) => {
    const topicLabel = getComponentLabel(componentType);
    if (!productName && !topicLabel) return '';
    if (!topicLabel) return productName || '';
    if (!productName) return topicLabel;
    return `${topicLabel} - ${productName}`;
  };

  const patchEditingItemWithSuggestion = (
    prev: Partial<KnowledgeItem>,
    patch: Partial<KnowledgeItem>
  ): Partial<KnowledgeItem> => {
    const oldSuggestedTitle = buildKnowledgeTitleSuggestion(prev.product, prev.componentType);
    const nextProduct = patch.product ?? prev.product;
    const nextComponentType = patch.componentType ?? prev.componentType;
    const nextTopic = getComponentLabel(nextComponentType);
    const nextSuggestedTitle = buildKnowledgeTitleSuggestion(nextProduct, nextComponentType);
    const currentTitle = (prev.title || '').trim();
    const shouldRefreshTitle = !currentTitle || currentTitle === oldSuggestedTitle;

    return {
      ...prev,
      ...patch,
      topic: nextTopic,
      title: shouldRefreshTitle ? nextSuggestedTitle : prev.title,
    };
  };

  const getComponentBadge = (code: string) => {
    const fromTax = taxonomy.componentTypes?.find((c) => c.code === code);
    if (fromTax) {
      return {
        label: fromTax.label,
        color: fromTax.color || 'bg-blue-50 text-blue-700 border-blue-200',
        desc: fromTax.desc || '',
      };
    }
    const fromStatic = (COMPONENT_TYPE_LABELS as any)[code];
    if (fromStatic) {
      return fromStatic;
    }
    return {
      label: code,
      color: 'bg-neutral-100 text-neutral-700 border-neutral-200',
      desc: '',
    };
  };

  const handleTaxonomyChange = (newTaxonomy: KnowledgeTaxonomyData) => {
    setTaxonomy(newTaxonomy);
  };

  const handleChatbotConfigChange = (newChatbotConfig: AiChatbotConfig) => {
    if (onConfigChange && config) {
      onConfigChange({
        ...config,
        aiChatbot: newChatbotConfig,
      });
    }
  };

  const uniqueProducts = Array.from(new Set(items.map((i) => i.product))).filter(Boolean);

  const productOrder = [
    ...(taxonomy.products || []).map((p) => p.name).filter(Boolean),
    ...uniqueProducts.filter((p) => !(taxonomy.products || []).some((tp) => tp.name === p)),
  ];

  const groupedByProduct = productOrder.reduce<Record<string, KnowledgeItem[]>>((acc, product) => {
    const productItems = filteredItems.filter((item) => item.product === product);
    if (productItems.length > 0) acc[product] = productItems;
    return acc;
  }, {});

  useEffect(() => {
    const visibleProducts = Object.keys(groupedByProduct);
    if (selectedProduct !== 'all' && visibleProducts.includes(selectedProduct)) {
      setExpandedProducts((prev) => new Set(prev).add(selectedProduct));
      return;
    }
    if (visibleProducts.length > 0 && expandedProducts.size === 0) {
      setExpandedProducts(new Set([visibleProducts[0]]));
    }
  }, [items, selectedProduct, searchQuery, selectedCategory, selectedComponentType, taxonomy.products?.length]);

  const toggleProduct = (product: string) => {
    setExpandedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(product)) next.delete(product);
      else next.add(product);
      return next;
    });
  };

  const toggleComponentGroup = (key: string) => {
    setExpandedComponentGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const getProductComponentGroups = (productItems: KnowledgeItem[]) => {
    const groups = new Map<string, KnowledgeItem[]>();
    productItems.forEach((item) => {
      const key = item.componentType || 'custom';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    });
    const taxonomyOrder = (taxonomy.componentTypes || []).map((c) => c.code);
    return Array.from(groups.entries()).sort(([a], [b]) => {
      const ai = taxonomyOrder.indexOf(a);
      const bi = taxonomyOrder.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return getComponentBadge(a).label.localeCompare(getComponentBadge(b).label, 'vi');
    });
  };

  return (
    <div className="space-y-6">
      {/* Knowledge workspace header: independent title and responsive action rows. */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm px-4 py-5 sm:px-6 sm:py-6" aria-label="Trung Tâm Quản Lý AI Knowledge">
        <div className="flex min-w-0 items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
            <Brain className="w-6 h-6" aria-hidden="true" />
          </div>
          <h2 className="min-w-0 text-xl sm:text-2xl font-extrabold leading-snug tracking-tight text-slate-900">
            Trung Tâm Quản Lý AI Knowledge
          </h2>
        </div>
        {mainTab === 'knowledge' && (
          <div className="mt-5 flex w-full min-w-0 flex-wrap items-center gap-2 border-t border-slate-100 pt-5" role="toolbar" aria-label="Công cụ AI Knowledge">
            <button type="button" onClick={() => setShowChatTester(!showChatTester)}
              className={`inline-flex min-h-10 max-w-full items-center justify-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${showChatTester?'bg-violet-600 text-white border-violet-600':'bg-white border-slate-200 text-violet-700 hover:bg-violet-50'}`}>
              <Bot className="h-4 w-4 shrink-0" aria-hidden="true" /><span>{showChatTester?'Đóng Kiểm Tra AI':'Thử Nghiệm Chatbot'}</span>
            </button>
            <button type="button" onClick={handleExportKnowledgeBackup}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
              <Download className="h-4 w-4 shrink-0" aria-hidden="true" /><span>Xuất Backup</span>
            </button>
            <input ref={backupInputRef} type="file" accept="application/json,.json" className="hidden" aria-label="Chọn file backup Knowledge" onChange={e => e.target.files?.[0] && handleRestoreKnowledgeBackup(e.target.files[0])} />
            <button type="button" onClick={() => backupInputRef.current?.click()}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
              <Upload className="h-4 w-4 shrink-0" aria-hidden="true" /><span>Nhập Backup</span>
            </button>
            <div className="flex min-w-0 flex-wrap items-center gap-2 lg:ml-auto">
              <button type="button" onClick={() => setShowUploadModal(true)}
                className="inline-flex min-h-10 max-w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                <Upload className="h-4 w-4 shrink-0" aria-hidden="true" /><span>Upload Tài Liệu (PDF/Word/Excel)</span>
              </button>
              <button type="button" onClick={() => {
                const firstProduct = availableProducts[0] || COMMON_PRODUCTS[0] || '';
                const firstComponent = availableComponentTypes[0]?.code || 'overview';
                const mapped = resolveCategoryForProduct(firstProduct);
                const topicLabel = getComponentLabel(firstComponent);
                setEditingItem({
                  title: buildKnowledgeTitleSuggestion(firstProduct, firstComponent),
                  product: firstProduct,
                  productId: mapped?.productId,
                  category: mapped?.category || availableCategories[0] || COMMON_CATEGORIES[0] || '',
                  categoryId: mapped?.categoryId,
                  topic: topicLabel,
                  componentType: firstComponent,
                  componentId: availableComponentTypes.find((c) => c.code === firstComponent)?.id,
                  content: '',
                  tags: ['bao-viet'],
                  active: true,
                });
              }}
                className="inline-flex min-h-10 max-w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                <Plus className="h-4 w-4 shrink-0" aria-hidden="true" /><span>Thêm Mục Thủ Công</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 5 CORE TABS NAVIGATION */}
      <div className="flex items-center gap-2 p-1.5 bg-neutral-100/80 rounded-2xl border border-neutral-200/80 overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
        <button
          type="button"
          onClick={() => setMainTab('settings')}
          className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            mainTab === 'settings'
              ? 'bg-white text-blue-700 shadow-xs border border-blue-200/60'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
          }`}
        >
          <Sliders className="w-4 h-4 text-blue-600" />
          <span>Cấu Hình & Thiết Lập AI</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-50 text-blue-700 font-bold">
            Toàn diện
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('knowledge')}
          className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            mainTab === 'knowledge' ? 'bg-white text-blue-700 shadow-xs border border-blue-200/60' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
          }`}
        >
          <BookOpen className="w-4 h-4 text-blue-600" />
          <span>Kho Tri Thức & Tài Liệu</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-50 text-blue-700 font-bold">CMS</span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('taxonomy')}
          className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            mainTab === 'taxonomy'
              ? 'bg-white text-emerald-700 shadow-xs border border-emerald-200/60'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
          }`}
        >
          <FolderTree className="w-4 h-4 text-emerald-600" />
          <span>Cấu Trúc Nghiệp Vụ</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-50 text-emerald-700 font-bold">
            SP · Danh mục · Bộ phận
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('training')}
          className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            mainTab === 'training'
              ? 'bg-white text-blue-700 shadow-xs border border-blue-200/60'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
          }`}
        >
          <HeartHandshake className="w-4 h-4 text-rose-500" />
          <span>Huấn Luyện Phong Cách & Lịch Sự</span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('chatbot')}
          className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            mainTab === 'chatbot'
              ? 'bg-white text-blue-700 shadow-xs border border-blue-200/60'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
          }`}
        >
          <Palette className="w-4 h-4 text-purple-600" />
          <span>Giao Diện & Vị Trí Chatbot</span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('health')}
          className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            mainTab === 'health'
              ? 'bg-white text-rose-700 shadow-xs border border-rose-200/60'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
          }`}
        >
          <Activity className="w-4 h-4 text-rose-600" />
          <span>Sức Khỏe API & Cache</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-50 text-rose-700 font-bold">
            503/404/429
          </span>
        </button>
      </div>

      {/* RENDER VIEW ACCORDING TO mainTab */}
      {mainTab === 'settings' && (
        <AiSettingsOverviewEditor
          role={role}
          config={config}
          onConfigChange={onConfigChange}
          onOpenTestChat={() => setShowChatTester(true)}
          canEditAI={canEditAI}
        />
      )}

      {mainTab === 'health' && (
        <AiHealthAndCacheDashboard role={role} canEdit={canEditAI} />
      )}

      {mainTab === 'taxonomy' && (
        <TaxonomySettings onTaxonomyChange={handleTaxonomyChange} />
      )}

      {mainTab === 'training' && (
        <AiPersonaTraining
          initialConfig={config?.aiChatbot?.training}
          canViewAI={canViewAI}
          canEditAI={canEditAI}
          onConfigChange={(training) => {
            if (onConfigChange && config) {
              onConfigChange({
                ...config,
                aiChatbot: {
                  ...(config.aiChatbot || {}),
                  training,
                },
              });
            }
          }}
        />
      )}

      {mainTab === 'chatbot' && (
        <AiChatbotCustomizer
          config={config?.aiChatbot}
          onChange={handleChatbotConfigChange}
          canEditAI={canEditAI}
        />
      )}

      {mainTab === 'knowledge' && (
        <>

      {notice && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center justify-between gap-3 border ${
            notice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : notice.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{notice.text}</span>
          </div>
          <button type="button" onClick={() => setNotice(null)} className="text-neutral-400 hover:text-neutral-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Extracted Preview Banner (If user uploaded or extracted without auto-saving) */}
      {extractedPreview && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              <h3 className="text-sm font-bold text-amber-900">
                AI đã phân tích & bóc tách {extractedPreview.length} khối tri thức từ tài liệu
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setExtractedPreview(null)}
                className="px-2.5 py-1 text-xs font-semibold text-neutral-600 hover:bg-amber-100 rounded-lg"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSavePreviewItems}
                className="px-3 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-xs"
              >
                Lưu toàn bộ vào Cơ sở Tri thức
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
            {extractedPreview.map((item, idx) => (
              <div key={idx} className="bg-white p-3 rounded-xl border border-amber-200 text-xs space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neutral-900 truncate">{item.title}</span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold">
                    {item.componentType}
                  </span>
                </div>
                <div className="text-[11px] text-neutral-500 flex gap-2">
                  <span>📦 {item.product}</span>
                  <span>📁 {item.topic}</span>
                </div>
                <p className="text-neutral-700 line-clamp-3 text-[11px] font-mono bg-neutral-50 p-1.5 rounded">
                  {item.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Chat Tester Drawer */}
      {showChatTester && (
        <div className="bg-white rounded-2xl border border-purple-200 shadow-lg p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-neutral-900">Sandbox Kiểm thử Trợ lý AI (Grounding Test)</h3>
                <p className="text-[11px] text-neutral-500">
                  Thử hỏi các câu hỏi chuyên sâu để kiểm tra nguồn tri thức AI bóc tách từ các tài liệu bạn vừa nạp.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setTestSessionId(null);
                setTestMessages([
                  {
                    role: 'model',
                    text: 'Xin chào! Bạn có câu hỏi nào về sản phẩm bảo hiểm Bảo Việt không?',
                  },
                ]);
              }}
              className="text-[11px] font-semibold text-neutral-500 hover:text-neutral-800 px-2 py-1 rounded bg-neutral-100"
            >
              Làm mới hội thoại
            </button>
          </div>

          <div className="h-64 overflow-y-auto space-y-2.5 p-2 bg-neutral-50 rounded-xl border border-neutral-100 text-xs">
            {testMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-xs'
                      : 'bg-white border border-neutral-200 text-neutral-800 rounded-tl-xs shadow-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1 max-w-[85%]">
                    {msg.sources.map((src, sIdx) => (
                      <span
                        key={sIdx}
                        className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-semibold border border-purple-200 flex items-center gap-1"
                      >
                        <BookOpen className="w-2.5 h-2.5" />
                        {src}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {testChatting && (
              <div className="flex items-center gap-1.5 text-neutral-500 text-xs p-2">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>AI đang truy xuất kiến thức và soạn câu trả lời...</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSendTestChat} className="flex gap-2">
            <input
              type="text"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="VD: Xe tôi bị ngập nước thủy kích có được bồi thường không? Cần hồ sơ gì?"
              className="flex-1 text-xs px-3 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:border-blue-600"
            />
            <button
              type="submit"
              disabled={testChatting || !testInput.trim()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Gửi hỏi</span>
            </button>
          </form>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tiêu đề, nội dung, sản phẩm, thẻ tag..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-200 text-xs focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Product filter */}
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-neutral-200 bg-white font-medium text-neutral-700"
            >
              <option value="all">Tất cả sản phẩm ({items.length})</option>
              {uniqueProducts.map((p) => (
                <option key={p} value={p}>
                  {p} ({items.filter((i) => i.product === p).length})
                </option>
              ))}
            </select>

            {/* Component type filter */}
            <select
              value={selectedComponentType}
              onChange={(e) => setSelectedComponentType(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-neutral-200 bg-white font-medium text-neutral-700"
            >
              <option value="all">Tất cả bộ phận nội dung</option>
              {availableComponentTypes.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={loadKnowledge}
              title="Tải lại danh sách"
              className="p-2 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-600 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

          </div>
        </div>

        {/* Quick Component Types Pill Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 cms-no-scrollbar text-xs">
          <span className="text-neutral-400 text-[11px] font-semibold shrink-0 mr-1">Bộ phận cấu thành:</span>
          <button
            type="button"
            onClick={() => setSelectedComponentType('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 cursor-pointer ${
              selectedComponentType === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            Tất cả
          </button>
          {availableComponentTypes.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => setSelectedComponentType(c.code)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-all ${
                selectedComponentType === c.code
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-50 text-neutral-700 hover:bg-neutral-100 border border-neutral-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Knowledge Base Table / Grid */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <span className="text-xs font-bold text-neutral-700">
            Hiển thị {filteredItems.length} trên tổng số {items.length} mục tri thức sản phẩm
          </span>
          <span className="text-[11px] text-neutral-500">
            AI tự động trích lọc các khối kiến thức phù hợp nhất để trả lời khách hàng
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-neutral-500 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
            <span>Đang nạp cơ sở tri thức sản phẩm...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-xs text-neutral-500 space-y-3">
            <Brain className="w-8 h-8 text-neutral-300 mx-auto" />
            <p className="font-semibold text-neutral-700">Không tìm thấy mục tri thức nào phù hợp.</p>
            <p className="text-neutral-400">Hãy thử đổi từ khóa tìm kiếm hoặc nhấn Upload để nạp tài liệu mới.</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {Object.entries(groupedByProduct).map(([product, productItems]) => {
              const productExpanded = expandedProducts.has(product);
              const componentGroups = getProductComponentGroups(productItems);
              const activeCount = productItems.filter((item) => item.active !== false).length;

              return (
                <div key={product} className="bg-white group/product">
                  <div className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-blue-50/30 transition-colors">
                    <div
                      onClick={() => toggleProduct(product)}
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer select-none"
                    >
                      <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <Package className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {productExpanded ? (
                            <ChevronDown className="w-4 h-4 text-blue-600 shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-neutral-400 -rotate-90 shrink-0" />
                          )}
                          <h3 className="text-sm font-bold text-neutral-900 truncate">{product}</h3>
                        </div>
                        <div className="ml-6 mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
                          <span>{productItems.length} mục tri thức</span>
                          <span>•</span>
                          <span>{componentGroups.length} thành phần</span>
                          <span className="text-emerald-600 font-semibold">• {activeCount} đang học</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 text-[11px] font-bold shrink-0">
                        {productItems.length} mục
                      </span>

                      {canEditAI && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenQuickDeleteProduct(product, productItems);
                          }}
                          disabled={deletingProductId === product}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                          title={`Xóa nhanh toàn bộ ${productItems.length} mục tri thức của sản phẩm ${product} thay vì xóa từng thành phần`}
                        >
                          {deletingProductId === product ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-600" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          )}
                          <span className="hidden sm:inline">Xóa nhanh mục sản phẩm</span>
                          <span className="sm:hidden">Xóa nhanh</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {productExpanded && (
                    <div className="border-t border-neutral-100 bg-neutral-50/40 px-3 sm:px-5 py-3 space-y-2">
                      {componentGroups.map(([componentType, componentItems]) => {
                        const compMeta = getComponentBadge(componentType);
                        const groupKey = `${product}::${componentType}`;
                        const groupExpanded = expandedComponentGroups.has(groupKey);

                        return (
                          <div key={groupKey} className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
                            <div className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-neutral-50 transition-colors">
                              <div
                                onClick={() => toggleComponentGroup(groupKey)}
                                className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer select-none"
                              >
                                {groupExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-neutral-500 shrink-0" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-neutral-400 -rotate-90 shrink-0" />
                                )}
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${compMeta.color}`}>
                                  {compMeta.label}
                                </span>
                                <span className="text-[11px] text-neutral-500 truncate">{compMeta.desc}</span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[11px] font-bold text-neutral-600 px-2 py-0.5 rounded-md bg-neutral-100">
                                  {componentItems.length}
                                </span>

                                {canEditAI && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleQuickDeleteComponentGroup(product, componentType, compMeta.label, componentItems);
                                    }}
                                    disabled={deletingGroupKey === groupKey}
                                    className="p-1 sm:px-2 sm:py-1 rounded-lg text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                                    title={`Xóa nhanh toàn bộ ${componentItems.length} mục trong thành phần ${compMeta.label}`}
                                  >
                                    {deletingGroupKey === groupKey ? (
                                      <RefreshCw className="w-3 h-3 animate-spin text-rose-600" />
                                    ) : (
                                      <Trash2 className="w-3 h-3" />
                                    )}
                                    <span className="hidden md:inline">Xóa thành phần</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            {groupExpanded && (
                              <div className="border-t border-neutral-100 divide-y divide-neutral-100">
                                {componentItems.map((item) => (
                                  <div key={item.id} className="p-4 hover:bg-neutral-50/70 transition-colors space-y-2.5">
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                      <div className="space-y-1 flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-neutral-100 text-neutral-600">
                                            📁 {item.topic || item.category || 'Nội dung'}
                                          </span>
                                          {item.sourceFileName && (
                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-neutral-500 bg-neutral-50 border border-neutral-200">
                                              📄 {item.sourceFileName}
                                            </span>
                                          )}
                                          {!item.active && (
                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-neutral-200 text-neutral-600">
                                              Tạm ẩn
                                            </span>
                                          )}
                                        </div>
                                        <h3 className="text-sm font-bold text-neutral-900">{item.title}</h3>
                                      </div>

                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => handleToggleActive(item)}
                                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer border ${
                                            item.active !== false
                                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                              : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                                          }`}
                                          title="Bật/tắt cho phép AI sử dụng mục này"
                                        >
                                          {item.active !== false ? 'Đang học' : 'Tạm dừng'}
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => setEditingItem({ ...item })}
                                          className="p-1.5 rounded-lg text-neutral-600 hover:bg-neutral-100 border border-neutral-200 cursor-pointer"
                                          title="Chỉnh sửa nội dung"
                                        >
                                          <Edit className="w-3.5 h-3.5" />
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => handleDeleteItem(item.id, item.title)}
                                          disabled={deletingItemId !== null}
                                          className={`p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-neutral-200 ${deletingItemId !== null ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                          title="Xóa mục tri thức"
                                          aria-label={`Xóa mục tri thức ${item.title}`}
                                        >
                                          {deletingItemId === item.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                        </button>
                                      </div>
                                    </div>

                                    <div className="bg-neutral-50 rounded-xl p-3 text-xs text-neutral-700 font-sans leading-relaxed border border-neutral-200/60 max-h-36 overflow-y-auto whitespace-pre-wrap">
                                      {item.content}
                                    </div>

                                    {item.tags && item.tags.length > 0 && (
                                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                        <Tag className="w-3 h-3 text-neutral-400" />
                                        {item.tags.map((t, idx) => (
                                          <span key={idx} className="text-[10px] text-neutral-500 bg-white px-1.5 py-0.2 rounded border border-neutral-200">
                                            #{t}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: XÓA NHANH MỤC SẢN PHẨM */}
      {quickDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 space-y-5 animate-in fade-in duration-150">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-neutral-900">
                  Xóa Nhanh Mục Sản Phẩm
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Xóa toàn bộ tri thức của sản phẩm trong một thao tác duy nhất thay vì xóa từng thành phần đơn lẻ.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuickDeleteModal(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-xl hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-2.5">
              <div className="text-xs text-rose-900 font-semibold">
                Sản phẩm sẽ bị xóa sạch:
              </div>
              <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-rose-200 shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Package className="w-5 h-5 text-rose-600 shrink-0" />
                  <span className="font-extrabold text-sm text-neutral-900 truncate">
                    {quickDeleteModal.product}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs shrink-0">
                  <span className="px-2.5 py-0.5 rounded-lg font-bold bg-rose-100 text-rose-800 border border-rose-200">
                    {quickDeleteModal.count} mục tri thức
                  </span>
                  <span className="px-2 py-0.5 rounded-lg font-medium bg-neutral-100 text-neutral-600">
                    {quickDeleteModal.componentCount} thành phần
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-rose-800 leading-relaxed">
                ⚠️ Tất cả các thành phần (Biểu phí, Quyền lợi, Đối tượng, Bồi thường...) của sản phẩm này sẽ được xóa hoàn toàn khỏi cơ sở tri thức, đồng bộ lên Firestore và ghi Audit Log.
              </p>
            </div>

            {quickDeleteModal.taxonomyProductId && (
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-neutral-50 border border-neutral-200 cursor-pointer hover:bg-neutral-100/70 transition-colors">
                <input
                  type="checkbox"
                  checked={deleteTaxonomyTogether}
                  onChange={(e) => setDeleteTaxonomyTogether(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-neutral-800">
                    Xóa luôn khỏi Cấu Trúc Nghiệp Vụ (Taxonomy)
                  </span>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Gỡ bỏ tên sản phẩm khỏi danh mục phân loại AI để không hiển thị trong gợi ý nạp tài liệu sau này.
                  </p>
                </div>
              </label>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setQuickDeleteModal(null)}
                disabled={deletingProductId !== null}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmQuickDeleteProduct}
                disabled={deletingProductId !== null}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {deletingProductId ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang xóa nhanh...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xác nhận xóa nhanh toàn bộ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Upload Document File */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-neutral-200 space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Upload Tài Liệu Huấn Luyện AI</h3>
                  <p className="text-[11px] text-neutral-500">Hỗ trợ file PDF, Word (.docx), Excel (.xlsx, .csv), Text (.txt)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/40 rounded-2xl p-6 text-center cursor-pointer transition-colors space-y-2"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.md"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 mx-auto flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                {uploadFile ? (
                  <div>
                    <p className="font-bold text-blue-900">{uploadFile.name}</p>
                    <p className="text-[11px] text-neutral-500">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-bold text-neutral-800">Kéo thả tài liệu vào đây hoặc bấm để chọn file</p>
                    <p className="text-[11px] text-neutral-500">PDF, Word, Excel, Biểu phí, Quy tắc nghiệp vụ</p>
                  </div>
                )}
              </div>

              {/* Product & Category Selector for this file */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">Gán Sản Phẩm Mục Tiêu</label>
                  <select
                    value={uploadDefaultProduct}
                    onChange={(e) => setUploadDefaultProduct(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-200 bg-white font-medium"
                  >
                    {availableProducts.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">Danh Mục Bảo Hiểm</label>
                  <select
                    value={uploadDefaultCategory}
                    onChange={(e) => setUploadDefaultCategory(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-200 bg-white font-medium"
                  >
                    {availableCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-neutral-800 text-[11px]">Tự động lưu vào Cơ sở Tri thức</p>
                  <p className="text-[10px] text-neutral-500">
                    AI sẽ bóc tách và tự động thêm ngay các mục vào kho tri thức để Chatbot sử dụng ngay.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={autoSaveUpload}
                  onChange={(e) => setAutoSaveUpload(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleFileUpload}
                disabled={uploading || !uploadFile}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>AI đang phân tích tài liệu...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Tiến hành Phân tích & Học</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Raw Text Ingestion Trainer */}
      {showTextTrainer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-neutral-200 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                  <FileCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Nạp & Phân Tích Văn Bản Nghiệp Vụ</h3>
                  <p className="text-[11px] text-neutral-500">
                    Dán trực tiếp thông báo phí, quy tắc bồi thường hoặc kịch bản tư vấn
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTextTrainer(false)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">Sản phẩm</label>
                  <select
                    value={uploadDefaultProduct}
                    onChange={(e) => setUploadDefaultProduct(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-200 bg-white font-medium"
                  >
                    {availableProducts.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">Danh mục</label>
                  <select
                    value={uploadDefaultCategory}
                    onChange={(e) => setUploadDefaultCategory(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-200 bg-white font-medium"
                  >
                    {availableCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                  Nội dung tài liệu nội bộ / Bảng giá / Quy tắc:
                </label>
                <textarea
                  rows={8}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Dán nội dung tài liệu, quy định chi trả hoặc kịch bản bán hàng vào đây..."
                  className="w-full p-3 rounded-xl border border-neutral-200 text-xs font-mono focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setShowTextTrainer(false)}
                className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleExtractFromText}
                disabled={extractingText || !rawText.trim()}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {extractingText ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang bóc tách tri thức...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Phân tích cấu trúc</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Edit or Create Manual Knowledge Unit */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveItem}
            className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-neutral-200 space-y-4 animate-in fade-in max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
                  <Edit className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-neutral-900">
                  {editingItem.id ? 'Chỉnh Sửa Mục Tri Thức' : 'Tạo Mục Tri Thức Mới'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">Tiêu đề mục tri thức *</label>
                <input
                  type="text"
                  required
                  value={editingItem.title || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  placeholder="VD: Biểu phí bảo hiểm vật chất xe ô tô kinh doanh & không kinh doanh"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs focus:outline-none focus:border-blue-600 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">Tên sản phẩm cụ thể *</label>
                  <div className="space-y-1.5">
                    <select
                      value={availableProducts.includes(editingItem.product || '') ? editingItem.product : '__custom__'}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '__custom__') {
                          setEditingItem((prev) => prev ? patchEditingItemWithSuggestion(prev, {
                            product: '',
                            productId: undefined,
                            category: '',
                            categoryId: undefined,
                          }) : prev);
                          return;
                        }
                        const mapped = resolveCategoryForProduct(value);
                        setEditingItem((prev) => prev ? patchEditingItemWithSuggestion(prev, {
                          product: value,
                          productId: mapped?.productId,
                          category: mapped?.category || '',
                          categoryId: mapped?.categoryId,
                        }) : prev);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs bg-white font-medium"
                    >
                      {availableProducts.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                      <option value="__custom__">Tùy chỉnh khác...</option>
                    </select>
                    {!availableProducts.includes(editingItem.product || '') && (
                      <input
                        type="text"
                        required
                        value={editingItem.product || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setEditingItem((prev) => prev ? patchEditingItemWithSuggestion(prev, {
                            product: value,
                            productId: undefined,
                          }) : prev);
                        }}
                        placeholder="Nhập tên sản phẩm chính xác..."
                        className="w-full px-3 py-1.5 rounded-lg border border-neutral-200 text-xs focus:outline-none focus:border-blue-600"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">Danh mục lớn</label>
                  {resolveCategoryForProduct(editingItem.product) ? (
                    <div className="w-full px-3 py-2 rounded-xl border border-blue-100 bg-blue-50/60 text-xs font-semibold text-blue-800 min-h-[38px] flex items-center">
                      {resolveCategoryForProduct(editingItem.product)?.category || 'Chưa gán danh mục trong Cấu Trúc Nghiệp Vụ'}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <select
                        value={availableCategories.includes(editingItem.category || '') ? editingItem.category : '__custom__'}
                        onChange={(e) => {
                          if (e.target.value !== '__custom__') {
                            const category = (taxonomy.categories || []).find((c) => c.name === e.target.value);
                            setEditingItem({ ...editingItem, category: e.target.value, categoryId: category?.id });
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs bg-white font-medium"
                      >
                        {availableCategories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                        <option value="__custom__">Tùy chỉnh khác...</option>
                      </select>
                      <input
                        type="text"
                        value={editingItem.category || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value, categoryId: undefined })}
                        placeholder="Nhập tên danh mục..."
                        className="w-full px-3 py-1.5 rounded-lg border border-neutral-200 text-xs focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  )}
                  <p className="mt-1 text-[10px] text-neutral-400">
                    Chọn sản phẩm trong taxonomy sẽ tự động mapping danh mục.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">Topic</label>
                <select
                  value={editingItem.componentType || availableComponentTypes[0]?.code || 'overview'}
                  onChange={(e) => {
                    const componentType = e.target.value as KnowledgeComponentType;
                    const component = availableComponentTypes.find((c) => c.code === componentType);
                    setEditingItem((prev) => prev ? patchEditingItemWithSuggestion(prev, {
                      componentType,
                      componentId: component?.id,
                    }) : prev);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs bg-white font-medium"
                >
                  {availableComponentTypes.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-neutral-400">
                  Topic chính là bộ phận cấu thành nội dung; không cần nhập thêm một chủ đề trùng lặp.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                  Nội dung chi tiết (Định dạng Markdown) *
                </label>
                <textarea
                  rows={8}
                  required
                  value={editingItem.content || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, content: e.target.value })}
                  placeholder="Ghi rõ công thức, tỷ lệ %, quyền lợi, thủ tục hồ sơ..."
                  className="w-full p-3 rounded-xl border border-neutral-200 text-xs font-mono focus:outline-none focus:border-blue-600 leading-relaxed"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-neutral-700">
                    Từ khóa tìm kiếm (Tags)
                  </label>
                  <span className="text-[10px] text-neutral-400">Gõ dấu phẩy (,) hoặc Enter để phân tách từ khóa</span>
                </div>
                <input
                  type="text"
                  value={tagsInputValue}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTagsInputValue(val);
                    const parsed = val.split(',').map((s) => s.trim()).filter(Boolean);
                    setEditingItem((prev) => (prev ? { ...prev, tags: parsed } : null));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const parsed = tagsInputValue.split(',').map((s) => s.trim()).filter(Boolean);
                      setEditingItem((prev) => (prev ? { ...prev, tags: parsed } : null));
                    }
                  }}
                  placeholder="oto, vat-chat, thuy-kich, phi-bao-hiem"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs focus:outline-none focus:border-blue-600 bg-white"
                />
                {Array.isArray(editingItem.tags) && editingItem.tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {editingItem.tags.map((tag, tIdx) => (
                      <span
                        key={tIdx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-medium"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => {
                            const updatedTags = (editingItem.tags || []).filter((_, idx) => idx !== tIdx);
                            setEditingItem((prev) => (prev ? { ...prev, tags: updatedTags } : null));
                            setTagsInputValue(updatedTags.join(', '));
                          }}
                          className="hover:text-red-600 cursor-pointer ml-0.5 text-xs font-bold leading-none"
                          title="Xóa tag này"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="activeCheck"
                  checked={editingItem.active !== false}
                  onChange={(e) => setEditingItem({ ...editingItem, active: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600"
                />
                <label htmlFor="activeCheck" className="text-xs font-semibold text-neutral-700 cursor-pointer">
                  Kích hoạt mục tri thức này cho AI Chatbot tư vấn
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-50"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={savingItem}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {savingItem ? 'Đang lưu...' : 'Lưu Mục Tri Thức'}
              </button>
            </div>
          </form>
        </div>
      )}
      </>
      )}
    </div>
  );
};
