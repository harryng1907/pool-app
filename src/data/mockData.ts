import { ActivityEvent, SquadMember, MatchReason } from '../types';

export const DISCOVER_EVENTS: ActivityEvent[] = [
  {
    id: 'comp1511-a2',
    badge: 'COMP1511 COHORT',
    title: 'COMP1511 Assignment 2 grind',
    timeAndPlace: 'Thursday 2:00 PM · Law Library L2 · ~3 hrs',
    duration: '~3 hrs',
    location: 'Law Library L2',
    tags: ['COMP1511', 'Quiet focus', 'First years', '2 of 4 spots'],
    subtext: '31 students interested this week',
    cohort: 'Computer Science & Engineering',
    description: 'Tackling linked lists and pointer recursion together. Silent sprint with 10-min debug checks.',
    interestedCount: 31,
    openSpots: '2 of 4 spots',
  },
  {
    id: 'math1081-prep',
    badge: 'MATH1081 COHORT',
    title: 'MATH1081 Discrete Math Lab Quiz Sprint',
    timeAndPlace: 'Friday 11:00 AM · Main Library L3 · ~2 hrs',
    duration: '~2 hrs',
    location: 'Main Library L3',
    tags: ['MATH1081', 'Problem Solving', 'First years', '1 of 4 spots'],
    subtext: '24 students interested this week',
    cohort: 'Science & Engineering',
    description: 'Working through set theory, logic proofs, and modular arithmetic past papers.',
    interestedCount: 24,
    openSpots: '1 of 4 spots',
  },
  {
    id: 'desn1000-build',
    badge: 'DESN1000 COHORT',
    title: 'DESN1000 Prototype build & CAD test',
    timeAndPlace: 'Monday 3:30 PM · Makerspace Hilmer · ~3 hrs',
    duration: '~3 hrs',
    location: 'Makerspace Hilmer',
    tags: ['DESN1000', 'Hands-on', 'Engineering', '3 of 5 spots'],
    subtext: '18 students interested this week',
    cohort: 'Engineering Design',
    description: 'Laser cutting acrylic parts, 3D printing tolerance checks, and physical assembly.',
    interestedCount: 18,
    openSpots: '3 of 5 spots',
  },
];

export const SQUAD_MEMBERS: SquadMember[] = [
  {
    id: 'mei',
    name: 'Mei',
    role: 'CS · 1st yr',
    isUser: false,
    avatarColor: '#0E5B66',
    initials: 'ML',
    degree: '1st Yr CSE',
    year: 'Year 1',
    statusQuote: 'Bringing pointers diagram cheat sheet 📝',
    verifiedStudent: true,
  },
  {
    id: 'tomas',
    name: 'Tomas',
    role: 'ENG · 1st yr',
    isUser: false,
    avatarColor: '#2563EB',
    initials: 'TK',
    degree: '1st Yr Data',
    year: 'Year 1',
    statusQuote: 'Has VSCode remote debugger setup & coffee ☕',
    verifiedStudent: true,
  },
  {
    id: 'maya',
    name: 'Maya',
    role: 'YOU',
    isUser: true,
    avatarColor: '#F57C2A',
    initials: 'MY',
    degree: '1st Yr Software Eng',
    year: 'Year 1',
    statusQuote: 'Locked in for the A2 stage 3 tests 🎯',
    verifiedStudent: true,
  },
];

export const MATCH_REASONS: MatchReason[] = [
  {
    id: '1',
    text: 'All three in COMP1511 — Assignment 2 sprint & lab practice',
  },
  {
    id: '2',
    text: 'All free Tuesday afternoons — Target slot: 2:00 PM – 4:30 PM',
  },
  {
    id: '3',
    text: 'All prefer quiet focused study — Pomodoro 50/10 rhythm preferred',
  },
];

export const SESSION_DETAILS = {
  confirmedTime: 'Tuesday, 2:00 PM',
  subhead: "You're locked in! Your squad is ready to roll.",
  location: 'Law Library, Level 2',
  locationDetail: 'Quiet study zone · Pod 4B',
  duration: 'About 3 hours',
  durationDetail: '2:00 PM – 5:00 PM',
  focusTopic: 'COMP1511 Assignment 2',
  focusTopicDetail: 'Linked lists, pointers & debugging',
  trustBanner: 'Public campus venue. Everyone is an active, verified UNSW student.',
};
