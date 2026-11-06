import React, { useEffect, useState } from 'react';
import {
  Plus,
  RefreshCw,
  Trash2,
  KeyRound,
  Save,
  UserCog,
  Shield,
  Check,
  X,
  Lock,
  Eye,
  Edit3,
  Sparkles,
  Users,
  Settings,
  Sliders,
  CheckSquare,
  Square,
} from 'lucide-react';
import { AdminRole, ManagedAdminAccount, AdminPermissions } from '../../types';
import {
  createAdminAccount,
  deleteAdminAccount,
  getAdminAccounts,
  resetAdminPassword,
  updateAdminAccount,
} from '../../services/api';

const ROLES: Array<[AdminRole, string]> = [
  ['superadmin', 'Super Admin (Toàn quyền hệ thống)'],
  ['marketing_admin', 'Marketing Admin (Quản lý nội dung & Leads)'],
  ['content_editor', 'Content Editor (Chuyên viên biên tập)'],
  ['viewer', 'Viewer (Chỉ xem)'],
];

const CMS_TABS_CONFIG = [
  { id: 'analytics', label: 'Báo cáo Hiệu quả & Chuyển đổi (Analytics)', category: 'Tổng quan', desc: 'Xem biểu đồ traffic, tỷ lệ chuyển đổi, chi phí' },
  { id: 'revisions', label: 'Lịch sử Phiên bản (Revisions)', category: 'Tổng quan', desc: 'Xem các lần xuất bản và khôi phục nháp' },
  { id: 'pages', label: 'Quản lý Trang (Landing Pages)', category: 'Trang', desc: 'Tạo trang mới, đổi slug, quản lý danh sách' },
  { id: 'content', label: 'Khối Nội dung & Hero Banner', category: 'Nội dung', desc: 'Sửa tiêu đề, section, bảng giá, quyền lợi' },
  { id: 'forms', label: 'Biểu Mẫu Tư Vấn (Form Center)', category: 'Nội dung', desc: 'Cấu hình các trường form, thông báo và nút submit' },
  { id: 'countdown', label: 'Đồng Hồ Đếm Ngược Khuyến Mãi', category: 'Nội dung', desc: 'Cấu hình thời gian ưu đãi và thông điệp gấp' },
  { id: 'footer', label: 'Chân Trang & Thông Tin Hotline', category: 'Nội dung', desc: 'Hotline, địa chỉ, mạng xã hội và nút gọi nổi' },
  { id: 'leads', label: 'Danh Sách Khách Hàng (Leads)', category: 'Khách hàng', desc: 'Xem khách hàng đăng ký, xuất CSV, xử lý tư vấn' },
  { id: 'sheets', label: 'Đồng Bộ Google Sheets', category: 'Khách hàng', desc: 'Kết nối và đẩy dữ liệu khách hàng sang bảng tính' },
  { id: 'ai-knowledge', label: 'Tri Thức AI & Tài Liệu Huấn Luyện', category: 'AI & Chatbot', desc: 'Upload tài liệu nội bộ và tùy biến giao diện bot' },
  { id: 'chat-history', label: 'Lịch Sử Chat & Can Thiệp AI', category: 'AI & Chatbot', desc: 'Xem khách chat với AI và can thiệp trả lời trực tiếp' },
  { id: 'seo', label: 'SEO & Thẻ Meta Mạng Xã Hội', category: 'Cài đặt', desc: 'Tối ưu công cụ tìm kiếm Google và thẻ Facebook' },
  { id: 'settings', label: 'Cài Đặt Giao Diện & Style Toàn Cục', category: 'Cài đặt', desc: 'Bảng màu, header, popups tư vấn và font chữ' },
  { id: 'login-design', label: 'Giao Diện Đăng Nhập CMS', category: 'Cài đặt', desc: 'Tùy biến hình nền, logo trang đăng nhập quản trị' },
];

