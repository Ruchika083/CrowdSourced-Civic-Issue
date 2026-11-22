import { useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutDashboard, Map as MapIcon, BarChart3, Landmark, LogOut, Menu, X, Eye,
} from 'lucide-react';
import Chart from 'chart.js/auto';
import type { Issue, IssueEvent, Official } from '../types';
import { simplifiedStatus } from '../types';
import {
  officialCanSee, officialActsAtCurrentLevel, updateIssue, insertEvent, HIERARCHY,
} from '../lib/data';
import { FlagBadge, StatusBadge } from './Badges';
import Timeline from './Timeline';
import IssueMap from './IssueMap';
import { useToast } from './Toast';

interface Props {
  official: Official;
  issues: Issue[];
  events: IssueEvent[];
  onLogout: () => void;
  onDataChanged: () => void;
}

type Page = 'dashboard' | 'map' | 'graphs';

export default function OfficialDashboard({ official, issues, events, onLogout, onDataChanged }: Props) {
  const toast = useToast();
  const [page, setPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionKind, setActionKind] = useState<'Time' | 'Budget' | 'Not Possible'>('Time');
  const [reason, setReason] = useState('');
  const [extendedDays, setExtendedDays] = useState('10');
  const [search, setSearch] = useState('');
  const [flagFilter, setFlagFilter] = useState('All');

  const visible = useMemo(() => issues.filter((i) => officialCanSee(i, official)), [issues, official]);
  const detailsIssue = issues.find((i) => i.id === detailsId) ?? null;
  const detailsEvents = detailsIssue ? events.filter((e) => e.issue_id === detailsIssue.id) : [];

  const filtered = visible.filter((i) => {
    if (search && !(i.id + i.issue_type + i.location).toLowerCase().includes(search.toLowerCase())) return false;
    if (flagFilter === 'Resolved' && simplifiedStatus(i.status) !== 'Resolved') return false;
    if (flagFilter === 'Red' && i.flag !== 'Red') return false;
    if (flagFilter === 'None' && !(i.flag === 'None' && simplifiedStatus(i.status) !== 'Resolved')) return false;
    return true;
  });

  const counts = useMemo(() => ({
    total: visible.length,
    under: visible.filter((i) => i.flag === 'None' && simplifiedStatus(i.status) !== 'Resolved').length,
    unsolved: visible.filter((i) => i.flag === 'Red').length,
    resolved: visible.filter((i) => simplifiedStatus(i.status) === 'Resolved').length,
  }), [visible]);

  async function markResolved(issue: Issue) {
    await updateIssue(issue.id, { status: 'Resolved', flag: 'Green' });
    await insertEvent({
      issue_id: issue.id, action: 'Resolved', level: official.designation,
      level_name: official.name, note: `Marked as resolved by ${official.designation} level (${official.department} Department).`,
    });
    toast(`Complaint ${issue.id} marked as resolved.`, 'success');
    onDataChanged();
  }

  function openAction(issue: Issue, kind: 'Time' | 'Budget' | 'Not Possible') {
    setActionId(issue.id);
    setActionKind(kind);
    setReason('');
    setExtendedDays('10');
  }

  async function confirmAction() {
    const issue = issues.find((i) => i.id === actionId);
    if (!issue) return;
    if (reason.trim().length < 5) {
      toast('Please provide an explanation (at least a few words) — the citizen will see it.', 'error');
      return;
    }
    const isTop = official.designation === 'IAS';
    if (actionKind === 'Time') {
      const days = Math.max(1, Math.min(90, parseInt(extendedDays, 10) || 10));
      const newDue = new Date(Date.now() + days * 86400000).toISOString();
      await updateIssue(issue.id, { status: `Time Escalation requested at ${official.designation}`, due_date: newDue });
      await insertEvent({
        issue_id: issue.id, action: 'Time Escalation', level: official.designation, level_name: official.name,
        note: reason.trim(), new_due_date: newDue,
      });
      toast(`Additional ${days} days recorded for ${issue.id}.`, 'success');
    } else if (actionKind === 'Budget') {
      await updateIssue(issue.id, { status: `Budget Escalation requested at ${official.designation}`, flag: 'Red' });
      await insertEvent({
        issue_id: issue.id, action: 'Budget Escalation', level: official.designation, level_name: official.name,
        note: reason.trim(),
      });
      toast(`Budget escalation recorded for ${issue.id}.`, 'success');
    } else {
      await updateIssue(issue.id, { status: `Marked Not Possible at ${official.designation}`, flag: 'Red' });
      await insertEvent({
        issue_id: issue.id, action: 'Not Possible', level: official.designation, level_name: official.name,
        note: reason.trim(),
      });
      toast(`'Not possible' decision recorded for ${issue.id}.`, 'info');
    }
    if (actionKind !== 'Time' && !isTop) {
      const idx = HIERARCHY.indexOf(issue.current_level);
      if (idx < HIERARCHY.length - 1) {
        const next = HIERARCHY[idx + 1];
        await updateIssue(issue.id, { current_level: next, status: `${actionKind} at ${official.designation} — moved to ${next}` });
        await insertEvent({
          issue_id: issue.id, action: 'Escalated', level: official.designation, level_name: official.name,
          note: `Complaint moved from ${official.designation} to ${next} following the recorded decision.`, new_level: next,
        });
      }
    }
    setActionId(null);
    onDataChanged();
  }

  const nav = (
    <nav className="space-y-1">
      {([['dashboard', 'Dashboard', LayoutDashboard], ['map', 'Issue Map', MapIcon], ['graphs', 'Analytics', BarChart3]] as const).map(([id, label, Icon]) => (
        <button
          key={id}
          onClick={() => { setPage(id as Page); setSidebarOpen(false); }}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            page === id ? 'bg-[var(--navy-700)] text-white' : 'text-[var(--neutral-600)] hover:bg-[var(--neutral-100)]'
          }`}
        >
          <Icon size={18} /> {label}
        </button>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-[var(--neutral-300)] sticky top-0 z-[500]">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2" onClick={() => setSidebarOpen((o) => !o)} aria-label="Toggle menu">
              {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <Landmark size={24} className="text-[var(--navy-700)]" />
            <span className="font-bold text-lg text-[var(--navy-800)]">Official Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium leading-tight">{official.name}</p>
              <p className="text-xs text-[var(--neutral-600)] leading-tight">{official.designation} · {official.department} Dept.</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-[var(--navy-700)] text-white flex items-center justify-center font-semibold">
              {official.name.charAt(0).toUpperCase()}
            </div>
            <button className="btn-ghost !px-3" onClick={onLogout} aria-label="Sign out"><LogOut size={16} /></button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden lg:block w-60 shrink-0 border-r border-[var(--neutral-300)] bg-white p-4">{nav}</aside>
        {sidebarOpen && (
          <div className="fixed inset-0 z-[600] lg:hidden" onClick={() => setSidebarOpen(false)}>
            <div className="absolute inset-0 bg-black/40" />
            <aside className="absolute left-0 top-0 h-full w-64 bg-white p-4 pt-20" onClick={(e) => e.stopPropagation()}>{nav}</aside>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 min-w-0">
          {page === 'dashboard' && (
            <section>
              <h1 className="text-2xl font-semibold text-[var(--navy-800)] mb-1">Department Issues</h1>
              <p className="text-sm text-[var(--neutral-600)] mb-5">
                {official.designation === 'IAS'
                  ? 'All complaints across every department and level.'
                  : `${official.department} Department complaints at or below your ${official.designation} level.`}
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                <StatCard label="In your view" value={counts.total} cls="text-[var(--navy-800)]" />
                <StatCard label="Under consideration" value={counts.under} cls="text-[var(--neutral-600)]" symbol="○" />
                <StatCard label="Unsolved" value={counts.unsolved} cls="text-[var(--danger)]" symbol="🚩" />
                <StatCard label="Resolved" value={counts.resolved} cls="text-[var(--success)]" symbol="✓" />
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                <input className="input max-w-xs" placeholder="Search ID, type, location…" value={search} onChange={(e) => setSearch(e.target.value)} />
                <select className="input max-w-[200px]" value={flagFilter} onChange={(e) => setFlagFilter(e.target.value)}>
                  <option value="All">All indicators</option>
                  <option value="None">○ Under consideration</option>
                  <option value="Red">🚩 Unsolved</option>
                  <option value="Resolved">✓ Resolved</option>
                </select>
              </div>
              {filtered.length === 0 ? (
                <div className="card p-8 text-center text-sm text-[var(--neutral-600)]">No complaints match your filters right now.</div>
              ) : (
                <div className="card overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-[var(--neutral-600)] bg-[var(--neutral-50)]">
                        <th className="px-4 py-3">Indicator</th>
                        <th className="px-4 py-3">ID</th>
                        <th className="px-4 py-3">Due</th>
                        <th className="px-4 py-3">Location</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((i) => {
                        const canAct = officialActsAtCurrentLevel(i, official) && simplifiedStatus(i.status) !== 'Resolved';
                        return (
                          <tr key={i.id} className="border-t border-[var(--neutral-100)] align-top">
                            <td className="px-4 py-3"><FlagBadge flag={i.flag} /></td>
                            <td className="px-4 py-3 font-mono text-xs">{i.id}<br /><span className="text-xs text-[var(--neutral-600)] font-sans">{i.issue_type}</span></td>
                            <td className="px-4 py-3">{i.due_date ? new Date(i.due_date).toLocaleDateString('en-IN') : '—'}</td>
                            <td className="px-4 py-3">{i.location}<br /><span className="text-xs text-[var(--neutral-600)]">at {i.current_level} level</span></td>
                            <td className="px-4 py-3"><StatusBadge status={i.status} /></td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1.5">
                                <button className="btn-ghost !py-1.5 !px-2.5" onClick={() => setDetailsId(i.id)}><Eye size={14} /> Details</button>
                                {canAct ? (
                                  <>
                                    <button className="btn-success !py-1.5 !px-2.5" onClick={() => markResolved(i)}>Resolve</button>
                                    <button className="btn-warning !py-1.5 !px-2.5" onClick={() => openAction(i, 'Time')}>Time Esc.</button>
                                    <button className="btn-warning !py-1.5 !px-2.5" onClick={() => openAction(i, 'Budget')}>Budget Esc.</button>
                                    {official.designation !== 'IAS' && (
                                      <button className="btn-danger !py-1.5 !px-2.5" onClick={() => openAction(i, 'Not Possible')}>Not Possible</button>
                                    )}
                                  </>
                                ) : simplifiedStatus(i.status) !== 'Resolved' ? (
                                  <span className="text-xs text-[var(--neutral-600)] self-center">Handled at {i.current_level} level</span>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {page === 'map' && (
            <section>
              <h1 className="text-2xl font-semibold text-[var(--navy-800)] mb-1">Issues Map</h1>
              <p className="text-sm text-[var(--neutral-600)] mb-4">Unresolved complaints in your view. Colours show the department. Demo complaint coordinates are sample data.</p>
              <IssueMap issues={visible.filter((i) => simplifiedStatus(i.status) !== 'Resolved')} height="480px" />
              <div className="card p-3 mt-3 text-xs space-y-1.5">
                <p className="font-semibold text-[var(--navy-800)]">Legend</p>
                {[['Road', '#E74C3C'], ['Sanitation', '#F1C40F'], ['Water', '#3498DB'], ['General', '#6c757d']].map(([label, color]) => (
                  <p key={label} className="flex items-center gap-2">
                    <span className="inline-block w-3.5 h-3.5 rounded-full" style={{ background: color }} /> {label}
                  </p>
                ))}
              </div>
            </section>
          )}

          {page === 'graphs' && <Graphs issues={visible} />}
        </main>
      </div>

      {detailsIssue && (
        <Modal onClose={() => setDetailsId(null)} title={`Complaint ${detailsIssue.id}`}>
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <FlagBadge flag={detailsIssue.flag} />
              <StatusBadge status={detailsIssue.status} />
              <span className="badge flag-none">{detailsIssue.department} Dept.</span>
              <span className="badge flag-none">{detailsIssue.current_level} level</span>
            </div>
            <p><strong>Type:</strong> {detailsIssue.issue_type}</p>
            <p><strong>Location:</strong> {detailsIssue.location}</p>
            <p><strong>Reported:</strong> {new Date(detailsIssue.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
            <p><strong>Due by:</strong> {detailsIssue.due_date ? new Date(detailsIssue.due_date).toLocaleDateString('en-IN') : '—'}</p>
            <p><strong>Description:</strong> {detailsIssue.description}</p>
            {detailsIssue.image && (
              <img src={detailsIssue.image} alt="Complaint evidence" className="rounded-lg border border-[var(--neutral-300)] max-h-64" />
            )}
            {detailsIssue.audio && (
              <div>
                <p className="text-xs text-[var(--neutral-600)] mb-1">Voice note:</p>
                <audio controls src={detailsIssue.audio} className="w-full max-w-sm" />
              </div>
            )}
            {detailsIssue.original_transcript && (
              <div className="bg-[var(--teal-100)] rounded-lg p-3 space-y-2">
                <p><strong>Original voice transcript</strong> (citizen's own words):</p>
                <p className="italic">“{detailsIssue.original_transcript}”</p>
                {detailsIssue.translated_transcript && (
                  <>
                    <p className="text-xs text-[var(--neutral-600)]">Machine translation to English (may contain errors):</p>
                    <p>“{detailsIssue.translated_transcript}”</p>
                  </>
                )}
              </div>
            )}
            <div>
              <h3 className="font-semibold mb-3">Complaint history</h3>
              <Timeline events={detailsEvents} />
            </div>
          </div>
        </Modal>
      )}

      {actionId && (
        <Modal
          onClose={() => setActionId(null)}
          title={actionKind === 'Time' ? 'Request additional time' : actionKind === 'Budget' ? 'Request additional budget' : 'Mark as not possible'}
        >
          <div className="space-y-3 text-sm">
            <p className="text-[var(--neutral-600)]">
              {actionKind === 'Time' && 'Record why more time is needed and propose a new deadline. The citizen will see this.'}
              {actionKind === 'Budget' && 'Record why additional funds are required. The complaint stays flagged 🚩 and remains with higher review.'}
              {actionKind === 'Not Possible' && 'Record why this cannot currently be resolved. A red flag 🚩 is not a permanent rejection — the complaint moves to the next higher level for review.'}
            </p>
            <div>
              <label className="label" htmlFor="act-reason">Explanation (required, shown to the citizen)</label>
              <textarea id="act-reason" className="input min-h-[90px]" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain the reason…" />
            </div>
            {actionKind === 'Time' && (
              <div>
                <label className="label" htmlFor="act-days">Proposed extension (days)</label>
                <input id="act-days" type="number" min={1} max={90} className="input max-w-[140px]" value={extendedDays} onChange={(e) => setExtendedDays(e.target.value)} />
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button className="btn-ghost" onClick={() => setActionId(null)}>Cancel</button>
              <button className={`btn ${actionKind === 'Not Possible' ? 'btn-danger' : 'btn-warning'}`} onClick={confirmAction}>
                Confirm {actionKind === 'Time' ? 'time escalation' : actionKind === 'Budget' ? 'budget escalation' : 'decision'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function StatCard({ label, value, cls, symbol }: { label: string; value: number; cls: string; symbol?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-[var(--neutral-600)]">{label}</p>
      <p className={`text-2xl font-bold ${cls}`}>{symbol ? `${symbol} ` : ''}{value}</p>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[1500] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card p-5 max-w-xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[var(--navy-800)]">{title}</h3>
          <button className="p-1 text-[var(--neutral-600)]" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Graphs({ issues }: { issues: Issue[] }) {
  const [dept, setDept] = useState('All');
  const [status, setStatus] = useState('All');
  const [time, setTime] = useState('All');

  const filtered = useMemo(() => {
    const now = Date.now();
    return issues.filter((i) => {
      if (dept !== 'All' && i.department !== dept) return false;
      if (status !== 'All' && simplifiedStatus(i.status) !== status) return false;
      if (time !== 'All') {
        const ageDays = (now - new Date(i.created_at).getTime()) / 86400000;
        if (ageDays > parseInt(time, 10)) return false;
      }
      return true;
    });
  }, [issues, dept, status, time]);

  return (
    <section>
      <h1 className="text-2xl font-semibold text-[var(--navy-800)] mb-1">Issue Analytics</h1>
      <p className="text-sm text-[var(--neutral-600)] mb-4">Counts reflect only the complaints visible in your role.</p>
      <div className="flex flex-wrap gap-2 mb-4">
        <select className="input max-w-[200px]" value={dept} onChange={(e) => setDept(e.target.value)}>
          <option value="All">All departments</option>
          {['Road', 'Sanitation', 'Water', 'General'].map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="input max-w-[200px]" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="All">All statuses</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
        </select>
        <select className="input max-w-[200px]" value={time} onChange={(e) => setTime(e.target.value)}>
          <option value="All">All time</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
        </select>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard title="Issues by department" issues={filtered} chartKind="department" />
        <ChartCard title="Issues by status" issues={filtered} chartKind="status" />
        <div className="lg:col-span-2"><ChartCard title="Issues reported over time" issues={filtered} chartKind="timeline" /></div>
        <div className="lg:col-span-2"><ChartCard title="Issue hotspots by location" issues={filtered} chartKind="location" /></div>
      </div>
    </section>
  );
}

function ChartCard({ title, issues, chartKind }: { title: string; issues: Issue[]; chartKind: 'department' | 'status' | 'timeline' | 'location' }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();
    const counts = new Map<string, number>();
    for (const i of issues) {
      const key =
        chartKind === 'department' ? i.department
        : chartKind === 'status' ? simplifiedStatus(i.status)
        : chartKind === 'timeline' ? new Date(i.created_at).toISOString().slice(0, 10)
        : i.area || i.location.split('(')[0].trim();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const entries = [...counts.entries()].sort((a, b) =>
      chartKind === 'timeline' ? a[0].localeCompare(b[0]) : b[1] - a[1]
    );
    const palette = ['#E74C3C', '#F1C40F', '#3498DB', '#6c757d', '#0e7490', '#d97706'];
    chartRef.current = new Chart(canvasRef.current, {
      type: chartKind === 'timeline' ? 'line' : chartKind === 'department' ? 'pie' : 'bar',
      data: {
        labels: entries.map((e) => e[0]),
        datasets: [{
          label: chartKind === 'timeline' ? 'Issues reported' : 'Issues',
          data: entries.map((e) => e[1]),
          backgroundColor: chartKind === 'timeline' ? 'rgba(26,65,96,0.15)' : palette,
          borderColor: chartKind === 'timeline' ? '#1a4160' : '#ffffff',
          borderWidth: 1,
          fill: chartKind === 'timeline',
          tension: 0.2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: chartKind === 'location' ? 'y' : 'x',
        plugins: { legend: { display: chartKind === 'department' } },
        scales: chartKind === 'department' ? {} : { y: { beginAtZero: true, ticks: { precision: 0 } } },
      },
    });
    return () => { chartRef.current?.destroy(); chartRef.current = null; };
  }, [issues, chartKind]);

  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-[var(--navy-800)] mb-3">{title}</h3>
      {issues.length === 0 ? (
        <p className="text-sm text-[var(--neutral-600)] py-10 text-center">No data for the current filters.</p>
      ) : (
        <div style={{ height: chartKind === 'timeline' || chartKind === 'location' ? 280 : 240 }}>
          <canvas ref={canvasRef} />
        </div>
      )}
    </div>
  );
}
