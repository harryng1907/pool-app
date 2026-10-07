import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';
import { ActivityInput, Category, SquadType } from '../types';
import { INTERESTS } from '../lib/catalog';

type IconName = keyof typeof Ionicons.glyphMap;

interface SuggestScreenProps {
  busy: boolean;
  onSubmit: (input: ActivityInput) => void;
}

const ICONS: IconName[] = [
  'cafe', 'ice-cream', 'book', 'laptop', 'code-slash', 'calculator',
  'basketball', 'tennisball', 'walk', 'bicycle', 'musical-notes', 'mic',
  'game-controller', 'dice', 'film', 'camera', 'brush', 'restaurant',
  'sunny', 'leaf', 'briefcase', 'bulb', 'rocket', 'sparkles',
];

const TYPES: { key: SquadType; label: string; icon: IconName }[] = [
  { key: 'deadline', label: 'Study', icon: 'hourglass-outline' },
  { key: 'hobby', label: 'Hobby', icon: 'sparkles' },
  { key: 'career', label: 'Career', icon: 'trending-up' },
];

const PLACES: { key: Category; label: string; icon: IconName }[] = [
  { key: 'quiet', label: 'Quiet', icon: 'library' },
  { key: 'food', label: 'Café', icon: 'cafe' },
  { key: 'social', label: 'Social', icon: 'people' },
  { key: 'active', label: 'Sport', icon: 'football' },
  { key: 'maker', label: 'Make', icon: 'construct' },
];

const DURATIONS = [60, 90, 120, 180];

