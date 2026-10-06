export type TabType = 'discover' | 'squads' | 'profile';

export type ScreenType = 'discover' | 'squads' | 'confirmed' | 'profile';

export interface ActivityEvent {
  id: string;
  badge: string;
  title: string;
  timeAndPlace: string;
  duration: string;
  location: string;
  tags: string[];
  subtext: string;
  cohort: string;
  description?: string;
  interestedCount: number;
  openSpots: string;
}

export interface SquadMember {
  id: string;
  name: string;
  role: string;
  isUser: boolean;
  avatarColor: string;
  initials: string;
  avatarUrl?: string;
  degree: string;
  year: string;
  statusQuote: string;
  verifiedStudent: boolean;
}

export interface MatchReason {
  id: string;
  text: string;
}
