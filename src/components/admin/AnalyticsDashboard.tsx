import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  MousePointerClick,
  Users,
  Eye,
  Clock3,
  Target,
  RefreshCw,
  Plus,
  Trash2,
  Save,
  TrendingUp,
  Filter,
  PieChart as PieIcon,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { AnalyticsCampaignCost, LandingPageConfig } from '../../types';
import {getUiMapping} from '../../utils/uiLibrary';
import { getAnalyticsCosts, getAnalyticsSummary, resetDashboardData, saveAnalyticsCosts } from '../../services/api';

const num = (n: number, d = 0) => Number(n || 0).toLocaleString('vi-VN', { maximumFractionDigits: d });
const pct = (n: number) => `${num(n, 1)}%`;
const money = (n: number | null) => (n == null ? '—' : `${num(n, 0)} ₫`);

const PALETTE = ['#465fff', '#12b76a', '#7a5af8', '#f79009', '#ee46bc', '#06aed4'];

export const AnalyticsDashboard: React.FC<{ pageId?: string; canEditCosts: boolean; config:LandingPageConfig }> = ({
  pageId,
  canEditCosts,
  config,
}) => {
  const cms=config;
  const analyticsSurface=getUiMapping(cms?.websiteSettings,'analyticsSurface');
  const [days, setDays] = useState(30);
  const [scope, setScope] = useState<'all' | 'page'>(pageId ? 'page' : 'all');
  const [data, setData] = useState<any>(null);
  const [costs, setCosts] = useState<AnalyticsCampaignCost[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [chartView, setChartView] = useState<'overview' | 'actions' | 'conversions' | 'rates'>('overview');

  const load = async () => {
    setLoading(true);
    try {
      const [d, c] = await Promise.all([
        getAnalyticsSummary(days, scope === 'page' ? pageId : undefined),
        getAnalyticsCosts(),
      ]);
      setData(d);
      setCosts(c);
    } catch (e: any) {
      setNotice(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [days, pageId, scope]);

  const saveCosts = async () => {
    try {
      const r = await saveAnalyticsCosts(costs);
      setCosts(r.costs);
      setNotice('Đã lưu chi phí campaign.');
      await load();
    } catch (e: any) {
      setNotice(e.message);
    }
  };

  const resetDashboard = async () => {
    if (!canEditCosts) return;
    const ok = window.confirm(
      'Reset toàn bộ dữ liệu Dashboard (Analytics + chi phí campaign) và lưu trạng thái rỗng lên Cloud Firestore? Dữ liệu thống kê sẽ không thể khôi phục bằng giao diện.'
    );
    if (!ok) return;
    try {
      setLoading(true);
      const r = await resetDashboardData({ analytics: true, campaignCosts: true });
      setCosts([]);
      await load();
      setNotice(`Đã reset Dashboard: ${r.deletedAnalytics || 0} analytics + ${r.deletedCampaignCosts || 0} campaign cost. Cloud đã xác nhận.`);
    } catch (e: any) {
      setNotice(e?.message || 'Không thể reset Dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const cards = data
    ? [
        ['Page Views', data.pageViews, Eye, 'Tổng lượt xem'],
        ['Section Views', data.sectionViews, Eye, 'Lượt xem khối'],
        ['Unique Visitors', data.uniqueVisitors, Users, 'Khách riêng biệt'],
        ['Returning', data.returningVisitors, Users, 'Khách quay lại'],
        ['Total Clicks', data.clicks, MousePointerClick, 'Tổng tương tác'],
        ['CTA Clicks', data.ctaClicks, Target, 'Click nút kêu gọi'],
        ['Form Starts', data.formStarts, Target, 'Bắt đầu điền'],
        ['Form Submits', data.formSubmits, Target, 'Lượt gửi form'],
        ['Leads', data.leads, Target, 'Khách tiềm năng'],
        ['CTR', pct(data.ctr), BarChart3, 'CTA / Views'],
        ['CR', pct(data.conversionRate), BarChart3, 'Leads / Sessions'],
        ['Retention D1', pct(data.retentionD1), Users, 'Quay lại sau ≥ 1 ngày'],
        ['Retention D7', pct(data.retentionD7), Users, 'Quay lại sau ≥ 7 ngày'],
        ['Retention D30', pct(data.retentionD30), Users, 'Quay lại sau ≥ 30 ngày'],
        ['Engagement', pct(data.engagementRate), Users, 'Tương tác sâu'],
        ['Bounce', pct(data.bounceRate), Users, 'Tỷ lệ thoát'],
        ['Avg. time', `${num(data.avgSessionDuration, 0)}s`, Clock3, 'Thời gian/phiên'],
      ]
    : [];

  // Same backend metrics, presented in a compact TailAdmin-style overview.
  // All secondary metrics remain available without an extra API request.
  const primaryLabels = new Set(['Page Views', 'CTA Clicks', 'Form Submits', 'Leads']);
  const primaryCards = cards.filter(([label]:any)=>primaryLabels.has(label));
  const secondaryCards = cards.filter(([label]:any)=>!primaryLabels.has(label));

  const dailyTrends = data?.dailyTrends || [];
  const funnel = data?.funnel || [];
  const devices = (data?.devices || []).map((d: any) => ({
    name: d.name === 'mobile' ? 'Di động (Mobile)' : d.name === 'desktop' ? 'Máy tính (Desktop)' : d.name === 'tablet' ? 'Máy tính bảng' : d.name,
    value: d.value,
  }));
  const topButtons = data?.topButtons || [];
  const topSections = data?.topSections || [];

  return (
    <div data-ui-surface={analyticsSurface} className="cms-ui-analytics cms-modern-analytics cms-actual-dashboard space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-wrap gap-3 items-center justify-between bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-neutral-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <span>Tổng quan hiệu suất</span>
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Theo dõi lưu lượng, tương tác và chuyển đổi từ dữ liệu ghi nhận trên website.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {pageId && (
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as 'all' | 'page')}
              className="border border-neutral-300 rounded-xl px-3 py-2 text-xs font-bold bg-white focus:outline-none focus:border-blue-600"
            >
              <option value="page">Trang hiện tại</option>
              <option value="all">Toàn bộ Landing Pages</option>
            </select>
          )}

          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="border border-neutral-300 rounded-xl px-3 py-2 text-xs font-bold bg-white focus:outline-none focus:border-blue-600"
          >
            <option value={7}>7 ngày qua</option>
            <option value={14}>14 ngày qua</option>
            <option value={30}>30 ngày qua</option>
            <option value={90}>90 ngày qua</option>
            <option value={365}>1 năm qua</option>
          </select>

          {canEditCosts && (
            <details className="cms-tail-safe-actions">
              <summary>Quản lý dữ liệu nâng cao</summary>
              <div>
            <button
              type="button"
              onClick={resetDashboard}
              disabled={loading}
              className="border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1.5 disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Reset Dashboard
            </button>
              </div>
            </details>
          )}
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="border border-neutral-300 rounded-xl p-2 hover:bg-neutral-50 text-neutral-700 transition-colors"
            title="Tải lại dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {notice && (
        <div className="text-xs p-3 rounded-xl bg-blue-50 text-blue-800 border border-blue-100 flex items-center justify-between">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} className="text-blue-600 font-bold ml-2">
            ×
          </button>
        </div>
      )}

      {/* Four high-priority business metrics; detailed metrics stay available on demand. */}
      <div className="cms-tail-metrics-featured" aria-label="Chỉ số quan trọng">
        {primaryCards.map(([label, value, Icon, hint]: any) => (
          <div
            key={label}
            className="cms-ui-metric-card cms-v2-metric-card cms-actual-kpi bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs hover:border-blue-300 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="cms-actual-kpi-icon"><Icon className="w-4 h-4" /></span>
              <span className="text-[10px] text-neutral-400 font-mono">{hint}</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-neutral-900 truncate">{value}</div>
            <div className="text-[10px] text-neutral-500 font-bold uppercase mt-0.5 truncate">{label}</div>
          </div>
        ))}
      </div>
      {/* Actual dashboard composition: two chart columns plus a recent-activity data table. */}
      <div className="cms-actual-analytics-grid">
        <section className="cms-actual-surface cms-actual-traffic" aria-label="Xu hướng lưu lượng và tương tác">
          <header className="cms-actual-panel-header"><div><div className="cms-actual-panel-eyebrow">TRAFFIC OVERVIEW</div><h3>Xu hướng truy cập</h3><p>Dữ liệu sự kiện trong {days} ngày gần nhất</p></div><span className="cms-actual-panel-pill"><TrendingUp className="w-3.5 h-3.5" /> Analytics</span></header>
          <div className="cms-actual-chart">
            {dailyTrends.length === 0 ? <div className="cms-actual-empty">{loading ? 'Đang tải dữ liệu...' : 'Chưa có dữ liệu truy cập trong kỳ.'}</div> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTrends} margin={{ top: 12, right: 12, left: -22, bottom: 0 }}>
                  <defs><linearGradient id="cmsActualViews" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#465fff" stopOpacity={0.22} /><stop offset="98%" stopColor="#465fff" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 4" vertical={false} stroke="#edf2f7" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#98a2b3' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#98a2b3' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', boxShadow: '0 8px 20px #10182810' }} />
                  <Area type="monotone" dataKey="views" name="Lượt xem" stroke="#465fff" strokeWidth={2.3} fill="url(#cmsActualViews)" activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="visitors" name="Khách riêng biệt" stroke="#12b76a" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="cms-actual-chart-legend"><span><i className="cms-actual-key" /> Lượt xem</span><span><i className="cms-actual-key green" /> Khách riêng biệt</span></div>
        </section>
        <section className="cms-actual-surface cms-actual-conversion" aria-label="Phân tích chuyển đổi">
          <header className="cms-actual-panel-header"><div><div className="cms-actual-panel-eyebrow">CONVERSION</div><h3>Phễu chuyển đổi</h3><p>Hành trình khách hàng</p></div><Target className="w-5 h-5 text-indigo-500" /></header>
          <div className="cms-actual-funnel">
            {funnel.length ? funnel.slice(0,5).map((step:any,index:number) => (
              <div key={`${step.stage}-${index}`} className="cms-actual-funnel-row"><div><span>{step.stage}</span><strong>{num(step.count)}</strong></div>
                <div className="cms-actual-funnel-track"><span style={{ width: `${Math.max(0,Math.min(100,Number(step.pct)||0))}%` }} /></div>
              </div>
            )) : <div className="cms-actual-empty">Chưa có dữ liệu chuyển đổi.</div>}
          </div>
          <div className="cms-actual-conversion-footer"><span>Tỷ lệ chuyển đổi</span><strong>{data ? pct(data.conversionRate) : '—'}</strong></div>
        </section>
      </div>
      <section className="cms-actual-surface cms-actual-daily" aria-label="Dữ liệu truy cập theo ngày">
        <div className="cms-actual-panel-header"><div><div className="cms-actual-panel-eyebrow">RECENT ACTIVITY</div><h3>Hoạt động gần đây</h3><p>7 ngày gần nhất trong khoảng thời gian đang chọn</p></div><span className="cms-actual-panel-pill">{dailyTrends.length} ngày dữ liệu</span></div>
        <div className="cms-actual-table-scroll"><table><thead><tr><th>Ngày</th><th>Lượt xem</th><th>Khách truy cập</th><th>Click</th><th>CTA</th><th>Leads</th></tr></thead>
          <tbody>{dailyTrends.length ? dailyTrends.slice(-7).reverse().map((day:any,i:number)=>(<tr key={`${day.date}-${i}`}><td><strong>{day.date}</strong></td><td>{num(day.views)}</td><td>{num(day.visitors)}</td><td>{num(day.clicks)}</td><td>{num(day.ctaClicks)}</td><td>{num(day.leads)}</td></tr>)) : <tr><td colSpan={6} className="cms-actual-empty">Chưa có dữ liệu theo ngày</td></tr>}</tbody>
        </table></div>
      </section>
      <details className="cms-actual-advanced">
        <summary><span><BarChart3 className="w-4 h-4" /> Xem toàn bộ báo cáo, chỉ số và chi phí chiến dịch</span><ArrowRight className="w-4 h-4" /></summary>
        <div className="cms-actual-advanced-body">
      {secondaryCards.length > 0 && (
        <details className="cms-tail-other-metrics">
          <summary>Chi tiết thêm {secondaryCards.length} chỉ số <span aria-hidden="true">⌄</span></summary>
          <div className="cms-v2-metrics grid gap-3.5">
            {secondaryCards.map(([label, value, Icon, hint]: any) => (
          <div
            key={label}
            className="cms-ui-metric-card cms-v2-metric-card cms-actual-kpi bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs hover:border-blue-300 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="cms-actual-kpi-icon"><Icon className="w-4 h-4" /></span>
              <span className="text-[10px] text-neutral-400 font-mono">{hint}</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-neutral-900 truncate">{value}</div>
            <div className="text-[10px] text-neutral-500 font-bold uppercase mt-0.5 truncate">{label}</div>
          </div>
            ))}
          </div>
        </details>
      )}

      {/* SECTION 1: Trend Charts with Tab Toggle */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3">
          <div>
            <h3 className="font-black text-sm text-neutral-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>Biểu đồ Xu hướng Hoạt động theo Thời gian ({days} ngày)</span>
            </h3>
            <p className="text-[11px] text-neutral-500">
              Quan sát biến động lưu lượng truy cập, tương tác nút bấm và tỷ lệ chuyển đổi hàng ngày
            </p>
          </div>

          {/* Chart Mode Tabs */}
          <div className="flex rounded-xl bg-neutral-100 p-0.5 text-xs font-bold">
            <button
              type="button"
              onClick={() => setChartView('overview')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                chartView === 'overview' ? 'bg-white shadow-2xs text-blue-700' : 'text-neutral-600'
              }`}
            >
              Lưu lượng (Views & Visitors)
            </button>
            <button
              type="button"
              onClick={() => setChartView('actions')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                chartView === 'actions' ? 'bg-white shadow-2xs text-blue-700' : 'text-neutral-600'
              }`}
            >
              Tương tác (Clicks & CTA)
            </button>
            <button
              type="button"
              onClick={() => setChartView('conversions')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                chartView === 'conversions' ? 'bg-white shadow-2xs text-blue-700' : 'text-neutral-600'
              }`}
            >
              Chuyển đổi (Form & Leads)
            </button>
            <button
              type="button"
              onClick={() => setChartView('rates')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                chartView === 'rates' ? 'bg-white shadow-2xs text-blue-700' : 'text-neutral-600'
              }`}
            >
              Tỷ lệ CTR & CR (%)
            </button>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="h-72 w-full pt-2">
          {dailyTrends.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-neutral-400">
              Đang tải hoặc chưa phát sinh sự kiện trong khoảng thời gian này.
            </div>
          ) : chartView === 'overview' ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#465fff" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#465fff" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#12b76a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#12b76a" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f2f4f7" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#667085' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#667085' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #eaecf0', fontSize: 12 }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Area type="monotone" dataKey="views" name="Lượt xem (Views)" stroke="#465fff" strokeWidth={2.5} fillOpacity={1} fill="url(#colorViews)" />
                <Area type="monotone" dataKey="visitors" name="Khách riêng biệt (Visitors)" stroke="#12b76a" strokeWidth={2} fillOpacity={1} fill="url(#colorVisitors)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : chartView === 'actions' ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7a5af8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#7a5af8" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorCta" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f79009" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f79009" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f2f4f7" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#667085' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#667085' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #eaecf0', fontSize: 12 }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Area type="monotone" dataKey="clicks" name="Tổng Click" stroke="#7a5af8" strokeWidth={2} fillOpacity={1} fill="url(#colorClicks)" />
                <Area type="monotone" dataKey="ctaClicks" name="Click nút CTA" stroke="#f79009" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCta)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : chartView === 'conversions' ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f2f4f7" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#667085' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#667085' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #eaecf0', fontSize: 12 }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Bar dataKey="formStarts" name="Bắt đầu Form" fill="#b2bbff" radius={[4, 4, 0, 0]} />
                <Bar dataKey="formSubmits" name="Gửi Form" fill="#465fff" radius={[4, 4, 0, 0]} />
                <Bar dataKey="leads" name="Leads xác nhận" fill="#465fff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f2f4f7" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#667085' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#667085' }}
                  axisLine={false}
                  tickLine={false}
                  unit="%"
                />
                <Tooltip
                  formatter={(val: any) => `${val}%`}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #eaecf0', fontSize: 12 }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Line type="monotone" dataKey="ctr" name="Tỷ lệ CTR (CTA / Views)" stroke="#f79009" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="conversionRate" name="Tỷ lệ Chuyển đổi CR (Leads / Views)" stroke="#12b76a" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* SECTION 2: Conversion Funnel & Device Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Funnel Chart (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="mb-3">
            <h3 className="font-black text-sm text-neutral-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>Biểu đồ Phễu Chuyển đổi (Conversion Funnel)</span>
            </h3>
            <p className="text-[11px] text-neutral-500">
              Đo lường tỷ lệ rớt khách qua từng giai đoạn từ lúc xem trang đến khi để lại thông tin
            </p>
          </div>

          <div className="space-y-2.5 my-2">
            {funnel.map((step: any, idx: number) => {
              const bgColors = [
                'bg-blue-600',
                'bg-blue-500',
                'bg-indigo-500',
                'bg-sky-500',
                'bg-emerald-500',
                'bg-emerald-600',
              ];
              const color = bgColors[idx % bgColors.length];
              return (
                <div key={step.stage} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-neutral-800">{step.stage}</span>
                    <div className="flex items-center gap-2 font-mono">
                      <b className="text-neutral-900">{num(step.count)}</b>
                      <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">
                        {step.pct}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-neutral-100 h-3 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${color} rounded-full transition-all duration-500`}
                      style={{ width: `${Math.max(2, Math.min(100, step.pct))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
            <span>Tỷ lệ hoàn thành phễu:</span>
            <span className="font-bold text-emerald-600 font-mono">
              {funnel.length >= 6 ? `${funnel[5]?.pct}%` : '—'}
            </span>
          </div>
        </div>

        {/* Devices Donut Chart (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="mb-2">
            <h3 className="font-black text-sm text-neutral-900 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-indigo-600" />
              <span>Cơ cấu Thiết bị truy cập (Device Breakdown)</span>
            </h3>
            <p className="text-[11px] text-neutral-500">Tỷ lệ truy cập giữa Di động, Máy tính và Tablet</p>
          </div>

          <div className="h-52 w-full flex items-center justify-center">
            {devices.length === 0 ? (
              <div className="text-xs text-neutral-400">Chưa có dữ liệu thiết bị.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={devices}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {devices.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [`${num(value)} lượt`, 'Truy cập']}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #eaecf0', fontSize: 12 }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="pt-2 border-t border-neutral-100 text-[11px] text-neutral-500 flex justify-between">
            <span>Tối ưu giao diện:</span>
            <span className="font-semibold text-neutral-700">Responsive Mobile First</span>
          </div>
        </div>
      </div>

      {/* SECTION 3: Content and CTA Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Rank title="Khối Nội dung được xem nhiều nhất" rows={topSections} unit="lượt xem" />
        <Rank title="Nút kêu gọi hành động (CTA) được nhấn nhiều nhất" rows={topButtons} unit="click" />
        <Rank title="Nguồn truy cập chính (UTM Source)" rows={data?.sources} unit="lượt" />
        <Rank title="Chiến dịch quảng cáo (UTM Campaign)" rows={data?.trafficCampaigns} unit="lượt" />
      </div>

      {/* SECTION 4: Campaign Costs Table (CPC / CPA) */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs">
        <div className="mb-4">
          <h3 className="font-black text-sm text-neutral-900 flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-600" />
            <span>Chi phí Chiến dịch Quảng cáo → Tính toán CPC & CPA</span>
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Nhập chi phí quảng cáo thực tế từ Google Ads/Facebook Ads để tự động tính CPC (Cost Per Click) và CPA (Cost Per Lead).
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-neutral-500 border-b border-neutral-100">
                <th className="p-2.5 font-bold">Campaign</th>
                <th className="p-2.5 font-bold">Source</th>
                <th className="p-2.5 font-bold">Medium</th>
                <th className="p-2.5 font-bold">Chi phí (₫)</th>
                <th className="p-2.5 font-bold">Ad Clicks</th>
                <th className="p-2.5 font-bold">Leads</th>
                <th className="p-2.5 font-bold">CPC</th>
                <th className="p-2.5 font-bold">CPA</th>
                <th className="p-2.5" />
              </tr>
            </thead>
            <tbody>
              {costs.map((c, i) => {
                const calc = data?.campaigns?.find((x: any) => x.id === c.id) || c;
                const edit = (k: string, v: any) =>
                  setCosts((cs) => cs.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
                return (
                  <tr key={c.id || i} className="border-t border-neutral-100 hover:bg-neutral-50/50">
                    <td className="p-2">
                      <input
                        disabled={!canEditCosts}
                        value={c.campaign}
                        onChange={(e) => edit('campaign', e.target.value)}
                        className="border border-neutral-200 rounded-lg px-2 py-1.5 w-36 text-xs bg-white"
                        placeholder="bv_suc_khoe_hn"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        disabled={!canEditCosts}
                        value={c.source || ''}
                        onChange={(e) => edit('source', e.target.value)}
                        className="border border-neutral-200 rounded-lg px-2 py-1.5 w-24 text-xs bg-white"
                        placeholder="google"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        disabled={!canEditCosts}
                        value={c.medium || ''}
                        onChange={(e) => edit('medium', e.target.value)}
                        className="border border-neutral-200 rounded-lg px-2 py-1.5 w-24 text-xs bg-white"
                        placeholder="cpc"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        disabled={!canEditCosts}
                        type="number"
                        value={c.spend}
                        onChange={(e) => edit('spend', Number(e.target.value))}
                        className="border border-neutral-200 rounded-lg px-2 py-1.5 w-28 text-xs bg-white font-mono"
                        placeholder="5000000"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        disabled={!canEditCosts}
                        type="number"
                        value={c.clicks ?? ''}
                        onChange={(e) =>
                          edit('clicks', e.target.value === '' ? undefined : Number(e.target.value))
                        }
                        className="border border-neutral-200 rounded-lg px-2 py-1.5 w-20 text-xs bg-white font-mono"
                        placeholder="1200"
                      />
                    </td>
                    <td className="p-2 font-bold text-neutral-900 font-mono">{calc.conversions ?? 0}</td>
                    <td className="p-2 font-bold text-neutral-900 font-mono">{money(calc.cpc)}</td>
                    <td className="p-2 font-bold text-emerald-700 font-mono">{money(calc.cpa)}</td>
                    <td className="p-2 text-right">
                      {canEditCosts && (
                        <button
                          type="button"
                          onClick={() => setCosts((x) => x.filter((_, j) => j !== i))}
                          className="text-neutral-400 hover:text-red-600 p-1 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {canEditCosts && (
          <div className="flex gap-2 mt-4 pt-3 border-t border-neutral-100 justify-end">
            <button
              type="button"
              onClick={() =>
                setCosts((c) => [
                  ...c,
                  {
                    id: `cost_${Date.now()}`,
                    campaign: '',
                    spend: 0,
                    updatedAt: new Date().toISOString(),
                  },
                ])
              }
              className="px-3 py-2 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-50 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Chiến dịch</span>
            </button>
            <button
              type="button"
              onClick={saveCosts}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Chi phí</span>
            </button>
          </div>
        )}
      </div>

      <div className="text-[11px] text-neutral-500 bg-neutral-50 border border-neutral-200 rounded-xl p-3.5 leading-relaxed">
        <b>💡 Hướng dẫn đo lường:</b> Dữ liệu phân tích lưu trữ first-party bảo mật, không phụ thuộc cookie bên thứ ba.
        Tỷ lệ chuyển đổi (CR) tính theo Lead thu được chia cho số phiên truy cập. Để đo lường chiến dịch quảng cáo, hãy gắn UTM tag vào link (ví dụ: <code className="bg-neutral-200 px-1 py-0.5 rounded text-neutral-800">?utm_source=facebook&utm_campaign=baoviet_kcare</code>).
      </div>
        </div>
      </details>
    </div>
  );
};

const Rank: React.FC<{ title: string; rows?: Array<{ name: string; value: number }>; unit?: string }> = ({
  title,
  rows = [],
  unit = 'lượt',
}) => {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs">
      <h3 className="font-black text-sm text-neutral-900 mb-3">{title}</h3>
      <div className="space-y-3">
        {rows.length ? (
          rows.slice(0, 7).map((r) => (
            <div key={r.name} className="space-y-1">
              <div className="flex justify-between gap-3 text-xs">
                <span className="truncate text-neutral-700 font-medium">{r.name}</span>
                <span className="font-mono font-bold text-neutral-900">
                  {num(r.value)} <span className="text-[10px] text-neutral-400 font-normal">{unit}</span>
                </span>
              </div>
              <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(3, (r.value / max) * 100)}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <div className="text-xs text-neutral-400 py-3">Chưa có dữ liệu ghi nhận.</div>
        )}
      </div>
    </div>
  );
};
