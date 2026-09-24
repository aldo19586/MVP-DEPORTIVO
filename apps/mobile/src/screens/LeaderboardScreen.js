import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Image
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { api } from '../services/api';
import { THEME } from '../theme';

const MOCK_LEADERS = [
  { rank: 1, name: 'Franco Benítez', ovr: 89, elo: 1880, district: 'Surco, Lima', wins: 28, streak: '🔥 6x', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120' },
  { rank: 2, name: 'Carlos Mendoza', ovr: 86, elo: 1855, district: 'Surco, Lima', wins: 24, streak: '🔥 4x', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120' },
  { rank: 3, name: 'Mateo Ramos', ovr: 84, elo: 1820, district: 'Miraflores, Lima', wins: 21, streak: '🔥 3x', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120' },
  { rank: 4, name: 'Lucía Morales', ovr: 82, elo: 1780, district: 'San Isidro, Lima', wins: 19, streak: '🔥 2x', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120' },
  { rank: 5, name: 'Rodrigo Paz', ovr: 81, elo: 1750, district: 'San Borja, Lima', wins: 17, streak: '1x', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120' },
  { rank: 6, name: 'Diego Paredes', ovr: 79, elo: 1710, district: 'Surco, Lima', wins: 15, streak: '2x', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120' },
];

export default function LeaderboardScreen({ currentUser }) {
  const [selectedSport, setSelectedSport] = useState('futbol');
  const [selectedFormat, setSelectedFormat] = useState('5v5');
  const [leaders, setLeaders] = useState(MOCK_LEADERS);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.getLeaderboard(selectedSport, selectedFormat);
        if (res && res.leaderboard && res.leaderboard.length > 0) {
          setLeaders(res.leaderboard);
        }
      } catch (e) {
        // Usa mock data
      }
    })();
  }, [selectedSport, selectedFormat]);

  const top1 = leaders[0] || MOCK_LEADERS[0];
  const top2 = leaders[1] || MOCK_LEADERS[1];
  const top3 = leaders[2] || MOCK_LEADERS[2];

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.brandSmall}>MATCHSPORT LEAGUE</Text>
          <Text style={styles.topTitle}>TABLA DE POSICIONES</Text>
        </View>
        <View style={styles.seasonBadge}>
          <Text style={styles.seasonText}>⚡ S11 APERTURA</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Filter Pills */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, selectedSport === 'futbol' && styles.filterChipActive]}
            onPress={() => setSelectedSport('futbol')}
          >
            <Text style={[styles.filterChipText, selectedSport === 'futbol' && styles.filterChipTextActive]}>
              ⚽ Fútbol
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, selectedSport === 'basket' && styles.filterChipActive]}
            onPress={() => setSelectedSport('basket')}
          >
            <Text style={[styles.filterChipText, selectedSport === 'basket' && styles.filterChipTextActive]}>
              🏀 Basket
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, selectedSport === 'padel' && styles.filterChipActive]}
            onPress={() => setSelectedSport('padel')}
          >
            <Text style={[styles.filterChipText, selectedSport === 'padel' && styles.filterChipTextActive]}>
              🎾 Pádel
            </Text>
          </TouchableOpacity>
        </View>

        {/* Podium Top 3 */}
        <View style={styles.podiumContainer}>
          {/* Top 2 - Plata */}
          <View style={styles.podiumCol2}>
            <View style={styles.avatarCrownWrap}>
              <Text style={styles.silverCrown}>🥈</Text>
              <Image source={{ uri: top2.avatar }} style={styles.podiumAvatar} />
              <View style={styles.silverBadge}><Text style={styles.badgeRankNum}>2</Text></View>
            </View>
            <Text style={styles.podiumName} numberOfLines={1}>{top2.name.split(' ')[0]}</Text>
            <Text style={styles.podiumElo}>{top2.elo} Elo</Text>
            <View style={styles.podiumStep2} />
          </View>

          {/* Top 1 - Oro */}
          <View style={styles.podiumCol1}>
            <View style={styles.avatarCrownWrap}>
              <Text style={styles.goldCrown}>👑</Text>
              <Image source={{ uri: top1.avatar }} style={[styles.podiumAvatar, styles.avatarGold]} />
              <View style={styles.goldBadge}><Text style={styles.badgeRankNum}>1</Text></View>
            </View>
            <Text style={styles.podiumNameGold} numberOfLines={1}>{top1.name.split(' ')[0]}</Text>
            <Text style={styles.podiumEloGold}>{top1.elo} Elo</Text>
            <View style={styles.podiumStep1} />
          </View>

          {/* Top 3 - Bronce */}
          <View style={styles.podiumCol3}>
            <View style={styles.avatarCrownWrap}>
              <Text style={styles.bronzeCrown}>🥉</Text>
              <Image source={{ uri: top3.avatar }} style={styles.podiumAvatar} />
              <View style={styles.bronzeBadge}><Text style={styles.badgeRankNum}>3</Text></View>
            </View>
            <Text style={styles.podiumName} numberOfLines={1}>{top3.name.split(' ')[0]}</Text>
            <Text style={styles.podiumElo}>{top3.elo} Elo</Text>
            <View style={styles.podiumStep3} />
          </View>
        </View>

        {/* Full Table List */}
        <View style={styles.tableCard}>
          <Text style={styles.tableHeader}>RANKING GLOBAL EN LIMA</Text>
          {leaders.map((item, index) => {
            const isUser = currentUser?.id === item.id;
            return (
              <View key={item.id || index} style={[styles.tableRow, isUser && styles.tableRowMe]}>
                <Text style={styles.rankCol}>#{item.rank || index + 1}</Text>
                <Image source={{ uri: item.avatar }} style={styles.tableAvatar} />
                <View style={styles.nameCol}>
                  <Text style={[styles.tableName, isUser && styles.tableNameMe]}>{item.name}</Text>
                  <Text style={styles.tableSub}>{item.district || 'Lima'} • {item.wins || 18}W</Text>
                </View>
                <View style={styles.eloCol}>
                  <Text style={styles.tableElo}>{item.elo || 1750}</Text>
                  <Text style={styles.tableStreak}>{item.streak || '🔥 3x'}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bgCanvas,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  brandSmall: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.primary,
    letterSpacing: 1,
  },
  topTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  seasonBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.radius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.borderGold,
  },
  seasonText: {
    color: THEME.colors.goldLight,
    fontSize: 10,
    fontWeight: '900',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 16,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    backgroundColor: THEME.colors.cardBg,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.radius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  filterChipActive: {
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    borderColor: THEME.colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
  },
  filterChipTextActive: {
    color: THEME.colors.primary,
  },
  podiumContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 190,
    gap: 12,
    marginTop: 8,
  },
  podiumCol1: {
    alignItems: 'center',
    width: 90,
  },
  podiumCol2: {
    alignItems: 'center',
    width: 80,
  },
  podiumCol3: {
    alignItems: 'center',
    width: 80,
  },
  avatarCrownWrap: {
    alignItems: 'center',
    position: 'relative',
    marginBottom: 4,
  },
  goldCrown: {
    fontSize: 18,
    marginBottom: 2,
  },
  silverCrown: {
    fontSize: 14,
    marginBottom: 2,
  },
  bronzeCrown: {
    fontSize: 14,
    marginBottom: 2,
  },
  podiumAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: THEME.colors.border,
  },
  avatarGold: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderColor: THEME.colors.gold,
  },
  goldBadge: {
    position: 'absolute',
    bottom: -4,
    backgroundColor: THEME.colors.gold,
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  silverBadge: {
    position: 'absolute',
    bottom: -4,
    backgroundColor: '#9CA3AF',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bronzeBadge: {
    position: 'absolute',
    bottom: -4,
    backgroundColor: '#B45309',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRankNum: {
    fontSize: 9,
    fontWeight: '900',
    color: '#000',
  },
  podiumName: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  podiumNameGold: {
    fontSize: 12,
    fontWeight: '900',
    color: THEME.colors.gold,
  },
  podiumElo: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    fontWeight: '700',
  },
  podiumEloGold: {
    fontSize: 11,
    color: THEME.colors.primary,
    fontWeight: '900',
  },
  podiumStep1: {
    width: '100%',
    height: 70,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.borderGold,
    marginTop: 6,
  },
  podiumStep2: {
    width: '100%',
    height: 50,
    backgroundColor: 'rgba(156, 163, 175, 0.15)',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginTop: 6,
  },
  podiumStep3: {
    width: '100%',
    height: 35,
    backgroundColor: 'rgba(180, 83, 9, 0.15)',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginTop: 6,
  },
  tableCard: {
    backgroundColor: THEME.colors.cardBg,
    borderRadius: THEME.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 10,
  },
  tableHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.8,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
    gap: 10,
  },
  tableRowMe: {
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    borderRadius: THEME.radius.md,
    paddingHorizontal: 8,
  },
  rankCol: {
    fontSize: 12,
    fontWeight: '900',
    color: THEME.colors.textSecondary,
    width: 24,
  },
  tableAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  nameCol: {
    flex: 1,
  },
  tableName: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  tableNameMe: {
    color: THEME.colors.primary,
  },
  tableSub: {
    fontSize: 9,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  eloCol: {
    alignItems: 'flex-end',
  },
  tableElo: {
    fontSize: 13,
    fontWeight: '900',
    color: THEME.colors.primary,
  },
  tableStreak: {
    fontSize: 9,
    color: THEME.colors.gold,
    fontWeight: '700',
    marginTop: 1,
  },
});
