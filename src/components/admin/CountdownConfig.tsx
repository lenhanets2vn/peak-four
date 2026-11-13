import React from 'react';
import { Clock, Zap, Calendar, Sparkles, Check } from 'lucide-react';
import { CountdownConfig as CountdownConfigType } from '../../types';
import { CountdownBanner } from '../landing/CountdownBanner';

interface Props {
  config: CountdownConfigType;
  onChange: (config: CountdownConfigType) => void;
}

export const CountdownConfig: React.FC<Props> = ({ config, onChange }) => {
  const setQuickDate = (daysAhead: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    d.setHours(23, 59, 59, 0);
    // Format to datetime-local input: YYYY-MM-DDTHH:mm
    const isoString = d.toISOString();
    onChange({
      ...config,
      targetDate: isoString,
    });
  };

  // Format current targetDate for <input type="datetime-local">
  const formatForInput = (isoDate: string) => {
    try {
      const d = new Date(isoDate);
      if (isNaN(d.getTime())) return '';
      // local ISO string slice
      const offset = d.getTimezoneOffset() * 60000;
      const localISOTime = new Date(d.getTime() - offset).toISOString().slice(0, 16);
      return localISOTime;
    } catch {
      return '';
    }
  };

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    const selected = new Date(e.target.value);
    onChange({
      ...config,
      targetDate: selected.toISOString(),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <span>Đồng Hồ Đếm Ngược Khuyến Mãi</span>
          </h3>
          <p className="text-xs text-neutral-600 mt-0.5">
            Tạo sự cấp bách thúc đẩy chuyển đổi Facebook Ads với thanh banner cố định và đồng hồ đếm ngược
          </p>
        </div>

        {/* Master Enable/Disable Toggle */}
        <label className="inline-flex items-center gap-2 cursor-pointer bg-neutral-50 px-3 py-1.5 rounded-xl border border-neutral-200">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => onChange({ ...config, enabled: e.target.checked })}
            className="w-4 h-4 text-amber-600 rounded border-neutral-300 focus:ring-amber-500"
          />
          <span className="text-xs font-bold text-neutral-800">
            {config.enabled ? 'Đang Bật Đếm Ngược' : 'Đang Tắt Đếm Ngược'}
          </span>
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Settings Form */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-xs space-y-5">
          {/* Target End Date/Time */}
          <div>
            <label className="block text-xs font-bold text-neutral-800 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-neutral-500" />
              Ngày & Giờ Kết Thúc Khuyến Mãi *
            </label>
            <input
              type="datetime-local"
              value={formatForInput(config.targetDate)}
              onChange={handleDateInputChange}
              disabled={!config.enabled}
              className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-sm font-mono text-neutral-900 focus:outline-none focus:border-amber-600 disabled:opacity-50"
            />

            {/* Quick date shortcuts */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-[11px] text-neutral-400 font-medium">Chọn nhanh:</span>
              <button
                type="button"
                onClick={() => setQuickDate(1)}
                disabled={!config.enabled}
                className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                +24 Giờ
              </button>
              <button
                type="button"
                onClick={() => setQuickDate(3)}
                disabled={!config.enabled}
                className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                +3 Ngày
              </button>
              <button
                type="button"
                onClick={() => setQuickDate(7)}
                disabled={!config.enabled}
                className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                +7 Ngày
              </button>
            </div>
          </div>

          {/* Urgency Banner Text */}
          <div>
            <label className="block text-xs font-bold text-neutral-800 mb-1 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              Tiêu Đề Thanh Banner Cấp Bách
            </label>
            <input
              type="text"
              value={config.urgencyBannerText}
              onChange={(e) => onChange({ ...config, urgencyBannerText: e.target.value })}
              disabled={!config.enabled}
              placeholder="VD: ƯU ĐÃI ĐẶC BIỆT: Chỉ còn 4 suất kiểm toán miễn phí cho cohort đợt này!"
              className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl text-sm text-neutral-900 focus:outline-none focus:border-amber-600 disabled:opacity-50"
            />
            <p className="text-[11px] text-neutral-500 mt-1">
              Hiển thị trên thanh banner đầu trang trên cả thiết bị di động và máy tính.
            </p>
          </div>

          {/* Timer Block Title */}
          <div>
            <label className="block text-xs font-bold text-neutral-800 mb-1">
              Tiêu Đề Khối Đếm Ngược
            </label>
            <input
              type="text"
              value={config.title}
              onChange={(e) => onChange({ ...config, title: e.target.value })}
              disabled={!config.enabled}
              placeholder="VD: ƯU ĐÃI KHÉP LẠI SAU:"
              className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl text-sm text-neutral-900 focus:outline-none focus:border-amber-600 disabled:opacity-50"
            />
          </div>

          {/* Expired Fallback Message */}
          <div>
            <label className="block text-xs font-bold text-neutral-800 mb-1">
              Nội Dung Khi Hết Giờ (Khi đếm ngược về 0)
            </label>
            <input
              type="text"
              value={config.expiredMessage}
              onChange={(e) => onChange({ ...config, expiredMessage: e.target.value })}
              disabled={!config.enabled}
              placeholder="VD: Đợt ưu đãi đã khép lại. Vui lòng đăng ký vào danh sách chờ bên dưới."
              className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl text-sm text-neutral-900 focus:outline-none focus:border-amber-600 disabled:opacity-50"
            />
          </div>

          {/* Show Sticky Top Bar Toggle */}
          <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-neutral-800 block">
                Thanh Thông Báo Cố Định Đầu Trang (Sticky Top Banner)
              </span>
              <span className="text-[11px] text-neutral-500">
                Ghim banner đếm ngược ở đỉnh màn hình trình duyệt
              </span>
            </div>
            <input
              type="checkbox"
              checked={config.showBanner}
              onChange={(e) => onChange({ ...config, showBanner: e.target.checked })}
              disabled={!config.enabled}
              className="w-4 h-4 text-amber-600 rounded border-neutral-300 focus:ring-amber-500 disabled:opacity-50"
            />
          </div>
        </div>

        {/* Live Preview Column */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Xem Trước Khối Đồng Hồ Đếm Ngược
            </h4>

            {config.enabled ? (
              <div className="space-y-4">
                <CountdownBanner config={config} variant="card" />

                <div className="pt-2">
                  <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-2">
                    Xem Trước Banner Đầu Trang:
                  </span>
                  <div className="rounded-xl overflow-hidden shadow-xs">
                    <CountdownBanner config={config} variant="banner" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-neutral-400 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                Đồng hồ đếm ngược hiện đang tắt. Bật &quot;Đang Bật Đếm Ngược&quot; ở trên để kích hoạt.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
