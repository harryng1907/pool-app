import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from './src/theme';
import { TabType, ScreenType, ActivityEvent } from './src/types';
import {
  DISCOVER_EVENTS,
  SQUAD_MEMBERS,
  MATCH_REASONS,
} from './src/data/mockData';
import { Header } from './src/components/Header';
import { BottomNav } from './src/components/BottomNav';
import { MatchingOverlay } from './src/components/MatchingOverlay';
import { DiscoverScreen } from './src/screens/DiscoverScreen';
import { SquadsScreen } from './src/screens/SquadsScreen';
import { ConfirmedScreen } from './src/screens/ConfirmedScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';

function MainApp() {
  const insets = useSafeAreaInsets();

  // Navigation & State
  const [activeTab, setActiveTab] = useState<TabType>('discover');
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('discover');
  const [isMatching, setIsMatching] = useState(false);
  const [hasSquad, setHasSquad] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);

  // Flow Handlers
  const handleImIn = (_event: ActivityEvent) => {
    setIsMatching(true);
    // 1-second AI assembly overlay, then automatically navigates to Screen 2 (Squads)
    setTimeout(() => {
      setIsMatching(false);
      setHasSquad(true);
      setCurrentScreen('squads');
      setActiveTab('squads');
    }, 1000);
  };

  const handleNotForMe = () => {
    setCardIndex((prev) => (prev + 1) % DISCOVER_EVENTS.length);
  };

  const handleLooksGood = () => {
    setCurrentScreen('confirmed');
  };

  const handleBackToSquads = () => {
    setCurrentScreen('squads');
    setActiveTab('squads');
  };

  const handleSelectTab = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'discover') {
      setCurrentScreen('discover');
    } else if (tab === 'squads') {
      // If user has confirmed squad, open confirmed, otherwise squads
      setCurrentScreen('squads');
    } else if (tab === 'profile') {
      setCurrentScreen('profile');
    }
  };

  const handleProfilePress = () => {
    setActiveTab('profile');
    setCurrentScreen('profile');
  };

  const handleResetDemo = () => {
    setHasSquad(false);
    setIsMatching(false);
    setCardIndex(0);
    setCurrentScreen('discover');
    setActiveTab('discover');
  };

  const handleNavigateToScreen = (screen: 'discover' | 'squads' | 'confirmed') => {
    if (screen === 'squads') {
      setHasSquad(true);
      setActiveTab('squads');
      setCurrentScreen('squads');
    } else if (screen === 'confirmed') {
      setHasSquad(true);
      setActiveTab('squads');
      setCurrentScreen('confirmed');
    } else {
      setActiveTab('discover');
      setCurrentScreen('discover');
    }
  };

  // Header Title mapping
  const getHeaderTitle = () => {
    switch (currentScreen) {
      case 'discover':
        return 'Discover';
      case 'squads':
        return 'Squads';
      case 'confirmed':
        return 'Confirmed';
      case 'profile':
        return 'Profile';
      default:
        return 'Discover';
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      {/* Top Header */}
      <Header
        title={getHeaderTitle()}
        currentScreen={currentScreen}
        onProfilePress={handleProfilePress}
        onBackPress={
          currentScreen === 'confirmed' ? handleBackToSquads : undefined
        }
        onResetPress={handleResetDemo}
        showBack={currentScreen === 'confirmed'}
      />

      {/* Main Screen Content */}
      <View style={styles.screenContainer}>
        {currentScreen === 'discover' && (
          <DiscoverScreen
            events={DISCOVER_EVENTS}
            currentIndex={cardIndex}
            onImIn={handleImIn}
            onNotForMe={handleNotForMe}
          />
        )}

        {currentScreen === 'squads' && (
          <SquadsScreen
            members={SQUAD_MEMBERS}
            reasons={MATCH_REASONS}
            onLooksGood={handleLooksGood}
            onExploreMore={() => handleSelectTab('discover')}
          />
        )}

        {currentScreen === 'confirmed' && (
          <ConfirmedScreen
            members={SQUAD_MEMBERS}
            onResetDemo={handleResetDemo}
            onBackToSquads={handleBackToSquads}
          />
        )}

        {currentScreen === 'profile' && (
          <ProfileScreen
            onResetDemo={handleResetDemo}
            onNavigateToScreen={handleNavigateToScreen}
          />
        )}
      </View>

      {/* 1-second AI Assembling Overlay */}
      <MatchingOverlay visible={isMatching} />

      {/* Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        hasSquad={hasSquad}
        bottomInset={insets.bottom}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
});
