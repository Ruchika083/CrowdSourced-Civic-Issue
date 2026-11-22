import type { Issue } from '../types';
import { simplifiedStatus } from '../types';

export function FlagBadge({ flag }: { flag: string }) {
  const map: Record<string, { symbol: string; label: string; cls: string }> = {
    Green: { symbol: '✓', label: 'Resolved', cls: 'flag-green' },
    Red: { symbol: '🚩', label: 'Unsolved', cls: 'flag-red' },
    None: { symbol: '○', label: 'Under Consideration', cls: 'flag-none' },
  };
  const f = map[flag] ?? map.None;
  return (
    <span className={`badge ${f.cls}`}>
      <span aria-hidden>{f.symbol}</span> {f.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const simple = simplifiedStatus(status);
  const cls =
    simple === 'Resolved'
      ? 'flag-green'
      : simple === 'Pending'
        ? 'flag-none'
        : 'badge bg-[#fdf3e0] text-[#92610a]';
  return <span className={`badge ${cls}`}>{status}</span>;
}
