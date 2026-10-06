import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';
import { ActivityCard, Nudge, SquadType } from '../types';
import { formatDuration, formatWhen, SQUAD_TYPE_LABEL } from '../lib/format';

type IconName = keyof typeof Ionicons.glyphMap;

const TYPE_ICON: Record<ActivityCard['squad_type'], IconName> = {
  deadline: 'hourglass-outline',
  hobby: 'sparkles',
  career: 'trending-up',
};

// "Pick what kind of squad you want" — filter chips on top of the deck.
const FILTERS: { key: 'all' | SquadType; label: string; icon: IconName }[] = [
  { key: 'all', label: 'All', icon: 'apps' },
  { key: 'deadline', label: 'Study', icon: 'hourglass-outline' },
  { key: 'hobby', label: 'Hobby', icon: 'sparkles' },
  { key: 'career', label: 'Career', icon: 'trending-up' },
];

const SWIPE_DISTANCE = 110;

// Fri–Sun in Sydney → "Weekend's here"
const isWeekend = () => {
  const day = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', weekday: 'short' }).format(new Date());
  return ['Fri', 'Sat', 'Sun'].includes(day);
};

const CATEGORY_PLACE: Record<ActivityCard['category'], string> = {
  quiet: 'Quiet study spot',
  social: 'Social campus spot',
  active: 'Sports centre',
  maker: 'Makerspace',
  food: 'Campus café',
};

interface DiscoverScreenProps {
  cards: ActivityCard[];
  loading: boolean;
  busy: boolean;
  notice: string | null;
  nudges: Nudge[];
  onImIn: (card: ActivityCard) => void;
  onNotForMe: (card: ActivityCard) => void;
  onRebook: (nudge: Nudge) => void;
  onRefresh: () => void;
}