// Suggest an activity. Nobody "hosts": it becomes a card, and the matcher builds the squad.
export const SuggestScreen: React.FC<SuggestScreenProps> = ({ busy, onSubmit }) => {
  const [icon, setIcon] = useState<IconName>('cafe');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<SquadType>('hobby');
  const [place, setPlace] = useState<Category>('food');
  const [duration, setDuration] = useState(90);
  const [course, setCourse] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const valid = title.trim().length >= 4 && (!course.trim() || /^[A-Za-z]{4}\s?\d{4}$/.test(course.trim()));

  const toggleTag = (t: string) =>
    setTags((x) => (x.includes(t) ? x.filter((y) => y !== t) : x.length < 3 ? [...x, t] : x));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Live preview of the card */}
      <View style={styles.preview}>
        <View style={styles.previewIcon}>
          <Ionicons name={icon} size={28} color={THEME.colors.primaryOrange} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.previewLabel}>STUDENT IDEA</Text>
          <Text style={styles.previewTitle} numberOfLines={2}>
            {title.trim() || 'Your activity'}
          </Text>
        </View>
      </View>

      <Text style={styles.label}>WHAT?</Text>
      <View style={styles.inputRow}>
        <Ionicons name="create-outline" size={18} color={THEME.colors.textMuted} />
        <TextInput
          style={styles.input}
          placeholder="e.g. Sunset picnic on the lawn"
          placeholderTextColor={THEME.colors.textMuted}
          value={title}
          onChangeText={setTitle}
          maxLength={60}
        />
      </View>

      <Text style={styles.label}>ICON</Text>
      <View style={styles.iconGrid}>
        {ICONS.map((ic) => (
          <TouchableOpacity
            key={ic}
            style={[styles.iconCell, icon === ic && styles.on]}
            onPress={() => setIcon(ic)}
            accessibilityLabel={ic}
          >
            <Ionicons name={ic} size={22} color={icon === ic ? '#FFFFFF' : THEME.colors.primaryOrange} />
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>TYPE</Text>
      <View style={styles.row}>
        {TYPES.map((t) => (
          <TouchableOpacity key={t.key} style={[styles.pill, type === t.key && styles.onTeal]} onPress={() => setType(t.key)}>
            <Ionicons name={t.icon} size={16} color={type === t.key ? '#FFFFFF' : THEME.colors.deepTeal} />
            <Text style={[styles.pillText, type === t.key && styles.onText]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>WHERE (PUBLIC CAMPUS SPOT)</Text>
      <View style={styles.row}>
        {PLACES.map((p) => (
          <TouchableOpacity key={p.key} style={[styles.square, place === p.key && styles.onTeal]} onPress={() => setPlace(p.key)}>
            <Ionicons name={p.icon} size={20} color={place === p.key ? '#FFFFFF' : THEME.colors.deepTeal} />
            <Text style={[styles.squareText, place === p.key && styles.onText]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>HOW LONG</Text>
      <View style={styles.row}>
        {DURATIONS.map((d) => (
          <TouchableOpacity key={d} style={[styles.pill, duration === d && styles.onTeal]} onPress={() => setDuration(d)}>
            <Ionicons name="time-outline" size={14} color={duration === d ? '#FFFFFF' : THEME.colors.deepTeal} />
            <Text style={[styles.pillText, duration === d && styles.onText]}>{d < 120 ? `${d}m` : `${d / 60}h`}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>VIBE · PICK UP TO 3</Text>
      <View style={styles.tagWrap}>
        {INTERESTS.map((it) => {
          const on = tags.includes(it.tag);
          return (
            <TouchableOpacity key={it.tag} style={[styles.tag, on && styles.on]} onPress={() => toggleTag(it.tag)}>
              <Ionicons name={it.icon} size={13} color={on ? '#FFFFFF' : THEME.colors.primaryOrange} />
              <Text style={[styles.tagText, on && styles.onText]}>{it.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>COURSE (OPTIONAL)</Text>
      <View style={styles.inputRow}>
        <Ionicons name="school-outline" size={18} color={THEME.colors.textMuted} />
        <TextInput
          style={styles.input}
          placeholder="e.g. COMP1511"
          placeholderTextColor={THEME.colors.textMuted}
          value={course}
          onChangeText={setCourse}
          autoCapitalize="characters"
          maxLength={9}
        />
      </View>

      <View style={styles.note}>
        <Ionicons name="sparkles" size={14} color={THEME.colors.deepTeal} />
        <Text style={styles.noteText}>You won't host. We find people who'd be into it and a time you're all free.</Text>
      </View>

      <TouchableOpacity
        style={[styles.submit, (!valid || busy) && { opacity: 0.45 }]}
        disabled={!valid || busy}
        activeOpacity={0.85}
        onPress={() =>
          onSubmit({
            title: title.trim(),
            squad_type: type,
            category: place,
            icon,
            duration_mins: duration,
            tags,
            course: course.trim() || undefined,
          })
        }
      >
        {busy ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Text style={styles.submitText}>Post & find my squad</Text>
            <Ionicons name="sparkles" size={18} color="#FFFFFF" />
          </>
        )}
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
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: THEME.colors.cardWhite,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  previewIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: THEME.colors.primaryOrangeLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.deepTeal,
    letterSpacing: 0.6,
  },
  previewTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginTop: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: THEME.colors.cardWhite,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 16,
    color: THEME.colors.textPrimary,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconCell: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: THEME.colors.cardWhite,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  on: {
    backgroundColor: THEME.colors.primaryOrange,
    borderColor: THEME.colors.primaryOrange,
  },
  onTeal: {
    backgroundColor: THEME.colors.deepTeal,
    borderColor: THEME.colors.deepTeal,
  },
  onText: {
    color: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: THEME.radii.pill,
    backgroundColor: THEME.colors.cardWhite,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.deepTeal,
  },
  square: {
    width: 62,
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.cardWhite,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  squareText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.deepTeal,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
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
  tagText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME.colors.deepTealLight,
    borderRadius: 14,
    padding: 12,
    marginTop: 20,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: THEME.colors.deepTealDark,
    lineHeight: 18,
  },
  submit: {
    height: 56,
    borderRadius: THEME.radii.pill,
    backgroundColor: THEME.colors.primaryOrange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    ...THEME.shadows.buttonOrange,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
});
