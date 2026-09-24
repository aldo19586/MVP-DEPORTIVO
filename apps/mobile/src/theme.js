// MatchSport Mobile - Sistema de Diseño "Obsidian Pitch & Neon FUT"
// Extraído fielmente de las especificaciones y tokens de Google Stitch

export const THEME = {
  colors: {
    bgCanvas: '#0B0E14',           // Obsidian pitch backdrop
    bgSurface: '#10131A',          // Surface general
    cardBg: '#161B22',             // Tactical dark slate (cards, lists)
    cardElevated: '#1F2937',       // Elevated components & chip backgrounds
    cardHighest: '#272A31',        // Hover / active item highlight
    
    primary: '#00E676',            // Electric Emerald Green (actions, ready, radar)
    primaryLight: '#75FF9E',
    primaryDark: '#00612E',
    
    gold: '#F59E0B',               // Championship Gold (FUT OVR, MVP, rankings)
    goldLight: '#FFB95F',
    goldDark: '#78350F',
    
    danger: '#EF4444',             // Crimson Red (cancelar, disputas, team B)
    dangerLight: '#FF8080',
    dangerDark: '#7F1D1D',
    
    teamA: '#3B82F6',              // Azul Equipo A
    teamB: '#EF4444',              // Rojo Equipo B
    
    textPrimary: '#F9FAFB',        // White high-contrast
    textSecondary: '#9CA3AF',      // Muted slate
    textMuted: '#6B7280',          // Dimmed captions
    textGold: '#FBBF24',           // Gold label text
    
    border: 'rgba(255, 255, 255, 0.08)',
    borderHover: 'rgba(255, 255, 255, 0.16)',
    borderActive: '#00E676',
    borderGold: 'rgba(245, 158, 11, 0.5)',
    
    overlay: 'rgba(11, 14, 20, 0.85)',
    tabBarBg: '#10141D',
  },
  
  fonts: {
    // React Native usa pesos nativos ('bold', '600', '700')
    display: {
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    tactical: {
      fontWeight: '700',
      letterSpacing: 1.0,
      textTransform: 'uppercase',
    }
  },
  
  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    pill: 9999,
  }
};
