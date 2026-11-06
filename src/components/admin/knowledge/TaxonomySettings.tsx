import { getAuthHeaders, authFetch } from '../../../services/api';
import React, { useState, useEffect } from 'react';
import {
  Layers,
  Package,
  FolderTree,
  FileCode,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  RotateCcw,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  TaxonomyProduct,
  TaxonomyCategory,
  TaxonomyComponentType,
  KnowledgeTaxonomyData,
} from '../../../types';
import {
  DEFAULT_TAXONOMY_CATEGORIES,
  DEFAULT_TAXONOMY_PRODUCTS,
  DEFAULT_TAXONOMY_COMPONENT_TYPES,
} from '../../../utils/aiConfigDefaults';

interface Props {
  onTaxonomyChange?: (taxonomy: KnowledgeTaxonomyData) => void;
}

const COLOR_PRESETS = [
  { label: 'Xanh dương (Blue)', value: 'bg-blue-50 text-blue-700 border-blue-200' },
  { label: 'Xanh lá (Emerald)', value: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { label: 'Vàng cam (Amber)', value: 'bg-amber-50 text-amber-700 border-amber-200' },
  { label: 'Đỏ hồng (Rose)', value: 'bg-rose-50 text-rose-700 border-rose-200' },
  { label: 'Tím (Purple)', value: 'bg-purple-50 text-purple-700 border-purple-200' },
  { label: 'Xanh lơ (Cyan)', value: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { label: 'Chàm (Indigo)', value: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { label: 'Cam (Orange)', value: 'bg-orange-50 text-orange-700 border-orange-200' },
  { label: 'Xám trung tính (Neutral)', value: 'bg-neutral-100 text-neutral-700 border-neutral-300' },
];

export const TaxonomySettings: React.FC<Props> = ({ onTaxonomyChange }) => {
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'categories' | 'components'>('products');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [categories, setCategories] = useState<TaxonomyCategory[]>([]);
  const [products, setProducts] = useState<TaxonomyProduct[]>([]);
  const [componentTypes, setComponentTypes] = useState<TaxonomyComponentType[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchFilter, setSearchFilter] = useState('');

  // Modals state
  const [editingProduct, setEditingProduct] = useState<TaxonomyProduct | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);

  const [editingCategory, setEditingCategory] = useState<TaxonomyCategory | null>(null);
  const [isNewCategory, setIsNewCategory] = useState(false);

  const [editingComponent, setEditingComponent] = useState<TaxonomyComponentType | null>(null);
  const [isNewComponent, setIsNewComponent] = useState(false);

  // Load taxonomy from backend
  const fetchTaxonomy = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/ai/knowledge/taxonomy', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success && data.taxonomy) {
        setCategories(Array.isArray(data.taxonomy.categories) ? data.taxonomy.categories : []);
        setProducts(Array.isArray(data.taxonomy.products) ? data.taxonomy.products : []);
        setComponentTypes(Array.isArray(data.taxonomy.componentTypes) ? data.taxonomy.componentTypes : []);
        setLoadError(null);
        if (onTaxonomyChange) {
          onTaxonomyChange(data.taxonomy);
        }
      }
    } catch (err: any) {
      console.error('Failed to load taxonomy:', err);
      setLoadError(err?.message || 'Không thể tải cấu trúc nghiệp vụ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxonomy();
  }, []);

  const saveTaxonomyToBackend = async (
    newProducts: TaxonomyProduct[],
    newCategories: TaxonomyCategory[],
    newComponents: TaxonomyComponentType[]
  ) => {
    setSaving(true);
    try {
      const payload: KnowledgeTaxonomyData = {
        products: newProducts,
        categories: newCategories,
        componentTypes: newComponents,
      };

      const res = await authFetch('/api/ai/knowledge/taxonomy', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setNotice({ text: 'Đã lưu Danh mục, Sản phẩm nghiệp vụ và Bộ phận cấu thành thành công!', type: 'success' });
        if (onTaxonomyChange) {
          onTaxonomyChange(payload);
        }
      } else {
        setNotice({ text: data.error || 'Lưu cấu trúc thất bại', type: 'error' });
      }
    } catch (err: any) {
      setNotice({ text: 'Lỗi kết nối khi lưu cấu trúc nghiệp vụ', type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setNotice(null), 4000);
    }
  };

  // Reset to default
  const handleResetDefaults = async () => {
    if (!confirm('Bạn có chắc muốn xóa toàn bộ Sản phẩm và Danh mục hiện tại? Bộ phận cấu thành sẽ được khôi phục về cấu hình hệ thống.')) {
      return;
    }
    setProducts(DEFAULT_TAXONOMY_PRODUCTS);
    setCategories(DEFAULT_TAXONOMY_CATEGORIES);
    setComponentTypes(DEFAULT_TAXONOMY_COMPONENT_TYPES);
    await saveTaxonomyToBackend(
      DEFAULT_TAXONOMY_PRODUCTS,
      DEFAULT_TAXONOMY_CATEGORIES,
      DEFAULT_TAXONOMY_COMPONENT_TYPES
    );
  };

  // Product CRUD
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name.trim()) return;

    let updated: TaxonomyProduct[];
    if (isNewProduct) {
      const newProd: TaxonomyProduct = {
        ...editingProduct,
        id: editingProduct.id || `prod_${Date.now()}`,
        name: editingProduct.name.trim(),
        category: editingProduct.category || (categories[0]?.name ?? 'Bảo hiểm Chung'),
      };
      updated = [...products, newProd];
    } else {
      updated = products.map((p) => (p.id === editingProduct.id ? editingProduct : p));
    }

    setProducts(updated);
    setEditingProduct(null);
    await saveTaxonomyToBackend(updated, categories, componentTypes);
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Xác nhận xóa sản phẩm "${name}" khỏi danh mục nghiệp vụ?`)) return;

    // Tùy chọn xóa nhanh các mục tri thức liên quan nếu có
    const alsoDeleteKB = confirm(
      `Bạn có muốn xóa nhanh TOÀN BỘ các mục tri thức của sản phẩm "${name}" trong Kho Tri Thức luôn không?\n\n- Nhấn OK: Xóa cả sản phẩm và toàn bộ tri thức liên quan.\n- Nhấn Hủy (Cancel): Chỉ xóa khỏi danh mục nghiệp vụ, giữ nguyên tri thức.`
    );

    if (alsoDeleteKB) {
      try {
        await authFetch(`/api/ai/knowledge/product/${encodeURIComponent(name)}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
      } catch (err) {
        console.warn('Lỗi khi xóa tri thức liên quan của sản phẩm:', err);
      }
    }

    const updated = products.filter((p) => p.id !== id);
    setProducts(updated);
    await saveTaxonomyToBackend(updated, categories, componentTypes);
  };

  // Category CRUD
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editingCategory.name.trim()) return;

    let updated: TaxonomyCategory[];
    if (isNewCategory) {
      const newCat: TaxonomyCategory = {
        ...editingCategory,
        id: editingCategory.id || `cat_${Date.now()}`,
        name: editingCategory.name.trim(),
      };
      updated = [...categories, newCat];
    } else {
      updated = categories.map((c) => (c.id === editingCategory.id ? editingCategory : c));
    }

    setCategories(updated);
    setEditingCategory(null);
    await saveTaxonomyToBackend(products, updated, componentTypes);
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Xác nhận xóa danh mục "${name}"?`)) return;
    const updated = categories.filter((c) => c.id !== id);
    setCategories(updated);
    await saveTaxonomyToBackend(products, updated, componentTypes);
  };

  // Component Types CRUD
  const handleSaveComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingComponent || !editingComponent.label.trim() || !editingComponent.code.trim()) return;

    const formattedCode = editingComponent.code.trim().toLowerCase().replace(/\s+/g, '_');
    const compToSave = {
      ...editingComponent,
      code: formattedCode,
    };

    let updated: TaxonomyComponentType[];
    if (isNewComponent) {
      const newComp: TaxonomyComponentType = {
        ...compToSave,
        id: formattedCode,
      };
      updated = [...componentTypes, newComp];
    } else {
      updated = componentTypes.map((c) => (c.id === compToSave.id ? compToSave : c));
    }

    setComponentTypes(updated);
    setEditingComponent(null);
    await saveTaxonomyToBackend(products, categories, updated);
  };

  const handleDeleteComponent = async (id: string, label: string) => {
    if (!confirm(`Xác nhận xóa bộ phận cấu thành "${label}"?`)) return;
    const updated = componentTypes.filter((c) => c.id !== id);
    setComponentTypes(updated);
    await saveTaxonomyToBackend(products, categories, updated);
  };

  if (loading) {
    return <div className="min-h-[320px] flex flex-col items-center justify-center text-neutral-500"><RefreshCw className="w-7 h-7 animate-spin text-blue-600 mb-2"/><p className="text-sm font-semibold">Đang tải cấu trúc nghiệp vụ...</p><p className="text-xs text-neutral-400 mt-1">Chưa hiển thị dữ liệu mặc định.</p></div>;
  }
  if (loadError) {
    return <div className="min-h-[320px] flex flex-col items-center justify-center text-neutral-500"><AlertCircle className="w-7 h-7 text-rose-500 mb-2"/><p className="text-sm font-semibold">Không thể tải cấu trúc nghiệp vụ.</p><p className="text-xs text-neutral-400 mt-1">{loadError}</p><button type="button" onClick={fetchTaxonomy} className="mt-3 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold">Thử lại</button></div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Tabs */}
      <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-blue-600" />
              Cấu Trúc Nghiệp Vụ (Sản Phẩm, Danh Mục & Bộ Phận Cấu Thành)
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              Quản lý danh mục, các sản phẩm và các bộ phận cấu thành nội dung (Biểu phí, Quyền lợi, Bồi thường...) cho tính năng Nạp & Phân Tích Văn Bản AI.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleResetDefaults}
              disabled={saving}
              className="px-3 py-1.5 rounded-xl border border-neutral-200 hover:bg-neutral-100 text-xs font-semibold text-neutral-700 flex items-center gap-1.5 cursor-pointer"
              title="Khôi phục dữ liệu mẫu gốc"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Khôi phục mẫu chuẩn
            </button>
            <button
              type="button"
              onClick={fetchTaxonomy}
              disabled={loading || saving}
              className="p-1.5 rounded-xl border border-neutral-200 hover:bg-neutral-100 text-neutral-600 cursor-pointer"
              title="Làm mới"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {notice && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
              notice.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {notice.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />}
            <span>{notice.text}</span>
          </div>
        )}

        {/* Sub Navigation Bar */}
        <div className="flex items-center gap-2 mt-5 border-b border-neutral-200 pb-2">
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('products');
              setSearchFilter('');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'products'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            <Package className="w-4 h-4" />
            Sản Phẩm Nghiệp Vụ ({products.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab('categories');
              setSearchFilter('');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'categories'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            Danh Mục Nghiệp Vụ ({categories.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab('components');
              setSearchFilter('');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'components'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            Bộ Phận Cấu Thành Nội Dung ({componentTypes.length})
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: PRODUCTS */}
      {activeSubTab === 'products' && (
        <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Tìm kiếm sản phẩm nghiệp vụ..."
                className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-blue-600"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setIsNewProduct(true);
                setEditingProduct({
                  id: `prod_${Date.now()}`,
                  name: '',
                  category: categories[0]?.name || 'Bảo hiểm Chung',
                  description: '',
                });
              }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Thêm Sản Phẩm Mới
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {products
              .filter(
                (p) =>
                  !searchFilter ||
                  p.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
                  p.category.toLowerCase().includes(searchFilter.toLowerCase())
              )
              .map((prod) => (
                <div
                  key={prod.id}
                  className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 hover:bg-white hover:shadow-xs transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {prod.category}
                      </span>
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => {
                            setIsNewProduct(false);
                            setEditingProduct({ ...prod });
                          }}
                          className="p-1 text-neutral-500 hover:text-blue-600 rounded hover:bg-neutral-100"
                          title="Sửa sản phẩm"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(prod.id, prod.name)}
                          className="p-1 text-neutral-500 hover:text-rose-600 rounded hover:bg-neutral-100"
                          title="Xóa sản phẩm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <h4 className="text-xs font-bold text-neutral-900 mt-2">{prod.name}</h4>
                    {prod.description && (
                      <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2 leading-relaxed">
                        {prod.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: CATEGORIES */}
      {activeSubTab === 'categories' && (
        <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Tìm danh mục nghiệp vụ..."
                className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-blue-600"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setIsNewCategory(true);
                setEditingCategory({
                  id: `cat_${Date.now()}`,
                  name: '',
                  description: '',
                });
              }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Thêm Danh Mục Mới
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories
              .filter(
                (c) =>
                  !searchFilter ||
                  c.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
                  (c.description && c.description.toLowerCase().includes(searchFilter.toLowerCase()))
              )
              .map((cat) => (
                <div
                  key={cat.id}
                  className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 hover:bg-white hover:shadow-xs transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-neutral-900">{cat.name}</h4>
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => {
                            setIsNewCategory(false);
                            setEditingCategory({ ...cat });
                          }}
                          className="p-1 text-neutral-500 hover:text-blue-600 rounded hover:bg-neutral-100"
                          title="Sửa danh mục"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          className="p-1 text-neutral-500 hover:text-rose-600 rounded hover:bg-neutral-100"
                          title="Xóa danh mục"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {cat.description && (
                      <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2 leading-relaxed">
                        {cat.description}
                      </p>
                    )}
                    <div className="mt-3 pt-2 border-t border-neutral-200/60 flex items-center justify-between text-[10px] text-neutral-400">
                      <span>Sản phẩm thuộc nhóm:</span>
                      <span className="font-bold text-neutral-700">
                        {products.filter((p) => p.category === cat.name).length} sản phẩm
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: COMPONENT TYPES */}
      {activeSubTab === 'components' && (
        <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Tìm kiếm bộ phận cấu thành..."
                className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-blue-600"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setIsNewComponent(true);
                setEditingComponent({
                  id: `comp_${Date.now()}`,
                  code: '',
                  label: '',
                  color: COLOR_PRESETS[0].value,
                  desc: '',
                });
              }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Thêm Bộ Phận Cấu Thành Mới
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {componentTypes
              .filter(
                (c) =>
                  !searchFilter ||
                  c.label.toLowerCase().includes(searchFilter.toLowerCase()) ||
                  c.code.toLowerCase().includes(searchFilter.toLowerCase()) ||
                  c.desc.toLowerCase().includes(searchFilter.toLowerCase())
              )
              .map((comp) => (
                <div
                  key={comp.id}
                  className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 hover:bg-white hover:shadow-xs transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${comp.color}`}>
                        {comp.label}
                      </span>
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => {
                            setIsNewComponent(false);
                            setEditingComponent({ ...comp });
                          }}
                          className="p-1 text-neutral-500 hover:text-blue-600 rounded hover:bg-neutral-100"
                          title="Sửa bộ phận"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteComponent(comp.id, comp.label)}
                          className="p-1 text-neutral-500 hover:text-rose-600 rounded hover:bg-neutral-100"
                          title="Xóa bộ phận"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-neutral-600 mt-2 font-mono">
                      Code định danh: <span className="font-semibold text-blue-600">{comp.code}</span>
                    </p>
                    {comp.desc && (
                      <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2 leading-relaxed">
                        {comp.desc}
                      </p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* MODAL: EDIT PRODUCT */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 border border-neutral-200 shadow-2xl">
            <h3 className="text-sm font-bold text-neutral-900 mb-3">
              {isNewProduct ? 'Thêm Sản Phẩm Nghiệp Vụ Mới' : 'Chỉnh Sửa Sản Phẩm Nghiệp Vụ'}
            </h3>
            <form onSubmit={handleSaveProduct} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Tên Sản Phẩm *</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  placeholder="VD: Bảo hiểm Tai nạn 24/7..."
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-blue-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Danh Mục Thuộc Nhóm *</label>
                <select
                  value={editingProduct.category}
                  onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-blue-600 bg-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Mô Tả Sản Phẩm</label>
                <textarea
                  rows={3}
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  placeholder="Mô tả tóm tắt phạm vi, quyền lợi chính..."
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-3.5 py-1.5 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  {saving ? 'Đang lưu...' : 'Lưu Sản Phẩm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT CATEGORY */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 border border-neutral-200 shadow-2xl">
            <h3 className="text-sm font-bold text-neutral-900 mb-3">
              {isNewCategory ? 'Thêm Danh Mục Nghiệp Vụ Mới' : 'Chỉnh Sửa Danh Mục Nghiệp Vụ'}
            </h3>
            <form onSubmit={handleSaveCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Tên Danh Mục *</label>
                <input
                  type="text"
                  required
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  placeholder="VD: Bảo hiểm Xe cơ giới..."
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-blue-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Mô Tả Danh Mục</label>
                <textarea
                  rows={3}
                  value={editingCategory.description || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                  placeholder="Mô tả chung phạm vi các gói bảo hiểm trong danh mục này..."
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-3.5 py-1.5 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  {saving ? 'Đang lưu...' : 'Lưu Danh Mục'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT COMPONENT TYPE */}
      {editingComponent && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 border border-neutral-200 shadow-2xl">
            <h3 className="text-sm font-bold text-neutral-900 mb-3">
              {isNewComponent ? 'Thêm Bộ Phận Cấu Thành Nội Dung Mới' : 'Chỉnh Sửa Bộ Phận Cấu Thành'}
            </h3>
            <form onSubmit={handleSaveComponent} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Tên Hiển Thị (Tiếng Việt) *</label>
                <input
                  type="text"
                  required
                  value={editingComponent.label}
                  onChange={(e) => setEditingComponent({ ...editingComponent, label: e.target.value })}
                  placeholder="VD: Điều kiện Khấu trừ & Mức miễn thường..."
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-blue-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Mã Định Danh (Code slug) *</label>
                <input
                  type="text"
                  required
                  disabled={!isNewComponent}
                  value={editingComponent.code}
                  onChange={(e) => setEditingComponent({ ...editingComponent, code: e.target.value })}
                  placeholder="VD: deductibles..."
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-blue-600 font-mono disabled:bg-neutral-100"
                />
                <p className="text-[10px] text-neutral-400 mt-0.5">Dùng để AI phân loại đoạn văn bản vào đúng mục.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Màu Sắc Huy Hiệu Badge</label>
                <select
                  value={editingComponent.color}
                  onChange={(e) => setEditingComponent({ ...editingComponent, color: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-blue-600 bg-white"
                >
                  {COLOR_PRESETS.map((preset, idx) => (
                    <option key={idx} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] text-neutral-500">Xem trước badge:</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold border ${editingComponent.color}`}>
                    {editingComponent.label || 'Tên mẫu'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Mô Tả Bộ Phận Cấu Thành</label>
                <textarea
                  rows={2}
                  value={editingComponent.desc}
                  onChange={(e) => setEditingComponent({ ...editingComponent, desc: e.target.value })}
                  placeholder="Mô tả những nội dung nào nên thuộc về bộ phận này..."
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setEditingComponent(null)}
                  className="px-3.5 py-1.5 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  {saving ? 'Đang lưu...' : 'Lưu Bộ Phận'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
