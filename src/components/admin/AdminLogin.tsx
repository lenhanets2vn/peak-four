import React, { useState, useEffect } from 'react';
import {
  Lock,
  ShieldAlert,
  ArrowLeft,
  Loader2,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Info,
  AlertTriangle,
  Headphones,
  Building2,
  Sparkles,
  Key,
  Fingerprint,
  Award,
  UserCheck,
} from 'lucide-react';
import { googleSignIn } from '../../services/firebaseAuth';
import { loginAdmin, saveServerToken, getAdminSession, getFirstSetupStatus, createFirstOwner } from '../../services/api';
import { AdminLoginSettings } from '../../types';
import { defaultAdminLoginSettings } from '../../data/defaultConfig';
import '../../styles/cmsWorkspace2026.css';
import '../../styles/tailadminCms.css';
import { loadGoogleFont } from '../../utils/fontPresets';

interface Props {
  onSuccess: (user?: any, token?: string) => void;
  onBackToLanding: () => void;
  settings?: AdminLoginSettings;
  brandName?: string;
}

export const AdminLogin: React.FC<Props> = ({
  onSuccess,
  onBackToLanding,
  settings: customSettings,
  brandName = '',
}) => {
  const settings: AdminLoginSettings = {
    ...defaultAdminLoginSettings,
    ...(customSettings || {}),
  };

  useEffect(() => {
    if (settings.fontFamily) loadGoogleFont(settings.fontFamily);
    if (settings.headingFontFamily) loadGoogleFont(settings.headingFontFamily);
  }, [settings.fontFamily, settings.headingFontFamily]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingQuick, setLoadingQuick] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstSetup, setFirstSetup] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupToken, setSetupToken] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupName, setSetupName] = useState('');
  useEffect(() => {
    let active = true;
    getFirstSetupStatus().then(status => {if(active)setFirstSetup(status.setupAvailable);}).catch(()=>{});
    return () => {active=false;};
  }, []);
  const handleFirstSetup = async (e: React.FormEvent) => {
    e.preventDefault();setError(null);setLoadingQuick(true);
    try {
      const result=await createFirstOwner({setupToken,username:setupName,password:setupPassword});
      setFirstSetup(false);setSetupOpen(false);setSetupToken('');setSetupPassword('');
      setUsername(setupName);setError(result.message);
    } catch(err:any) {setError(err?.message || 'Thiết lập tài khoản thất bại.');}
    finally{setLoadingQuick(false);}
  };


  const handleLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const login = await loginAdmin({ username, password });
      onSuccess(login.user, login.token);
    } catch (err: any) {
      setError(err?.message || 'Tên đăng nhập hoặc mật khẩu không đúng.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdmin = async () => {
    setError(null);
    setLoadingQuick(true);
    try {
      const login = await loginAdmin({ quickAdmin: true });
      onSuccess(login.user, login.token);
    } catch (err: any) {
      setError(err?.message || 'Đăng nhập nhanh thất bại. Vui lòng thử lại.');
    } finally {
      setLoadingQuick(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoadingGoogle(true);
    try {
      const google = await googleSignIn();
      if (!google?.accessToken) throw new Error('AUTH_FAILED');
      const login = await getAdminSession();
      onSuccess(login.user, 'cookie-session');
    } catch {
      setError('Không thể đăng nhập. Vui lòng kiểm tra tài khoản được cấp quyền hoặc liên hệ quản trị viên.');
    } finally {
      setLoadingGoogle(false);
    }
  };

  // Compute background styles
  const getContainerStyle = (): React.CSSProperties => {
    const type = settings.backgroundType || 'gradient';
    if (type === 'color') {
      return { backgroundColor: settings.backgroundColor || '#0b1329' };
    }
    if (type === 'gradient') {
      const grad = settings.backgroundGradient || { from: '#06132b', to: '#0f2744', direction: 'to-br' };
      const dirMap: Record<string, string> = {
        'to-br': '135deg',
        'to-b': '180deg',
        'to-r': '90deg',
        'to-tr': '45deg',
      };
      const deg = dirMap[grad.direction || 'to-br'] || '135deg';
      const viaPart = grad.via ? `, ${grad.via}` : '';
      return {
        background: `linear-gradient(${deg}, ${grad.from}${viaPart}, ${grad.to})`,
      };
    }
    if (type === 'image') {
      return {
        backgroundImage: `url(${settings.backgroundImage || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2000&q=80'})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      };
    }
    if (type === 'split') {
      return { backgroundColor: settings.backgroundColor || '#07152f' };
    }
    return { backgroundColor: '#0b1329' };
  };

  // Theme styling for login card
  const isLight = settings.themeMode === 'light';
  const isGlass = settings.themeMode === 'glassmorphism';

  const cardBaseTheme = isLight
    ? 'bg-white/95 border border-neutral-200 text-neutral-900'
    : isGlass
    ? 'bg-slate-900/65 backdrop-blur-xl border border-white/15 text-white'
    : 'bg-neutral-900/90 border border-neutral-700/80 text-neutral-100';

  const cardShadowClass =
    settings.cardShadow === 'none'
      ? 'shadow-none'
      : settings.cardShadow === 'md'
      ? 'shadow-md'
      : settings.cardShadow === 'xl'
      ? 'shadow-xl'
      : 'shadow-2xl';

  const borderRadius = `${settings.cardBorderRadius ?? 20}px`;
  const accentColor = settings.accentColor || '#0054a6';

  // Card alignment classes (for non-split mode)
  const positionClass =
    settings.cardPosition === 'left'
      ? 'justify-center items-center lg:justify-start lg:pl-16'
      : settings.cardPosition === 'right'
      ? 'justify-center items-center lg:justify-end lg:pr-16'
      : 'justify-center items-center';

  // Helper to render configured card icon
  const renderCardIcon = () => {
    const iconKey = settings.cardIcon || 'shieldCheck';
    const iconColor = settings.cardIconColor || accentColor;
    const iconBg = settings.cardIconBgColor || `${accentColor}25`;
    const iconProps = { className: 'w-6 h-6', style: { color: iconColor } };

    let IconComponent = Lock;
    if (iconKey === 'shield') IconComponent = ShieldAlert;
    else if (iconKey === 'shieldCheck') IconComponent = ShieldCheck;
    else if (iconKey === 'key') IconComponent = Key;
    else if (iconKey === 'fingerprint') IconComponent = Fingerprint;
    else if (iconKey === 'building') IconComponent = Building2;
    else if (iconKey === 'sparkles') IconComponent = Sparkles;
    else if (iconKey === 'userCheck') IconComponent = UserCheck;
    else if (iconKey === 'award') IconComponent = Award;

    return (
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md"
        style={{
          backgroundColor: iconBg,
          border: `1px solid ${iconColor}40`,
        }}
      >
        <IconComponent {...iconProps} />
      </div>
    );
  };

  // Sub-component: The Login Form Card
  const renderLoginCard = () => (
    <div
      className={`w-full max-w-md p-6 sm:p-8 transition-all ${cardBaseTheme} ${cardShadowClass}`}
      style={{
        borderRadius,
        fontFamily: settings.fontFamily || 'inherit',
        ...(settings.cardBackground ? { backgroundColor: settings.cardBackground } : {}),
        ...(settings.cardBorderColor ? { borderColor: settings.cardBorderColor } : {}),
        ...(settings.cardTextColor ? { color: settings.cardTextColor } : {}),
      }}
    >
      {/* Announcement Banner */}
      {settings.announcement?.enabled && settings.announcement?.text && (
        <div
          className={`mb-5 p-3 rounded-xl text-xs flex items-center gap-2.5 border ${
            settings.announcement.type === 'warning'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : settings.announcement.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
          }`}
        >
          {settings.announcement.type === 'warning' ? (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          ) : settings.announcement.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <Info className="w-4 h-4 shrink-0" />
          )}
          <span className="leading-snug">{settings.announcement.text}</span>
        </div>
      )}

      {/* Brand & Title Header */}
      <div className="text-center mb-6">
        {settings.logoUrl ? (
          <div className="flex justify-center mb-4">
            <img
              src={settings.logoUrl}
              alt="Logo"
              className="object-contain"
              style={{ width: `${settings.logoWidth || 160}px`, maxHeight: '64px' }}
            />
          </div>
        ) : (
          renderCardIcon()
        )}

        <h2
          className={`text-2xl font-black ${isLight ? 'text-neutral-900' : 'text-white'}`}
          style={{
            fontFamily: settings.headingFontFamily || settings.fontFamily || 'inherit',
            ...(settings.cardHeadingColor ? { color: settings.cardHeadingColor } : {}),
          }}
        >
          {settings.title || 'Đăng nhập Quản trị CMS'}
        </h2>
        <p
          className={`text-xs mt-2 ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}
          style={{
            fontFamily: settings.fontFamily || 'inherit',
            ...(settings.cardSubtextColor ? { color: settings.cardSubtextColor } : {}),
          }}
        >
          {settings.subtitle || 'Hệ thống quản trị nội dung và khách hàng'}
        </p>

        {settings.badgeText && (
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border"
            style={{
              backgroundColor: `${accentColor}15`,
              borderColor: `${accentColor}40`,
              color: isLight ? accentColor : '#93c5fd',
            }}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{settings.badgeText}</span>
          </div>
        )}
      </div>

      {/* Error notification */}
      {error && (
        <div className="mb-5 p-3 bg-red-950/70 border border-red-800 rounded-xl text-xs text-red-200 flex gap-2 items-start">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {firstSetup && (
        <div className="mb-5 rounded-xl border border-blue-400/40 bg-blue-900/30 p-4">
          <button type="button" className="w-full rounded-lg bg-blue-600 text-white font-bold py-3" onClick={()=>setSetupOpen(v=>!v)}>
            Thiết lập CMS lần đầu (bypass có bảo vệ)
          </button>
          {setupOpen && <form onSubmit={handleFirstSetup} className="mt-3 space-y-3">
            <p className="text-xs text-slate-200">Chỉ chủ website có mã CMS_SETUP_TOKEN trên Render mới tạo được tài khoản đầu tiên. Tính năng tự khóa sau khi thiết lập.</p>
            <input className="w-full rounded-lg border p-3 text-slate-900" type="password" autoComplete="off" placeholder="Mã thiết lập bí mật" value={setupToken} onChange={e=>setSetupToken(e.target.value)} required />
            <input className="w-full rounded-lg border p-3 text-slate-900" autoComplete="username" placeholder="Tên quản trị viên mới" value={setupName} onChange={e=>setSetupName(e.target.value)} required />
            <input className="w-full rounded-lg border p-3 text-slate-900" type="password" autoComplete="new-password" placeholder="Mật khẩu mới (ít nhất 10 ký tự, chữ và số)" value={setupPassword} onChange={e=>setSetupPassword(e.target.value)} required />
            <button className="w-full rounded-lg bg-emerald-600 text-white p-3 font-bold disabled:opacity-60" type="submit" disabled={loadingQuick}>Tạo Super Admin và khóa bypass</button>
          </form>}
        </div>
      )}
      {/* Nút Đăng nhập nhanh vào vai trò Admin không cần mật khẩu (Bypass) */}
      {settings.showQuickAdmin !== false && (
        <div
          className={`mb-6 p-3.5 rounded-xl border shadow-inner ${
            isLight
              ? 'bg-emerald-50/80 border-emerald-300'
              : 'bg-gradient-to-br from-emerald-950/70 via-neutral-900 to-teal-950/60 border-emerald-500/40'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-500">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Truy cập tức thì</span>
            </div>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
              Admin Bypass
            </span>
          </div>
          <button
            type="button"
            onClick={handleQuickAdmin}
            disabled={loadingQuick || loading || loadingGoogle}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm py-3 px-4 rounded-xl shadow-lg hover:shadow-emerald-900/40 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            style={{
              ...(settings.bypassButtonColor ? { background: settings.bypassButtonColor } : {}),
              ...(settings.bypassButtonTextColor ? { color: settings.bypassButtonTextColor } : {}),
              fontFamily: settings.headingFontFamily || settings.fontFamily || 'inherit',
            }}
          >
            {loadingQuick ? (
              <span className="inline-flex gap-2 items-center">
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang vào Admin...
              </span>
            ) : (
              <span className="inline-flex gap-2 items-center">
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                {settings.quickAdminLabel || 'Đăng nhập nhanh vai trò Admin (Bypass)'}
              </span>
            )}
          </button>
          <p
            className={`text-[11px] text-center mt-2 ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}
            style={{
              fontFamily: settings.fontFamily || 'inherit',
              ...(settings.cardSubtextColor ? { color: settings.cardSubtextColor } : {}),
            }}
          >
            {settings.bypassSubtitle || 'Truy cập với toàn quyền Super Admin (không cần tài khoản & mật khẩu)'}
          </p>
        </div>
      )}

      {/* Divider only separates the quick bypass from the account form. */}
      {settings.showQuickAdmin !== false && <div className="my-5 flex items-center gap-3">
        <div className={`h-px flex-1 ${isLight ? 'bg-neutral-200' : 'bg-neutral-700'}`} />
        <span className={`text-[11px] uppercase tracking-wider font-semibold ${isLight ? 'text-neutral-400' : 'text-neutral-500'}`}>
          hoặc tài khoản CMS
        </span>
        <div className={`h-px flex-1 ${isLight ? 'bg-neutral-200' : 'bg-neutral-700'}`} />
      </div>}

      {/* Local Username & Password Form */}
      <form onSubmit={handleLocal} className="space-y-3.5">
        <div>
          <label
            className={`block text-xs font-bold mb-1.5 ${isLight ? 'text-neutral-700' : 'text-neutral-300'}`}
            style={{
              fontFamily: settings.fontFamily || 'inherit',
              ...(settings.cardTextColor ? { color: settings.cardTextColor } : {}),
            }}
          >
            {settings.usernameLabel || 'Tên đăng nhập'}
          </label>
          <input
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={`w-full rounded-xl px-4 py-3 text-sm outline-none transition-all ${
              isLight
                ? 'bg-neutral-50 border border-neutral-300 text-neutral-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
                : 'bg-neutral-950/60 border border-neutral-700 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
            }`}
            placeholder={settings.usernamePlaceholder || 'admin / marketing...'}
            style={{ fontFamily: settings.fontFamily || 'inherit' }}
            required
          />
        </div>
        <div>
          <label
            className={`block text-xs font-bold mb-1.5 ${isLight ? 'text-neutral-700' : 'text-neutral-300'}`}
            style={{
              fontFamily: settings.fontFamily || 'inherit',
              ...(settings.cardTextColor ? { color: settings.cardTextColor } : {}),
            }}
          >
            {settings.passwordLabel || 'Mật khẩu'}
          </label>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full rounded-xl px-4 py-3 text-sm outline-none transition-all ${
              isLight
                ? 'bg-neutral-50 border border-neutral-300 text-neutral-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
                : 'bg-neutral-950/60 border border-neutral-700 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
            }`}
            placeholder={settings.passwordPlaceholder || '••••••••'}
            style={{ fontFamily: settings.fontFamily || 'inherit' }}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full text-white font-bold text-sm py-3 px-4 rounded-xl disabled:opacity-60 transition-all active:scale-[0.99] shadow-md cursor-pointer flex items-center justify-center gap-2"
          style={{
            backgroundColor: accentColor,
            fontFamily: settings.headingFontFamily || settings.fontFamily || 'inherit',
          }}
        >
          {loading ? (
            <span className="inline-flex gap-2 items-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang xác minh...
            </span>
          ) : (
            settings.submitButtonText || 'Đăng nhập'
          )}
        </button>
      </form>

      {/* Google SSO Button */}
      {settings.showGoogleLogin !== false && (
        <>
          <div className="my-5 flex items-center gap-3">
            <div className={`h-px flex-1 ${isLight ? 'bg-neutral-200' : 'bg-neutral-700'}`} />
            <span className={`text-[11px] ${isLight ? 'text-neutral-400' : 'text-neutral-500'}`}>hoặc</span>
            <div className={`h-px flex-1 ${isLight ? 'bg-neutral-200' : 'bg-neutral-700'}`} />
          </div>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loadingGoogle}
            className={`w-full font-semibold text-sm py-3 px-4 rounded-xl border flex items-center justify-center gap-3 disabled:opacity-60 transition-all cursor-pointer ${
              isLight
                ? 'bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-300 shadow-xs'
                : 'bg-neutral-800/80 hover:bg-neutral-800 text-white border-neutral-700'
            }`}
          >
            {loadingGoogle ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang xác minh Google...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Đăng nhập bằng Google</span>
              </>
            )}
          </button>
        </>
      )}

      {/* Support & Footer notes */}
      {(settings.supportContact || settings.copyrightText) && (
        <div className={`mt-6 pt-4 border-t text-center space-y-1 ${isLight ? 'border-neutral-100 text-neutral-500' : 'border-neutral-800/80 text-neutral-400'}`}>
          {settings.supportContact && (
            <div className="text-[11px] flex items-center justify-center gap-1.5 font-medium">
              <Headphones className="w-3.5 h-3.5" />
              <span>{settings.supportContact}</span>
            </div>
          )}
          {settings.copyrightText && (
            <div className="text-[10px] text-neutral-500">{settings.copyrightText}</div>
          )}
        </div>
      )}
    </div>
  );

  // Reference-inspired default: a clean split sign-in shell. No authentication
  // changes: the existing local, Google and explicitly-enabled quick-admin
  // handlers continue to power the form. Custom login designs retain priority.
  const useReferenceSignIn = settings.backgroundType === defaultAdminLoginSettings.backgroundType
    && settings.themeMode === defaultAdminLoginSettings.themeMode
    && settings.backgroundColor === defaultAdminLoginSettings.backgroundColor
    && settings.backgroundGradient?.from === defaultAdminLoginSettings.backgroundGradient?.from
    && settings.backgroundGradient?.to === defaultAdminLoginSettings.backgroundGradient?.to
    && (!settings.cardBackground || settings.cardBackground === defaultAdminLoginSettings.cardBackground);

  if (useReferenceSignIn) {
    return (
      <main className="cms-v2-signin cms-tail-signin" data-theme="reference-light">
        <section className="cms-v2-signin-visual" aria-label="Không gian quản trị CMS">
          <div className="cms-v2-signin-logo"><span>CMS</span><strong>{brandName || 'Không gian quản trị'}</strong></div>
          <div className="cms-v2-cloud cms-v2-cloud-one" aria-hidden="true" />
          <div className="cms-v2-cloud cms-v2-cloud-two" aria-hidden="true" />
          <div className="cms-v2-cloud cms-v2-cloud-three" aria-hidden="true" />
          <div className="cms-v2-signin-caption">
            <span>CMS WORKSPACE</span>
            <h1>Quản trị đơn giản.<br />Kết nối hiệu quả.</h1>
            <p>Quản lý nội dung, khách hàng và hiệu suất trên một không gian làm việc thống nhất.</p>
          </div>
        </section>
        <section className="cms-v2-signin-form-panel">
          {settings.showBackToLanding !== false && (
            <button type="button" onClick={onBackToLanding} className="cms-v2-signin-back"><ArrowLeft className="w-4 h-4" /> {settings.backToLandingText || 'Quay lại website'}</button>
          )}
          <div className="cms-v2-signin-form-wrap">
            <div className="cms-v2-signin-eyebrow">CMS WORKSPACE</div>
            {renderLoginCard()}
          </div>
          <p className="cms-v2-signin-footer">Khu vực quản trị dành cho tài khoản được cấp quyền.</p>
        </section>
      </main>
    );
  }

  // If Split Screen mode is active
  if (settings.backgroundType === 'split') {
    const bannerBg = settings.splitBannerImage || settings.backgroundImage || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80';
    return (
      <div className="min-h-screen flex flex-col lg:grid lg:grid-cols-12 relative selection:bg-blue-600 selection:text-white">
        {/* Left Column: Corporate Brand Banner */}
        <div
          className="lg:col-span-7 relative flex flex-col justify-between p-8 sm:p-12 lg:p-16 text-white min-h-[420px] lg:min-h-screen overflow-hidden"
          style={{
            backgroundImage: `url(${bannerBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Overlay */}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: settings.backgroundOverlayColor || '#030d22',
              opacity: (settings.backgroundOverlayOpacity ?? 75) / 100,
            }}
          />

          {/* Top Bar on Banner */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
                <Building2 className="w-5 h-5 text-blue-300" />
              </div>
              <span className="font-black text-sm tracking-wider uppercase">{brandName}</span>
            </div>
            {settings.showBackToLanding !== false && (
              <button
                onClick={onBackToLanding}
                className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15 transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{settings.backToLandingText || 'Landing Page'}</span>
              </button>
            )}
          </div>

          {/* Middle Value Proposition */}
          <div className="relative z-10 my-auto max-w-xl py-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-bold mb-4">
              <Sparkles className="w-3.5 h-3.5 text-blue-300" />
              <span>Nền tảng Quản trị Số Hóa</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight mb-4">
              {settings.splitBannerTitle || 'Hệ thống quản trị nội dung'}
            </h1>
            <p className="text-sm sm:text-base text-neutral-200/90 leading-relaxed mb-6 font-normal">
              {settings.splitBannerSubtitle ||
                'Hệ thống quản trị Landing Page, khách hàng tiềm năng & Trợ lý AI Notebook đàm thoại chuẩn xác không hallucination.'}
            </p>

            {/* Benefits List */}
            {settings.splitBannerBenefits && settings.splitBannerBenefits.length > 0 && (
              <div className="space-y-3">
                {settings.splitBannerBenefits.map((benefit, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-neutral-200">
                    <span className="p-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </span>
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Security Note */}
          <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-neutral-400">
            <span>{settings.supportContact || 'Hỗ trợ kỹ thuật: 1900 55 88 99'}</span>
            <span>Bảo mật SSL 256-bit</span>
          </div>
        </div>

        {/* Right Column: Form Container */}
        <div
          className="lg:col-span-5 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-12 relative"
          style={{ backgroundColor: settings.backgroundColor || '#07152f' }}
        >
          {renderLoginCard()}
        </div>
      </div>
    );
  }

  // Standard (Centered / Left / Right) Layout
  return (
    <div
      className={`min-h-screen flex flex-col px-4 py-12 relative selection:bg-blue-600 selection:text-white ${positionClass}`}
      style={getContainerStyle()}
    >
      {/* Background Overlay (for Image mode) */}
      {settings.backgroundType === 'image' && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundColor: settings.backgroundOverlayColor || '#000000',
            opacity: (settings.backgroundOverlayOpacity ?? 65) / 100,
            backdropFilter: settings.backgroundBlur ? `blur(${settings.backgroundBlur}px)` : undefined,
          }}
        />
      )}

      {/* Back to Landing Page link */}
      {settings.showBackToLanding !== false && (
        <button
          onClick={onBackToLanding}
          className="absolute top-6 left-6 z-20 flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white bg-black/30 hover:bg-black/50 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{settings.backToLandingText || 'Quay lại Landing Page'}</span>
        </button>
      )}

      {/* Render Card */}
      <div className="relative z-10 w-full flex justify-center">{renderLoginCard()}</div>
    </div>
  );
};
