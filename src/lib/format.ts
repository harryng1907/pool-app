// All times are shown in campus (Sydney) time, whatever the device's timezone.
const TZ = 'Australia/Sydney';

const dayTime = new Intl.DateTimeFormat('en-AU', {
  timeZone: TZ,
  weekday: 'long',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});
const shortDay = new Intl.DateTimeFormat('en-AU', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' });
const timeOnly = new Intl.DateTimeFormat('en-AU', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true });

const tidy = (s: string) => s.replace(/\s?(am|pm)/i, (m) => ` ${m.trim().toUpperCase()}`).replace(',', '');

/** "Thursday 2:00 PM" */
export const formatWhen = (iso: string) => tidy(dayTime.format(new Date(iso)));

/** "Thu 8 Oct" */
export const formatDate = (iso: string) => shortDay.format(new Date(iso)).replace(',', '');

/** "2:00 PM – 5:00 PM" */
export const formatRange = (startIso: string, endIso: string) =>
  `${tidy(timeOnly.format(new Date(startIso)))} – ${tidy(timeOnly.format(new Date(endIso)))}`;

/** "~3 hrs", "~90 min" */
export const formatDuration = (mins: number) =>
  mins % 60 === 0 ? `~${mins / 60} hr${mins === 60 ? '' : 's'}` : mins > 60 ? `~${(mins / 60).toFixed(1)} hrs` : `~${mins} min`;

export const yearLabel = (year: number) => ['1st', '2nd', '3rd'][year - 1] ?? `${year}th`;

export const SQUAD_TYPE_LABEL = {
  deadline: 'Deadline',
  hobby: 'Hobby',
  career: 'Career',
} as const;
