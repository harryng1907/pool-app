import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';
import { ActivityEvent } from '../types';

interface DiscoverScreenProps {
  events: ActivityEvent[];
  onImIn: (event: ActivityEvent) => void;
  onNotForMe: () => void;
  currentIndex: number;
}

export const DiscoverScreen: React.FC<DiscoverScreenProps> = ({
  events,
  onImIn,
  onNotForMe,
  currentIndex,
}) => {
  const currentEvent = events[currentIndex % events.length];
  // Calculate displayed count matching spec "2 of 3" (or dynamically based on index)
  const displayCount = `${currentIndex + 1} of ${events.length}`;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Tag banner: ● ACTIVE EVENTS and 2 of 3 count */}
      <View style={styles.bannerRow}>
        <View style={styles.activeBannerPill}>
          <View style={styles.orangeDot} />
          <Text style={styles.activeBannerText}>ACTIVE EVENTS</Text>
        </View>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{displayCount}</Text>
        </View>
      </View>

      {/* Centered Activity Card */}
      <View style={styles.cardWrapper}>
        {/* Subtle stack card behind for deck depth */}
        <View style={styles.stackCardBack} />

        <View style={styles.card}>
          {/* Header badge */}
          <View style={styles.badgeRow}>
            <View style={styles.cohortBadge}>
              <Ionicons name="school" size={13} color={THEME.colors.deepTeal} />
              <Text style={styles.cohortBadgeText}>{currentEvent.badge}</Text>
            </View>
            <View style={styles.verifiedCampusTag}>
              <Ionicons name="checkmark-circle" size={13} color={THEME.colors.successGreen} />
              <Text style={styles.verifiedCampusText}>UNSW Verified</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.cardTitle}>{currentEvent.title}</Text>

          {/* Time & Place */}
          <View style={styles.timePlaceBox}>
            <View style={styles.timePlaceRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="calendar-outline" size={16} color={THEME.colors.primaryOrange} />
              </View>
              <Text style={styles.timePlaceText}>Thursday 2:00 PM</Text>
            </View>

            <View style={styles.timePlaceRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="location-outline" size={16} color={THEME.colors.deepTeal} />
              </View>
              <Text style={styles.timePlaceText}>Law Library L2</Text>
              <Text style={styles.timePlaceDot}>·</Text>
              <Text style={styles.timePlaceDuration}>~3 hrs</Text>
            </View>
          </View>

          {/* Tags */}
          <View style={styles.tagsContainer}>
            {currentEvent.tags.map((tag, idx) => {
              const isSpotTag = tag.includes('spots');
              return (
                <View
                  key={idx}
                  style={[
                    styles.tagPill,
                    isSpotTag ? styles.spotTagPill : styles.regularTagPill,
                  ]}
                >
                  {isSpotTag && (
                    <Ionicons
                      name="people-outline"
                      size={12}
                      color={THEME.colors.primaryOrange}
                      style={{ marginRight: 4 }}
                    />
                  )}
                  <Text
                    style={[
                      styles.tagText,
                      isSpotTag ? styles.spotTagText : styles.regularTagText,
                    ]}
                  >
                    {tag}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Activity Description snippet */}
          {currentEvent.description && (
            <View style={styles.descriptionBox}>
              <Text style={styles.descriptionText}>
                "{currentEvent.description}"
              </Text>
            </View>
          )}

          {/* Subtext */}
          <View style={styles.subtextContainer}>
            <View style={styles.fireIconWrapper}>
              <Ionicons name="flame" size={15} color={THEME.colors.primaryOrange} />
            </View>
            <Text style={styles.subtext}>{currentEvent.subtext}</Text>
          </View>
        </View>
      </View>

      {/* Two bottom action buttons: "Not for me" and "I'm in" */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.notForMeButton}
          onPress={onNotForMe}
          activeOpacity={0.7}
          accessibilityLabel="Not for me, show next event"
        >
          <Ionicons name="close" size={20} color={THEME.colors.grayButtonText} />
          <Text style={styles.notForMeText}>Not for me</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.imInButton}
          onPress={() => onImIn(currentEvent)}
          activeOpacity={0.85}
          accessibilityLabel="I'm in, join this squad"
        >
          <Text style={styles.imInText}>I'm in</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Pro tip hint */}
      <View style={styles.hintContainer}>
        <Text style={styles.hintText}>
          Swipe on things you'd want to do, not on people.
        </Text>
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
    paddingBottom: 24,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  activeBannerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: THEME.colors.cardWhite,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radii.tag,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  orangeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.primaryOrange,
  },
  activeBannerText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.darkNavy,
    letterSpacing: 0.6,
  },
  countPill: {
    backgroundColor: THEME.colors.cardWhite,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radii.tag,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  cardWrapper: {
    position: 'relative',
    marginBottom: 20,
  },
  stackCardBack: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    bottom: -8,
    backgroundColor: '#EAEAE7',
    borderRadius: THEME.radii.card,
    opacity: 0.7,
  },
  card: {
    backgroundColor: THEME.colors.cardWhite,
    borderRadius: THEME.radii.card,
    padding: 22,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cohortBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: THEME.colors.deepTealLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.radii.tag,
  },
  cohortBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.deepTeal,
    letterSpacing: 0.4,
  },
  verifiedCampusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedCampusText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    lineHeight: 31,
    marginBottom: 14,
    letterSpacing: -0.4,
  },
  timePlaceBox: {
    backgroundColor: '#FBFBFA',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    marginBottom: 16,
    gap: 8,
  },
  timePlaceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: THEME.colors.cardWhite,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  timePlaceText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  timePlaceDot: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  timePlaceDuration: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tagPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: THEME.radii.tag,
    flexDirection: 'row',
    alignItems: 'center',
  },
  regularTagPill: {
    backgroundColor: '#F3F4F6',
  },
  spotTagPill: {
    backgroundColor: THEME.colors.primaryOrangeLight,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  regularTagText: {
    color: THEME.colors.darkNavy,
  },
  spotTagText: {
    color: THEME.colors.primaryOrange,
  },
  descriptionBox: {
    backgroundColor: '#F7F8FA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.deepTeal,
  },
  descriptionText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  subtextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
  },
  fireIconWrapper: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtext: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  notForMeButton: {
    flex: 1,
    height: 56,
    borderRadius: THEME.radii.pill,
    backgroundColor: THEME.colors.grayButton,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  notForMeText: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.grayButtonText,
  },
  imInButton: {
    flex: 1.4,
    height: 56,
    borderRadius: THEME.radii.pill,
    backgroundColor: THEME.colors.primaryOrange,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    ...THEME.shadows.buttonOrange,
  },
  imInText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  hintContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  hintText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
