import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { THEME } from '../theme';

export default function BottomNavBar({ activeTab, onSelectTab, openRoomsCount = 0 }) {
  const handleTabPress = (tabKey) => {
    try {
      Haptics.selectionAsync();
    } catch (e) {
      // Omitir si no está disponible
    }
    onSelectTab(tabKey);
  };

  const tabs = [
    { key: 'JUGAR', label: 'JUGAR', icon: '⚽' },
    { key: 'SALAS', label: 'SALAS', icon: '🏟️', badge: openRoomsCount > 0 ? openRoomsCount : null },
    { key: 'RANKING', label: 'RANKING', icon: '🏆' },
    { key: 'PERFIL', label: 'PERFIL', icon: '👤' },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabButton, isActive && styles.activeTabButton]}
            onPress={() => handleTabPress(tab.key)}
            activeOpacity={0.7}
          >
            <View style={styles.iconWrapper}>
              <Text style={[styles.tabIcon, isActive && styles.activeTabIcon]}>
                {tab.icon}
              </Text>
              {tab.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{tab.badge}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
              {tab.label}
            </Text>
            {isActive && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 70,
    backgroundColor: THEME.colors.tabBarBg,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    paddingBottom: 8,
    paddingTop: 6,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    position: 'relative',
  },
  activeTabButton: {},
  iconWrapper: {
    position: 'relative',
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.6,
    color: THEME.colors.textSecondary,
    marginBottom: 2,
  },
  activeTabIcon: {
    opacity: 1,
    transform: [{ scale: 1.15 }],
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.8,
  },
  activeTabLabel: {
    color: THEME.colors.primary,
    fontWeight: '800',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -4,
    width: 16,
    height: 3,
    borderRadius: 2,
    backgroundColor: THEME.colors.primary,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: THEME.colors.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#00210B',
    fontSize: 9,
    fontWeight: '900',
  },
});
