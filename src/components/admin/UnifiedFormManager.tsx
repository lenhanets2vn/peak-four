import React, { useState } from 'react';
import {
  FileText,
  Sliders,
  CheckCircle2,
  Send,
  Sparkles,
  Link,
  ShieldCheck,
  Eye,
  Plus,
  Trash2,
  Copy,
  Layers,
  ArrowRight
} from 'lucide-react';
import { LandingPageConfig, FormField, ReusableForm } from '../../types';
import { FormBuilder } from './FormBuilder';
import { inputCls, labelCls } from './SettingsEditors';
import { FontSelector } from '../common/FontSelector';

interface Props {
  config: LandingPageConfig;
  onChange: (config: LandingPageConfig) => void;
}

export const UnifiedFormManager: React.FC<Props> = ({ config, onChange }) => {
  const [activeSubTab, setActiveSubTab] = useState<'fields' | 'copy' | 'reusable'>('fields');
  const [notice, setNotice] = useState<string | null>(null);

  const formSettings = config.formSettings || {
    title: 'Đăng Ký Nhận Báo Giá & Tư Vấn Miễn Phí',
    subtitle: 'Chuyên viên Bảo Việt sẽ liên hệ tư vấn giải pháp tối ưu cho bạn trong 15 phút.',
    badge: 'Tư Vấn Miễn Phí',
    submitButtonText: 'Nhận Báo Giá Ngay',
    submittingText: 'Đang Gửi Thông Tin...',
    successHeading: 'Đăng Ký Thành Công!',
    successMessage: 'Cảm ơn quý khách. Tư vấn viên Bảo Việt sẽ liên hệ trong ít phút.',
    privacyDisclaimer: 'Thông tin của bạn được cam kết bảo mật tuyệt đối 100% theo quy định.',
    redirectUrl: '',
    submitEventName: 'lead_form_submitted'
  };

  const updateFormSettings = (patch: Partial<typeof formSettings>) => {
    onChange({
      ...config,
      formSettings: {
        ...formSettings,
        ...patch
      }
    });
  };

  const fields = config.formFields || [];
  const reusableForms = config.websiteSettings?.forms || [];

  const handleCreateReusableForm = () => {
    const formId = `form_${Date.now()}`;
    const newForm: ReusableForm = {
      id: formId,
      name: `Biểu mẫu ${reusableForms.length + 1}`,
      enabled: true,
      order: reusableForms.length + 1,
      settings: {
        title: 'Đăng Ký Nhanh',
        subtitle: 'Vui lòng để lại số điện thoại để được hỗ trợ',
        badge: 'Tư vấn miễn phí',
        submitButtonText: 'Gửi Yêu Cầu',
        submittingText: 'Đang gửi...',
        successHeading: 'Đăng ký thành công!',
        successMessage: 'Chuyên viên Bảo Việt sẽ liên hệ lại quý khách trong ít phút.',
        privacyDisclaimer: 'Cam kết bảo mật thông tin theo tiêu chuẩn Bảo Việt.',
        formId
      },
      fields: [
        { id: `f_name_${Date.now()}`, name: 'fullName', label: 'Họ và tên', type: 'text', placeholder: 'Nhập họ và tên...', required: true, order: 1 },
        { id: `f_phone_${Date.now()}`, name: 'phone', label: 'Số điện thoại', type: 'tel', placeholder: 'Nhập số điện thoại...', required: true, order: 2 }
      ]
    };
    const next = [...reusableForms, newForm];
    onChange({
      ...config,
      websiteSettings: {
        ...config.websiteSettings,
        forms: next
      }
    });
    setNotice('Đã tạo thêm biểu mẫu tái sử dụng mới');
    setTimeout(() => setNotice(null), 3000);
  };

  const handleDeleteReusableForm = (id: string) => {
    const next = reusableForms.filter(f => f.id !== id);
    onChange({
      ...config,
      websiteSettings: {
        ...config.websiteSettings,
        forms: next
      }
    });
  };

  return (
    <div className="space-y-5">
      {/* Sub-tab navigation for Forms */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3 mb-3">
          <div>
            <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span>Trung Tâm Quản Lý Biểu Mẫu Tư Vấn (Form Center)</span>
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Hợp nhất cấu hình trường nhập dữ liệu, tiêu đề & thông báo hoàn thành trong một giao diện duy nhất.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveSubTab('fields')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'fields'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>1. Trường Dữ Liệu ({fields.filter(f => !f.deletedAt).length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('copy')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'copy'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>2. Tiêu Đề & Thông Báo</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('reusable')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'reusable'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>3. Form Phụ & Popups ({reusableForms.filter(f => !f.deletedAt).length})</span>
            </button>
          </div>
        </div>

        {notice && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium px-3.5 py-2 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
        )}
      </div>

      {/* Tab 1: Form Fields (FormBuilder) */}
      {activeSubTab === 'fields' && (
        <FormBuilder
          fields={fields}
          onChange={(newFields) => onChange({ ...config, formFields: newFields })}
        />
      )}

      {/* Tab 2: Form Copy, CTA & Messages */}
      {activeSubTab === 'copy' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Settings Form */}
          <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="border-b border-neutral-100 pb-3">
              <h4 className="text-sm font-bold text-neutral-900">Nội Dung Tiêu Đề & Lời Dẫn Form</h4>
              <p className="text-xs text-neutral-500">Tùy biến thông điệp thu hút khách hàng để lại thông tin tư vấn.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Tiêu Đề Form *</label>
                <input
                  type="text"
                  value={formSettings.title}
                  onChange={(e) => updateFormSettings({ title: e.target.value })}
                  className={inputCls}
                  placeholder="VD: Đăng Ký Nhận Báo Giá Miễn Phí"
                />
              </div>

              <div>
                <label className={labelCls}>Huy Hiệu Nhấn Mạnh Đầu Form</label>
                <input
                  type="text"
                  value={formSettings.badge || ''}
                  onChange={(e) => updateFormSettings({ badge: e.target.value })}
                  className={inputCls}
                  placeholder="VD: Ưu Đãi Giới Hạn / Tư Vấn 24/7"
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Lời Dẫn Phụ Dưới Tiêu Đề</label>
              <textarea
                rows={2}
                value={formSettings.subtitle || ''}
                onChange={(e) => updateFormSettings({ subtitle: e.target.value })}
                className={inputCls}
                placeholder="VD: Chuyên viên tư vấn sẽ liên hệ lại trong vòng 15 phút..."
              />
            </div>

            <div className="border-t border-neutral-100 pt-4">
              <h4 className="text-sm font-bold text-neutral-900 mb-3">Font Chữ Khu Vực Form / Leads</h4>
              <div className="space-y-4">
                <FontSelector value={formSettings.fontFamily || ''} onChange={(font) => updateFormSettings({ fontFamily: font })} label="Font Family của Form" previewText="Họ và tên - Số điện thoại - Nhận báo giá ngay" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {([['titleFontSize','Tiêu đề',24],['subtitleFontSize','Mô tả',14],['labelFontSize','Nhãn trường',14],['inputFontSize','Nội dung ô nhập',14],['helperFontSize','Ghi chú / lỗi',12]] as const).map(([key,label,fallback]) => (
                    <label key={key} className={labelCls}>{label} (px)
                      <input type="number" min="10" max="48" className={`${inputCls} mt-1`} value={(formSettings as any)[key] ?? fallback} onChange={(e)=>updateFormSettings({[key]: Math.max(10, Math.min(48, Number(e.target.value)||fallback))} as any)} />
                    </label>
                  ))}
                </div>
                <p className="text-[11px] text-neutral-500">Áp dụng trực tiếp cho tiêu đề, mô tả, label và nội dung người dùng nhập trong Lead Form.</p>
              </div>
            </div>

            <div className="border-t border-neutral-100 pt-4">
              <h4 className="text-sm font-bold text-neutral-900 mb-3">Nút Gửi & Cam Kết</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Chữ Trên Nút Gửi (Submit Button)</label>
                  <input
                    type="text"
                    value={formSettings.submitButtonText || 'Gửi Thông Tin Ngay'}
                    onChange={(e) => updateFormSettings({ submitButtonText: e.target.value })}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>Trạng Thái Đang Gửi (Loading State)</label>
                  <input
                    type="text"
                    value={formSettings.submittingText || 'Đang gửi...'}
                    onChange={(e) => updateFormSettings({ submittingText: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className={labelCls}>Cam Kết Bảo Mật (Dưới Nút Gửi)</label>
                <input
                  type="text"
                  value={formSettings.privacyDisclaimer || ''}
                  onChange={(e) => updateFormSettings({ privacyDisclaimer: e.target.value })}
                  className={inputCls}
                  placeholder="VD: Thông tin được bảo mật 100% theo quy định..."
                />
              </div>
            </div>

            <div className="border-t border-neutral-100 pt-4">
              <h4 className="text-sm font-bold text-neutral-900 mb-3">Thông Báo Thành Công & Chuyển Hướng</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Tiêu Đề Thành Công (Success Title)</label>
                  <input
                    type="text"
                    value={formSettings.successHeading || 'Đăng Ký Thành Công!'}
                    onChange={(e) => updateFormSettings({ successHeading: e.target.value })}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>Tên Sự Kiện GA4 / Facebook Pixel</label>
                  <input
                    type="text"
                    value={formSettings.submitEventName || 'lead_form_submitted'}
                    onChange={(e) => updateFormSettings({ submitEventName: e.target.value })}
                    className={`${inputCls} font-mono text-xs`}
                    placeholder="lead_form_submitted"
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className={labelCls}>Nội Dung Thông Báo Thành Công</label>
                <textarea
                  rows={2}
                  value={formSettings.successMessage || ''}
                  onChange={(e) => updateFormSettings({ successMessage: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div className="mt-3">
                <label className={labelCls}>URL Chuyển Hướng Sau Khi Gửi (Tùy chọn - Thank You Page)</label>
                <input
                  type="url"
                  value={formSettings.redirectUrl || ''}
                  onChange={(e) => updateFormSettings({ redirectUrl: e.target.value })}
                  className={inputCls}
                  placeholder="https://... hoặc để trống nếu chỉ hiển thị thông báo popup"
                />
              </div>
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="space-y-4">
            <div className="bg-neutral-900 text-white rounded-2xl p-5 shadow-md">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  Xem Trước Khung Form
                </span>
                <span className="text-[10px] bg-neutral-800 px-2 py-0.5 rounded text-neutral-400 font-mono">
                  Live Preview
                </span>
              </div>

              <div className="bg-white text-neutral-900 rounded-xl p-4 shadow-xs space-y-3">
                {formSettings.badge && (
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                    {formSettings.badge}
                  </span>
                )}

                <h5 className="text-sm font-bold text-neutral-900 leading-snug">
                  {formSettings.title || 'Tiêu Đề Biểu Mẫu'}
                </h5>

                {formSettings.subtitle && (
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    {formSettings.subtitle}
                  </p>
                )}

                <div className="space-y-2 pt-2">
                  <div className="h-8 bg-neutral-100 rounded-lg border border-neutral-200 text-[11px] text-neutral-400 flex items-center px-3">
                    Họ và tên của bạn *
                  </div>
                  <div className="h-8 bg-neutral-100 rounded-lg border border-neutral-200 text-[11px] text-neutral-400 flex items-center px-3">
                    Số điện thoại liên hệ *
                  </div>
                </div>

                <button
                  type="button"
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{formSettings.submitButtonText || 'Gửi Thông Tin Ngay'}</span>
                </button>

                {formSettings.privacyDisclaimer && (
                  <div className="flex items-center justify-center gap-1 text-[10px] text-neutral-500 text-center pt-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>{formSettings.privacyDisclaimer}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Xem Trước Màn Hình Thành Công:</span>
              </div>
              <p className="text-xs font-bold text-emerald-900 mt-1">
                {formSettings.successHeading || 'Đăng Ký Thành Công!'}
              </p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                {formSettings.successMessage || 'Cảm ơn quý khách...'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Reusable Forms */}
      {activeSubTab === 'reusable' && (
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
            <div>
              <h4 className="text-sm font-bold text-neutral-900">Danh Sách Biểu Mẫu Tái Sử Dụng & Popup</h4>
              <p className="text-xs text-neutral-500">
                Tạo các biểu mẫu chuyên biệt để gắn vào các nút CTA hoặc Popup tư vấn ở các phần khác nhau trên trang.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCreateReusableForm}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Biểu Mẫu Phụ</span>
            </button>
          </div>

          {reusableForms.length === 0 ? (
            <div className="p-8 text-center text-neutral-400 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
              <p className="text-xs">Chưa có biểu mẫu phụ nào. Trang hiện đang sử dụng Biểu mẫu chính ở Tab 1 & Tab 2.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reusableForms.map((rf) => (
                <div key={rf.id} className="border border-neutral-200 rounded-xl p-4 bg-neutral-50/50 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={rf.name}
                      onChange={(e) => {
                        const next = reusableForms.map(f => f.id === rf.id ? { ...f, name: e.target.value } : f);
                        onChange({ ...config, websiteSettings: { ...config.websiteSettings, forms: next } });
                      }}
                      className="font-bold text-xs bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-neutral-900 flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteReusableForm(rf.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                      title="Xóa form này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-neutral-500 font-bold block mb-0.5">Tiêu Đề</label>
                      <input
                        type="text"
                        value={rf.settings?.title || ''}
                        onChange={(e) => {
                          const next = reusableForms.map(f => f.id === rf.id ? { ...f, settings: { ...f.settings, title: e.target.value } } : f);
                          onChange({ ...config, websiteSettings: { ...config.websiteSettings, forms: next } });
                        }}
                        className="w-full bg-white border border-neutral-200 rounded px-2 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-500 font-bold block mb-0.5">Nút Gửi</label>
                      <input
                        type="text"
                        value={rf.settings?.submitButtonText || ''}
                        onChange={(e) => {
                          const next = reusableForms.map(f => f.id === rf.id ? { ...f, settings: { ...f.settings, submitButtonText: e.target.value } } : f);
                          onChange({ ...config, websiteSettings: { ...config.websiteSettings, forms: next } });
                        }}
                        className="w-full bg-white border border-neutral-200 rounded px-2 py-1 text-xs"
                      />
                    </div>
                  </div>

                  <div className="text-[11px] text-neutral-500 flex items-center justify-between pt-1 border-t border-neutral-200">
                    <span>Số trường nhập: <strong>{rf.fields?.length || 0} trường</strong></span>
                    <span className="font-mono text-[10px] text-neutral-400">ID: {rf.id}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
