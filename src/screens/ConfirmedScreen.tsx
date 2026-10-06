import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';
import { SquadMember } from '../types';
import { SESSION_DETAILS } from '../data/mockData';

interface ConfirmedScreenProps {
  members: SquadMember[];
  onResetDemo: () => void;
  onBackToSquads: () => void;
}

export const ConfirmedScreen: React.FC<ConfirmedScreenProps> = ({
  members,
  onResetDemo,
  onBackToSquads,
}) => {
  const [calendarAdded, setCalendarAdded] = useState(false);

  const handleAddToCalendar = () => {
    setCalendarAdded(true);
    Alert.alert(
      'Session added to calendar!',
      'Tuesday 2:00 PM – 5:00 PM @ Law Library L2 with Mei & Tomas.',
      [{ text: 'Great!', style: 'default' }]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Pill Tag: ● SESSION CONFIRMED */}
      <View style={styles.topStatusRow}>
        <View style={styles.confirmedPill}>
          <View style={styles.greenDot} />
          <Text style={styles.confirmedPillText}>SESSION CONFIRMED</Text>
        </View>

        <TouchableOpacity
          style={styles.inlineResetButton}
          onPress={onResetDemo}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh-outline" size={14} color={THEME.colors.deepTeal} />
          <Text style={styles.inlineResetText}>Reset Demo</Text>
        </TouchableOpacity>
      </View>

      {/* Headline & Subhead */}
      <View style={styles.headerTextBox}>
        <Text style={styles.headlineText}>{SESSION_DETAILS.confirmedTime}</Text>
        <Text style={styles.subheadText}>{SESSION_DETAILS.subhead}</Text>
      </View>

      {/* Session Details Card */}
      <View style={styles.detailsCard}>
        <View style={styles.cardHeaderStrip}>
          <Text style={styles.cardHeaderTitle}>SESSION DETAILS</Text>
          <View style={styles.podTag}>
            <Text style={styles.podTagText}>Pod 4B</Text>
          </View>
        </View>

        {/* Location Item */}
        <View style={styles.detailItem}>
          <View style={[styles.detailIconBox, { backgroundColor: THEME.colors.deepTealLight }]}>
            <Ionicons name="location" size={18} color={THEME.colors.deepTeal} />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Location</Text>
            <Text style={styles.detailValue}>{SESSION_DETAILS.location}</Text>
            <Text style={styles.detailSubtext}>{SESSION_DETAILS.locationDetail}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Duration Item */}
        <View style={styles.detailItem}>
          <View style={[styles.detailIconBox, { backgroundColor: THEME.colors.primaryOrangeLight }]}>
            <Ionicons name="time" size={18} color={THEME.colors.primaryOrange} />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValue}>{SESSION_DETAILS.duration}</Text>
            <Text style={styles.detailSubtext}>{SESSION_DETAILS.durationDetail}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Focus Topic Item */}
        <View style={styles.detailItem}>
          <View style={[styles.detailIconBox, { backgroundColor: '#F0EFFF' }]}>
            <Ionicons name="code-slash" size={18} color="#6366F1" />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Focus Topic</Text>
            <Text style={styles.detailValue}>{SESSION_DETAILS.focusTopic}</Text>
            <Text style={styles.detailSubtext}>{SESSION_DETAILS.focusTopicDetail}</Text>
          </View>
        </View>
      </View>

      {/* Your Squad Section */}
      <View style={styles.squadSection}>
        <View style={styles.squadSectionHeader}>
          <Text style={styles.squadSectionTitle}>Your Squad (3)</Text>
          <Text style={styles.squadSectionSub}>UNSW Verified</Text>
        </View>

        <View style={styles.membersList}>
          {members.map((member) => (
            <View
              key={member.id}
              style={[
                styles.memberCard,
                member.isUser && styles.userMemberCard,
              ]}
            >
              <View style={[styles.memberAvatar, { backgroundColor: member.avatarColor }]}>
                <Text style={styles.memberAvatarInitials}>{member.initials}</Text>
                {member.verifiedStudent && (
                  <View style={styles.verifiedCheckBadge}>
                    <Ionicons name="checkmark" size={9} color="#FFFFFF" />
                  </View>
                )}
              </View>

              <View style={styles.memberInfo}>
                <View style={styles.memberNameRow}>
                  <Text style={styles.memberNameText}>
                    {member.name} {member.isUser && '(You)'}
                  </Text>
                  <View
                    style={[
                      styles.degreeTag,
                      member.isUser ? styles.degreeTagUser : styles.degreeTagNormal,
                    ]}
                  >
                    <Text
                      style={[
                        styles.degreeTagText,
                        member.isUser ? styles.degreeTagTextUser : styles.degreeTagTextNormal,
                      ]}
                    >
                      {member.degree}
                    </Text>
                  </View>
                </View>
                <Text style={styles.memberQuote}>{member.statusQuote}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Trust Banner: 🛡️ Public campus venue. Everyone is an active, verified UNSW student. */}
        <View style={styles.trustBanner}>
          <Text style={styles.trustShield}>🛡️</Text>
          <Text style={styles.trustText}>{SESSION_DETAILS.trustBanner}</Text>
        </View>
      </View>

      {/* Bottom Action: Orange button "Add to Calendar" */}
      <View style={styles.bottomActionContainer}>
        <TouchableOpacity
          style={[
            styles.calendarButton,
            calendarAdded && styles.calendarButtonAdded,
          ]}
          onPress={handleAddToCalendar}
          activeOpacity={0.85}
          accessibilityLabel="Add session to calendar"
        >
          <Ionicons
            name={calendarAdded ? 'checkmark-circle' : 'calendar'}
            size={20}
            color="#FFFFFF"
          />
          <Text style={styles.calendarButtonText}>
            {calendarAdded ? 'Added to Calendar ✓' : 'Add to Calendar'}
          </Text>
        </TouchableOpacity>
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
});
