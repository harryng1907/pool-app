// Pick-lists for onboarding. Interest tags use the same words as activity tags,
// so what you pick here feeds the deck ranking and the matcher directly.
import { Ionicons } from '@expo/vector-icons';

type IconName = keyof typeof Ionicons.glyphMap;

export const INTERESTS: { tag: string; label: string; icon: IconName }[] = [
  { tag: 'quiet focus', label: 'Quiet focus', icon: 'headset' },
  { tag: 'library', label: 'Library', icon: 'library' },
  { tag: 'lofi', label: 'Lofi', icon: 'musical-notes' },
  { tag: 'night owl', label: 'Night owl', icon: 'moon' },
  { tag: 'problem solving', label: 'Puzzles', icon: 'extension-puzzle' },
  { tag: 'pair programming', label: 'Pair coding', icon: 'git-branch' },
  { tag: 'boba', label: 'Boba', icon: 'ice-cream' },
  { tag: 'matcha', label: 'Matcha', icon: 'leaf' },
  { tag: 'chill', label: 'Chill', icon: 'cafe' },
  { tag: 'reading', label: 'Reading', icon: 'book' },
  { tag: 'social', label: 'Social', icon: 'people' },
  { tag: 'board games', label: 'Board games', icon: 'dice' },
  { tag: 'trivia', label: 'Trivia', icon: 'help-circle' },
  { tag: 'anime', label: 'Anime', icon: 'tv' },
  { tag: 'art', label: 'Art', icon: 'brush' },
  { tag: 'photography', label: 'Photos', icon: 'camera' },
  { tag: 'language', label: 'Languages', icon: 'chatbubbles' },
  { tag: 'outdoors', label: 'Outdoors', icon: 'sunny' },
  { tag: 'running', label: 'Running', icon: 'walk' },
  { tag: 'gym', label: 'Gym', icon: 'barbell' },
  { tag: 'badminton', label: 'Badminton', icon: 'tennisball' },
  { tag: 'climbing', label: 'Climbing', icon: 'fitness' },
  { tag: 'sport', label: 'Sport', icon: 'football' },
  { tag: 'internships', label: 'Internships', icon: 'briefcase' },
  { tag: 'coding interview', label: 'LeetCode', icon: 'terminal' },
  { tag: 'startups', label: 'Startups', icon: 'bulb' },
  { tag: 'hackathon', label: 'Hackathons', icon: 'rocket' },
  { tag: 'building', label: 'Making things', icon: 'construct' },
];

export const DEGREES: { label: string; short: string; icon: IconName }[] = [
  { label: 'Computer Science', short: 'CS', icon: 'laptop' },
  { label: 'Software Engineering', short: 'SENG', icon: 'code-slash' },
  { label: 'Data Science', short: 'DS', icon: 'analytics' },
  { label: 'Engineering', short: 'ENG', icon: 'construct' },
  { label: 'Commerce', short: 'COMM', icon: 'briefcase' },
  { label: 'Science', short: 'SCI', icon: 'flask' },
  { label: 'Medicine', short: 'MED', icon: 'medkit' },
  { label: 'Law', short: 'LAW', icon: 'document-text' },
  { label: 'Design', short: 'DESN', icon: 'color-palette' },
  { label: 'Arts', short: 'ARTS', icon: 'brush' },
  { label: 'Psychology', short: 'PSYC', icon: 'happy' },
  { label: 'Something else', short: 'UNSW', icon: 'school' },
];

export const COMMON_COURSES = [
  'COMP1511', 'COMP1521', 'COMP1531', 'COMP2521', 'MATH1081', 'MATH1131', 'MATH1231',
  'ECON1101', 'ACCT1501', 'DESN1000', 'ENGG1000', 'PSYC1001', 'ARTS1090',
];

// Free-time blocks (Sydney time). Adjacent picks on the same day are merged into one window.
export const TIME_BLOCKS: { key: string; label: string; start: number; end: number; icon: IconName }[] = [
  { key: 'am', label: 'Morning', start: 9, end: 12, icon: 'sunny-outline' },
  { key: 'pm', label: 'Arvo', start: 12, end: 17, icon: 'partly-sunny-outline' },
  { key: 'eve', label: 'Evening', start: 17, end: 21, icon: 'moon-outline' },
];

// Mon → Sun, as Postgres day-of-week numbers (0 = Sunday)
export const WEEK: { dow: number; label: string }[] = [
  { dow: 1, label: 'Mon' },
  { dow: 2, label: 'Tue' },
  { dow: 3, label: 'Wed' },
  { dow: 4, label: 'Thu' },
  { dow: 5, label: 'Fri' },
  { dow: 6, label: 'Sat' },
  { dow: 0, label: 'Sun' },
];

export const GROUP_PREFS: { key: 'one' | 'small' | 'any'; label: string; sub: string; icon: IconName }[] = [
  { key: 'one', label: '1-on-1', sub: 'Just one person', icon: 'person' },
  { key: 'small', label: 'Small group', sub: '3–4 people', icon: 'people' },
  { key: 'any', label: 'Either', sub: 'Surprise me', icon: 'shuffle' },
];
