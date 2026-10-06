import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';
import { SquadMember, MatchReason } from '../types';

interface SquadsScreenProps {
  members: SquadMember[];
  reasons: MatchReason[];
  onLooksGood: () => void;
  onExploreMore?: () => void;
}

export const SquadsScreen: React.FC<SquadsScreenProps> = ({
  members,
  reasons,
  onLooksGood,
  onExploreMore,
}) => {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Header Text */}
      <View style={styles.heroSection}>
        <View style={styles.squadReadyPill}>
          <View style={styles.greenDot} />
          <Text style={styles.squadReadyPillText}>SQUAD FORMED</Text>
        </View>
        <Text style={styles.heroTitle}>Your squad is ready</Text>
        <Text style={styles.heroSubtitle}>
          We matched you with 2 fellow students who share your schedule and study style.
        </Text>
      </View>

      {/* Avatars Row: 3 overlapping circles with badges */}
      <View style={styles.avatarsCard}>
        <View style={styles.overlapRow}>
          {members.map((member, index) => {
            return (
              <View
                key={member.id}
                style={[
                  styles.avatarWrapper,
                  index > 0 && styles.avatarOverlap,
                  { zIndex: 10 - index },
                ]}
              >
                <View
                  style={[
                    styles.avatarCircle,
                    { backgroundColor: member.avatarColor },
                  ]}
                >
                  <Text style={styles.avatarInitialsText}>{member.initials}</Text>
                  {member.isUser && (
                    <View style={styles.youIndicator}>
                      <Ionicons name="star" size={10} color="#FFFFFF" />
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Badges for each member: Mei (CS · 1st yr), Tomas (ENG · 1st yr), Maya (YOU) */}
        <View style={styles.memberBadgesRow}>
          {members.map((member) => (
            <View
              key={member.id}
              style={[
                styles.memberBadgeBox,
                member.isUser && styles.memberBadgeBoxUser,
              ]}
            >
              <View style={styles.memberBadgeHeader}>
                <Text style={styles.memberName}>{member.name}</Text>
                {member.verifiedStudent && (
                  <Ionicons name="checkmark-circle" size={12} color={THEME.colors.deepTeal} />
                )}
              </View>
              <View
                style={[
                  styles.roleTag,
                  member.isUser ? styles.roleTagUser : styles.roleTagNormal,
                ]}
              >
                <Text
                  style={[
                    styles.roleTagText,
                    member.isUser ? styles.roleTagTextUser : styles.roleTagTextNormal,
                  ]}
                >
                  {member.role}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* "Why You Matched" Card (98% Fit badge) */}
      <View style={styles.matchCard}>
        <View style={styles.matchHeader}>
          <View style={styles.matchHeaderTitleRow}>
            <Ionicons name="sparkles" size={18} color={THEME.colors.primaryOrange} />
            <Text style={styles.matchCardTitle}>Why You Matched</Text>
          </View>
          <View style={styles.fitBadge}>
            <Text style={styles.fitBadgeText}>98% Fit</Text>
          </View>
        </View>

        <View style={styles.reasonsList}>
          {reasons.map((reason) => (
            <View key={reason.id} style={styles.reasonItem}>
              <View style={styles.checkCircle}>
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              </View>
              <Text style={styles.reasonText}>{reason.text}</Text>
            </View>
          ))}
        </View>

        {/* Location hint: 📍 Main Library, Level 4 Pod (SUGGESTED) */}
        <View style={styles.locationHintBox}>
          <View style={styles.locationIconWrapper}>
            <Ionicons name="location" size={16} color={THEME.colors.deepTeal} />
          </View>
          <View style={styles.locationTextWrapper}>
            <Text style={styles.locationHintTitle}>SUGGESTED VENUE</Text>
            <Text style={styles.locationHintDetail}>
              Main Library, Level 4 Pod
            </Text>
          </View>
        </View>
      </View>

      {/* Bottom CTA: Large orange button "Looks good" with celebration icon */}
      <View style={styles.ctaContainer}>
        <TouchableOpacity
          style={styles.looksGoodButton}
          onPress={onLooksGood}
          activeOpacity={0.85}
          accessibilityLabel="Looks good, confirm this squad"
        >
          <Text style={styles.looksGoodText}>Looks good</Text>
          <Text style={styles.celebrationEmoji}>🎉</Text>
        </TouchableOpacity>

        {onExploreMore && (
          <TouchableOpacity
            style={styles.exploreMoreButton}
            onPress={onExploreMore}
            activeOpacity={0.7}
          >
            <Text style={styles.exploreMoreText}>Back to Discover</Text>
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
    paddingBottom: 28,
  },
  heroSection: {
    marginBottom: 20,
  },
  squadReadyPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.successGreenLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radii.tag,
    marginBottom: 10,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.successGreen,
  },
  squadReadyPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    lineHeight: 21,
  },
  avatarsCard: {
    backgroundColor: THEME.colors.cardWhite,
    borderRadius: THEME.radii.card,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    marginBottom: 18,
    ...THEME.shadows.card,
  },
  overlapRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    paddingVertical: 6,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarOverlap: {
    marginLeft: -16,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: THEME.colors.cardWhite,
    alignItems: 'center',
    justifyContent: 'center',
    ...THEME.shadows.card,
  },
  avatarInitialsText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  youIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: THEME.colors.darkNavy,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  memberBadgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
  },
  memberBadgeBox: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  memberBadgeBoxUser: {
    backgroundColor: THEME.colors.primaryOrangeLight,
    borderColor: '#FED7AA',
  },
  memberBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 4,
  },
  memberName: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  roleTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roleTagNormal: {
    backgroundColor: '#EAEAEA',
  },
  roleTagUser: {
    backgroundColor: THEME.colors.primaryOrange,
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  roleTagTextNormal: {
    color: THEME.colors.textSecondary,
  },
  roleTagTextUser: {
    color: '#FFFFFF',
  },
  matchCard: {
    backgroundColor: THEME.colors.cardWhite,
    borderRadius: THEME.radii.card,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 20,
    ...THEME.shadows.card,
  },
  matchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderLight,
  },
  matchHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  matchCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    letterSpacing: -0.3,
  },
  fitBadge: {
    backgroundColor: THEME.colors.primaryOrangeLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: THEME.radii.tag,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  fitBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.primaryOrange,
  },
  reasonsList: {
    gap: 14,
    marginBottom: 16,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: THEME.colors.deepTeal,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  reasonText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: THEME.colors.textPrimary,
    fontWeight: '500',
  },
  locationHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: THEME.colors.deepTealLight,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CFE7EA',
  },
  locationIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.cardWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationTextWrapper: {
    flex: 1,
  },
  locationHintTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.deepTeal,
    letterSpacing: 0.5,
  },
  locationHintDetail: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.darkNavy,
    marginTop: 1,
  },
  ctaContainer: {
    gap: 10,
  },
  looksGoodButton: {
    height: 58,
    borderRadius: THEME.radii.pill,
    backgroundColor: THEME.colors.primaryOrange,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    ...THEME.shadows.buttonOrange,
  },
  looksGoodText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  celebrationEmoji: {
    fontSize: 20,
  },
  exploreMoreButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  exploreMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
});
