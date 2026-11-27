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

  const normalizedActiveTab = activeTab === 'MIS_PARTIDOS' ? 'SALAS' : activeTab;

  const tabs = [
    { key: 'SALAS', label: 'SALAS', icon: '⚽', badge: openRoomsCount > 0 ? openRoomsCount : null },
    { key: 'RANKING', label: 'RANKING', icon: '🏆' },
    { key: 'PERFIL', label: 'PERFIL', icon: '🛡️' },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = normalizedActiveTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabButton, isActive && styles.activeTabButton]}
            onPress={() => handleTabPress(tab.key)}
            activeOpacity={0.75}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
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
            <Text
              style={[styles.tabLabel, isActive && styles.activeTabLabel]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
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
    height: 68,
    backgroundColor: THEME.colors.surfaceLow,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingBottom: 8,
    paddingTop: 6,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    position: 'relative',
    minHeight: 48,
  },
  activeTabButton: {},
  iconWrapper: {
    position: 'relative',
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetIconOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: THEME.colors.onSurfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7,
  },
  targetIconOuterActive: {
    borderColor: THEME.colors.neonPitch,
    opacity: 1,
    shadowColor: THEME.colors.neonPitch,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
  },
  targetIconInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.onSurfaceVariant,
  },
  targetIconInnerActive: {
    backgroundColor: THEME.colors.neonPitch,
  },
  tabIcon: {
    fontSize: 19,
    opacity: 0.65,
    color: THEME.colors.onSurfaceVariant,
  },
  activeTabIcon: {
    opacity: 1,
    color: THEME.colors.neonPitch,
    transform: [{ scale: 1.12 }],
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.onSurfaceVariant,
    letterSpacing: 0.9,
    marginTop: 2,
  },
  activeTabLabel: {
    color: THEME.colors.neonPitch,
    fontWeight: '800',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -3,
    width: 20,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: THEME.colors.neonPitch,
    shadowColor: THEME.colors.neonPitch,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 6,
    elevation: 4,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -12,
    backgroundColor: THEME.colors.neonPitch,
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
