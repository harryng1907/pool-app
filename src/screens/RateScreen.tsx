import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';
import { Squad } from '../types';

interface RateScreenProps {
  squad: Squad;
  busy: boolean;
  onSubmit: (scores: { user_id: string; score: number }[], venueScore: number | null) => void;
  onBack: () => void;
}

const MEMBER_LABELS = ['', 'Not again', 'Probably not', 'Maybe', 'Yes', 'Definitely!'];
const VENUE_LABELS = ['', 'Avoid it', 'Not great', 'Fine', 'Good', 'Perfect spot'];

const Stars: React.FC<{ value: number; onChange: (v: number) => void; labels: string[] }> = ({
  value,
  onChange,
  labels,
}) => (
  <View>
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity key={n} onPress={() => onChange(n)} hitSlop={6} accessibilityLabel={`${n} stars`}>
          <Ionicons
            name={n <= value ? 'star' : 'star-outline'}
            size={30}
            color={n <= value ? THEME.colors.primaryOrange : '#D1D5DB'}
          />
        </TouchableOpacity>
      ))}
    </View>
    <Text style={styles.starLabel}>{value ? labels[value] : ' '}</Text>
  </View>
);

// After the session: "go again?" per person, plus the venue. Feeds the next match.
export const RateScreen: React.FC<RateScreenProps> = ({ squad, busy, onSubmit, onBack }) => {
  const others = squad.members.filter((m) => !m.is_me && m.status === 'accepted' && m.id);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [venueScore, setVenueScore] = useState(0);

  const complete = others.every((m) => scores[m.id!]) && venueScore > 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>How was {squad.activity.title}?</Text>
      <Text style={styles.subtitle}>
        Only you see your ratings. We use them to pick who and where for your next squad.
      </Text>

      <Text style={styles.sectionLabel}>WOULD YOU GO AGAIN WITH…</Text>
      {others.map((m) => (
        <View key={m.id} style={styles.card}>
          <View style={styles.personRow}>
            <View style={[styles.avatar, { backgroundColor: m.avatar_color }]}>
              <Text style={styles.avatarText}>{m.initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{m.name}</Text>
              <Text style={styles.degree}>{m.degree}</Text>
            </View>
          </View>
          <Stars
            value={scores[m.id!] ?? 0}
            onChange={(v) => setScores((s) => ({ ...s, [m.id!]: v }))}
            labels={MEMBER_LABELS}
          />
        </View>
      ))}

      <Text style={styles.sectionLabel}>THE VENUE</Text>
      <View style={styles.card}>
        <View style={styles.personRow}>
          <View style={[styles.avatar, { backgroundColor: THEME.colors.deepTealLight }]}>
            <Ionicons name="location" size={20} color={THEME.colors.deepTeal} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{squad.venue.name}</Text>
            {squad.venue.detail && <Text style={styles.degree}>{squad.venue.detail}</Text>}
          </View>
        </View>
        <Stars value={venueScore} onChange={setVenueScore} labels={VENUE_LABELS} />
      </View>

      <TouchableOpacity
        style={[styles.submit, (!complete || busy) && { opacity: 0.5 }]}
        disabled={!complete || busy}
        onPress={() =>
          onSubmit(
            others.map((m) => ({ user_id: m.id!, score: scores[m.id!] })),
            venueScore || null,
          )
        }
        activeOpacity={0.85}
      >
        {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>Save ratings</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.back} onPress={onBack}>
        <Text style={styles.backText}>Later</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    marginTop: 6,
    lineHeight: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.8,
    marginTop: 22,
    marginBottom: 10,
  },
  card: {
    backgroundColor: THEME.colors.cardWhite,
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  degree: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 1,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  starLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.primaryOrange,
    marginTop: 6,
  },
  submit: {
    height: 56,
    borderRadius: THEME.radii.pill,
    backgroundColor: THEME.colors.primaryOrange,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    ...THEME.shadows.buttonOrange,
  },
  submitText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 17,
  },
  back: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  backText: {
    color: THEME.colors.textSecondary,
    fontWeight: '700',
  },
});
