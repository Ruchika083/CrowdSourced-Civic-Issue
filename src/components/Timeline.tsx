import type { IssueEvent } from '../types';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function Timeline({ events }: { events: IssueEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-[var(--neutral-600)]">No recorded actions yet.</p>;
  }
  return (
    <ol className="relative border-l-2 border-[var(--neutral-300)] ml-3 space-y-5">
      {events.map((e) => (
        <li key={e.id} className="ml-6">
          <span className="absolute -left-[9px] w-4 h-4 rounded-full border-2 border-white bg-[var(--teal-600)]" />
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-semibold text-sm text-[var(--navy-800)]">{e.action}</span>
            <span className="badge flag-none">{e.level} level</span>
            {e.new_level && e.new_level !== e.level && (
              <span className="text-xs text-[var(--neutral-600)]">moved to {e.new_level}</span>
            )}
          </div>
          <p className="text-xs text-[var(--neutral-600)] mt-0.5">
            {formatDateTime(e.created_at)}
            {e.level_name ? ` — ${e.level_name}` : ''}
          </p>
          {e.note && <p className="text-sm mt-1 text-[#37474f]">{e.note}</p>}
          {e.new_due_date && (
            <p className="text-xs mt-1 text-[var(--warning)] font-medium">
              Extended due date: {new Date(e.new_due_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
