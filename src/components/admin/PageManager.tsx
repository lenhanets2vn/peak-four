import React, { useEffect, useState } from 'react';
import {
  Copy,
  FilePlus2,
  FileText,
  Loader2,
  RotateCcw,
  Trash2,
  ExternalLink,
  Check,
  X,
  LayoutList,
  Edit3,
  Home,
  Layers,
  Sparkles,
  ArrowRight,
  Globe,
  Settings,
  AlertCircle,
  Search,
  CheckCircle2,
  Eye,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { AdminRole, LandingPageSummary } from '../../types';
import {
  createPage,
  duplicatePage,
  getPages,
  permanentDeletePage,
  restorePage,
  trashPage,
  updatePage,
  reorderPages,
  createPreviewToken,
} from '../../services/api';

interface Props {
  role: AdminRole;
  currentPageId?: string;
  onSelect: (id: string) => void;
  onNavigateToEditor?: () => void;
  onPreparePreviewPage?: (id:string) => Promise<void>;
  onOrderChange?: (orderedIds:string[]) => void;
}

export const PageManager: React.FC<Props> = ({
  role,
  currentPageId = 'page_home',
  onSelect,
  onNavigateToEditor,
  onPreparePreviewPage,
  onOrderChange,
}) => {
  const [pages, setPages] = useState<LandingPageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTrash, setShowTrash] = useState(false);
  const [searchPages, setSearchPages] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; slug: string; status: 'active' | 'inactive' }>({
    name: '',
    slug: '',
    status: 'active',
  });

  const canWrite = role === 'superadmin' || role === 'marketing_admin';
  const canPermanent = role === 'superadmin';

  const load = async () => {
    setLoading(true);
    try {
      const data = await getPages(true);
      setPages(data);
    } catch (e: any) {
      setNotice({ text: e.message || 'Lỗi tải danh sách trang', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const run = async (fn: () => Promise<any>, msg: string) => {
    try {
      await fn();
      setNotice({ text: msg, type: 'success' });
      setTimeout(() => setNotice(null), 4000);
      await load();
    } catch (e: any) {
      setNotice({ text: e.message || 'Thao tác thất bại', type: 'error' });
    }
  };

  // Auto generate slug from title
  const handleNameChange = (val: string) => {
    setName(val);
    const generated = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
    setSlug(generated ? `/${generated}` : '');
  };

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await run(async () => {
      const r = await createPage({
        name: name.trim(),
        slug: slug.trim() || undefined,
      });
      setName('');
      setSlug('');
      if (r.page?.id) {
        onSelect(r.page.id);
        onNavigateToEditor?.();
      }
    }, `Đã tạo Category Page "${name}" thành công và tải vào trình chỉnh sửa.`);
  };

  const startEdit = (p: LandingPageSummary) => {
    setEditingPageId(p.id);
    setEditForm({
      name: p.name,
      slug: p.slug,
      status: p.status,
    });
  };

  const saveEdit = async (id: string) => {
    await run(async () => {
      await updatePage(id, editForm);
      setEditingPageId(null);
    }, `Đã lưu cập nhật cho trang "${editForm.name}".`);
  };

  const handleSelectAndEdit = (pageId: string) => {
    onSelect(pageId);
    onNavigateToEditor?.();
  };

  const activePages = pages.filter((p) => !p.deletedAt);
  const trashPages = pages.filter((p) => !!p.deletedAt);
  const normalizedSearch = searchPages.trim().toLocaleLowerCase('vi');
  const displayedPages = normalizedSearch ? activePages.filter(p =>
    `${p.name} ${p.slug} ${p.id}`.toLocaleLowerCase('vi').includes(normalizedSearch)
  ) : activePages;
  const movePage = (id:string, offset:number) => {
    const index=activePages.findIndex(p=>p.id===id);
    const target=index+offset;
    if(index<0||target<0||target>=activePages.length)return;
    const reordered=[...activePages];
    [reordered[index],reordered[target]]=[reordered[target],reordered[index]];
    const ids=reordered.map(p=>p.id);
    void run(async()=>{await reorderPages(ids);onOrderChange?.(ids);}, 'Đã đổi thứ tự trang trong CMS. Xuất Bản Live để cập nhật thanh điều hướng công khai.');
  };
  const previewDraft = async (page:LandingPageSummary) => {
    const tab=window.open('about:blank','_blank');
    if(tab)tab.opener=null;
    try {
      await onPreparePreviewPage?.(page.id);
      const result=await createPreviewToken(page.id);
      if(tab)tab.location.replace(result.url);
      else window.open(result.url,'_blank','noopener,noreferrer');
    } catch(error:any) {tab?.close();setNotice({text:error?.message||'Không mở được bản xem trước',type:'error'});}
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <LayoutList className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-black text-neutral-900">Quản Lý Category Bar / Các Trang</h3>
          </div>
          <p className="text-xs text-neutral-500 mt-1 max-w-2xl">
            Mỗi mục trên <strong>Category Bar / Primary Menu</strong> chính là một trang độc lập. Tạo trang mới sẽ tạo một mục Category Bar mới; Hero, Banner và các khối nội dung của từng trang là riêng. Footer là <strong>một Footer dùng chung toàn website</strong> và luôn giống nhau trên mọi Category Page. Bạn có thể đổi tên mục Category Bar bằng cách đổi tên trang tại đây.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            className="p-2 border border-neutral-200 rounded-xl hover:bg-neutral-50 text-neutral-600 transition-colors"
            title="Làm mới danh sách"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={`p-3 rounded-xl text-xs font-bold border flex items-center justify-between ${
            notice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} className="text-xs hover:opacity-75">
            ✕
          </button>
        </div>
      )}

      {/* Create New Functional Page Form */}
      {canWrite && (
        <form onSubmit={handleCreatePage} className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
            <FilePlus2 className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
              Tạo Category Page Mới
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Tên Category Bar / Tên Category / Page *</label>
              <input
                type="text"
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:border-blue-600 bg-white"
                placeholder="VD: Bảo hiểm Xe Cơ Giới"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Đường dẫn Slug (URL)</label>
              <input
                type="text"
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:border-blue-600 bg-white font-mono"
                placeholder="/xe-co-gioi"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
              <div className="text-xs font-black text-blue-800">Cấu hình mới, độc lập</div>
              <p className="mt-1 text-[11px] leading-5 text-blue-700">Category Page mới bắt đầu từ cấu hình trắng riêng: Hero, Banner, Sections và nội dung không sao chép từ Home hay Page khác. Hệ thống tự đưa trang này vào Category Bar sau khi Publish. Footer không thuộc riêng Page mà dùng chung toàn website.</p>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-40 transition-colors shadow-xs cursor-pointer"
            >
              <FilePlus2 className="w-4 h-4" />
              <span>Tạo & Bắt Đầu Chỉnh Sửa Trang Này</span>
            </button>
          </div>
        </form>
      )}

      {/* Pages List */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h4 className="cms-tail-panel-label">Danh sách trang ({displayedPages.length}/{activePages.length})</h4>
          <label className="cms-tail-search">
            <Search className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            <input type="search" value={searchPages} onChange={e => setSearchPages(e.target.value)} placeholder="Tìm tên, slug hoặc ID trang..." aria-label="Tìm trang trong CMS" />
          </label>
        </div>

        {loading ? (
          <div className="py-12 bg-white rounded-2xl border border-neutral-200 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
            <p className="text-xs text-neutral-400 mt-2">Đang tải danh sách landing pages...</p>
          </div>
        ) : (
          displayedPages.length === 0 ? (
            <div className="cms-tail-empty" role="status">Không có trang nào phù hợp. Thử một từ khóa hoặc slug khác.</div>
          ) : displayedPages.map((p,index) => {
            const isCurrent = p.id === currentPageId;
            const isHome = p.id === 'page_home' || p.slug === '/';
            const isSystem = isHome || p.system === true;
            const isEditingThis = editingPageId === p.id;

            return (
              <div
                key={p.id}
                className={`bg-white border rounded-2xl p-4 transition-all shadow-xs ${
                  isCurrent
                    ? 'border-blue-500 ring-2 ring-blue-100 bg-gradient-to-r from-blue-50/30 to-white'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                {isEditingThis ? (
                  /* Inline Edit Form */
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-neutral-600 block mb-1">Tên Category / Page</label>
                        <input
                          className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:border-blue-600 bg-white"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-neutral-600 block mb-1">Đường dẫn Slug</label>
                        <input
                          disabled={isSystem}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:border-blue-600 bg-white font-mono disabled:bg-neutral-100"
                          value={editForm.slug}
                          onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-neutral-600 block mb-1">Trạng thái</label>
                        <select
                          className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:border-blue-600 bg-white"
                          value={editForm.status}
                          onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                        >
                          <option value="active">Đang hoạt động (Active)</option>
                          <option value="inactive">Tạm ẩn (Inactive)</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingPageId(null)}
                        className="px-3 py-1.5 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-600 hover:bg-neutral-50"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={() => saveEdit(p.id)}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Lưu Thay Đổi
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Standard Card View */
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isHome ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {isHome ? <Home className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-black text-sm text-neutral-900 truncate">{p.name}</h4>
                          {isHome && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              Trang Chủ Mặc Định
                            </span>
                          )}
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              Đang Chọn Chỉnh Sửa
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-neutral-100 text-neutral-600'
                            }`}
                          >
                            {p.status === 'active' ? 'Hoạt động' : 'Tạm ẩn'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-neutral-500 font-mono mt-1">
                          <span className="text-blue-700 font-bold">{p.slug}</span>
                          <span>·</span>
                          <span className={p.published ? 'text-emerald-700 font-bold' : 'text-amber-700'}>
                            {p.published ? '✓ Đã xuất bản live' : 'Bản nháp (Draft only)'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                      {canWrite && <div className="flex flex-col gap-1" aria-label={`Đổi thứ tự ${p.name}`}>
                        <button type="button" onClick={()=>movePage(p.id,-1)} disabled={Boolean(normalizedSearch)||index===0||loading} title="Đưa trang lên" aria-label={`Đưa ${p.name} lên`} className="rounded border p-1 disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5"/></button>
                        <button type="button" onClick={()=>movePage(p.id,1)} disabled={Boolean(normalizedSearch)||index===activePages.length-1||loading} title="Đưa trang xuống" aria-label={`Đưa ${p.name} xuống`} className="rounded border p-1 disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5"/></button>
                      </div>}
                      {/* Primary Select & Edit Action */}
                      <button
                        type="button"
                        onClick={() => handleSelectAndEdit(p.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                          isCurrent
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-neutral-900 text-white hover:bg-neutral-800'
                        }`}
                        title="Tải trang này vào trình soạn thảo để chỉnh sửa Hero, Khối nội dung, Form..."
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Chỉnh Sửa Trang Này</span>
                      </button>

                      {/* Preview link */}
                      <button type="button"
                        onClick={()=>previewDraft(p)}
                        className="p-2 text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
                        title="Xem trước bản nháp trong tab mới (cần Lưu Nháp trước)"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>

                      {canWrite && (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(p)}
                            className="p-2 text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
                            title="Sửa tên hoặc slug"
                          >
                            <Settings className="w-4 h-4" />
                          </button>

                          {(
                            <button
                              type="button"
                              onClick={() => run(() => duplicatePage(p.id), `Đã sao chép nhân bản trang "${p.name}".`)}
                              className="p-2 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                              title="Nhân bản cấu hình trang này"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          )}

                          {!isSystem && (
                            <button
                              type="button"
                              onClick={() => run(() => trashPage(p.id), `Đã chuyển trang "${p.name}" vào Thùng rác.`)}
                              className="p-2 text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                              title="Chuyển vào thùng rác"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Trash Drawer */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowTrash((v) => !v)}
          className="text-xs font-bold text-neutral-500 hover:text-neutral-800 flex items-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>
            {showTrash ? 'Ẩn' : 'Xem'} Thùng Rác ({trashPages.length})
          </span>
        </button>

        {showTrash && (
          <div className="mt-3 space-y-2">
            {trashPages.length === 0 ? (
              <div className="text-xs text-neutral-400 p-4 bg-white rounded-xl border border-neutral-200 text-center">
                Thùng rác trống.
              </div>
            ) : (
              trashPages.map((p) => (
                <div
                  key={p.id}
                  className="bg-red-50/50 border border-red-200 rounded-xl p-3 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-bold text-xs text-neutral-900">{p.name}</div>
                    <div className="text-[10px] text-neutral-500 font-mono">{p.slug}</div>
                  </div>
                  <div className="flex gap-2">
                    {canWrite && (
                      <button
                        type="button"
                        onClick={() => run(() => restorePage(p.id), `Đã khôi phục trang "${p.name}".`)}
                        className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-lg flex items-center gap-1"
                        title="Khôi phục trang"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Khôi phục
                      </button>
                    )}
                    {canPermanent && (
                      <button
                        type="button"
                        onClick={() => run(() => permanentDeletePage(p.id), `Đã xóa vĩnh viễn trang "${p.name}".`)}
                        className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                        title="Xóa vĩnh viễn khỏi hệ thống"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
