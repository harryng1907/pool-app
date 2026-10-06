import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';
import { Squad } from '../types';
import { formatDate, formatDuration, formatRange, formatWhen, SQUAD_TYPE_LABEL, yearLabel } from '../lib/format';

interface ConfirmedScreenProps {
  squad: Squad;
  busy: boolean;
  onEndSession: () => void;
  onRate: () => void;
  onBack: () => void;
  onOpenChat: () => void;
  onReport: (userId: string, reason: string) => Promise<void>;
}

const REPORT_REASONS: { label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: "Didn't show up", icon: 'time-outline' },
  { label: 'Made me uncomfortable', icon: 'sad-outline' },
  { label: 'Inappropriate messages', icon: 'chatbox-ellipses-outline' },
];

// A confirmed (or finished) session: faces revealed, time, place, and what happens next.
export const ConfirmedScreen: React.FC<ConfirmedScreenProps> = ({
  squad,
  busy,
  onEndSession,
  onRate,
  onBack,
  onOpenChat,
  onReport,
}) => {
  const [calendarAdded, setCalendarAdded] = useState(false);
  const [reporting, setReporting] = useState<string | null>(null);
  const [reported, setReported] = useState<Set<string>>(new Set());
  const done = squad.status === 'completed';
  const accepted = squad.members.filter((m) => m.status === 'accepted');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topStatusRow}>
        <View style={styles.confirmedPill}>
          <View style={[styles.greenDot, done && { backgroundColor: THEME.colors.textMuted }]} />
          <Text style={styles.confirmedPillText}>{done ? 'SESSION DONE' : 'SESSION CONFIRMED'}</Text>
        </View>

        <TouchableOpacity style={styles.inlineResetButton} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={14} color={THEME.colors.deepTeal} />
          <Text style={styles.inlineResetText}>My squads</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.headerTextBox}>
        <Text style={styles.headlineText}>{formatWhen(squad.starts_at)}</Text>
        <Text style={styles.subheadText}>
          {done
            ? squad.rated
              ? 'Thanks for rating — it shapes who and where we match you next.'
              : 'How did it go? Your rating shapes your next squad.'
            : `${formatDate(squad.starts_at)} · You're locked in. Your squad is ready.`}
        </Text>
      </View>

      <View style={styles.detailsCard}>
        <View style={styles.cardHeaderStrip}>
          <Text style={styles.cardHeaderTitle}>SESSION DETAILS</Text>
          <View style={styles.podTag}>
            <Text style={styles.podTagText}>{SQUAD_TYPE_LABEL[squad.activity.squad_type]}</Text>
          </View>
        </View>

        <View style={styles.detailItem}>
          <View style={[styles.detailIconBox, { backgroundColor: THEME.colors.deepTealLight }]}>
            <Ionicons name="location" size={18} color={THEME.colors.deepTeal} />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Location</Text>
            <Text style={styles.detailValue}>{squad.venue.name}</Text>
            {squad.venue.detail && <Text style={styles.detailSubtext}>{squad.venue.detail}</Text>}
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailItem}>
          <View style={[styles.detailIconBox, { backgroundColor: THEME.colors.primaryOrangeLight }]}>
            <Ionicons name="time" size={18} color={THEME.colors.primaryOrange} />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValue}>{formatDuration(squad.activity.duration_mins)}</Text>
            <Text style={styles.detailSubtext}>{formatRange(squad.starts_at, squad.ends_at)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailItem}>
          <View style={[styles.detailIconBox, { backgroundColor: '#F0EFFF' }]}>
            <Ionicons name={squad.activity.icon as keyof typeof Ionicons.glyphMap} size={18} color="#6366F1" />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Focus</Text>
            <Text style={styles.detailValue}>{squad.activity.title}</Text>
            {squad.activity.description && (
              <Text style={styles.detailSubtext}>{squad.activity.description}</Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.squadSection}>
        <View style={styles.squadSectionHeader}>
          <Text style={styles.squadSectionTitle}>Your Squad ({accepted.length})</Text>
          <Text style={styles.squadSectionSub}>UNSW verified</Text>
        </View>

        <View style={styles.membersList}>
          {accepted.map((member, index) => (
            <View
              key={member.id ?? index}
              style={[styles.memberCard, member.is_me && styles.userMemberCard]}
            >
              <View style={[styles.memberAvatar, { backgroundColor: member.avatar_color }]}>
                <Text style={styles.memberAvatarInitials}>{member.initials}</Text>
                <View style={styles.verifiedCheckBadge}>
                  <Ionicons name="checkmark" size={9} color="#FFFFFF" />
                </View>
              </View>

              <View style={styles.memberInfo}>
                <View style={styles.memberNameRow}>
                  <Text style={styles.memberNameText}>
                    {member.name} {member.is_me && '(You)'}
                  </Text>
                  <View style={[styles.degreeTag, member.is_me ? styles.degreeTagUser : styles.degreeTagNormal]}>
                    <Text
                      style={[
                        styles.degreeTagText,
                        member.is_me ? styles.degreeTagTextUser : styles.degreeTagTextNormal,
                      ]}
                    >
                      {member.degree_short} · {yearLabel(member.year)} yr
                    </Text>
                  </View>
                </View>
                {member.status_quote && <Text style={styles.memberQuote}>{member.status_quote}</Text>}
                {reporting === member.id && (
                  <View style={styles.reportBox}>
                    {REPORT_REASONS.map((r) => (
                      <TouchableOpacity
                        key={r.label}
                        style={styles.reportChip}
                        onPress={async () => {
                          await onReport(member.id!, r.label);
                          setReported((x) => new Set(x).add(member.id!));
                          setReporting(null);
                        }}
                      >
                        <Ionicons name={r.icon} size={14} color="#B91C1C" />
                        <Text style={styles.reportChipText}>{r.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {member.id && reported.has(member.id) && (
                  <Text style={styles.reportedText}>Reported · you won't be matched again</Text>
                )}
              </View>

              {!member.is_me && member.id && !reported.has(member.id) && (
                <TouchableOpacity
                  style={styles.flagBtn}
                  onPress={() => setReporting(reporting === member.id ? null : member.id)}
                  accessibilityLabel={`Report ${member.name}`}
                >
                  <Ionicons name={reporting === member.id ? 'close' : 'flag-outline'} size={16} color={THEME.colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        <View style={styles.trustBanner}>
          <Text style={styles.trustShield}>🛡️</Text>
          <Text style={styles.trustText}>
            Public campus venue. Everyone is a verified UNSW student. You can only message people in this squad.
          </Text>
        </View>
      </View>

      <View style={styles.bottomActionContainer}>
        <TouchableOpacity style={styles.chatButton} onPress={onOpenChat} activeOpacity={0.85}>
          <Ionicons name="chatbubbles" size={20} color="#FFFFFF" />
          <Text style={styles.calendarButtonText}>Squad chat</Text>
        </TouchableOpacity>

        {!done && (
          <>
            <TouchableOpacity
              style={[styles.calendarButton, calendarAdded && styles.calendarButtonAdded]}
              onPress={() => setCalendarAdded(true)}
              activeOpacity={0.85}
              accessibilityLabel="Add session to calendar"
            >
              <Ionicons name={calendarAdded ? 'checkmark-circle' : 'calendar'} size={20} color="#FFFFFF" />
              <Text style={styles.calendarButtonText}>
                {calendarAdded ? 'Added to Calendar ✓' : 'Add to Calendar'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onEndSession}
              disabled={busy}
              activeOpacity={0.7}
              accessibilityLabel="Demo: mark the session as finished"
            >
              <Ionicons name="play-skip-forward" size={16} color={THEME.colors.deepTeal} />
              <Text style={styles.secondaryButtonText}>Demo: skip to after the session</Text>
            </TouchableOpacity>
          </>
        )}

        {done && !squad.rated && (
          <TouchableOpacity style={styles.calendarButton} onPress={onRate} activeOpacity={0.85}>
            <Ionicons name="star" size={20} color="#FFFFFF" />
            <Text style={styles.calendarButtonText}>Rate this session</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  topStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  confirmedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.successGreenLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: THEME.radii.tag,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: THEME.colors.successGreen,
  },
  confirmedPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.6,
  },
  inlineResetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.cardWhite,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  inlineResetText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.deepTeal,
  },
  headerTextBox: {
    marginBottom: 18,
  },
  headlineText: {
    fontSize: 28,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  subheadText: {
    fontSize: 15,
    color: THEME.colors.textSecondary,
    lineHeight: 22,
    fontWeight: '500',
  },
  detailsCard: {
    backgroundColor: THEME.colors.cardWhite,
    borderRadius: THEME.radii.card,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 22,
    ...THEME.shadows.card,
  },
  cardHeaderStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.8,
  },
  podTag: {
    backgroundColor: THEME.colors.deepTealLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  podTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.deepTeal,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  detailIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 2,
  },
  detailSubtext: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.borderLight,
    marginVertical: 14,
  },
  squadSection: {
    marginBottom: 24,
  },
  squadSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  squadSectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  squadSectionSub: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.deepTeal,
  },
  membersList: {
    gap: 10,
    marginBottom: 14,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.cardWhite,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 12,
    ...THEME.shadows.card,
  },
  userMemberCard: {
    borderColor: '#FED7AA',
    backgroundColor: '#FFFAF6',
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  memberAvatarInitials: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  verifiedCheckBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    backgroundColor: THEME.colors.deepTeal,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  memberNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  degreeTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  degreeTagNormal: {
    backgroundColor: '#F3F4F6',
  },
  degreeTagUser: {
    backgroundColor: THEME.colors.primaryOrangeLight,
  },
  degreeTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  degreeTagTextNormal: {
    color: THEME.colors.textSecondary,
  },
  degreeTagTextUser: {
    color: THEME.colors.primaryOrange,
  },
  memberQuote: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontStyle: 'italic',
  },
  trustBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FA',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D4EEF2',
    gap: 10,
  },
  trustShield: {
    fontSize: 18,
  },
  trustText: {
    flex: 1,
    fontSize: 12,
    color: THEME.colors.deepTealDark,
    lineHeight: 17,
    fontWeight: '600',
  },
  bottomActionContainer: {
    paddingTop: 4,
  },
  calendarButton: {
    height: 58,
    borderRadius: THEME.radii.pill,
    backgroundColor: THEME.colors.primaryOrange,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    ...THEME.shadows.buttonOrange,
  },
  calendarButtonAdded: {
    backgroundColor: THEME.colors.successGreen,
  },
  calendarButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.deepTeal,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: THEME.radii.pill,
    backgroundColor: THEME.colors.deepTeal,
    marginBottom: 12,
    ...THEME.shadows.buttonTeal,
  },
  flagBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  reportBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  reportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.radii.pill,
    backgroundColor: '#FEF2F2',
  },
  reportChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B91C1C',
  },
  reportedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B91C1C',
    marginTop: 6,
  },
});
