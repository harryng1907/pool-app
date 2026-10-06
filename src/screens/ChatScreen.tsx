import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';
import { Message, Squad } from '../types';
import { getMessages, sendMessage } from '../lib/api';
import { formatWhen } from '../lib/format';

interface ChatScreenProps {
  squad: Squad;
}

// One-tap messages so nobody has to think of the first thing to say.
const QUICK = ['👋 Hi all!', '📍 I’m here', '🏃 5 min late', '☕ Getting coffee first', '👍 See you then'];

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', timeZone: 'Australia/Sydney' });

// Chat scoped to one confirmed squad. There is no inbox anywhere else in Pool.
export const ChatScreen: React.FC<ChatScreenProps> = ({ squad }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const scroll = useRef<ScrollView>(null);
  const lastId = useRef(0);

  const load = useCallback(async () => {
    try {
      const fresh = await getMessages(squad.id, lastId.current);
      if (fresh.length) {
        lastId.current = fresh[fresh.length - 1].id;
        setMessages((m) => [...m, ...fresh]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load chat');
    }
  }, [squad.id]);

  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [load]);

  const send = async (body: string) => {
    const trimmed = body.trim();
    if (!trimmed) return;
    setText('');
    try {
      await sendMessage(squad.id, trimmed);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.banner}>
        <Ionicons name="calendar" size={14} color={THEME.colors.deepTeal} />
        <Text style={styles.bannerText} numberOfLines={1}>
          {formatWhen(squad.starts_at)} · {squad.venue.name}
        </Text>
      </View>

      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
      >
        <View style={styles.systemNote}>
          <Ionicons name="shield-checkmark" size={14} color={THEME.colors.textMuted} />
          <Text style={styles.systemText}>Only your squad can see this chat.</Text>
        </View>

        {messages.map((m, i) => {
          const showName = !m.is_me && messages[i - 1]?.name !== m.name;
          return (
            <View key={m.id} style={[styles.row, m.is_me && styles.rowMe]}>
              {!m.is_me && (
                <View style={[styles.avatar, { backgroundColor: m.avatar_color, opacity: showName ? 1 : 0 }]}>
                  <Text style={styles.avatarText}>{m.initials}</Text>
                </View>
              )}
              <View style={{ maxWidth: '78%' }}>
                {showName && <Text style={styles.name}>{m.name}</Text>}
                <View style={[styles.bubble, m.is_me ? styles.bubbleMe : styles.bubbleThem]}>
                  <Text style={[styles.body, m.is_me && { color: '#FFFFFF' }]}>{m.body}</Text>
                </View>
                <Text style={[styles.time, m.is_me && { textAlign: 'right' }]}>{timeOf(m.created_at)}</Text>
              </View>
            </View>
          );
        })}
        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <ScrollView
        horizontal
        style={styles.quickScroll}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickRow}
      >
        {QUICK.map((q) => (
          <TouchableOpacity key={q} style={styles.quick} onPress={() => send(q)}>
            <Text style={styles.quickText}>{q}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Message your squad"
          placeholderTextColor={THEME.colors.textMuted}
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => send(text)}
          returnKeyType="send"
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !text.trim() && { opacity: 0.4 }]}
          onPress={() => send(text)}
          disabled={!text.trim()}
          accessibilityLabel="Send"
        >
          <Ionicons name="send" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.deepTealLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.deepTealDark,
  },
  list: {
    padding: 16,
    gap: 6,
  },
  systemNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginBottom: 8,
  },
  systemText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  rowMe: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  name: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginBottom: 3,
    marginLeft: 4,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
  },
  bubbleMe: {
    backgroundColor: THEME.colors.primaryOrange,
    borderBottomRightRadius: 6,
  },
  bubbleThem: {
    backgroundColor: THEME.colors.cardWhite,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderBottomLeftRadius: 6,
  },
  body: {
    fontSize: 15,
    color: THEME.colors.textPrimary,
    lineHeight: 20,
  },
  time: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 3,
    marginHorizontal: 4,
  },
  quickScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  quickRow: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  quick: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: THEME.radii.pill,
    backgroundColor: THEME.colors.cardWhite,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  quickText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  input: {
    flex: 1,
    backgroundColor: THEME.colors.cardWhite,
    borderRadius: THEME.radii.pill,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontSize: 15,
    color: THEME.colors.textPrimary,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.primaryOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: '#DC2626',
    textAlign: 'center',
    marginTop: 8,
  },
});
