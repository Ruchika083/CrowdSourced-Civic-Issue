import { useMemo, useState } from 'react';
import {
  LayoutDashboard, FilePlus2, Radar, Map as MapIcon, HelpCircle, MessageSquare,
  Landmark, LogOut, Menu, X,
} from 'lucide-react';
import type { Issue, IssueEvent } from '../types';
import { simplifiedStatus } from '../types';
import { FlagBadge, StatusBadge } from './Badges';
import Timeline from './Timeline';
import IssueMap from './IssueMap';
import ReportIssueForm from './ReportIssueForm';

interface Props {
  citizen: { name: string; email: string };
  issues: Issue[];
  events: IssueEvent[];
  onLogout: () => void;
  onSubmitted: (issue: Issue) => void;
}

type Page = 'dashboard' | 'report' | 'track' | 'map' | 'faq' | 'feedback';

const MENU: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'My Dashboard', icon: LayoutDashboard },
  { id: 'report', label: 'Report an Issue', icon: FilePlus2 },
  { id: 'track', label: 'Track Complaint', icon: Radar },
  { id: 'map', label: 'Issue Map', icon: MapIcon },
  { id: 'faq', label: 'FAQs', icon: HelpCircle },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare },
];

export default function CitizenDashboard({ citizen, issues, events, onLogout, onSubmitted }: Props) {
  const [page, setPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [trackId, setTrackId] = useState('');
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);

  const myIssues = useMemo(() => issues, [issues]);
  const activeIssue = myIssues.find((i) => i.id === activeIssueId) ?? null;
  const activeEvents = activeIssue ? events.filter((e) => e.issue_id === activeIssue.id) : [];

  const counts = useMemo(() => {
    const resolved = myIssues.filter((i) => simplifiedStatus(i.status) === 'Resolved').length;
    const unsolved = myIssues.filter((i) => i.flag === 'Red').length;
    return {
      total: myIssues.length,
      under: myIssues.length - resolved - unsolved,
      resolved,
      unsolved,
    };
  }, [myIssues]);

  function goToTrack(issueId: string) {
    setActiveIssueId(issueId);
    setTrackId(issueId);
    setPage('track');
  }

  const nav = (
    <nav className="space-y-1">
      {MENU.map((m) => (
        <button
          key={m.id}
          onClick={() => { setPage(m.id); setSidebarOpen(false); }}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            page === m.id ? 'bg-[var(--navy-700)] text-white' : 'text-[var(--neutral-600)] hover:bg-[var(--neutral-100)]'
          }`}
        >
          <m.icon size={18} /> {m.label}
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
            <Landmark size={24} className="text-[var(--teal-600)]" />
            <span className="font-bold text-lg text-[var(--navy-800)]">Civic Talk</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium leading-tight">{citizen.name}</p>
              <p className="text-xs text-[var(--neutral-600)] leading-tight">{citizen.email}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-[var(--teal-600)] text-white flex items-center justify-center font-semibold">
              {citizen.name.charAt(0).toUpperCase()}
            </div>
            <button className="btn-ghost !px-3" onClick={onLogout} aria-label="Sign out"><LogOut size={16} /></button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden lg:block w-60 shrink-0 border-r border-[var(--neutral-300)] bg-white p-4">
          {nav}
        </aside>
        {sidebarOpen && (
          <div className="fixed inset-0 z-[600] lg:hidden" onClick={() => setSidebarOpen(false)}>
            <div className="absolute inset-0 bg-black/40" />
            <aside className="absolute left-0 top-0 h-full w-64 bg-white p-4 pt-20" onClick={(e) => e.stopPropagation()}>
              {nav}
            </aside>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 min-w-0">
          {page === 'dashboard' && (
            <section>
              <h1 className="text-2xl font-semibold text-[var(--navy-800)] mb-1">Welcome, {citizen.name}</h1>
              <p className="text-sm text-[var(--neutral-600)] mb-5">Your complaints and their current state.</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <StatCard label="Total reported" value={counts.total} cls="text-[var(--navy-800)]" />
                <StatCard label="Under consideration" value={counts.under} cls="text-[var(--neutral-600)]" symbol="○" />
                <StatCard label="Unsolved" value={counts.unsolved} cls="text-[var(--danger)]" symbol="🚩" />
                <StatCard label="Resolved" value={counts.resolved} cls="text-[var(--success)]" symbol="✓" />
              </div>
              {myIssues.length === 0 ? (
                <div className="card p-8 text-center text-sm text-[var(--neutral-600)]">
                  You have not reported any issues yet. Use <strong>Report an Issue</strong> to submit your first complaint.
                </div>
              ) : (
                <div className="card min-w-0 overflow-x-auto" role="region" aria-label="Your reported complaints" tabIndex={0}>
                  <table className="w-full min-w-[880px] table-fixed text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-[var(--neutral-600)] bg-[var(--neutral-50)]">
                        <th className="w-36 px-3 py-3">Indicator</th>
                        <th className="w-24 px-3 py-3">ID</th>
                        <th className="w-28 px-3 py-3">Date</th>
                        <th className="w-40 px-3 py-3">Issue</th>
                        <th className="w-36 px-3 py-3">Status</th>
                        <th className="w-28 px-3 py-3">Currently with</th>
                        <th className="w-24 px-3 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myIssues.map((i) => (
                        <tr key={i.id} className="border-t border-[var(--neutral-100)]">
                          <td className="px-3 py-3 break-words"><FlagBadge flag={i.flag} /></td>
                          <td className="px-4 py-3 font-mono text-xs">{i.id}</td>
                          <td className="px-3 py-3 break-words">{new Date(i.created_at).toLocaleDateString('en-IN')}</td>
                          <td className="px-3 py-3 break-words">{i.issue_type}<br /><span className="text-xs text-[var(--neutral-600)]">{i.location}</span></td>
                          <td className="px-3 py-3 break-words"><StatusBadge status={i.status} /></td>
                          <td className="px-3 py-3 break-words">{i.current_level}</td>
                          <td className="px-3 py-3 break-words">
                            <button className="btn-ghost !py-1.5 !px-3" onClick={() => goToTrack(i.id)}>Track</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {page === 'report' && (
            <section>
              <h1 className="text-2xl font-semibold text-[var(--navy-800)] mb-1">Report an Issue</h1>
              <p className="text-sm text-[var(--neutral-600)] mb-5">Type it, speak it, or both — evidence photos help officials act faster.</p>
              <ReportIssueForm onSubmitted={onSubmitted} />
            </section>
          )}

          {page === 'track' && (
            <section className="max-w-2xl">
              <h1 className="text-2xl font-semibold text-[var(--navy-800)] mb-1">Track a Complaint</h1>
              <p className="text-sm text-[var(--neutral-600)] mb-5">Enter your complaint ID, or pick one from your dashboard.</p>
              <div className="flex gap-2 mb-5">
                <input className="input" placeholder="e.g. user-123456" value={trackId} onChange={(e) => { setTrackId(e.target.value); setActiveIssueId(null); }} />
                <button className="btn-primary" onClick={() => setActiveIssueId(trackId.trim() || null)}>Track</button>
              </div>
              {activeIssue ? (
                <div className="card p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="font-semibold text-[var(--navy-800)]">{activeIssue.issue_type}</h2>
                      <p className="text-xs text-[var(--neutral-600)]">{activeIssue.id} · reported {new Date(activeIssue.created_at).toLocaleDateString('en-IN')} · {activeIssue.location}</p>
                    </div>
                    <FlagBadge flag={activeIssue.flag} />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <p><strong>Department:</strong> {activeIssue.department}</p>
                    <p><strong>Currently handled at:</strong> {activeIssue.current_level} level</p>
                    <p><strong>Status:</strong> {activeIssue.status}</p>
                    <p><strong>Due by:</strong> {activeIssue.due_date ? new Date(activeIssue.due_date).toLocaleDateString('en-IN') : '—'}</p>
                  </div>
                  {activeIssue.image && (
                    <img src={activeIssue.image} alt="Complaint evidence" className="rounded-lg border border-[var(--neutral-300)] max-h-64" />
                  )}
                  {activeIssue.audio && (
                    <div>
                      <p className="text-xs text-[var(--neutral-600)] mb-1">Voice note:</p>
                      <audio controls src={activeIssue.audio} className="w-full max-w-sm" />
                    </div>
                  )}
                  {activeIssue.original_transcript && (
                    <div className="bg-[var(--teal-100)] rounded-lg p-3 text-sm space-y-2">
                      <p><strong>Original voice transcript</strong> (as spoken by the citizen):</p>
                      <p className="italic">“{activeIssue.original_transcript}”</p>
                      {activeIssue.translated_transcript && (
                        <>
                          <p className="text-xs text-[var(--neutral-600)]">
                            Machine translation to English (may contain errors):
                          </p>
                          <p>“{activeIssue.translated_transcript}”</p>
                        </>
                      )}
                    </div>
                  )}
                  <p className="text-sm">{activeIssue.description}</p>
                  <div>
                    <h3 className="font-semibold text-sm text-[var(--navy-800)] mb-3">Complaint history</h3>
                    <Timeline events={activeEvents} />
                  </div>
                </div>
              ) : (
                trackId.trim() !== '' && (
                  <div className="card p-5 text-sm text-[var(--danger)]">No complaint found with that ID. Check the ID and try again.</div>
                )
              )}
            </section>
          )}

          {page === 'map' && (
            <section>
              <h1 className="text-2xl font-semibold text-[var(--navy-800)] mb-1">Issue Map</h1>
              <p className="text-sm text-[var(--neutral-600)] mb-4">Reported issues across the city. Colours show the department; popups show the resolution indicator. Coordinates for demo complaints are sample data.</p>
              <IssueMap issues={myIssues} height="480px" />
              <MapLegend kind="department" />
            </section>
          )}

          {page === 'faq' && <Faq />}
          {page === 'feedback' && <Feedback />}
        </main>
      </div>
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

function MapLegend({ kind }: { kind: 'department' | 'indicator' }) {
  const items = kind === 'department'
    ? [['Road', '#E74C3C'], ['Sanitation', '#F1C40F'], ['Water', '#3498DB'], ['General', '#6c757d']]
    : [];
  return (
    <div className="card p-3 mt-3 text-xs space-y-1.5">
      <p className="font-semibold text-[var(--navy-800)]">Legend</p>
      {items.map(([label, color]) => (
        <p key={label} className="flex items-center gap-2">
          <span className="inline-block w-3.5 h-3.5 rounded-full" style={{ background: color }} /> {label}
        </p>
      ))}
      <p className="flex items-center gap-2"><span>🚩</span> Unsolved (red flag)</p>
      <p className="flex items-center gap-2"><span>○</span> Under consideration</p>
      <p className="flex items-center gap-2"><span>✓</span> Resolved</p>
    </div>
  );
}

function Faq() {
  const faqs: [string, string][] = [
    ['How do I report an issue?', 'Open "Report an Issue" from the menu. Choose the type, add a photo, pick the area, and describe the problem — by typing or by voice.'],
    ['How can I track my complaint?', 'Open "Track Complaint" and enter your complaint ID, or press Track on any complaint in "My Dashboard". You will see every recorded action and which administrative level currently handles it.'],
    ['What do the three indicators mean?', '✓ Resolved — an authorized official marked the issue fixed. ○ Under Consideration — the complaint is being processed. 🚩 Unsolved — the complaint is not resolved (for example it was escalated or marked not possible); it is not a permanent rejection.'],
    ['What does escalation mean?', 'If a level needs more time, more budget, or cannot solve the issue, the complaint moves up: Ward → Zone → City → IAS. Every decision and its reason stays visible in the complaint history.'],
    ['Can I edit a complaint after submitting?', 'Contact the ward office; in this demo, edits are limited to officials recording decisions. The original details of your complaint are always preserved.'],
    ['Can I report in my own language?', 'Yes. In "Report an Issue", use "Report by Voice": pick your language, record, and the app keeps your original words and adds a labelled machine translation for officials.'],
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-[var(--navy-800)] mb-4">Frequently Asked Questions</h1>
      <div className="space-y-2">
        {faqs.map(([q, a], idx) => (
          <div key={q} className="card overflow-hidden">
            <button className="w-full text-left px-4 py-3 font-medium text-sm flex justify-between items-center" onClick={() => setOpen(open === idx ? null : idx)}>
              {q}
              <span className="text-[var(--teal-600)]">{open === idx ? '−' : '+'}</span>
            </button>
            {open === idx && <p className="px-4 pb-4 text-sm text-[#37474f]">{a}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function Feedback() {
  const [rating, setRating] = useState('5 - Excellent');
  const [comments, setComments] = useState('');
  const [sent, setSent] = useState(false);
  return (
    <section className="max-w-xl">
      <h1 className="text-2xl font-semibold text-[var(--navy-800)] mb-4">Submit Your Feedback</h1>
      <div className="card p-5 space-y-4">
        <div>
          <label className="label" htmlFor="fb-rating">How would you rate your experience?</label>
          <select id="fb-rating" className="input" value={rating} onChange={(e) => setRating(e.target.value)}>
            <option>5 - Excellent</option>
            <option>4 - Good</option>
            <option>3 - Average</option>
            <option>2 - Poor</option>
            <option>1 - Very Poor</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="fb-comments">Comments</label>
          <textarea id="fb-comments" className="input min-h-[110px]" value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Tell us how we can improve…" />
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            if (!comments.trim()) return;
            setSent(true);
            setComments('');
          }}
        >
          Submit feedback
        </button>
        {sent && <p className="text-sm text-[var(--success)]">Thank you for your feedback! (Stored locally in this demo — no feedback database yet.)</p>}
      </div>
    </section>
  );
}