export const DiscoverScreen: React.FC<DiscoverScreenProps> = ({
  cards,
  loading,
  busy,
  notice,
  nudges,
  onImIn,
  onNotForMe,
  onRebook,
  onRefresh,
}) => {
  const [filter, setFilter] = useState<'all' | SquadType>('all');
  const visible = filter === 'all' ? cards : cards.filter((c) => c.squad_type === filter);
  const card = visible[0];
  const nudge = nudges[0];

  // Drag the card: right = I'm in, left = Not for me.
  const pan = useRef(new Animated.Value(0)).current;
  const latest = useRef({ card, busy, onImIn, onNotForMe });
  latest.current = { card, busy, onImIn, onNotForMe };

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        !latest.current.busy && Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_, g) => pan.setValue(g.dx),
      onPanResponderRelease: (_, g) => {
        const { card: c, onImIn: yes, onNotForMe: no } = latest.current;
        if (c && Math.abs(g.dx) > SWIPE_DISTANCE) {
          const right = g.dx > 0;
          Animated.timing(pan, { toValue: right ? 600 : -600, duration: 180, useNativeDriver: false }).start(() =>
            right ? yes(c) : no(c),
          );
        } else {
          Animated.spring(pan, { toValue: 0, useNativeDriver: false }).start();
        }
      },
      onPanResponderTerminate: () => Animated.spring(pan, { toValue: 0, useNativeDriver: false }).start(),
    }),
  ).current;

  // New top card (or a failed swipe) → snap back to the middle.
  useEffect(() => {
    if (!busy) pan.setValue(0);
  }, [card?.id, busy, pan]);

  const rotate = pan.interpolate({ inputRange: [-300, 0, 300], outputRange: ['-12deg', '0deg', '12deg'] });
  const inOpacity = pan.interpolate({ inputRange: [0, SWIPE_DISTANCE], outputRange: [0, 1], extrapolate: 'clamp' });
  const nopeOpacity = pan.interpolate({ inputRange: [-SWIPE_DISTANCE, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* "Go again?" — built from your past ratings */}
      {nudge && (
        <TouchableOpacity
          style={styles.nudgeCard}
          onPress={() => onRebook(nudge)}
          activeOpacity={0.85}
          disabled={busy}
          accessibilityLabel={`Book again with ${nudge.names.join(', ')}`}
        >
          <View style={styles.nudgeIcon}>
            <Ionicons name="repeat" size={20} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.nudgeTitle}>
              {isWeekend() ? "Weekend's here! " : ''}Go again with {nudge.names.join(' & ')}?
            </Text>
            <Text style={styles.nudgeSub}>
              You rated them {nudge.top_score}★ after {nudge.activity_title}
              {nudge.venue_score != null && nudge.venue_score <= 2 && nudge.venue_name
                ? ` · we'll skip ${nudge.venue_name}`
                : ''}
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color={THEME.colors.deepTeal} />
        </TouchableOpacity>
      )}

      {notice && (
        <View style={styles.noticeBox}>
          <Ionicons name="information-circle" size={18} color={THEME.colors.deepTeal} />
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      )}

      <View style={styles.bannerRow}>
        <View style={styles.filterRow}>
          {FILTERS.map((ft) => {
            const on = filter === ft.key;
            return (
              <TouchableOpacity
                key={ft.key}
                style={[styles.filterChip, on && styles.filterChipOn]}
                onPress={() => setFilter(ft.key)}
                accessibilityLabel={`Show ${ft.label} activities`}
              >
                <Ionicons name={ft.icon} size={14} color={on ? '#FFFFFF' : THEME.colors.deepTeal} />
                <Text style={[styles.filterText, on && { color: '#FFFFFF' }]}>{ft.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {loading && !card ? (
        <View style={styles.emptyCard}>
          <ActivityIndicator color={THEME.colors.primaryOrange} />
        </View>
      ) : !card && cards.length > 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name={FILTERS.find((x) => x.key === filter)!.icon} size={40} color={THEME.colors.textMuted} />
          <Text style={styles.emptyTitle}>Nothing here right now</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={() => setFilter('all')} activeOpacity={0.8}>
            <Ionicons name="apps" size={16} color={THEME.colors.deepTeal} />
            <Text style={styles.refreshText}>Show all</Text>
          </TouchableOpacity>
        </View>
      ) : !card ? (
        <View style={styles.emptyCard}>
          <Ionicons name="checkmark-done-circle" size={44} color={THEME.colors.deepTeal} />
          <Text style={styles.emptyTitle}>You've seen everything</Text>
          <Text style={styles.emptySub}>New sessions get added every week. Check your squads in the meantime.</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} activeOpacity={0.8}>
            <Ionicons name="refresh" size={16} color={THEME.colors.deepTeal} />
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.cardWrapper}>
            {visible.length > 1 && <View style={styles.stackCardBack} />}

            <Animated.View
              style={[styles.card, { transform: [{ translateX: pan }, { rotate }] }]}
              {...responder.panHandlers}
            >
              <Animated.View style={[styles.stamp, styles.stampIn, { opacity: inOpacity }]} pointerEvents="none">
                <Ionicons name="checkmark-circle" size={20} color={THEME.colors.successGreen} />
                <Text style={[styles.stampText, { color: THEME.colors.successGreen }]}>I'M IN</Text>
              </Animated.View>
              <Animated.View style={[styles.stamp, styles.stampNope, { opacity: nopeOpacity }]} pointerEvents="none">
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                <Text style={[styles.stampText, { color: '#6B7280' }]}>NOT FOR ME</Text>
              </Animated.View>

              <View style={styles.badgeRow}>
                <View style={styles.cohortBadge}>
                  <Ionicons
                    name={card.course ? 'school' : TYPE_ICON[card.squad_type]}
                    size={13}
                    color={THEME.colors.deepTeal}
                  />
                  <Text style={styles.cohortBadgeText}>
                    {(card.course ?? SQUAD_TYPE_LABEL[card.squad_type]).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.verifiedCampusTag}>
                  <Ionicons
                    name={card.kind === 'session' ? 'radio-button-on' : 'sparkles'}
                    size={13}
                    color={card.kind === 'session' ? THEME.colors.successGreen : THEME.colors.primaryOrange}
                  />
                  <Text style={styles.verifiedCampusText}>
                    {card.kind === 'session' ? 'Real session' : 'AI picks the time'}
                  </Text>
                </View>
              </View>

              <View style={styles.titleRow}>
                <View style={styles.cardIcon}>
                  <Ionicons name={card.icon as IconName} size={26} color={THEME.colors.primaryOrange} />
                </View>
                <Text style={styles.cardTitle}>{card.title}</Text>
              </View>

              <View style={styles.timePlaceBox}>
                <View style={styles.timePlaceRow}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="calendar-outline" size={16} color={THEME.colors.primaryOrange} />
                  </View>
                  <Text style={styles.timePlaceText}>
                    {card.starts_at ? formatWhen(card.starts_at) : 'When your squad is all free'}
                  </Text>
                </View>

                <View style={styles.timePlaceRow}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="location-outline" size={16} color={THEME.colors.deepTeal} />
                  </View>
                  <Text style={styles.timePlaceText} numberOfLines={1}>
                    {card.venue?.name ?? CATEGORY_PLACE[card.category]}
                  </Text>
                  <Text style={styles.timePlaceDot}>·</Text>
                  <Text style={styles.timePlaceDuration}>{formatDuration(card.duration_mins)}</Text>
                </View>
              </View>

              <View style={styles.tagsContainer}>
                {card.tags
                  .filter((t) => t !== card.course)
                  .map((tag) => (
                    <View key={tag} style={[styles.tagPill, styles.regularTagPill]}>
                      <Text style={[styles.tagText, styles.regularTagText]}>{tag}</Text>
                    </View>
                  ))}
                {card.spots_left != null && (
                  <View style={[styles.tagPill, styles.spotTagPill]}>
                    <Ionicons
                      name="people-outline"
                      size={12}
                      color={THEME.colors.primaryOrange}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.tagText, styles.spotTagText]}>
                      {card.spots_left} {card.spots_left === 1 ? 'spot' : 'spots'} open
                    </Text>
                  </View>
                )}
              </View>

              {card.description && (
                <View style={styles.descriptionBox}>
                  <Text style={styles.descriptionText}>{card.description}</Text>
                </View>
              )}

              <View style={styles.subtextContainer}>
                <View style={styles.fireIconWrapper}>
                  <Ionicons name="flame" size={15} color={THEME.colors.primaryOrange} />
                </View>
                <Text style={styles.subtext}>
                  {card.interested_count === 0
                    ? 'Be the first to say yes'
                    : `${card.interested_count} student${card.interested_count === 1 ? '' : 's'} said "I'm in"`}
                </Text>
              </View>
            </Animated.View>
          </View>

          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.notForMeButton, busy && styles.disabled]}
              onPress={() => onNotForMe(card)}
              disabled={busy}
              activeOpacity={0.7}
              accessibilityLabel="Not for me, show next activity"
            >
              <Ionicons name="close" size={20} color={THEME.colors.grayButtonText} />
              <Text style={styles.notForMeText}>Not for me</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.imInButton, busy && styles.disabled]}
              onPress={() => onImIn(card)}
              disabled={busy}
              activeOpacity={0.85}
              accessibilityLabel="I'm in, find me a squad"
            >
              <Text style={styles.imInText}>I'm in</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </>
      )}

      <View style={styles.hintContainer}>
        <Text style={styles.hintText}>
          ← Not for me · swipe · I'm in →{'\n'}Things you'd do, not people.
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
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    lineHeight: 28,
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
  disabled: {
    opacity: 0.5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: THEME.colors.primaryOrangeLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nudgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: THEME.colors.deepTealLight,
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#CDE5E9',
  },
  nudgeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.deepTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nudgeTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.deepTealDark,
  },
  nudgeSub: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME.colors.cardWhite,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
  },
  emptyCard: {
    backgroundColor: THEME.colors.cardWhite,
    borderRadius: THEME.radii.card,
    padding: 32,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 20,
    minHeight: 260,
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  emptySub: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: THEME.radii.pill,
    backgroundColor: THEME.colors.deepTealLight,
  },
  refreshText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.deepTeal,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    flexShrink: 1,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: THEME.radii.pill,
    backgroundColor: THEME.colors.cardWhite,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  filterChipOn: {
    backgroundColor: THEME.colors.deepTeal,
    borderColor: THEME.colors.deepTeal,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.deepTeal,
  },
  stamp: {
    position: 'absolute',
    top: 18,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 2,
    backgroundColor: '#FFFFFFEE',
  },
  stampIn: {
    left: 18,
    borderColor: THEME.colors.successGreen,
    transform: [{ rotate: '-8deg' }],
  },
  stampNope: {
    right: 18,
    borderColor: '#9CA3AF',
    transform: [{ rotate: '8deg' }],
  },
  stampText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
