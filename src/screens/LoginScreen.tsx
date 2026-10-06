import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';
import { DEMO_ACCOUNTS, signInDemo } from '../lib/api';

// Demo sign-in. Accounts are real Supabase users; sign-up is restricted to UNSW emails in the database.
export const LoginScreen: React.FC = () => {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const signIn = async (email: string) => {
    setPending(email);
    setError(null);
    try {
      await signInDemo(email);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign in');
      setPending(null);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Image source={require('../../assets/logo_dark.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>Make the first move{'\n'}without making it.</Text>
      <Text style={styles.subtitle}>
        Swipe on things you'd want to do. We'll put you in a squad of 2–4 UNSW students with a time and a place.
      </Text>

      <View style={styles.pillsRow}>
        <View style={styles.pill}>
          <Ionicons name="shield-checkmark" size={14} color={THEME.colors.deepTeal} />
          <Text style={styles.pillText}>UNSW only</Text>
        </View>
        <View style={styles.pill}>
          <Ionicons name="eye-off" size={14} color={THEME.colors.deepTeal} />
          <Text style={styles.pillText}>No profile browsing</Text>
        </View>
        <View style={styles.pill}>
          <Ionicons name="location" size={14} color={THEME.colors.deepTeal} />
          <Text style={styles.pillText}>Public venues</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>CONTINUE AS A DEMO STUDENT</Text>
      {DEMO_ACCOUNTS.map((account) => (
        <TouchableOpacity
          key={account.email}
          style={styles.accountRow}
          onPress={() => signIn(account.email)}
          disabled={pending !== null}
          activeOpacity={0.8}
        >
          <View style={[styles.avatar, { backgroundColor: account.color }]}>
            <Text style={styles.avatarText}>{account.initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.accountName}>{account.name}</Text>
            <Text style={styles.accountBlurb}>{account.blurb}</Text>
          </View>
          {pending === account.email ? (
            <ActivityIndicator color={THEME.colors.primaryOrange} />
          ) : (
            <Ionicons name="arrow-forward" size={20} color={THEME.colors.textMuted} />
          )}
        </TouchableOpacity>
      ))}

      {error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.footnote}>
        Real sign-up uses your UNSW email (zID@ad.unsw.edu.au). Other domains are rejected by the database.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  content: {
    padding: 24,
    paddingTop: 40,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  logo: {
    width: 110,
    height: 40,
    marginBottom: 28,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    letterSpacing: -0.6,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 15,
    color: THEME.colors.textSecondary,
    lineHeight: 22,
    marginTop: 12,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 18,
    marginBottom: 32,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: THEME.colors.deepTealLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.radii.tag,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.deepTeal,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: THEME.colors.cardWhite,
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  accountBlurb: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  error: {
    color: '#DC2626',
    fontSize: 13,
    marginTop: 8,
  },
  footnote: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 20,
    lineHeight: 17,
  },
});
