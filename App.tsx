import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';
import { THEME } from './src/theme';
import { ActivityCard, ActivityInput, Connection, Me, Nudge, PlanOption, PlanTarget, ScreenType, Squad, TabType } from './src/types';
import { supabase } from './src/lib/supabase';
import * as api from './src/lib/api';
import { Header } from './src/components/Header';
import { BottomNav } from './src/components/BottomNav';
import { MatchingOverlay } from './src/components/MatchingOverlay';
import { DiscoverScreen } from './src/screens/DiscoverScreen';
import { SquadListScreen } from './src/screens/SquadListScreen';
import { SquadsScreen } from './src/screens/SquadsScreen';
import { ConfirmedScreen } from './src/screens/ConfirmedScreen';
import { RateScreen } from './src/screens/RateScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { MetricsScreen } from './src/screens/MetricsScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { SuggestScreen } from './src/screens/SuggestScreen';
import { PlanScreen } from './src/screens/PlanScreen';

const errorText = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');

// Keep the AI overlay up long enough to read, even when the matcher is fast.
const atLeast = <T,>(promise: Promise<T>, ms: number) =>
  Promise.all([promise, new Promise((r) => setTimeout(r, ms))]).then(([v]) => v);

function MainApp({ session }: { session: Session }) {
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<TabType>('discover');
  const [screen, setScreen] = useState<ScreenType>('discover');
  const [openSquadId, setOpenSquadId] = useState<string | null>(null);

  const [me, setMe] = useState<Me | null>(null);
  const [cards, setCards] = useState<ActivityCard[]>([]);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [matching, setMatching] = useState(false);
  const [matchingTags, setMatchingTags] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [planTarget, setPlanTarget] = useState<PlanTarget | null>(null);

  // Ask Claude for a "why you matched" sentence once per squad; the app works fine without it.
  const aiRequested = useRef(new Set<string>());
  const fillAiReasons = useCallback((list: Squad[]) => {
    for (const s of list) {
      if (s.ai_reason || s.status === 'cancelled' || aiRequested.current.has(s.id)) continue;
      aiRequested.current.add(s.id);
      api.requestAiReason(s.id).then((reason) => {
        if (reason) setSquads((cur) => cur.map((x) => (x.id === s.id ? { ...x, ai_reason: reason } : x)));
      });
    }
  }, []);

  const loadSquads = useCallback(async () => {
    const [s, n, c] = await Promise.all([api.getMySquads(), api.getNudges(), api.getConnections()]);
    setSquads(s);
    fillAiReasons(s);
    setNudges(n);
    setConnections(c);
  }, [fillAiReasons]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [m, d] = await Promise.all([api.getMe(), api.getDeck(), loadSquads()]);
      if (!m) {
        // Saved login points at an account that no longer exists (e.g. demo data was re-seeded).
        await api.signOut();
        return;
      }
      setMe(m);
      setCards(d);
    } catch (e) {
      setNotice(errorText(e));
    } finally {
      setLoading(false);
    }
  }, [loadSquads]);

  useEffect(() => {
    loadAll();
    api.logEvent('app_open').catch(() => {});
  }, [session.user.id, loadAll]);

  // Other (real) squad members accept on their own phones — poll so the reveal shows up.
  useEffect(() => {
    const t = setInterval(() => loadSquads().catch(() => {}), 10000);
    return () => clearInterval(t);
  }, [loadSquads]);

  const go = (tab: TabType, next: ScreenType, squadId: string | null = null) => {
    setActiveTab(tab);
    setScreen(next);
    setOpenSquadId(squadId);
  };

  const openSquad = (squad: Squad) => {
    go('squads', squad.status === 'completed' && !squad.rated ? 'rate' : 'squad', squad.id);
  };

  // --- Discover ------------------------------------------------------

  const handleImIn = async (card: ActivityCard) => {
    setBusy(true);
    setMatchingTags([card.course, ...card.tags].filter((t): t is string => !!t).slice(0, 3));
    setMatching(true);
    setNotice(null);
    try {
      const squadId = await atLeast(api.swipe(card.id, 'in'), 1400);
      setCards((cs) => cs.filter((c) => c.id !== card.id));
      await loadSquads();
      if (squadId) {
        go('squads', 'squad', squadId);
      } else {
        setNotice(`Saved "${card.title}". Nobody's free at the same time yet — we'll match you as soon as someone is.`);
      }
    } catch (e) {
      setNotice(errorText(e));
    } finally {
      setMatching(false);
      setBusy(false);
    }
  };

  const handleNotForMe = async (card: ActivityCard) => {
    setNotice(null);
    setCards((cs) => cs.filter((c) => c.id !== card.id));
    try {
      await api.swipe(card.id, 'pass');
    } catch (e) {
      setNotice(errorText(e));
    }
  };

  // "Go again?" and "Invite" open a few options instead of repeating the same thing.
  const openPlan = (target: PlanTarget, from: TabType) => {
    setPlanTarget(target);
    go(from, 'plan');
  };

  const handleRebook = (nudge: Nudge) =>
    openPlan({ userIds: nudge.user_ids, names: nudge.names, rebookOf: nudge.squad_id }, 'discover');

  // Runs the matcher behind the AI overlay, then opens the new squad (or explains why not).
  const matchThen = async (tags: string[], run: () => Promise<string | null>, noMatch: string) => {
    setBusy(true);
    setMatchingTags(tags.slice(0, 3));
    setMatching(true);
    setNotice(null);
    try {
      const squadId = await atLeast(run(), 1400);
      await loadSquads();
      if (squadId) go('squads', 'squad', squadId);
      else {
        setNotice(noMatch);
        go('discover', 'discover');
      }
    } catch (e) {
      setNotice(errorText(e));
    } finally {
      setMatching(false);
      setBusy(false);
    }
  };

  const handleInvite = (c: Connection) =>
    openPlan({ userIds: [c.id], names: [c.name], rebookOf: c.last_squad_id }, 'profile');

  const handlePick = (o: PlanOption) =>
    planTarget &&
    matchThen(
      [o.title, ...planTarget.names],
      () => api.planWith(o.activity_id, planTarget.userIds, o.starts_at, planTarget.rebookOf),
      `That time just stopped working for someone — try another option.`,
    );

  const handleSuggest = (input: ActivityInput) =>
    matchThen(
      [input.title, ...input.tags],
      async () => {
        const res = await api.createActivity(input);
        api.getDeck().then(setCards).catch(() => {});
        return res.squad_id;
      },
      `Posted "${input.title}"! Nobody's free at the same time yet — we'll match you as soon as someone says I'm in.`,
    );

  // --- Squad actions -------------------------------------------------

  const withBusy = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setNotice(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const handleRespond = (squad: Squad, accept: boolean) =>
    withBusy(async () => {
      await api.respondToSquad(squad.id, accept);
      await loadSquads();
      if (!accept) go('squads', 'squads');
    });

  const handleEndSession = (squad: Squad) =>
    withBusy(async () => {
      await api.endSession(squad.id);
      await loadSquads();
      go('squads', 'rate', squad.id);
    });

  const handleRate = (squad: Squad, scores: { user_id: string; score: number }[], venueScore: number | null) =>
    withBusy(async () => {
      await api.rateSquad(squad.id, scores, venueScore);
      await Promise.all([loadSquads(), api.getMe().then(setMe)]);
      setNotice('Thanks! Your next squad will use these ratings.');
      go('discover', 'discover');
    });

  const handleResetDemo = () =>
    withBusy(async () => {
      await api.resetMyDemo();
      setNotice(null);
      await loadAll();
      go('discover', 'discover');
    });

  const handleSelectTab = (tab: TabType) => {
    if (tab === 'profile') api.getMe().then(setMe).catch(() => {});
    if (tab === 'squads') loadSquads().catch(() => {});
    go(tab, tab === 'squads' ? 'squads' : tab);
  };

  // --- Render --------------------------------------------------------

  // New accounts (and "Edit profile") get the onboarding flow full-screen.
  if (me && (!me.onboarded || editingProfile)) {
    return (
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar style="dark" />
        <OnboardingScreen
          me={me}
          editing={me.onboarded}
          onCancel={me.onboarded ? () => setEditingProfile(false) : undefined}
          onDone={(updated) => {
            setMe(updated);
            setEditingProfile(false);
            api.getDeck().then(setCards).catch(() => {});
            go('discover', 'discover');
          }}
        />
      </View>
    );
  }

  const openSquadData = squads.find((s) => s.id === openSquadId) ?? null;
  const needsAction = squads.filter(
    (s) => (s.status === 'proposed' && s.my_status === 'invited') || (s.status === 'completed' && !s.rated),
  ).length;

  const title =
    screen === 'discover' ? 'Discover'
    : screen === 'profile' ? 'Profile'
    : screen === 'metrics' ? 'Metrics'
    : screen === 'rate' ? 'Rate'
    : screen === 'chat' ? 'Squad chat'
    : screen === 'suggest' ? 'Suggest'
    : screen === 'plan' ? 'Plan'
    : screen === 'squad' && openSquadData?.status !== 'proposed' ? 'Session'
    : 'Squads';

  const showBack = ['squad', 'rate', 'metrics', 'chat', 'suggest', 'plan'].includes(screen);
  const back = () =>
    screen === 'metrics' ? go('profile', 'profile')
    : screen === 'suggest' ? go('discover', 'discover')
    : screen === 'plan' ? go(activeTab, activeTab === 'profile' ? 'profile' : 'discover')
    : screen === 'chat' ? go('squads', 'squad', openSquadId)
    : go('squads', 'squads');

  let body: React.ReactNode = null;
  if (screen === 'discover') {
    body = (
      <DiscoverScreen
        cards={cards}
        loading={loading}
        busy={busy}
        notice={notice}
        nudges={nudges}
        onImIn={handleImIn}
        onNotForMe={handleNotForMe}
        onRebook={handleRebook}
        onRefresh={loadAll}
        onSuggest={() => go('discover', 'suggest')}
      />
    );
  } else if (screen === 'squads') {
    body = (
      <SquadListScreen
        squads={squads}
        loading={loading}
        onOpen={openSquad}
        onDiscover={() => go('discover', 'discover')}
      />
    );
  } else if (screen === 'squad' && openSquadData) {
    body =
      openSquadData.status === 'proposed' ? (
        <SquadsScreen
          squad={openSquadData}
          busy={busy}
          onAccept={() => handleRespond(openSquadData, true)}
          onDecline={() => handleRespond(openSquadData, false)}
          onGoAhead={() =>
            withBusy(async () => {
              await api.voteGoAhead(openSquadData.id);
              await loadSquads();
            })
          }
          onBack={back}
        />
      ) : (
        <ConfirmedScreen
          squad={openSquadData}
          busy={busy}
          onEndSession={() => handleEndSession(openSquadData)}
          onRate={() => go('squads', 'rate', openSquadData.id)}
          onBack={back}
          onOpenChat={() => go('squads', 'chat', openSquadData.id)}
          onCheckIn={() =>
            withBusy(async () => {
              await api.checkIn(openSquadData.id);
              await loadSquads();
            })
          }
          onReport={(userId, reason) => withBusy(() => api.reportMember(openSquadData.id, userId, reason))}
        />
      );
  } else if (screen === 'plan' && planTarget) {
    body = <PlanScreen target={planTarget} busy={busy} onPick={handlePick} />;
  } else if (screen === 'suggest') {
    body = <SuggestScreen busy={busy} onSubmit={handleSuggest} />;
  } else if (screen === 'chat' && openSquadData) {
    body = <ChatScreen squad={openSquadData} />;
  } else if (screen === 'rate' && openSquadData) {
    body = (
      <RateScreen
        squad={openSquadData}
        busy={busy}
        onSubmit={(scores, venueScore) => handleRate(openSquadData, scores, venueScore)}
        onBack={back}
      />
    );
  } else if (screen === 'profile') {
    body = (
      <ProfileScreen
        me={me}
        busy={busy}
        onResetDemo={handleResetDemo}
        onOpenMetrics={() => go('profile', 'metrics')}
        onEditProfile={() => setEditingProfile(true)}
        connections={connections}
        onInvite={handleInvite}
        onDeleteAccount={() => withBusy(() => api.deleteAccount())}
        onToggleRealOnly={(value) =>
          withBusy(async () => {
            setMe(await api.saveProfile({ real_only: value }));
            setCards(await api.getDeck());
          })
        }
        onSignOut={() => api.signOut()}
      />
    );
  } else if (screen === 'metrics') {
    body = <MetricsScreen onBack={back} />;
  } else {
    // A squad we were showing disappeared (e.g. reset) — fall back to the list.
    body = (
      <SquadListScreen
        squads={squads}
        loading={loading}
        onOpen={openSquad}
        onDiscover={() => go('discover', 'discover')}
      />
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <Header
        title={title}
        currentScreen={screen}
        onProfilePress={() => handleSelectTab('profile')}
        onBackPress={back}
        showBack={showBack}
        initials={me?.initials}
        avatarColor={me?.avatar_color}
      />
      <View style={styles.screenContainer}>{body}</View>
      <MatchingOverlay visible={matching} tags={matchingTags} />
      <BottomNav
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        badgeCount={needsAction}
        bottomInset={insets.bottom}
      />
    </View>
  );
}

function Root() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const insets = useSafeAreaInsets();
  const mounted = useRef(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted.current) return;
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => {
      mounted.current = false;
      data.subscription.unsubscribe();
    };
  }, []);

  if (!ready) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={THEME.colors.primaryOrange} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <StatusBar style="dark" />
        <LoginScreen />
      </View>
    );
  }

  return <MainApp key={session.user.id} session={session} />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <View style={styles.page}>
        <Root />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  // On a laptop browser, show the app at phone width in the middle of the page.
  page: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? '#E9E9E4' : THEME.colors.background,
  },
  root: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 480 : undefined,
    alignSelf: 'center',
    backgroundColor: THEME.colors.background,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenContainer: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
});
