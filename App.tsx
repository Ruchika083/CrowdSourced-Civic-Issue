import { useCallback, useEffect, useRef, useState } from 'react';
import type { Issue, IssueEvent, Official } from './types';
import { fetchIssues, fetchEvents, updateIssue, insertEvent, runDailyChecks, HIERARCHY } from './lib/data';
import Login from './components/Login';
import CitizenDashboard from './components/CitizenDashboard';
import OfficialDashboard from './components/OfficialDashboard';
import { ToastProvider, useToast } from './components/Toast';

type Session =
  | { kind: 'citizen'; name: string; email: string }
  | { kind: 'official'; official: Official }
  | null;

function CivicTalk() {
  const toast = useToast();
  const [session, setSession] = useState<Session>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [events, setEvents] = useState<IssueEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const overdueDone = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [i, e] = await Promise.all([fetchIssues(), fetchEvents()]);
      setIssues(i);
      setEvents(e);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not reach the complaint database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    load();
  }, [session, load]);

  // Overdue auto-escalation (existing behaviour): runs once per load.
  useEffect(() => {
    if (!session || loading || overdueDone.current || issues.length === 0) return;
    overdueDone.current = true;
    const updates: { id: string; patch: Partial<Issue>; event?: Omit<Parameters<typeof insertEvent>[0], 'issue_id'> }[] = [];
    runDailyChecks(issues, (id, patch, event) => {
      updates.push({ id, patch, event });
    });
    if (updates.length === 0) return;
    (async () => {
      for (const u of updates) {
        await updateIssue(u.id, u.patch);
        if (u.event) await insertEvent({ issue_id: u.id, ...u.event });
      }
      toast(`${updates.length} overdue complaint(s) were escalated to the next authority level.`, 'info');
      load();
    })();
  }, [session, loading, issues, load, toast]);

  function handleDataChanged() {
    load();
  }

  if (!session) {
    return (
      <Login
        onCitizenLogin={(name, email) => {
          overdueDone.current = false;
          setSession({ kind: 'citizen', name, email });
        }}
        onOfficialLogin={(official) => {
          overdueDone.current = false;
          setSession({ kind: 'official', official });
        }}
      />
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card p-6 max-w-md text-center space-y-3">
          <h1 className="font-semibold text-[var(--navy-800)]">Could not load complaints</h1>
          <p className="text-sm text-[var(--neutral-600)]">{loadError}</p>
          <button className="btn-primary" onClick={load}>Try again</button>
          <button className="btn-ghost w-full" onClick={() => setSession(null)}>Sign out</button>
        </div>
      </div>
    );
  }

  if (loading && issues.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-[var(--neutral-600)]">Loading complaints…</p>
      </div>
    );
  }

  return session.kind === 'citizen' ? (
    <CitizenDashboard
      citizen={{ name: session.name, email: session.email }}
      issues={issues}
      events={events}
      onLogout={() => setSession(null)}
      onSubmitted={handleDataChanged}
    />
  ) : (
    <OfficialDashboard
      official={session.official}
      issues={issues}
      events={events}
      onLogout={() => setSession(null)}
      onDataChanged={handleDataChanged}
    />
  );
}

export default function App() {
  return (
    <ToastProvider>
      <CivicTalk />
    </ToastProvider>
  );
}
