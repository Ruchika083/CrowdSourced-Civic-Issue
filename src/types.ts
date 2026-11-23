export type Flag = 'None' | 'Red' | 'Green';
export type Level = 'Ward' | 'Zone' | 'City' | 'IAS';

export interface IssueEvent {
  id: string;
  issue_id: string;
  action: string;
  level: string;
  level_name: string | null;
  note: string | null;
  new_level: string | null;
  new_due_date: string | null;
  created_at: string;
}

export interface Issue {
  id: string;
  issue_type: string;
  description: string;
  location: string;
  area: string;
  lat: number | null;
  lng: number | null;
  image: string | null;
  audio: string | null;
  original_transcript: string | null;
  translated_transcript: string | null;
  transcript_language: string | null;
  department: string;
  status: string;
  current_level: Level;
  flag: Flag;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Official {
  name: string;
  email: string;
  designation: Level;
  department: string;
}

export const VIZAG_AREAS: Record<string, { lat: number; lng: number }> = {
  Akkayyapalem: { lat: 17.73, lng: 83.3 },
  Allipuram: { lat: 17.7, lng: 83.28 },
  Anakapalle: { lat: 17.68, lng: 83.01 },
  Arilova: { lat: 17.76, lng: 83.32 },
  Asilmetta: { lat: 17.72, lng: 83.31 },
  'Bheemunipatnam (Bheemili)': { lat: 17.88, lng: 83.45 },
  'Chinna Waltair': { lat: 17.74, lng: 83.33 },
  'Dwaraka Nagar': { lat: 17.72, lng: 83.3 },
  Gajuwaka: { lat: 17.67, lng: 83.21 },
  Gopalapatnam: { lat: 17.75, lng: 83.25 },
  'Jagadamba Centre': { lat: 17.7, lng: 83.29 },
  Kancharapalem: { lat: 17.73, lng: 83.28 },
  Maddilapalem: { lat: 17.73, lng: 83.32 },
  Madhurawada: { lat: 17.82, lng: 83.34 },
  'MVP Colony': { lat: 17.74, lng: 83.32 },
  Pendurthi: { lat: 17.82, lng: 83.22 },
  'RK Beach': { lat: 17.71, lng: 83.32 },
  Seethammadhara: { lat: 17.74, lng: 83.31 },
  Siripuram: { lat: 17.72, lng: 83.32 },
};

export const SUB_ISSUES: Record<string, string[]> = {
  Sanitation: ['Garbage Overflow', 'Clogged Drains', 'Public Toilet Cleanliness'],
  'Road Issue': ['Pothole', 'Streetlight', 'Obstacle'],
  Water: ['Pipe Leak', 'No Water Supply', 'Contaminated Water'],
};

export const DEPARTMENT_COLORS: Record<string, string> = {
  Road: '#E74C3C',
  Sanitation: '#F1C40F',
  Water: '#3498DB',
  General: '#6c757d',
};

export function departmentFor(issueType: string): string {
  if (issueType.includes('Road')) return 'Road';
  if (issueType.includes('Sanitation')) return 'Sanitation';
  if (issueType.includes('Water')) return 'Water';
  return 'General';
}

export function simplifiedStatus(status: string): 'Pending' | 'In Progress' | 'Resolved' {
  const s = status.toLowerCase();
  if (s.includes('resolved')) return 'Resolved';
  if (s.includes('new at')) return 'Pending';
  return 'In Progress';
}

export function flagSymbol(flag: string): { symbol: string; label: string; className: string } {
  if (flag === 'Green') return { symbol: '✓', label: 'Resolved', className: 'flag-green' };
  if (flag === 'Red') return { symbol: '🚩', label: 'Unsolved', className: 'flag-red' };
  return { symbol: '○', label: 'Under Consideration', className: 'flag-none' };
}
