import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';

interface ProfileScreenProps {
  onResetDemo: () => void;
  onNavigateToScreen: (screen: 'discover' | 'squads' | 'confirmed') => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onResetDemo,
  onNavigateToScreen,
}) => {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Student Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.profileHeaderRow}>
          <View style={styles.avatarBig}>
            <Text style={styles.avatarBigText}>MY</Text>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark" size={12} color="#FFFFFF" />
            </View>
          </View>
          <View style={styles.profileNameBox}>
            <View style={styles.nameRow}>
              <Text style={styles.studentName}>Maya Lin</Text>
              <View style={styles.unswTag}>
                <Text style={styles.unswTagText}>UNSW</Text>
              </View>
            </View>
            <Text style={styles.degreeText}>Computer Science (1st Year)</Text>
            <Text style={styles.zidText}>zID: z5348821 · Active Student</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>3</Text>
            <Text style={styles.statLabel}>Squads Done</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>98%</Text>
            <Text style={styles.statLabel}>Avg Fit</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>12 hrs</Text>
            <Text style={styles.statLabel}>Focus Time</Text>
          </View>
        </View>
      </View>

      {/* Preferences Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Study Preferences</Text>

        <View style={styles.prefItem}>
          <View style={styles.prefIconBox}>
            <Ionicons name="timer-outline" size={18} color={THEME.colors.deepTeal} />
          </View>
          <View style={styles.prefContent}>
            <Text style={styles.prefLabel}>STUDY RHYTHM</Text>
            <Text style={styles.prefValue}>Pomodoro 50/10 Focus Intervals</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.prefItem}>
          <View style={styles.prefIconBox}>
            <Ionicons name="volume-mute-outline" size={18} color={THEME.colors.deepTeal} />
          </View>
          <View style={styles.prefContent}>
            <Text style={styles.prefLabel}>ENVIRONMENT</Text>
            <Text style={styles.prefValue}>Quiet focused study / Silent sprint</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.prefItem}>
          <View style={styles.prefIconBox}>
            <Ionicons name="book-outline" size={18} color={THEME.colors.deepTeal} />
          </View>
          <View style={styles.prefContent}>
            <Text style={styles.prefLabel}>CURRENT COURSES</Text>
            <Text style={styles.prefValue}>COMP1511, MATH1081, DESN1000</Text>
          </View>
        </View>
      </View>

      {/* Hackathon Pitch Demo Helper */}
      <View style={styles.demoCard}>
        <View style={styles.demoCardHeader}>
          <View style={styles.demoBadge}>
            <Text style={styles.demoBadgeText}>DEMO SHORTCUTS</Text>
          </View>
          <Image
            source={require('../../assets/logo_dark.png')}
            style={styles.demoLogo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.demoTitle}>Hackathon Pitch Controls</Text>
        <Text style={styles.demoSubtitle}>
          Jump directly to any screen in the 3-screen presentation flow:
        </Text>

        <View style={styles.shortcutButtons}>
          <TouchableOpacity
            style={styles.shortcutBtn}
            onPress={() => onNavigateToScreen('discover')}
            activeOpacity={0.7}
          >
            <Ionicons name="compass" size={16} color={THEME.colors.deepTeal} />
            <Text style={styles.shortcutBtnText}>1. Discover</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutBtn}
            onPress={() => onNavigateToScreen('squads')}
            activeOpacity={0.7}
          >
            <Ionicons name="people" size={16} color={THEME.colors.primaryOrange} />
            <Text style={styles.shortcutBtnText}>2. Squad Ready</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutBtn}
            onPress={() => onNavigateToScreen('confirmed')}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark-done" size={16} color={THEME.colors.successGreen} />
            <Text style={styles.shortcutBtnText}>3. Confirmed</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.resetFullBtn}
          onPress={onResetDemo}
          activeOpacity={0.8}
        >
          <Ionicons name="reload" size={16} color="#FFFFFF" />
          <Text style={styles.resetFullBtnText}>Reset to Start of Pitch</Text>
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
  profileCard: {
    backgroundColor: THEME.colors.cardWhite,
    borderRadius: THEME.radii.card,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 18,
    ...THEME.shadows.card,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 18,
  },
  avatarBig: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.colors.primaryOrange,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...THEME.shadows.buttonOrange,
  },
  avatarBigText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: THEME.colors.deepTeal,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileNameBox: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  studentName: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  unswTag: {
    backgroundColor: THEME.colors.unswYellow,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unswTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.darkNavy,
  },
  degreeText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    marginBottom: 2,
  },
  zidText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F9F9F8',
    borderRadius: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.darkNavy,
  },
  statLabel: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: THEME.colors.border,
  },
  card: {
    backgroundColor: THEME.colors.cardWhite,
    borderRadius: THEME.radii.card,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 18,
    ...THEME.shadows.card,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 16,
  },
  prefItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  prefIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: THEME.colors.deepTealLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefContent: {
    flex: 1,
  },
  prefLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  prefValue: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.borderLight,
    marginVertical: 12,
  },
  demoCard: {
    backgroundColor: '#0E1726',
    borderRadius: THEME.radii.card,
    padding: 20,
    marginBottom: 16,
  },
  demoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  demoBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  demoBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F57C2A',
    letterSpacing: 0.8,
  },
  demoLogo: {
    width: 26,
    height: 26,
  },
  demoTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  demoSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 14,
    lineHeight: 17,
  },
  shortcutButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  shortcutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  shortcutBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  resetFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: THEME.colors.primaryOrange,
    paddingVertical: 12,
    borderRadius: THEME.radii.pill,
  },
  resetFullBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