export const AdminAccountManager: React.FC = () => {
  const [rows, setRows] = useState<ManagedAdminAccount[]>([]);
  const [notice, setNotice] = useState('');
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState({
    username: '',
    displayName: '',
    email: '',
    role: 'marketing_admin' as AdminRole,
    password: '',
  });

  // Permissions Modal State
  const [editingPermissionsAccount, setEditingPermissionsAccount] = useState<ManagedAdminAccount | null>(null);
  const [tempPermissions, setTempPermissions] = useState<AdminPermissions>({});

  const load = async () => {
    try {
      const accounts = await getAdminAccounts();
      setRows(accounts);
    } catch (e: any) {
      setNotice(e?.message || 'Không thể tải danh sách tài khoản.');
    }
  };

  useEffect(() => {
    let active = true;
    const fetchAccounts = async () => {
      try {
        const accounts = await getAdminAccounts();
        if (active) setRows(accounts);
      } catch (e: any) {
        if (active) setNotice(e?.message || 'Không thể tải danh sách tài khoản.');
      }
    };
    void fetchAccounts();
    return () => {
      active = false;
    };
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAdminAccount(draft);
      setDraft({ username: '', displayName: '', email: '', role: 'marketing_admin', password: '' });
      setNotice('Đã tạo tài khoản thành công.');
      load();
    } catch (e: any) {
      setNotice(e.message);
    }
  };

  const patch = async (row: ManagedAdminAccount) => {
    try {
      await updateAdminAccount(row.id, {
        username: row.username,
        displayName: row.displayName,
        email: row.email,
        role: row.role,
        enabled: row.enabled,
        permissions: row.permissions,
      });
      setNotice('Đã cập nhật thông tin tài khoản.');
      load();
    } catch (e: any) {
      setNotice(e.message);
    }
  };

  const reset = async (row: ManagedAdminAccount) => {
    const password = resetPasswords[row.id] || '';
    if (!password) {
      setNotice('Nhập mật khẩu mới trước khi bấm Đổi mật khẩu.');
      return;
    }
    try {
      await resetAdminPassword(row.id, password);
      setResetPasswords((x) => ({ ...x, [row.id]: '' }));
      setNotice('Đã đổi mật khẩu. Tất cả phiên đăng nhập của tài khoản này đã bị đăng xuất.');
    } catch (e: any) {
      setNotice(e.message);
    }
  };

  const remove = async (row: ManagedAdminAccount) => {
    if (!window.confirm(`Xóa tài khoản ${row.username}?`)) return;
    try {
      await deleteAdminAccount(row.id);
      setNotice('Đã xóa tài khoản.');
      load();
    } catch (e: any) {
      setNotice(e.message);
    }
  };

  const openPermissionsModal = (account: ManagedAdminAccount) => {
    setEditingPermissionsAccount(account);
    const existing = account.permissions || {};
    // If not set yet, initialize based on role defaults
    const defaultAllowed = existing.allowedTabs || (account.role === 'viewer' ? [] : CMS_TABS_CONFIG.map((t) => t.id));
    const defaultCanEdit = existing.canEditTabs || (account.role === 'viewer' ? [] : CMS_TABS_CONFIG.map((t) => t.id));

    setTempPermissions({
      allowedTabs: defaultAllowed,
      canEditTabs: defaultCanEdit,
      canPublish: existing.canPublish ?? (account.role === 'superadmin' || account.role === 'marketing_admin'),
      canDeleteLeads: existing.canDeleteLeads ?? (account.role === 'superadmin' || account.role === 'marketing_admin'),
      canManagePages: existing.canManagePages ?? (account.role === 'superadmin' || account.role === 'marketing_admin'),
      canTakeoverChat: existing.canTakeoverChat ?? true,
      canViewAI: existing.canViewAI ?? (defaultAllowed.includes('ai-knowledge') || defaultAllowed.includes('ai-settings')),
      canEditAI: existing.canEditAI ?? (defaultCanEdit.includes('ai-knowledge') || defaultCanEdit.includes('ai-settings')),
    });
  };

  const savePermissions = async () => {
    if (!editingPermissionsAccount) return;
    try {
      await updateAdminAccount(editingPermissionsAccount.id, {
        permissions: tempPermissions,
      });
      setNotice(`Đã lưu phân quyền chi tiết cho nhân viên ${editingPermissionsAccount.displayName}.`);
      setEditingPermissionsAccount(null);
      load();
    } catch (err: any) {
      setNotice(err.message || 'Không thể lưu phân quyền.');
    }
  };

  // Toggle Allowed (View) Tab
  const toggleAllowedTab = (tabId: string) => {
    const current = tempPermissions.allowedTabs || [];
    const exists = current.includes(tabId);
    let updatedAllowed: string[];
    let updatedCanEdit = tempPermissions.canEditTabs || [];

    if (exists) {
      updatedAllowed = current.filter((t) => t !== tabId);
      updatedCanEdit = updatedCanEdit.filter((t) => t !== tabId);
    } else {
      updatedAllowed = [...current, tabId];
      if (!updatedCanEdit.includes(tabId)) {
        updatedCanEdit = [...updatedCanEdit, tabId];
      }
    }
    setTempPermissions({
      ...tempPermissions,
      allowedTabs: updatedAllowed,
      canEditTabs: updatedCanEdit,
    });
  };

  // Toggle Edit Tab
  const toggleEditTab = (tabId: string) => {
    const currentEdit = tempPermissions.canEditTabs || [];
    const exists = currentEdit.includes(tabId);
    let updatedCanEdit: string[];
    let updatedAllowed = tempPermissions.allowedTabs || [];

    if (exists) {
      updatedCanEdit = currentEdit.filter((t) => t !== tabId);
    } else {
      updatedCanEdit = [...currentEdit, tabId];
      if (!updatedAllowed.includes(tabId)) {
        updatedAllowed = [...updatedAllowed, tabId];
      }
    }
    setTempPermissions({
      ...tempPermissions,
      allowedTabs: updatedAllowed,
      canEditTabs: updatedCanEdit,
    });
  };

  // Preset Handlers
  const applyPreset = (presetName: 'full' | 'content_only' | 'leads_chat' | 'read_only') => {
    if (presetName === 'full') {
      setTempPermissions({
        allowedTabs: CMS_TABS_CONFIG.map((t) => t.id),
        canEditTabs: CMS_TABS_CONFIG.map((t) => t.id),
        canPublish: true,
        canDeleteLeads: true,
        canManagePages: true,
        canTakeoverChat: true,
        canViewAI: true,
        canEditAI: true,
      });
    } else if (presetName === 'content_only') {
      const contentTabs = ['content', 'forms', 'countdown', 'footer', 'seo', 'ai-knowledge'];
      setTempPermissions({
        allowedTabs: contentTabs,
        canEditTabs: contentTabs,
        canPublish: false,
        canDeleteLeads: false,
        canManagePages: false,
        canTakeoverChat: false,
        canViewAI: true,
        canEditAI: true,
      });
    } else if (presetName === 'leads_chat') {
      const crmTabs = ['leads', 'sheets', 'chat-history'];
      setTempPermissions({
        allowedTabs: crmTabs,
        canEditTabs: ['chat-history'],
        canPublish: false,
        canDeleteLeads: false,
        canManagePages: false,
        canTakeoverChat: true,
        canViewAI: false,
        canEditAI: false,
      });
    } else if (presetName === 'read_only') {
      setTempPermissions({
        allowedTabs: CMS_TABS_CONFIG.map((t) => t.id),
        canEditTabs: [],
        canPublish: false,
        canDeleteLeads: false,
        canManagePages: false,
        canTakeoverChat: false,
        canViewAI: true,
        canEditAI: false,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black flex items-center gap-2 text-neutral-900">
          <UserCog className="w-5 h-5 text-blue-600" />
          Tài Khoản Quản Trị & Phân Quyền Nhân Viên
        </h2>
        <p className="text-xs text-neutral-500 mt-1">
          Quản lý tài khoản đăng nhập nội bộ và cấu hình chi tiết quyền hạn: danh mục nào nhân viên được xem, nội dung nào được phép chỉnh sửa, và quyền xóa khách hàng (Leads).
        </p>
      </div>

      {notice && (
        <div className="p-3 rounded-xl bg-blue-50 text-blue-800 text-xs font-bold border border-blue-100 flex items-center justify-between">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} className="text-xs text-blue-500 hover:text-blue-800">
            ✕
          </button>
        </div>
      )}

      {/* Create Account Form */}
      <form onSubmit={create} className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs">
        <h3 className="font-black text-sm text-neutral-900 mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-blue-600" />
          Tạo tài khoản nhân viên mới
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          <F label="Tên đăng nhập (Username)">
            <input
              autoComplete="off"
              value={draft.username}
              onChange={(e) => setDraft({ ...draft, username: e.target.value })}
              required
              className="inp"
              placeholder="VD: nhanvien_tuvan01"
            />
          </F>
          <F label="Tên hiển thị (Họ và Tên)">
            <input
              value={draft.displayName}
              onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
              required
              className="inp"
              placeholder="VD: Nguyễn Văn An"
            />
          </F>
          <F label="Email nhân viên (tùy chọn)">
            <input
              type="email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              className="inp"
              placeholder="an.nguyen@baoviet.com.vn"
            />
          </F>
          <F label="Vai trò cấp bậc (Role)">
            <select
              value={draft.role}
              onChange={(e) => setDraft({ ...draft, role: e.target.value as AdminRole })}
              className="inp"
            >
              {ROLES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </F>
          <F label="Mật khẩu khởi tạo">
            <input
              type="password"
              autoComplete="new-password"
              value={draft.password}
              onChange={(e) => setDraft({ ...draft, password: e.target.value })}
              minLength={10}
              required
              className="inp"
              placeholder="Tối thiểu 10 ký tự"
            />
          </F>
        </div>
        <p className="text-[11px] text-neutral-500 mt-2">
          Mật khẩu an toàn: tối thiểu 10 ký tự, kết hợp chữ và số. Mật khẩu được mã hóa an toàn (scrypt).
        </p>
        <button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex gap-2 items-center cursor-pointer shadow-xs transition-colors">
          <Plus className="w-4 h-4" />
          Tạo tài khoản
        </button>
      </form>

      {/* Account List */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-black text-sm text-neutral-900">Danh sách tài khoản ({rows.length})</h3>
            <p className="text-xs text-neutral-500">Bấm nút "Phân Quyền CMS" để tùy chỉnh danh mục mà nhân viên được thấy/sửa.</p>
          </div>
          <button
            onClick={load}
            className="p-2 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-600 transition-colors"
            title="Tải lại danh sách"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {rows.map((r, i) => {
            const isSuper = r.role === 'superadmin';
            const allowedTabsCount = r.permissions?.allowedTabs?.length ?? (isSuper ? CMS_TABS_CONFIG.length : 0);
            const canEditCount = r.permissions?.canEditTabs?.length ?? (isSuper ? CMS_TABS_CONFIG.length : 0);

            return (
              <div key={r.id} className="border border-neutral-200 rounded-2xl p-4 space-y-3 hover:border-neutral-300 transition-colors bg-white">
                <div className="grid md:grid-cols-12 gap-2.5 items-center">
                  <div className="md:col-span-2">
                    <span className="text-[10px] font-bold text-neutral-400 block uppercase">Username</span>
                    <input
                      value={r.username}
                      onChange={(e) => setRows((x) => x.map((a, j) => (j === i ? { ...a, username: e.target.value } : a)))}
                      className="inp font-bold text-neutral-900"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-[10px] font-bold text-neutral-400 block uppercase">Tên hiển thị</span>
                    <input
                      value={r.displayName}
                      onChange={(e) => setRows((x) => x.map((a, j) => (j === i ? { ...a, displayName: e.target.value } : a)))}
                      className="inp"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-[10px] font-bold text-neutral-400 block uppercase">Email</span>
                    <input
                      value={r.email || ''}
                      placeholder="Chưa có email"
                      onChange={(e) => setRows((x) => x.map((a, j) => (j === i ? { ...a, email: e.target.value } : a)))}
                      className="inp text-neutral-600"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-[10px] font-bold text-neutral-400 block uppercase">Cấp bậc</span>
                    <select
                      value={r.role}
                      onChange={(e) => setRows((x) => x.map((a, j) => (j === i ? { ...a, role: e.target.value as AdminRole } : a)))}
                      className="inp font-bold"
                    >
                      {ROLES.map(([v, l]) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-1 flex items-center pt-3">
                    <label className="text-xs flex gap-1.5 items-center font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={r.enabled}
                        onChange={(e) => setRows((x) => x.map((a, j) => (j === i ? { ...a, enabled: e.target.checked } : a)))}
                      />
                      Active
                    </label>
                  </div>
                  <div className="md:col-span-3 flex items-center justify-end gap-1.5 pt-3">
                    {/* Permissions Config Button */}
                    <button
                      type="button"
                      onClick={() => openPermissionsModal(r)}
                      className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs flex items-center gap-1 border border-purple-200 transition-colors"
                      title="Phân quyền chi tiết danh mục CMS cho tài khoản này"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>Phân Quyền CMS</span>
                    </button>

                    <button
                      onClick={() => patch(r)}
                      className="p-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors"
                      title="Lưu thông tin"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    {!isSuper && (
                      <button
                        onClick={() => remove(r)}
                        className="p-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 transition-colors"
                        title="Xóa tài khoản"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Permissions Summary Badge */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-neutral-100 text-[11px]">
                  <span className="text-neutral-500 font-medium">Quyền hạn CMS:</span>
                  {isSuper ? (
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[10px]">
                      👑 Toàn quyền Superadmin (Tất cả danh mục)
                    </span>
                  ) : (
                    <>
                      <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 font-semibold text-[10px]">
                        👁️ Thấy {allowedTabsCount}/{CMS_TABS_CONFIG.length} mục
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold text-[10px]">
                        ✏️ Sửa {canEditCount}/{CMS_TABS_CONFIG.length} mục
                      </span>
                      {r.permissions?.canDeleteLeads && (
                        <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-700 font-bold text-[10px]">
                          🗑️ Được xóa Leads
                        </span>
                      )}
                      {r.permissions?.canPublish && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                          🚀 Được xuất bản (Publish)
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Password Reset Bar */}
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-neutral-50 rounded-xl p-2.5">
                  <span className="text-[11px] font-bold text-neutral-500">Đổi mật khẩu:</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder="Nhập mật khẩu mới..."
                    value={resetPasswords[r.id] || ''}
                    onChange={(e) => setResetPasswords((x) => ({ ...x, [r.id]: e.target.value }))}
                    className="inp max-w-xs bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => reset(r)}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex gap-1 items-center transition-colors shadow-xs"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    Cập nhật
                  </button>
                  <span className="text-[10px] text-neutral-400 sm:ml-auto">
                    Đăng nhập gần nhất: {r.lastLoginAt ? new Date(r.lastLoginAt).toLocaleString('vi-VN') : 'Chưa đăng nhập'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Permissions Configuration Modal */}
      {editingPermissionsAccount && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto cms-admin-modal-scroll animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-neutral-200 max-h-[90vh] overflow-y-auto cms-admin-modal-scroll space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-neutral-900">
                    Phân Quyền CMS: {editingPermissionsAccount.displayName}
                  </h3>
                  <p className="text-xs text-neutral-500 font-mono">
                    Username: {editingPermissionsAccount.username} · Cấp bậc: {editingPermissionsAccount.role}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingPermissionsAccount(null)}
                className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Presets Bar */}
            <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200/80 space-y-2">
              <span className="text-xs font-bold text-neutral-700 block">Mẫu phân quyền gợi ý nhanh:</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset('full')}
                  className="px-3 py-1.5 rounded-lg bg-white border border-neutral-300 text-xs font-semibold hover:bg-neutral-100 text-neutral-800"
                >
                  🌟 Toàn Quyền Nhân Viên
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('content_only')}
                  className="px-3 py-1.5 rounded-lg bg-white border border-neutral-300 text-xs font-semibold hover:bg-neutral-100 text-neutral-800"
                >
                  ✍️ Chuyên Viên Nội Dung (Content Only)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('leads_chat')}
                  className="px-3 py-1.5 rounded-lg bg-white border border-neutral-300 text-xs font-semibold hover:bg-neutral-100 text-neutral-800"
                >
                  👥 Tư Vấn Viên / CSKH (Leads & Chat)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('read_only')}
                  className="px-3 py-1.5 rounded-lg bg-white border border-neutral-300 text-xs font-semibold hover:bg-neutral-100 text-neutral-800"
                >
                  👁️ Chỉ Xem (Read Only)
                </button>
              </div>
            </div>

            {/* Special Action Grants */}
            <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                Hành Động Đặc Quyền Hệ Thống
              </h4>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white border border-amber-200/60 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={tempPermissions.canPublish ?? false}
                    onChange={(e) => setTempPermissions({ ...tempPermissions, canPublish: e.target.checked })}
                  />
                  <div>
                    <span className="text-xs font-bold text-neutral-900 block">Xuất Bản Trực Tiếp (Publish Live)</span>
                    <span className="text-[11px] text-neutral-500">Được phép bấm nút Publish đưa bản nháp lên website thực tế.</span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white border border-amber-200/60 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={tempPermissions.canDeleteLeads ?? false}
                    onChange={(e) => setTempPermissions({ ...tempPermissions, canDeleteLeads: e.target.checked })}
                  />
                  <div>
                    <span className="text-xs font-bold text-neutral-900 block">Xóa Dữ Liệu Khách Hàng (Delete Leads)</span>
                    <span className="text-[11px] text-neutral-500">Được phép xóa các lead khách hàng trong mục Leads.</span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white border border-amber-200/60 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={tempPermissions.canManagePages ?? false}
                    onChange={(e) => setTempPermissions({ ...tempPermissions, canManagePages: e.target.checked })}
                  />
                  <div>
                    <span className="text-xs font-bold text-neutral-900 block">Tạo / Xóa Trang (Manage Pages)</span>
                    <span className="text-[11px] text-neutral-500">Được phép thêm trang chức năng mới hoặc xóa trang khỏi CMS.</span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white border border-amber-200/60 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={tempPermissions.canTakeoverChat ?? true}
                    onChange={(e) => setTempPermissions({ ...tempPermissions, canTakeoverChat: e.target.checked })}
                  />
                  <div>
                    <span className="text-xs font-bold text-neutral-900 block">Can Thiệp & Trả Lời Chat Trực Tiếp</span>
                    <span className="text-[11px] text-neutral-500">Được quyền chat trực tiếp với khách hàng trong khung chat AI.</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Dedicated AI permissions */}
            <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Phân Quyền AI Knowledge & Gemini
              </h4>
              <p className="text-[11px] text-indigo-800/80">Quyền này áp dụng trực tiếp cho AI Knowledge, cấu hình AI và quản lý Gemini API key. Super Admin luôn có toàn quyền.</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white border border-indigo-200/70 cursor-pointer">
                  <input type="checkbox" className="mt-0.5" checked={tempPermissions.canViewAI ?? false}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      const allowed = tempPermissions.allowedTabs || [];
                      const nextAllowed = checked
                        ? Array.from(new Set([...allowed, 'ai-settings', 'ai-knowledge']))
                        : allowed.filter((id) => id !== 'ai-settings' && id !== 'ai-knowledge');
                      const edits = tempPermissions.canEditTabs || [];
                      const nextEdits = checked ? edits : edits.filter((id) => id !== 'ai-settings' && id !== 'ai-knowledge');
                      setTempPermissions({ ...tempPermissions, allowedTabs: nextAllowed, canEditTabs: nextEdits, canViewAI: checked, canEditAI: checked ? (tempPermissions.canEditAI ?? false) : false });
                    }} />
                  <div>
                    <span className="text-xs font-bold text-neutral-900 block">👁 Xem AI</span>
                    <span className="text-[11px] text-neutral-500">Được mở AI Knowledge, xem cấu hình, trạng thái và API key đã che.</span>
                  </div>
                </label>
                <label className={`flex items-start gap-2.5 p-2.5 rounded-lg bg-white border border-indigo-200/70 ${tempPermissions.canViewAI ? 'cursor-pointer' : 'opacity-50'}`}>
                  <input type="checkbox" className="mt-0.5" checked={tempPermissions.canEditAI ?? false} disabled={!tempPermissions.canViewAI}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      const allowed = tempPermissions.allowedTabs || [];
                      const edits = tempPermissions.canEditTabs || [];
                      setTempPermissions({
                        ...tempPermissions,
                        allowedTabs: Array.from(new Set([...allowed, 'ai-settings', 'ai-knowledge'])),
                        canEditTabs: checked
                          ? Array.from(new Set([...edits, 'ai-settings', 'ai-knowledge']))
                          : edits.filter((id) => id !== 'ai-settings' && id !== 'ai-knowledge'),
                        canViewAI: true,
                        canEditAI: checked,
                      });
                    }} />
                  <div>
                    <span className="text-xs font-bold text-neutral-900 block">✏️ Sửa AI</span>
                    <span className="text-[11px] text-neutral-500">Được sửa tri thức, cấu hình AI, huấn luyện và đổi/reveal Gemini API key.</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Granular Tabs Permissions Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-neutral-900">
                  Phân Quyền Theo Danh Mục & Nội Dung CMS
                </h4>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() =>
                      setTempPermissions({
                        ...tempPermissions,
                        allowedTabs: CMS_TABS_CONFIG.map((t) => t.id),
                        canEditTabs: CMS_TABS_CONFIG.map((t) => t.id),
                        canViewAI: true,
                        canEditAI: true,
                      })
                    }
                    className="text-blue-600 hover:underline font-bold"
                  >
                    Chọn tất cả
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() =>
                      setTempPermissions({
                        ...tempPermissions,
                        allowedTabs: [],
                        canEditTabs: [],
                        canViewAI: false,
                        canEditAI: false,
                      })
                    }
                    className="text-neutral-500 hover:underline"
                  >
                    Bỏ chọn tất cả
                  </button>
                </div>
              </div>

              <div className="border border-neutral-200 rounded-xl overflow-hidden divide-y divide-neutral-100">
                <div className="bg-neutral-100/70 p-3 grid grid-cols-12 text-[11px] font-bold text-neutral-600">
                  <div className="col-span-7">Danh mục CMS</div>
                  <div className="col-span-2 text-center">Được Thấy (View)</div>
                  <div className="col-span-3 text-center">Được Chỉnh Sửa (Edit)</div>
                </div>

                {CMS_TABS_CONFIG.map((tab) => {
                  const isAllowed = tempPermissions.allowedTabs?.includes(tab.id) ?? false;
                  const canEdit = tempPermissions.canEditTabs?.includes(tab.id) ?? false;

                  return (
                    <div
                      key={tab.id}
                      className={`p-3 grid grid-cols-12 items-center transition-colors ${
                        isAllowed ? 'bg-white' : 'bg-neutral-50/50 opacity-60'
                      }`}
                    >
                      <div className="col-span-7 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-600">
                            {tab.category}
                          </span>
                          <span className="font-bold text-xs text-neutral-900">{tab.label}</span>
                        </div>
                        <p className="text-[11px] text-neutral-500 mt-0.5">{tab.desc}</p>
                      </div>

                      <div className="col-span-2 flex justify-center">
                        <input
                          type="checkbox"
                          checked={isAllowed}
                          onChange={() => toggleAllowedTab(tab.id)}
                          className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                        />
                      </div>

                      <div className="col-span-3 flex justify-center">
                        <input
                          type="checkbox"
                          checked={canEdit}
                          disabled={!isAllowed}
                          onChange={() => toggleEditTab(tab.id)}
                          className="w-4 h-4 rounded text-emerald-600 cursor-pointer disabled:opacity-30"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingPermissionsAccount(null)}
                className="px-4 py-2 rounded-xl border border-neutral-300 text-neutral-700 font-bold text-xs hover:bg-neutral-50 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={savePermissions}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Save className="w-4 h-4" />
                <span>Lưu Phân Quyền</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`.inp{width:100%;border:1px solid #d4d4d8;border-radius:.75rem;padding:.55rem .75rem;font-size:.75rem;background:white}`}</style>
    </div>
  );
};

const F: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="text-xs font-bold text-neutral-700">
    <span className="block mb-1.5">{label}</span>
    {children}
  </label>
);
