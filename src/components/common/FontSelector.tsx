import React, { useState, useEffect } from 'react';
import { Type, Sparkles, Check, ChevronDown, RefreshCw } from 'lucide-react';
import { FONT_PRESETS, FontPreset, cleanFontName, loadGoogleFont } from '../../utils/fontPresets';

interface Props {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  description?: string;
  placeholder?: string;
  previewText?: string;
  showPreview?: boolean;
  compact?: boolean;
  allowCustom?: boolean;
}

export const FontSelector: React.FC<Props> = ({
  value = '',
  onChange,
  label,
  description,
  placeholder = 'Chọn hoặc nhập font chữ...',
  previewText = 'Bảo Việt Insurance – Niềm tin vững chắc, cam kết vàng 123456',
  showPreview = true,
  compact = false,
  allowCustom = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'sans-serif' | 'serif' | 'display' | 'monospace' | 'system'>('all');

  const currentCleanName = cleanFontName(value);

  // Find if current value matches one of our presets
  const matchedPreset = FONT_PRESETS.find(
    (p) => cleanFontName(p.name).toLowerCase() === currentCleanName.toLowerCase() ||
           cleanFontName(p.family).toLowerCase() === currentCleanName.toLowerCase()
  );

  useEffect(() => {
    if (value) {
      loadGoogleFont(value);
    }
  }, [value]);

  const handleSelectPreset = (preset: FontPreset) => {
    loadGoogleFont(preset.family);
    onChange(preset.family);
    setIsOpen(false);
    setCustomMode(false);
  };

  const handleCustomApply = () => {
    if (customInput.trim()) {
      const clean = customInput.trim();
      loadGoogleFont(clean);
      onChange(`'${clean}', sans-serif`);
      setIsOpen(false);
    }
  };

  const filteredPresets = activeCategory === 'all'
    ? FONT_PRESETS
    : FONT_PRESETS.filter((p) => p.category === activeCategory);

  return (
    <div className="space-y-1.5 font-sans">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-neutral-800 flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-[#0054a6]" />
            <span>{label}</span>
          </label>
          {value && (
            <button type="button" onClick={()=>onChange('')} className="text-[10px] font-bold text-blue-700 hover:underline" title="Dùng font kế thừa từ trang">Theo trang</button>
          )}
        </div>
      )}

      {description && (
        <p className="text-[11px] text-neutral-500">{description}</p>
      )}

      {/* Main trigger / display button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 hover:border-neutral-400 rounded-xl text-left text-xs font-semibold flex items-center justify-between gap-2 shadow-2xs transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="text-sm font-bold truncate"
              style={{ fontFamily: value || 'inherit' }}
            >
              {matchedPreset ? matchedPreset.name : currentCleanName || 'Mặc định (Inherit)'}
            </span>
            {matchedPreset && (
              <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium border border-blue-200">
                {matchedPreset.category === 'serif' ? 'Có chân' : matchedPreset.category === 'display' ? 'Sang trọng' : matchedPreset.category === 'monospace' ? 'Mono' : matchedPreset.category === 'system' ? 'Hệ thống' : 'Không chân'}
              </span>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown panel */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1.5 bg-white border border-neutral-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Category tabs */}
            <div className="flex border-b border-neutral-100 bg-neutral-50/80 p-1.5 gap-1 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors shrink-0 ${
                  activeCategory === 'all' ? 'bg-white text-blue-700 shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Tất cả ({FONT_PRESETS.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('sans-serif')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors shrink-0 ${
                  activeCategory === 'sans-serif' ? 'bg-white text-blue-700 shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Không chân (Sans)
              </button>
              <button type="button" onClick={()=>setActiveCategory('monospace')} className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors shrink-0 ${activeCategory==='monospace'?'bg-white text-blue-700 shadow-2xs':'text-neutral-600 hover:text-neutral-900'}`}>Mono</button>
              <button type="button" onClick={()=>setActiveCategory('display')} className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors shrink-0 ${activeCategory==='display'?'bg-white text-blue-700 shadow-2xs':'text-neutral-600 hover:text-neutral-900'}`}>Sang trọng / Display</button>
              <button
                type="button"
                onClick={() => setActiveCategory('serif')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors shrink-0 ${
                  activeCategory === 'serif' ? 'bg-white text-blue-700 shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Có chân (Serif)
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('system')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors shrink-0 ${
                  activeCategory === 'system' ? 'bg-white text-blue-700 shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Hệ thống
              </button>
            </div>

            {/* Presets list */}
            <div className="max-h-64 overflow-y-auto p-2 space-y-1 divide-y divide-neutral-100">
              {filteredPresets.map((preset) => {
                const isSelected =
                  cleanFontName(preset.name).toLowerCase() === currentCleanName.toLowerCase() ||
                  cleanFontName(preset.family).toLowerCase() === currentCleanName.toLowerCase();

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected ? 'bg-blue-50/80 border border-blue-200' : 'hover:bg-neutral-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-sm font-bold text-neutral-900"
                          style={{ fontFamily: preset.family }}
                        >
                          {preset.name}
                        </span>
                        {preset.vietnameseReady && (
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                            Tiếng Việt ✓
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-neutral-500 mt-0.5 leading-snug truncate">
                        {preset.description}
                      </p>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-[#0054a6] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom font input */}
            {allowCustom && (
              <div className="p-3 bg-neutral-50 border-t border-neutral-100">
                <div className="text-[11px] font-bold text-neutral-700 mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Nhập Google Font tùy chỉnh khác</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="VD: Roboto Slab, Poppins, Quicksand..."
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:border-[#0054a6]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCustomApply();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleCustomApply}
                    disabled={!customInput.trim()}
                    className="px-3 py-1.5 text-xs font-bold bg-[#0054a6] text-white rounded-lg hover:bg-[#004182] disabled:opacity-40 cursor-pointer"
                  >
                    Áp dụng
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Live font preview card */}
      {showPreview && value && (
        <div
          className="p-3 rounded-xl border border-neutral-200/80 bg-neutral-50/70 space-y-1 transition-all"
          style={{ fontFamily: value }}
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
            Xem trước mẫu chữ ({currentCleanName}):
          </div>
          <div className="text-sm font-bold text-neutral-900 leading-snug">
            {previewText}
          </div>
          <div className="text-xs text-neutral-600 font-normal leading-relaxed">
            Quyền lợi bồi thường minh bạch, chăm sóc tận tâm 24/7 và bảo lãnh viện phí trên toàn quốc.
          </div>
        </div>
      )}
    </div>
  );
};
