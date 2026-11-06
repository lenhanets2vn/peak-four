import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Loader2, Lock, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { FormField, FormSettings, LeadTracking } from '../../types';
import { useCmsConfig } from '../../context/CmsConfigContext';
import { gradientString, resolveButtonDesign } from '../../utils/styleResolver';
import { submitLead } from '../../services/api';
import { trackCmsEvent } from '../../utils/actionRuntime';
import { loadGoogleFont } from '../../utils/fontPresets';

interface Props {
  fields: FormField[];
  settings: FormSettings;
  onSuccess?: (leadId: string) => void;
  instanceId?: string;
  initialValues?: Record<string, any>;
  initialTracking?: Partial<LeadTracking>;
}


export const LeadForm: React.FC<Props> = ({ fields, settings, onSuccess, instanceId = 'main', initialValues = {}, initialTracking = {} }) => {
  const cmsConfig = useCmsConfig();
  const submitDesign = resolveButtonDesign(cmsConfig, settings.submitButtonDesign);
  // Form values: stores all dynamic fields keyed by field.name
  const [formData, setFormData] = useState<Record<string, any>>(() => ({
    name: '',
    email: '',
    phone: '',
    ...(fields || []).reduce((acc: Record<string, any>, field) => {
      if (field.defaultValue !== undefined) acc[field.name] = field.defaultValue;
      return acc;
    }, {}),
    ...initialValues,
  }));

  const [submittedInfo, setSubmittedInfo] = useState<{
    name: string;
    email: string;
    phone: string;
  }>({ name: '', email: '', phone: '' });

  const [tracking, setTracking] = useState<LeadTracking>({
    pageUrl: '',
    deviceType: 'desktop',
    formId: settings.formId || 'main',
    ...initialTracking,
  });

  // Honeypot anti-spam field
  const [honeypot, setHoneypot] = useState('');

  // States
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitHovered, setSubmitHovered] = useState(false);
  const [analyticsStarted,setAnalyticsStarted]=useState(false);

  useEffect(() => { if (settings.fontFamily) loadGoogleFont(settings.fontFamily); }, [settings.fontFamily]);
  const formFontStyle: React.CSSProperties = { fontFamily: settings.fontFamily || 'inherit' };
  const titleStyle: React.CSSProperties = { fontFamily: settings.fontFamily || 'inherit', fontSize: settings.titleFontSize ? `${settings.titleFontSize}px` : undefined };
  const subtitleStyle: React.CSSProperties = { fontFamily: settings.fontFamily || 'inherit', fontSize: settings.subtitleFontSize ? `${settings.subtitleFontSize}px` : undefined };
  const labelStyle: React.CSSProperties = { fontFamily: settings.fontFamily || 'inherit', fontSize: settings.labelFontSize ? `${settings.labelFontSize}px` : undefined };
  const inputStyle: React.CSSProperties = { fontFamily: settings.fontFamily || 'inherit', fontSize: settings.inputFontSize ? `${settings.inputFontSize}px` : undefined };
  const helperStyle: React.CSSProperties = { fontFamily: settings.fontFamily || 'inherit', fontSize: settings.helperFontSize ? `${settings.helperFontSize}px` : undefined };

  // Capture UTM parameters and device attributes on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const isMobile = window.innerWidth <= 768;
    const isTablet = window.innerWidth > 768 && window.innerWidth <= 1024;

    const detectedTracking: LeadTracking = {
      utmSource: urlParams.get('utm_source') || (document.referrer ? new URL(document.referrer, window.location.origin).hostname : 'direct'),
      utmMedium: urlParams.get('utm_medium') || '',
      utmCampaign: urlParams.get('utm_campaign') || urlParams.get('campaign') || '',
      utmContent: urlParams.get('utm_content') || '',
      utmTerm: urlParams.get('utm_term') || '',
      pageUrl: window.location.href,
      page: (cmsConfig as any)?.__pageId || (initialTracking as any)?.page || '',
      referrer: document.referrer || '',
      userAgent: navigator.userAgent,
      deviceType: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
      formId: settings.formId || 'main',
      ...initialTracking,
    };

    setTracking(detectedTracking);
  }, []);

  // Receive dynamic values from CTA actions and resolve {{utm_*}} variables without custom code.
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const resolveDynamic = (value?: string) => {
      if (!value) return '';
      const vars: Record<string, string> = {
        utm_source: urlParams.get('utm_source') || '',
        utm_medium: urlParams.get('utm_medium') || '',
        utm_campaign: urlParams.get('utm_campaign') || '',
        utm_content: urlParams.get('utm_content') || '',
        utm_term: urlParams.get('utm_term') || '',
        page_url: window.location.href,
        ...Object.fromEntries(Object.entries(initialValues).map(([key, val]) => [key, String(val ?? '')])),
      };
      return value.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_match, key) => vars[key] ?? '');
    };
    const defaults = (fields || []).reduce((acc: Record<string, any>, field) => {
      if (field.dynamicValue) acc[field.name] = resolveDynamic(field.dynamicValue);
      else if (field.defaultValue !== undefined) acc[field.name] = field.defaultValue;
      return acc;
    }, {});
    setFormData(prev => ({ ...defaults, ...prev, ...initialValues }));

    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      const configuredFormId = settings.formId || 'main';
      if (detail.formId && detail.formId !== configuredFormId && detail.formId !== instanceId) return;
      if (detail.parameters) setFormData(prev => ({ ...prev, ...detail.parameters }));
      setTracking(prev => ({ ...prev, formId: detail.formId || settings.formId || prev.formId, section: detail.context?.sectionId || prev.section, product: detail.context?.product || detail.parameters?.product_name || detail.parameters?.product || prev.product }));
      requestAnimationFrame(() => document.getElementById(instanceId)?.scrollIntoView({ behavior: detail.context?.smoothScroll === false ? 'auto' : 'smooth', block: 'center' }));
    };
    window.addEventListener('cms:open-form', handler);
    return () => window.removeEventListener('cms:open-form', handler);
  }, [fields, instanceId, JSON.stringify(initialValues)]);

  const handleInputChange = (fieldName: string, value: any) => {
    if(!analyticsStarted){setAnalyticsStarted(true);trackCmsEvent('form_start',{analyticsType:'form_start',page:tracking.pageUrl,section:tracking.section,product:tracking.product,formId:settings.formId||tracking.formId||'main',utmSource:tracking.utmSource,utmMedium:tracking.utmMedium,utmCampaign:tracking.utmCampaign});}
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    // Clear error on change
    if (errors[fieldName]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    for (const field of fields) {
      if (field.visible === false || field.deletedAt) continue;
      const val = formData[field.name];
      const strVal = val !== undefined && val !== null ? String(val).trim() : '';

      // Check required fields
      if (field.required) {
        if (field.type === 'checkbox') {
          if (!val) {
            newErrors[field.name] = `Vui lòng chọn/đồng ý ${field.label}`;
            continue;
          }
        } else if (!strVal) {
          newErrors[field.name] = `Vui lòng nhập ${field.label}`;
          continue;
        }
      }

      // If value is provided (or required and entered), validate formats
      if (strVal) {
        // Email validation
        const isEmailField =
          field.type === 'email' ||
          field.name.toLowerCase() === 'email' ||
          field.label.toLowerCase().includes('email');
        if (isEmailField) {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strVal)) {
            newErrors[field.name] = 'Vui lòng nhập địa chỉ email hợp lệ';
            continue;
          }
        }

        // Phone validation
        const isPhoneField =
          field.type === 'tel' ||
          field.name.toLowerCase().includes('phone') ||
          field.name.toLowerCase().includes('thoai') ||
          field.label.toLowerCase().includes('thoai') ||
          field.label.toLowerCase().includes('phone') ||
          field.label.toLowerCase().includes('sđt');
        if (isPhoneField) {
          const digits = strVal.replace(/\D/g, '');
          if (digits.length < 7) {
            newErrors[field.name] = 'Vui lòng nhập số điện thoại hợp lệ (tối thiểu 7 chữ số)';
            continue;
          }
        }

        // Name validation
        const isNameField =
          field.name.toLowerCase() === 'name' ||
          field.label.toLowerCase().includes('tên') ||
          field.label.toLowerCase().includes('name') ||
          field.label.toLowerCase().includes('họ');
        if (isNameField && strVal.length < 2) {
          newErrors[field.name] = 'Họ và tên phải có ít nhất 2 ký tự';
          continue;
        }

        // Number validation
        if (field.type === 'number') {
          if (isNaN(Number(strVal))) {
            newErrors[field.name] = 'Vui lòng nhập số hợp lệ';
            continue;
          }
        }

        // Admin-configured validation (safe regex + length rules)
        if (field.minLength && strVal.length < field.minLength) {
          newErrors[field.name] = field.validationMessage || `${field.label} phải có ít nhất ${field.minLength} ký tự`;
          continue;
        }
        if (field.maxLength && strVal.length > field.maxLength) {
          newErrors[field.name] = field.validationMessage || `${field.label} không được vượt quá ${field.maxLength} ký tự`;
          continue;
        }
        if (field.validationPattern) {
          try {
            const re = new RegExp(field.validationPattern);
            if (!re.test(strVal)) {
              newErrors[field.name] = field.validationMessage || `${field.label} không đúng định dạng`;
              continue;
            }
          } catch {
            // Invalid admin regex is ignored on the client; the server validates defensively too.
          }
        }
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      // Find first error field and focus its input element
      const firstErrorField = fields.find((f) => newErrors[f.name]);
      if (firstErrorField) {
        const inputEl = document.getElementById(`input-${firstErrorField.name}`);
        if (inputEl) {
          inputEl.focus();
        }
      }
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Intelligently resolve top-level fields: name, email, phone
      let resolvedName = '';
      const nameField = fields.find(
        (f) =>
          f.name.toLowerCase() === 'name' ||
          f.label.toLowerCase().includes('tên') ||
          f.label.toLowerCase().includes('name') ||
          f.label.toLowerCase().includes('họ')
      );
      if (nameField && formData[nameField.name]) {
        resolvedName = String(formData[nameField.name]).trim();
      } else if (formData.name) {
        resolvedName = String(formData.name).trim();
      } else {
        const firstStr = Object.values(formData).find(
          (v) => typeof v === 'string' && v.trim().length >= 2
        );
        resolvedName = (firstStr as string) || 'Khách hàng';
      }

      let resolvedEmail = '';
      const emailField = fields.find(
        (f) =>
          f.type === 'email' ||
          f.name.toLowerCase().includes('email') ||
          f.label.toLowerCase().includes('email')
      );
      if (emailField && formData[emailField.name]) {
        resolvedEmail = String(formData[emailField.name]).trim().toLowerCase();
      } else if (formData.email) {
        resolvedEmail = String(formData.email).trim().toLowerCase();
      }

      let resolvedPhone = '';
      const phoneField = fields.find(
        (f) =>
          f.type === 'tel' ||
          f.name.toLowerCase().includes('phone') ||
          f.name.toLowerCase().includes('thoai') ||
          f.label.toLowerCase().includes('thoai') ||
          f.label.toLowerCase().includes('phone') ||
          f.label.toLowerCase().includes('sđt')
      );
      if (phoneField && formData[phoneField.name]) {
        resolvedPhone = String(formData[phoneField.name]).trim();
      } else if (formData.phone) {
        resolvedPhone = String(formData.phone).trim();
      }

      setSubmittedInfo({
        name: resolvedName,
        email: resolvedEmail,
        phone: resolvedPhone,
      });

      const payload = {
        name: resolvedName,
        email: resolvedEmail,
        phone: resolvedPhone,
        customResponses: { ...formData },
        tracking,
        website_trap: honeypot, // Honeypot verification
      };

      const result = await submitLead(payload);

      if (result.success) {
        trackCmsEvent(settings.submitEventName || 'lead_submit', { analyticsType:'form_submit', page: tracking.pageUrl, section: tracking.section, product: tracking.product, formId: settings.formId || tracking.formId || 'main', utmSource: tracking.utmSource, utmMedium: tracking.utmMedium, utmCampaign: tracking.utmCampaign });
        setIsSubmitted(true);
      if (settings.redirectUrl?.trim()) {
        window.setTimeout(() => window.location.assign(settings.redirectUrl!.trim()), 250);
      }
        if (onSuccess) {
          onSuccess(result.leadId);
        }
      } else {
        setServerError('Gửi đăng ký không thành công. Vui lòng thử lại.');
      }
    } catch (err: any) {
      setServerError(err.message || 'Có lỗi xảy ra khi gửi thông tin. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success view
  if (isSubmitted) {
    return (
      <div
        id={`lead-form-success-${instanceId}`}
        className="cms-ui-success bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-emerald-100 text-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 to-teal-500"></div>

        <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600 shadow-sm animate-bounce">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-3 py-1 rounded-full mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          Đã Tiếp Nhận Đăng Ký
        </span>

        <h3 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-2">
          {settings.successHeading || 'Đã Tiếp Nhận Đăng Ký Thành Công!'}
        </h3>

        <p className="text-neutral-600 text-sm sm:text-base leading-relaxed mb-6 max-w-md mx-auto">
          {settings.successMessage ||
            'Cảm ơn bạn đã liên hệ! Đội ngũ của chúng tôi sẽ xem xét thông tin và liên hệ lại trong thời gian sớm nhất.'}
        </p>

        <div className="bg-neutral-50 rounded-xl p-4 text-left border border-neutral-200 mb-6 text-xs text-neutral-600 space-y-1.5">
          <div className="flex justify-between">
            <span className="font-medium text-neutral-500">Họ và tên:</span>
            <span className="font-semibold text-neutral-800">{submittedInfo.name || formData.name || 'Khách hàng'}</span>
          </div>
          {submittedInfo.phone && (
            <div className="flex justify-between">
              <span className="font-medium text-neutral-500">Số điện thoại:</span>
              <span className="font-semibold text-neutral-800">{submittedInfo.phone}</span>
            </div>
          )}
          {submittedInfo.email && (
            <div className="flex justify-between">
              <span className="font-medium text-neutral-500">Email nhận thông báo:</span>
              <span className="font-semibold text-neutral-800">{submittedInfo.email}</span>
            </div>
          )}
        </div>

        <button
          type="button"
          id="btn-submit-another-lead"
          onClick={() => {
            setFormData({ name: '', email: '', phone: '', ...initialValues });
            setSubmittedInfo({ name: '', email: '', phone: '' });
            setIsSubmitted(false);
          }}
          className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-neutral-700 hover:text-neutral-950 underline underline-offset-4 py-2 cursor-pointer"
        >
          Gửi một đơn đăng ký khác
        </button>
      </div>
    );
  }

  // Sorted dynamic fields
  const sortedFields = [...fields].filter((field) => field.visible !== false && !field.deletedAt).sort((a, b) => a.order - b.order);

  return (
    <div
      id={instanceId === 'main' ? 'lead-form-container' : `lead-form-container-${instanceId}`}
      className="bg-white rounded-2xl p-5 sm:p-7 shadow-xl border border-neutral-200/90 relative"
      style={formFontStyle}
    >
      <div className="mb-5 text-center sm:text-left">
        {settings.badge && (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-800 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full mb-2.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
            {settings.badge}
          </span>
        )}
        <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight" style={titleStyle}>
          {settings.title}
        </h2>
        {settings.subtitle && (
          <p className="text-xs sm:text-sm text-neutral-600 mt-1 leading-relaxed" style={subtitleStyle}>
            {settings.subtitle}
          </p>
        )}
      </div>

      {serverError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-800 text-xs sm:text-sm">
          <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
          <span>{serverError}</span>
        </div>
      )}

      <form id={`lead-capture-form-${instanceId}`} onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Anti-spam Honeypot (hidden from human users, traps automated bots) */}
        <div style={{ display: 'none', position: 'absolute', left: '-9999px' }} aria-hidden="true">
          <label htmlFor="website_trap">Leave this empty</label>
          <input
            id="website_trap"
            type="text"
            name="website_trap"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>

        {/* Dynamic Fields */}
        {sortedFields.map((field) => {
          const fieldError = errors[field.name];
          const val = formData[field.name] ?? '';

          if (field.type === 'hidden') {
            return <input key={field.id} type="hidden" id={`input-${field.name}`} name={field.name} value={String(val ?? '')} readOnly />;
          }

          return (
            <div key={field.id} id={`form-group-${field.name}`} className="space-y-1">
              <label
                htmlFor={`input-${field.name}`}
                className="block text-xs sm:text-sm font-semibold text-neutral-800" style={labelStyle}
              >
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>

              {/* Field Types */}
              {field.type === 'checkbox' ? (
                <label className="flex items-start gap-2.5 rounded-xl border border-neutral-200 p-3 bg-neutral-50/50 cursor-pointer">
                  <input
                    id={`input-${field.name}`}
                    name={field.name}
                    type="checkbox"
                    checked={Boolean(val)}
                    onChange={(e) => handleInputChange(field.name, e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-blue-700 border-neutral-300 rounded focus:ring-blue-600"
                  />
                  <span className="text-xs sm:text-sm text-neutral-700">{field.placeholder || field.label}</span>
                </label>
              ) : field.type === 'multiselect' ? (
                <select
                  multiple
                  id={`input-${field.name}`}
                  name={field.name}
                  value={Array.isArray(val) ? val : []}
                  onChange={(e) => handleInputChange(field.name, Array.from(e.currentTarget.selectedOptions).map((o: HTMLOptionElement) => o.value))}
                  style={inputStyle}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-neutral-900 bg-white focus:outline-none transition-all ${fieldError ? 'border-red-400' : 'border-neutral-300 focus:border-blue-700 focus:ring-2 focus:ring-blue-100'}`}
                >
                  {(field.options || []).map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                </select>
              ) : field.type === 'textarea' ? (
                <textarea
                  id={`input-${field.name}`}
                  name={field.name}
                  rows={3}
                  value={val}
                  placeholder={field.placeholder}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                  style={inputStyle}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none transition-all ${
                    fieldError
                      ? 'border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                      : 'border-neutral-300 focus:border-blue-700 focus:ring-2 focus:ring-blue-100 bg-neutral-50/50 hover:bg-white'
                  }`}
                />
              ) : field.type === 'select' ? (
                <select
                  id={`input-${field.name}`}
                  name={field.name}
                  value={val}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                  style={inputStyle}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-neutral-900 bg-white focus:outline-none transition-all ${
                    fieldError
                      ? 'border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                      : 'border-neutral-300 focus:border-blue-700 focus:ring-2 focus:ring-blue-100 bg-neutral-50/50 hover:bg-white'
                  }`}
                >
                  <option value="">{field.placeholder || `Chọn ${field.label}`}</option>
                  {(field.options || []).map((opt, i) => (
                    <option key={i} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : field.type === 'radio' ? (
                <div className="space-y-2 pt-1">
                  {(field.options || []).map((opt, i) => (
                    <label
                      key={i}
                      className="flex items-center gap-2.5 text-xs sm:text-sm text-neutral-700 cursor-pointer p-2 rounded-lg hover:bg-neutral-50 border border-transparent hover:border-neutral-200"
                    >
                      <input
                        type="radio"
                        name={field.name}
                        value={opt}
                        checked={val === opt}
                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                        className="w-4 h-4 text-blue-700 border-neutral-300 focus:ring-blue-600"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <input
                  id={`input-${field.name}`}
                  name={field.name}
                  type={field.type}
                  value={val}
                  placeholder={field.placeholder}
                  autoComplete={
                    field.name === 'name'
                      ? 'name'
                      : field.name === 'email'
                      ? 'email'
                      : field.name === 'phone'
                      ? 'tel'
                      : undefined
                  }
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                  style={inputStyle}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none transition-all ${
                    fieldError
                      ? 'border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                      : 'border-neutral-300 focus:border-blue-700 focus:ring-2 focus:ring-blue-100 bg-neutral-50/50 hover:bg-white'
                  }`}
                />
              )}

              {fieldError && (
                <p className="text-[11px] sm:text-xs text-red-600 font-medium flex items-center gap-1 pt-0.5" style={helperStyle}>
                  <AlertCircle className="w-3 h-3" />
                  {fieldError}
                </p>
              )}
            </div>
          );
        })}

        {/* Submit Button */}
        <button
          type="submit"
          id="btn-submit-lead-form"
          disabled={isSubmitting}
          onMouseEnter={() => setSubmitHovered(true)}
          onMouseLeave={() => setSubmitHovered(false)}
          className="w-full mt-2 text-sm sm:text-base transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
          style={{
            background: submitHovered ? (submitDesign.hoverBackground || gradientString(submitDesign.gradient) || 'var(--cms-button-hover, #003f7d)') : (gradientString(submitDesign.gradient) || submitDesign.background || 'var(--cms-button-primary, #0054a6)'),
            color: submitHovered ? (submitDesign.hoverTextColor || submitDesign.textColor || '#fff') : (submitDesign.textColor || '#fff'),
            borderColor: submitHovered ? (submitDesign.hoverBorderColor || submitDesign.borderColor || 'transparent') : (submitDesign.borderColor || 'transparent'),
            borderStyle: 'solid', borderWidth: submitDesign.borderWidth ?? 0, borderRadius: submitDesign.borderRadius ?? 12,
            padding: `${submitDesign.paddingY ?? 14}px ${submitDesign.paddingX ?? 24}px`,
            minHeight: submitDesign.height, fontSize: submitDesign.fontSize, fontWeight: submitDesign.fontWeight ?? 700,
            boxShadow: submitDesign.shadow === 'lg' ? '0 12px 28px rgba(0,0,0,.18)' : submitDesign.shadow === 'md' ? '0 6px 16px rgba(0,0,0,.14)' : submitDesign.shadow === 'sm' ? '0 1px 2px rgba(0,0,0,.08)' : undefined,
          }}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{settings.submittingText || 'Submitting...'}</span>
            </>
          ) : (
            <>
              <span>{settings.submitButtonText || 'Submit Application →'}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {/* Privacy Note */}
        {settings.privacyDisclaimer && (
          <p className="text-[11px] text-neutral-500 text-center flex items-center justify-center gap-1 pt-2" style={helperStyle}>
            <Lock className="w-3 h-3 text-neutral-400 shrink-0" />
            <span>{settings.privacyDisclaimer}</span>
          </p>
        )}
      </form>
    </div>
  );
};
