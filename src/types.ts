export type TabType = 'discover' | 'squads' | 'profile';

export type ScreenType = 'discover' | 'squads' | 'squad' | 'rate' | 'chat' | 'profile' | 'metrics';

export type SquadType = 'deadline' | 'hobby' | 'career';
export type Category = 'quiet' | 'social' | 'active' | 'maker' | 'food';

export interface Venue {
  id: string;
  name: string;
  detail: string | null;
}

// A card in the swipe deck (from get_deck)
export interface ActivityCard {
  id: string;
  kind: 'interest' | 'session';
  squad_type: SquadType;
  title: string;
  description: string | null;
  course: string | null;
  category: Category;
  tags: string[];
  icon: string;
  duration_mins: number;
  starts_at: string | null;
  capacity: number;
  venue: Venue | null;
  interested_count: number;
  spots_left: number | null;
}

export interface SquadMember {
  id: string | null; // null while hidden (before the squad is confirmed)
  name: string;
  initials: string;
  avatar_color: string;
  degree: string;
  degree_short: string;
  year: number;
  status_quote: string | null;
  is_me: boolean;
  status: 'invited' | 'accepted' | 'declined';
  hidden: boolean;
}

export type SquadStatus = 'proposed' | 'confirmed' | 'completed' | 'cancelled';

// From get_my_squads
export interface Squad {
  id: string;
  status: SquadStatus;
  my_status: 'invited' | 'accepted' | 'declined';
  starts_at: string;
  ends_at: string;
  reasons: string[];
  rebook_of: string | null;
  revealed: boolean;
  rated: boolean;
  activity: {
    id: string;
    title: string;
    description: string | null;
    course: string | null;
    category: Category;
    squad_type: SquadType;
    icon: string;
    tags: string[];
    duration_mins: number;
  };
  venue: Venue;
  members: SquadMember[];
}

// From get_nudges
export interface Nudge {
  squad_id: string;
  activity_title: string;
  activity_icon: string;
  venue_name: string | null;
  venue_score: number | null;
  names: string[];
  top_score: number;
}

// From get_me
export interface Me {
  id: string;
  name: string;
  full_name: string | null;
  initials: string;
  avatar_color: string;
  degree: string;
  degree_short: string;
  year: number;
  vibe: string | null;
  status_quote: string | null;
  group_pref: 'one' | 'small' | 'any';
  interests: string[];
  onboarded: boolean;
  email: string;
  is_guest: boolean;
  courses: string[];
  availability: { dow: number; start: number; end: number }[];
  stats: { swipes: number; squads_done: number; hours: number; people_met: number };
}

export interface Metrics {
  funnel: { step: string; users: number }[];
  totals: {
    activities: number;
    squads: number;
    avg_member_rating: number | null;
    avg_venue_rating: number | null;
    weekly_active: number;
  };
  cohorts: { week: string; signed_up: number; active_week_1: number }[];
}

// Sent to save_profile — every field optional
export interface ProfileInput {
  full_name?: string;
  degree?: string;
  degree_short?: string;
  year?: number;
  group_pref?: 'one' | 'small' | 'any';
  vibe?: string;
  status_quote?: string;
  interests?: string[];
  courses?: string[];
  availability?: { dow: number; start: number; end: number }[];
}

// From get_messages
export interface Message {
  id: number;
  body: string;
  created_at: string;
  is_me: boolean;
  name: string;
  initials: string;
  avatar_color: string;
}
