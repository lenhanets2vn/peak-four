import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  RefreshCw,
  TrendingUp,
  Tag,
  Smartphone,
  Monitor,
  ExternalLink,
  X,
  FileSpreadsheet,
  Trash2,
} from 'lucide-react';
import { LeadSubmission, FormField } from '../../types';
import { deleteAllLeads, deleteLead, downloadLeadsCsv } from '../../services/api';

interface Props {
  leads: LeadSubmission[];
  formFields: FormField[];
  onSyncLead?: (leadId: string) => void;
  onRefresh?: () => void;
  canDelete?: boolean;
}

export const LeadManagement: React.FC<Props> = ({
  leads,
  formFields,
  onSyncLead,
  onRefresh,
  canDelete = false,
}) => {
  const [deleting, setDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [leadToDelete, setLeadToDelete] = useState<LeadSubmission | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [campaignFilter, setCampaignFilter] = useState<string>('all');
  const [syncFilter, setSyncFilter] = useState<'all' | 'synced' | 'pending' | 'failed'>('all');
  const [selectedLead, setSelectedLead] = useState<LeadSubmission | null>(null);

  // Extract unique campaigns for filter dropdown
  const uniqueCampaigns = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.tracking.utmCampaign) set.add(l.tracking.utmCampaign);
      if (l.tracking.utmSource) set.add(l.tracking.utmSource);
    });
    return Array.from(set);
  }, [leads]);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;

    return leads.filter((lead) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const inName = lead.name.toLowerCase().includes(q);
        const inEmail = lead.email.toLowerCase().includes(q);
        const inPhone = lead.phone.toLowerCase().includes(q);
        const inCampaign = (lead.tracking.utmCampaign || '').toLowerCase().includes(q);
        const inSource = (lead.tracking.utmSource || '').toLowerCase().includes(q);
        const inCustom = Object.values(lead.customResponses || {}).some((v) =>
          String(v).toLowerCase().includes(q)
        );
        if (!inName && !inEmail && !inPhone && !inCampaign && !inSource && !inCustom) {
          return false;
        }
      }

      // Date
      const subTime = new Date(lead.submittedAt).getTime();
      if (dateFilter === 'today' && subTime < todayStart) return false;
      if (dateFilter === '7days' && subTime < sevenDaysAgo) return false;
      if (dateFilter === '30days' && subTime < thirtyDaysAgo) return false;

      // Campaign / Source
      if (campaignFilter !== 'all') {
        const matchesCampaign =
          lead.tracking.utmCampaign === campaignFilter ||
          lead.tracking.utmSource === campaignFilter;
        if (!matchesCampaign) return false;
      }

      // Sync status
      if (syncFilter !== 'all' && lead.syncStatus !== syncFilter) {
        return false;
      }

      return true;
    });
  }, [leads, search, dateFilter, campaignFilter, syncFilter]);

  // Aggregate Metrics
  const totalLeads = leads.length;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayLeads = leads.filter((l) => new Date(l.submittedAt).getTime() >= todayStart).length;
  const syncedCount = leads.filter((l) => l.syncStatus === 'synced').length;
  const fbLeads = leads.filter((l) =>
    (l.tracking.utmSource || '').toLowerCase().includes('facebook') ||
    (l.tracking.utmCampaign || '').toLowerCase().includes('fb')
  ).length;

  // Chart data: Leads by date (last 7 days)
  const last7DaysChart = useMemo(() => {
    const days: { label: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      const count = leads.filter((l) => {
        const t = new Date(l.submittedAt).getTime();
        return t >= dayStart && t < dayEnd;
      }).length;
      days.push({
        label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }),
        count,
      });
    }
    return days;
  }, [leads]);

  const maxDaily = Math.max(...last7DaysChart.map((d) => d.count), 1);

  // Campaign breakdown counts
  const campaignBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach((l) => {
      const camp = l.tracking.utmCampaign || l.tracking.utmSource || 'Direct / Organic';
      counts[camp] = (counts[camp] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [leads]);

  const handleConfirmDeleteSingle = async () => {
    if (!leadToDelete) return;
    const targetId = leadToDelete.id;
    const targetName = leadToDelete.name;
    setDeletingId(targetId);
    try {
      await deleteLead(targetId);
      if (selectedLead?.id === targetId) setSelectedLead(null);
      setLeadToDelete(null);
      setNotice({ text: `Đã xóa khách hàng "${targetName}" thành công.`, type: 'success' });
      setTimeout(() => setNotice(null), 4000);
      onRefresh?.();
    } catch (e: any) {
      setNotice({ text: e?.message || 'Không thể xóa khách hàng này.', type: 'error' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleConfirmDeleteAll = async () => {
    if (!leads.length || deleting) return;
    setDeleting(true);
    try {
      const r = await deleteAllLeads();
      setConfirmDeleteAll(false);
      setSelectedLead(null);
      setNotice({ text: `Đã xóa toàn bộ ${r.deletedCount || leads.length} khách hàng thành công.`, type: 'success' });
      setTimeout(() => setNotice(null), 4000);
      onRefresh?.();
    } catch (e: any) {
      setNotice({ text: e?.message || 'Không thể xóa toàn bộ danh sách.', type: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Notification */}
      {notice && (
        <div
          className={`p-3.5 rounded-xl text-xs font-bold border flex items-center justify-between transition-all ${
            notice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} className="text-xs hover:opacity-75 cursor-pointer">
            ✕
          </button>
        </div>
      )}
      {/* 1. Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Tổng Số Leads</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-neutral-900">{totalLeads}</div>
          <span className="text-[11px] text-neutral-400 mt-1 block">Tổng lượt đăng ký ghi nhận</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Leads Hôm Nay</span>
            <Calendar className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700">{todayLeads}</div>
          <span className="text-[11px] text-neutral-400 mt-1 block">Đăng ký trong ngày</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Facebook Ads</span>
            <Tag className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-700">{fbLeads}</div>
          <span className="text-[11px] text-neutral-400 mt-1 block">Ghi nhận từ chiến dịch FB</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Google Sheets</span>
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-neutral-900">
            {syncedCount} <span className="text-sm font-normal text-neutral-500">/ {totalLeads}</span>
          </div>
          <span className="text-[11px] text-neutral-400 mt-1 block">Hàng đã đồng bộ</span>
        </div>
      </div>

      {/* 2. Visual Trend & Campaign Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Daily Submissions Bar Chart */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>Biểu Đồ Leads Theo Ngày (7 ngày qua)</span>
            </h4>
          </div>

          <div className="h-32 flex items-end gap-2 sm:gap-4 pt-4 border-b border-neutral-100">
            {last7DaysChart.map((day, idx) => {
              const heightPercent = Math.max((day.count / maxDaily) * 100, 8);
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[10px] font-bold text-neutral-700 font-mono">
                    {day.count}
                  </span>
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full max-w-[36px] bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t-md transition-all hover:from-blue-700 hover:to-indigo-600 shadow-2xs"
                  />
                  <span className="text-[10px] text-neutral-400 truncate w-full text-center">
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Campaigns Distribution */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600 mb-3 flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-blue-600" />
            <span>Top Nguồn / Chiến Dịch UTM</span>
          </h4>

          <div className="space-y-2.5">
            {campaignBreakdown.map(([campName, count], idx) => {
              const pct = Math.round((count / Math.max(totalLeads, 1)) * 100);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-neutral-800 truncate max-w-[180px] font-semibold">
                      {campName}
                    </span>
                    <span className="text-neutral-500 font-mono">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className="h-full bg-blue-600 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Filter & Search Controls + Export */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm kiếm lead theo họ tên, email, SĐT..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs sm:text-sm text-neutral-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          {/* Filters & Export */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="px-2.5 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-700 focus:outline-none"
            >
              <option value="all">Toàn bộ thời gian</option>
              <option value="today">Hôm nay</option>
              <option value="7days">7 ngày qua</option>
              <option value="30days">30 ngày qua</option>
            </select>

            {/* Campaign Filter */}
            {uniqueCampaigns.length > 0 && (
              <select
                value={campaignFilter}
                onChange={(e) => setCampaignFilter(e.target.value)}
                className="px-2.5 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-700 focus:outline-none max-w-[150px] truncate"
              >
                <option value="all">Tất cả chiến dịch</option>
                {uniqueCampaigns.map((camp, idx) => (
                  <option key={idx} value={camp}>
                    {camp}
                  </option>
                ))}
              </select>
            )}

            {/* Sync Filter */}
            <select
              value={syncFilter}
              onChange={(e) => setSyncFilter(e.target.value as any)}
              className="px-2.5 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-700 focus:outline-none"
            >
              <option value="all">Mọi trạng thái Sheets</option>
              <option value="synced">Đã đồng bộ</option>
              <option value="pending">Chờ đồng bộ</option>
              <option value="failed">Lỗi đồng bộ</option>
            </select>

            {/* Delete all leads */}
            {canDelete && (
              <button
                type="button"
                onClick={() => setConfirmDeleteAll(true)}
                disabled={!leads.length || deleting}
                className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs py-2 px-3.5 rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleting ? 'Đang xóa...' : `Xóa toàn bộ (${leads.length})`}</span>
              </button>
            )}

            {/* Export CSV Button */}
            <button
              type="button"
              id="btn-export-leads-csv"
              onClick={() => downloadLeadsCsv(filteredLeads, formFields)}
              disabled={filteredLeads.length === 0}
              className="bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs py-2 px-3.5 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất File CSV ({filteredLeads.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Leads Table */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-700">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Thời Gian</th>
                <th className="py-3.5 px-4">Thông Tin Khách Hàng</th>
                <th className="py-3.5 px-4">Chiến Dịch / UTM</th>
                <th className="py-3.5 px-4">Câu Trả Lời</th>
                <th className="py-3.5 px-4">Google Sheet</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-neutral-400">
                    Không tìm thấy lead nào phù hợp bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-neutral-50/60 transition-colors">
                    {/* Timestamp */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-semibold text-neutral-900 block">
                        {new Date(lead.submittedAt).toLocaleDateString()}
                      </span>
                      <span className="text-[11px] text-neutral-400 font-mono">
                        {new Date(lead.submittedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>

                    {/* Contact Info */}
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-neutral-900 block">{lead.name}</span>
                      <span className="text-[11px] text-neutral-600 block">{lead.email}</span>
                      <span className="text-[11px] text-neutral-500 font-mono">{lead.phone}</span>
                    </td>

                    {/* Campaign / Tracking */}
                    <td className="py-3.5 px-4 max-w-[200px]">
                      {lead.tracking.utmCampaign ? (
                        <span className="inline-block font-semibold text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 truncate max-w-full">
                          {lead.tracking.utmCampaign}
                        </span>
                      ) : (
                        <span className="text-[11px] text-neutral-400">Truy cập trực tiếp</span>
                      )}
                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 mt-1">
                        <span>src: {lead.tracking.utmSource || 'direct'}</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          {lead.tracking.deviceType === 'mobile' ? (
                            <Smartphone className="w-3 h-3" />
                          ) : (
                            <Monitor className="w-3 h-3" />
                          )}
                          {lead.tracking.deviceType || 'mobile'}
                        </span>
                      </div>
                    </td>

                    {/* Key Custom Responses */}
                    <td className="py-3.5 px-4 max-w-[220px]">
                      <div className="space-y-0.5 text-[11px]">
                        {Object.entries(lead.customResponses || {})
                          .slice(0, 2)
                          .map(([key, val], i) => (
                            <div key={i} className="truncate">
                              <span className="font-medium text-neutral-500">{key}: </span>
                              <span className="text-neutral-800 font-semibold">{String(val)}</span>
                            </div>
                          ))}
                        {Object.keys(lead.customResponses || {}).length > 2 && (
                          <span className="text-[10px] text-blue-600 font-semibold">
                            +{Object.keys(lead.customResponses).length - 2} trường khác
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Google Sheet Sync Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {lead.syncStatus === 'synced' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Đã đồng bộ
                        </span>
                      ) : lead.syncStatus === 'failed' ? (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 cursor-help"
                          title={lead.syncError || 'Đồng bộ thất bại'}
                        >
                          <AlertCircle className="w-3 h-3 text-red-600" />
                          Thất bại
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Chờ đồng bộ
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => setLeadToDelete(lead)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 font-semibold text-xs"
                          title="Xóa lead"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedLead(lead)}
                        className="p-1.5 text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 font-semibold text-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Chi tiết</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Lead Details Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-start sm:items-center justify-center p-4 z-50 overflow-y-auto cms-admin-modal-scroll">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-neutral-200 max-h-[90vh] overflow-y-auto cms-admin-modal-scroll animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 mb-5">
              <div>
                <span className="text-[11px] font-mono text-neutral-400 block">
                  ID: {selectedLead.id}
                </span>
                <h3 className="text-xl font-bold text-neutral-900">{selectedLead.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Tabs / Sections */}
            <div className="space-y-6">
              {/* Contact Information */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">
                  Thông Tin Khách Hàng
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                  <div>
                    <span className="text-[11px] text-neutral-500 block font-medium">Họ và Tên</span>
                    <span className="text-sm font-semibold text-neutral-900">{selectedLead.name}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-neutral-500 block font-medium">Địa Chỉ Email</span>
                    <a
                      href={`mailto:${selectedLead.email}`}
                      className="text-sm font-semibold text-blue-600 hover:underline"
                    >
                      {selectedLead.email}
                    </a>
                  </div>
                  <div>
                    <span className="text-[11px] text-neutral-500 block font-medium">Số Điện Thoại</span>
                    <a
                      href={`tel:${selectedLead.phone}`}
                      className="text-sm font-semibold text-neutral-900 hover:underline"
                    >
                      {selectedLead.phone}
                    </a>
                  </div>
                  <div>
                    <span className="text-[11px] text-neutral-500 block font-medium">
                      Thời Điểm Đăng Ký
                    </span>
                    <span className="text-sm font-semibold text-neutral-900">
                      {new Date(selectedLead.submittedAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Form Responses */}
              {Object.keys(selectedLead.customResponses || {}).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">
                    Dữ Liệu Khảo Sát / Form
                  </h4>
                  <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 divide-y divide-neutral-200 space-y-2">
                    {Object.entries(selectedLead.customResponses).map(([key, val], i) => (
                      <div key={i} className="pt-2 first:pt-0 flex flex-col sm:flex-row sm:justify-between gap-1">
                        <span className="text-xs font-semibold text-neutral-600">{key}:</span>
                        <span className="text-xs font-bold text-neutral-900 sm:text-right max-w-sm">
                          {String(val)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Facebook Ads Attribution Tracking */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">
                  Tracking Attribution & Thông Số UTM
                </h4>
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200 text-xs space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-neutral-500 block font-medium">UTM Source:</span>
                      <span className="font-bold text-neutral-900">
                        {selectedLead.tracking.utmSource || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block font-medium">UTM Campaign:</span>
                      <span className="font-bold text-neutral-900">
                        {selectedLead.tracking.utmCampaign || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block font-medium">UTM Medium:</span>
                      <span className="font-bold text-neutral-900">
                        {selectedLead.tracking.utmMedium || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block font-medium">UTM Content:</span>
                      <span className="font-bold text-neutral-900">
                        {selectedLead.tracking.utmContent || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block font-medium">UTM Term:</span>
                      <span className="font-bold text-neutral-900">
                        {selectedLead.tracking.utmTerm || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block font-medium">Thiết bị (Device):</span>
                      <span className="font-bold text-neutral-900 uppercase">
                        {selectedLead.tracking.deviceType || 'mobile'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-blue-200/80">
                    <span className="text-neutral-500 block font-medium">Link Landing Page:</span>
                    <span className="font-mono text-[11px] text-neutral-700 break-all">
                      {selectedLead.tracking.pageUrl}
                    </span>
                  </div>
                </div>
              </div>

              {/* Google Sheets Sync status info */}
              <div className="flex items-center justify-between p-3 bg-neutral-100 rounded-xl">
                <span className="text-xs text-neutral-600 font-medium">
                  Trạng thái Google Sheets:{' '}
                  <strong className="text-neutral-900 uppercase">
                    {selectedLead.syncStatus}
                  </strong>
                </span>
                {selectedLead.syncedAt && (
                  <span className="text-[11px] text-neutral-400">
                    Đồng bộ lúc: {new Date(selectedLead.syncedAt).toLocaleTimeString('vi-VN')}
                  </span>
                )}
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
                {canDelete ? (
                  <button
                    type="button"
                    onClick={() => {
                      setLeadToDelete(selectedLead);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Xóa Khách Hàng Này</span>
                  </button>
                ) : <div />}

                <button
                  type="button"
                  onClick={() => setSelectedLead(null)}
                  className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 6. Single Lead Delete Confirmation Modal */}
      {leadToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">Xác Nhận Xóa Khách Hàng</h3>
                <p className="text-xs text-neutral-500">Thao tác này sẽ xóa vĩnh viễn khỏi danh sách.</p>
              </div>
            </div>

            <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 text-xs space-y-1">
              <div>Họ tên: <strong className="text-neutral-900">{leadToDelete.name}</strong></div>
              <div>Số điện thoại: <strong className="text-neutral-900">{leadToDelete.phone}</strong></div>
              {leadToDelete.email && <div>Email: <strong className="text-neutral-900">{leadToDelete.email}</strong></div>}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setLeadToDelete(null)}
                className="px-4 py-2 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={deletingId === leadToDelete.id}
                onClick={handleConfirmDeleteSingle}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deletingId === leadToDelete.id ? 'Đang xóa...' : 'Xác nhận xóa'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Bulk Delete Confirmation Modal */}
      {confirmDeleteAll && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">Xác Nhận Xóa Toàn Bộ Leads</h3>
                <p className="text-xs text-neutral-500">Cảnh báo: Hành động này không thể hoàn tác.</p>
              </div>
            </div>

            <p className="text-xs text-neutral-600">
              Bạn có chắc chắn muốn xóa toàn bộ <strong>{leads.length}</strong> khách hàng khỏi hệ thống CMS và Cloud Firestore?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteAll(false)}
                className="px-4 py-2 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDeleteAll}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleting ? 'Đang xóa toàn bộ...' : `Xác nhận xóa (${leads.length})`}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
