import { getSupabase } from './supabase';
import type { Issue, IssueEvent, Level, Official } from '../types';
import { departmentFor, VIZAG_AREAS } from '../types';

export const HIERARCHY: Level[] = ['Ward', 'Zone', 'City', 'IAS'];

export async function fetchIssues(): Promise<Issue[]> {
  const { data, error } = await getSupabase()
    .from('issues')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Issue[];
}

export async function fetchEvents(): Promise<IssueEvent[]> {
  const { data, error } = await getSupabase()
    .from('issue_events')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as IssueEvent[];
}

export async function submitIssue(payload: {
  issueType: string;
  description: string;
  area: string;
  landmark: string;
  image: string | null;
  audio: string | null;
  originalTranscript: string | null;
  translatedTranscript: string | null;
  transcriptLanguage: string | null;
}): Promise<Issue> {
  const coords = areaCoords(payload.area);
  const id = 'user-' + Date.now().toString().slice(-6);
  const fullLocation = payload.landmark
    ? `${payload.area} (Details: ${payload.landmark})`
    : payload.area;

  const { data, error } = await getSupabase()
    .from('issues')
    .insert({
      id,
      issue_type: payload.issueType,
      description: payload.description,
      location: fullLocation,
      area: payload.area,
      lat: coords.lat,
      lng: coords.lng,
      image: payload.image,
      audio: payload.audio,
      original_transcript: payload.originalTranscript,
      translated_transcript: payload.translatedTranscript,
      transcript_language: payload.transcriptLanguage,
      department: departmentFor(payload.issueType),
      status: 'New at Ward',
      current_level: 'Ward',
      flag: 'None',
      due_date: new Date(Date.now() + 10 * 86400000).toISOString(),
    })
    .select()
    .maybeSingle();
  if (error) throw error;
  const issue = data as Issue;

  await insertEvent({
    issue_id: issue.id,
    action: 'Submitted',
    level: 'Citizen',
    level_name: 'Citizen',
    note: payload.originalTranscript
      ? `Voice report submitted (original language preserved). Landmark: ${payload.landmark || 'n/a'}`
      : `Complaint reported. Landmark: ${payload.landmark || 'n/a'}`,
  });
  return issue;
}

export async function insertEvent(event: {
  issue_id: string;
  action: string;
  level: string;
  level_name?: string;
  note?: string | null;
  new_level?: string | null;
  new_due_date?: string | null;
}): Promise<void> {
  const { error } = await getSupabase().from('issue_events').insert(event);
  if (error) throw error;
}

export async function updateIssue(id: string, patch: Partial<Issue>): Promise<void> {
  const { error } = await getSupabase().from('issues').update(patch).eq('id', id);
  if (error) throw error;
}

export function areaCoords(area: string): { lat: number; lng: number } {
  return VIZAG_AREAS[area] ?? { lat: 17.72, lng: 83.3 };
}

export function officialCanSee(issue: Issue, official: Official): boolean {
  if (official.designation === 'IAS') return true;
  const userLevelIndex = HIERARCHY.indexOf(official.designation);
  const issueLevelIndex = HIERARCHY.indexOf(issue.current_level);
  return issue.department === official.department && issueLevelIndex <= userLevelIndex;
}

export function officialActsAtCurrentLevel(issue: Issue, official: Official): boolean {
  return issue.current_level === official.designation;
}

export function runDailyChecks(
  issues: Issue[],
  applyUpdate: (id: string, patch: Partial<Issue>, event?: Omit<Parameters<typeof insertEvent>[0], 'issue_id'>) => void
): void {
  const now = new Date();
  for (const issue of issues) {
    if (issue.status !== 'Resolved' && issue.due_date && now > new Date(issue.due_date)) {
      const idx = HIERARCHY.indexOf(issue.current_level);
      if (idx < HIERARCHY.length - 1) {
        const nextLevel = HIERARCHY[idx + 1];
        const newDue = new Date(now.getTime() + 10 * 86400000).toISOString();
        applyUpdate(issue.id, {
          status: `Auto-Escalated (Overdue) to ${nextLevel}`,
          current_level: nextLevel,
          flag: 'Red',
          due_date: newDue,
        }, {
          action: 'Escalated',
          level: issue.current_level,
          level_name: 'System (overdue)',
          note: `Complaint overdue — automatically escalated to ${nextLevel}. New due date set.`,
          new_level: nextLevel,
          new_due_date: newDue,
        });
      } else if (issue.flag !== 'Red') {
        applyUpdate(issue.id, { flag: 'Red' }, {
          action: 'Flagged Overdue',
          level: issue.current_level,
          level_name: 'System (overdue)',
          note: 'Complaint is overdue at the highest administrative level.',
        });
      }
    }
  }
}
