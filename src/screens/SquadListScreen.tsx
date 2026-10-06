import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';
import { Squad } from '../types';
import { formatDate, formatWhen } from '../lib/format';

interface SquadListScreenProps {
  squads: Squad[];
  loading: boolean;
  onOpen: (squad: Squad) => void;
  onDiscover: () => void;
}

type IconName = keyof typeof Ionicons.glyphMap;

function statusOf(squad: Squad): { label: string; color: string; bg: string; icon: IconName } {
  if (squad.status === 'proposed' && squad.my_status === 'invited')
    return { label: 'Needs your OK', color: THEME.colors.primaryOrange, bg: THEME.colors.primaryOrangeLight, icon: 'alert-circle' };
  if (squad.status === 'proposed')
    return { label: 'Waiting on others', color: THEME.colors.textSecondary, bg: '#F3F4F6', icon: 'hourglass-outline' };
  if (squad.status === 'confirmed')
    return { label: 'Confirmed', color: THEME.colors.successGreen, bg: THEME.colors.successGreenLight, icon: 'checkmark-circle' };
  if (!squad.rated)
    return { label: 'Rate it', color: THEME.colors.primaryOrange, bg: THEME.colors.primaryOrangeLight, icon: 'star' };
  return { label: 'Done', color: THEME.colors.textMuted, bg: '#F3F4F6', icon: 'checkmark-done' };
}

export const SquadListScreen: React.FC<SquadListScreenProps> = ({ squads, loading, onOpen, onDiscover }) => {
  if (loading && squads.length === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={THEME.colors.primaryOrange} />
      </View>
    );
  }

  if (squads.length === 0) {
    return (
      <View style={[styles.container, styles.center, { padding: 32 }]}>
        <Ionicons name="people-circle-outline" size={56} color={THEME.colors.textMuted} />
        <Text style={styles.emptyTitle}>No squads yet</Text>
        <Text style={styles.emptySub}>Say "I'm in" to something on Discover and we'll build your squad.</Text>
        <TouchableOpacity style={styles.cta} onPress={onDiscover} activeOpacity={0.85}>
          <Ionicons name="compass" size={18} color="#FFFFFF" />
          <Text style={styles.ctaText}>Go to Discover</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {squads.map((squad) => {
        const s = statusOf(squad);
        const others = squad.members.filter((m) => !m.is_me);
        return (
          <TouchableOpacity key={squad.id} style={styles.card} onPress={() => onOpen(squad)} activeOpacity={0.85}>
            <View style={styles.iconBox}>
              <Ionicons name={squad.activity.icon as IconName} size={22} color={THEME.colors.primaryOrange} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>{squad.activity.title}</Text>
              <View style={styles.metaRow}>
                <Ionicons name="calendar-outline" size={13} color={THEME.colors.textSecondary} />
                <Text style={styles.meta}>
                  {formatDate(squad.starts_at)} · {formatWhen(squad.starts_at).split(' ').slice(1).join(' ')}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={13} color={THEME.colors.textSecondary} />
                <Text style={styles.meta} numberOfLines={1}>{squad.venue.name}</Text>
              </View>
              <View style={styles.bottomRow}>
                <View style={styles.faces}>
                  {others.map((m, i) => (
                    <View
                      key={m.id ?? i}
                      style={[styles.face, { backgroundColor: m.avatar_color, marginLeft: i ? -8 : 0 }]}
                    >
                      {m.hidden ? (
                        <Ionicons name="eye-off" size={11} color="#FFFFFF" />
                      ) : (
                        <Text style={styles.faceText}>{m.initials}</Text>
                      )}
                    </View>
                  ))}
                </View>
                <View style={[styles.status, { backgroundColor: s.bg }]}>
                  <Ionicons name={s.icon} size={12} color={s.color} />
                  <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: THEME.colors.cardWhite,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: THEME.colors.primaryOrangeLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  meta: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    flexShrink: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  faces: {
    flexDirection: 'row',
  },
  face: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  faceText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: THEME.radii.tag,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginTop: 8,
  },
  emptySub: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
    backgroundColor: THEME.colors.primaryOrange,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: THEME.radii.pill,
  },
  ctaText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
});
