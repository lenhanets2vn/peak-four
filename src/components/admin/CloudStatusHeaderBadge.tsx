import React, { useEffect, useRef, useState } from 'react';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Link2,
  Unlink,
  Zap,
  ShieldCheck,
  Radio,
  UserCheck,
  Server,
} from 'lucide-react';
import { AdminUser, CloudStatusState, LeadSubmission } from '../../types';
import {
  checkFirebaseCloudStatus,
  getCloudStatus,
  subscribeToCloudStatus,
  syncAllLeadsToFirestore,
} from '../../services/firebaseRealtime';
import {
  linkCurrentUserAccount,
  unlinkCurrentUserAccount,
} from '../../services/firebaseAuth';

interface Props {
  user: AdminUser;
  onUserUpdate: (updatedUser: AdminUser) => void;
  onOpenFirebaseSettings?: () => void;
  leads?: LeadSubmission[];
  onLeadsSynced?: () => void;
}

export const CloudStatusHeaderBadge: React.FC<Props> = ({
  user,
  onUserUpdate,
  onOpenFirebaseSettings,
  leads = [],
  onLeadsSynced,
}) => {
  const [status, setStatus] = useState<CloudStatusState>(getCloudStatus());
  const [open, setOpen] = useState(false);
  const [linking, setLinking] = useState(false);
  const [syncingLeads, setSyncingLeads] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Subscribe to real-time status updates
  useEffect(() => {
    const unsub = subscribeToCloudStatus((nextStatus) => {
      setStatus(nextStatus);
    });
    // Check initial connection
    checkFirebaseCloudStatus(user, false);
    return unsub;
  }, [user]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const handleTestConnection = async () => {
    setChecking(true);
    setMessage(null);
    try {
      const next = await checkFirebaseCloudStatus(user, true);
      if (next.status === 'connected' || next.status === 'unlinked') {
        setMessage({
          text: next.degraded
            ? `Firestore đang kết nối nhưng lần ghi gần nhất có cảnh báo: ${next.lastWriteError || 'phản hồi chậm'}`
            : `Kết nối Firestore backend thành công! Độ trễ kiểm tra: ${next.latencyMs ?? 0}ms`,
          type: next.degraded ? 'info' : 'success',
        });
      } else if (next.status === 'not_configured') {
        setMessage({
          text: 'Chưa cấu hình Firestore backend trên Render Environment.',
          type: 'error',
        });
      } else {
        setMessage({
          text: next.error || 'Không thể kết nối máy chủ Firebase.',
          type: 'error',
        });
      }
    } catch (e: any) {
      setMessage({ text: e.message || 'Lỗi kiểm tra kết nối', type: 'error' });
    } finally {
      setChecking(false);
    }
  };

  const handleLinkFirebase = async () => {
    setLinking(true);
    setMessage(null);
    try {
      const { user: updatedUser, firebaseUser } = await linkCurrentUserAccount();
      onUserUpdate(updatedUser);
      await checkFirebaseCloudStatus(updatedUser, true);
      setMessage({
        text: `Đã liên kết tài khoản ${firebaseUser.email}. Kết nối Firestore backend được kiểm tra riêng qua Render Environment.`,
        type: 'success',
      });
    } catch (e: any) {
      setMessage({
        text: e.message || 'Không thể liên kết tài khoản Firebase.',
        type: 'error',
      });
    } finally {
      setLinking(false);
    }
  };

  const handleUnlinkFirebase = async () => {
    if (!confirm('Bạn có chắc muốn hủy liên kết tài khoản Firebase khỏi tài khoản CMS này?')) {
      return;
    }
    setLinking(true);
    setMessage(null);
    try {
      const updatedUser = await unlinkCurrentUserAccount();
      onUserUpdate(updatedUser);
      await checkFirebaseCloudStatus(updatedUser, true);
      setMessage({
        text: 'Đã hủy liên kết tài khoản Firebase.',
        type: 'info',
      });
    } catch (e: any) {
      setMessage({
        text: e.message || 'Hủy liên kết thất bại.',
        type: 'error',
      });
    } finally {
      setLinking(false);
    }
  };

  const handleSyncAllLeads = async () => {
    if (!leads.length) {
      setMessage({ text: 'Chưa có lead nào trên hệ thống để đồng bộ.', type: 'info' });
      return;
    }
    setSyncingLeads(true);
    setMessage(null);
    try {
      const result = await syncAllLeadsToFirestore(leads);
      if (result.success) {
        setMessage({
          text: `Đã đồng bộ ${result.count} leads lên Firebase Cloud thành công!`,
          type: 'success',
        });
        onLeadsSynced?.();
      } else {
        setMessage({
          text: result.error || 'Lỗi đồng bộ Leads lên Cloud.',
          type: 'error',
        });
      }
    } catch (e: any) {
      setMessage({ text: e.message || 'Lỗi đồng bộ', type: 'error' });
    } finally {
      setSyncingLeads(false);
    }
  };

  // Render Pill on Header
  const renderPillContent = () => {
    if (checking || status.status === 'syncing') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-950/80 border border-blue-600/50 text-blue-300 text-xs font-semibold hover:bg-blue-900/60 transition-colors">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
          <span className="hidden sm:inline">Đang đồng bộ Cloud...</span>
          <span className="sm:hidden">Đồng bộ</span>
        </span>
      );
    }

    if (status.status === 'connected' && status.degraded) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-950/80 border border-amber-600/50 text-amber-300 text-xs font-semibold hover:bg-amber-900/60 transition-colors">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Cloud: chậm</span>
          <span className="sm:hidden">Cloud</span>
        </span>
      );
    }

    if (status.status === 'connected') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-950/80 border border-emerald-600/50 text-emerald-300 text-xs font-semibold hover:bg-emerald-900/60 transition-colors">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Cloud className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Cloud: Online</span>
          <span className="sm:hidden">Online</span>
        </span>
      );
    }

    if (status.status === 'unlinked') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-950/80 border border-amber-600/50 text-amber-300 text-xs font-semibold hover:bg-amber-900/60 transition-colors">
          <span className="h-2 w-2 rounded-full bg-amber-400"></span>
          <Link2 className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Liên kết Firebase</span>
          <span className="sm:hidden">Liên kết</span>
        </span>
      );
    }

    if (status.status === 'not_configured') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-neutral-800/80 border border-neutral-700 text-neutral-400 text-xs font-semibold hover:bg-neutral-800 transition-colors">
          <CloudOff className="w-3.5 h-3.5 text-neutral-500" />
          <span className="hidden sm:inline">Chưa cấu hình Cloud</span>
          <span className="sm:hidden">No Cloud</span>
        </span>
      );
    }

    const isQuotaBlocked = /RESOURCE_EXHAUSTED|quota exceeded|quota\/rate limit|quota/i.test(String(status.error || ''));
    if (isQuotaBlocked) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-950/80 border border-amber-600/50 text-amber-300 text-xs font-semibold hover:bg-amber-900/60 transition-colors">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Cloud: giới hạn quota</span>
          <span className="sm:hidden">Quota</span>
        </span>
      );
    }

    // Offline or Error
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-950/80 border border-rose-600/50 text-rose-300 text-xs font-semibold hover:bg-rose-900/60 transition-colors">
        <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
        <span className="hidden sm:inline">Local Mode · Cloud Offline</span>
        <span className="sm:hidden">Local</span>
      </span>
    );
  };

  const isUserLinked = !!(user.firebaseLinked || user.authMethod === 'google' || user.firebaseUid);
  const userFirebaseEmail = user.firebaseEmail || (user.authMethod === 'google' ? user.email : undefined);

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-xl"
        title="Bấm để xem trạng thái kết nối Cloud & Đồng bộ thời gian thực"
      >
        {renderPillContent()}
      </button>

      {/* Popover Card */}
      {open && (
        <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-24px)] rounded-2xl bg-neutral-900 border border-neutral-800 text-white shadow-2xl z-50 p-4 sm:p-5 text-left animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-start justify-between pb-3 border-b border-neutral-800">
            <div>
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Firebase Cloud Sync</h3>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Nhận diện tự động qua biến môi trường (Environment Variable)
              </p>
            </div>
            <div className="text-right">
              {status.status === 'connected' ? (
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 font-bold border border-emerald-700/50">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-bold border border-neutral-700">
                  {status.status === 'not_configured' ? 'Chưa cấu hình' : 'Offline'}
                </span>
              )}
            </div>
          </div>

          {/* Feedback message */}
          {message && (
            <div
              className={`mt-3 p-2.5 rounded-xl text-xs font-medium border ${
                message.type === 'success'
                  ? 'bg-emerald-950/80 border-emerald-700/50 text-emerald-200'
                  : message.type === 'error'
                  ? 'bg-rose-950/80 border-rose-700/50 text-rose-200'
                  : 'bg-blue-950/80 border-blue-700/50 text-blue-200'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Account Linking Section */}
          <div className="mt-3.5 bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                Tài khoản CMS của bạn
              </span>
              <span className="text-[11px] text-neutral-400 font-mono">
                {user.username || user.email}
              </span>
            </div>

            <div className="mt-2.5 pt-2 border-t border-neutral-800/60 text-xs">
              {isUserLinked ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-neutral-300">
                    <span className="flex items-center gap-1 text-emerald-400 text-[11px] font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Đã liên kết Firebase
                    </span>
                    <span className="text-[11px] text-neutral-300 font-medium truncate max-w-[160px]">
                      {userFirebaseEmail || 'Google Account'}
                    </span>
                  </div>
                  {user.firebaseUid && (
                    <div className="text-[10px] text-neutral-500 font-mono truncate">
                      UID: {user.firebaseUid}
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      disabled={linking}
                      onClick={handleLinkFirebase}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[11px] font-semibold text-neutral-200 flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                    >
                      {linking ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}
                      Đổi tài khoản
                    </button>
                    {user.authMethod !== 'google' && (
                      <button
                        type="button"
                        disabled={linking}
                        onClick={handleUnlinkFirebase}
                        className="py-1.5 px-2 rounded-lg bg-neutral-800/50 hover:bg-rose-950/60 hover:text-rose-300 text-[11px] font-semibold text-neutral-400 flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                      >
                        <Unlink className="w-3 h-3" />
                        Hủy
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Liên kết tài khoản của bạn với Firebase để đồng bộ dữ liệu hai chiều và bảo vệ quyền hạn Cloud.
                  </p>
                  <button
                    type="button"
                    disabled={linking}
                    onClick={handleLinkFirebase}
                    className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
                  >
                    {linking ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Đang liên kết...
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        Liên kết tài khoản với Firebase
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sync Information Details */}
          <div className="mt-3 space-y-2 text-[11px]">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="flex items-center gap-1.5">
                <Server className="w-3 h-3 text-neutral-500" />
                Project ID:
              </span>
              <span className="font-mono text-neutral-200 truncate max-w-[170px]">
                {status.projectId || '(Tự động nhận diện)'}
              </span>
            </div>

            <div className="flex items-center justify-between text-neutral-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Nguồn Cloud:
              </span>
              <span className="text-[10px] text-emerald-300 font-mono truncate max-w-[170px]" title={status.envSource || 'Biến môi trường (Environment Variable)'}>
                {status.envSource || 'Biến môi trường (Env)'}
              </span>
            </div>

            <div className="flex items-center justify-between text-neutral-400">
              <span className="flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-neutral-500" />
                Listeners Real-time:
              </span>
              <span className="text-neutral-200 font-medium">
                {status.status === 'connected' ? 'Leads & Pages (Active)' : 'Tạm dừng'}
              </span>
            </div>

            <div className="flex items-center justify-between text-neutral-400">
              <span>Độ trễ phản hồi:</span>
              <span className="font-mono text-neutral-200">
                {status.latencyMs !== undefined ? `${status.latencyMs} ms` : '—'}
              </span>
            </div>

            <div className="flex items-center justify-between text-neutral-400">
              <span>Đồng bộ lần cuối:</span>
              <span className="text-neutral-200">
                {status.lastSyncTime
                  ? new Date(status.lastSyncTime).toLocaleTimeString('vi-VN')
                  : 'Chưa đồng bộ'}
              </span>
            </div>

            <div className="flex items-center justify-between text-neutral-400">
              <span>Message Queue:</span>
              <span className={`font-mono ${Number(status.messageQueue?.deadLetter || 0) > 0 ? 'text-rose-300' : Number(status.messageQueue?.pending || 0) > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
                {status.messageQueue?.configured
                  ? `${status.messageQueue.pending ?? 0} chờ · ${status.messageQueue.leased ?? 0} xử lý · ${status.messageQueue.deadLetter ?? 0} DLQ`
                  : 'Chưa bật'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 pt-3 border-t border-neutral-800 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={checking}
              onClick={handleTestConnection}
              className="flex-1 py-1.5 px-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin text-blue-400' : ''}`} />
              Kiểm tra Cloud
            </button>

            <button
              type="button"
              disabled={syncingLeads || !leads.length}
              onClick={handleSyncAllLeads}
              className="flex-1 py-1.5 px-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
              title="Đẩy toàn bộ Leads từ server lên Firestore Cloud"
            >
              {syncingLeads ? <RefreshCw className="w-3 h-3 animate-spin text-blue-400" /> : <Cloud className="w-3 h-3" />}
              Đồng bộ Leads ({leads.length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
