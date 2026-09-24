import React from 'react';
import { LayoutDashboard, Radio, Scale, Users, SlidersHorizontal, Calendar, LogOut } from 'lucide-react';

export default function Sidebar({ currentView, setView, onlineCount = 0, disputesCount = 0, onLogout }) {
  const menuItems = [
    { id: 'metrics', label: 'Resumen General', icon: LayoutDashboard, badge: null },
    { id: 'live-monitor', label: 'Live Socket Monitor', icon: Radio, badge: onlineCount > 0 ? `${onlineCount} en vivo` : null, badgeColor: 'badge-lime' },
    { id: 'venues', label: 'Canchas y Turnos B2B', icon: Calendar, badge: 'B2B', badgeColor: 'badge-purple' },
    { id: 'disputes', label: 'Sala de Disputas', icon: Scale, badge: disputesCount > 0 ? `${disputesCount} alerta` : null, badgeColor: 'badge-red' },
    { id: 'players', label: 'Auditoría de Jugadores', icon: Users, badge: null },
    { id: 'sports', label: 'Deportes y Formatos', icon: SlidersHorizontal, badge: null }
  ];

  return (
    <aside className="admin-sidebar">
      <div style={{ padding: '24px 20px', borderBottom: '1px solid #1e293b' }}>
        <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', fontWeight: '700' }}>
          Módulos de Control
        </div>
      </div>

      <nav style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isActive ? '#1e293b' : 'transparent',
                color: isActive ? '#f8fafc' : '#94a3b8',
                fontWeight: isActive ? '700' : '500',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                width: '100%'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Icon size={18} color={isActive ? '#10b981' : '#64748b'} />
                <span style={{ fontSize: '13px' }}>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`badge ${item.badgeColor || 'badge-lime'}`} style={{ padding: '2px 8px', fontSize: '10px' }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Admin Foot Status */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid #1e293b', backgroundColor: '#090d16', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"
            alt="SuperAdmin"
            style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #10b981' }}
          />
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#f8fafc' }}>Admin MatchSport</div>
            <div style={{ fontSize: '10px', color: '#10b981', fontWeight: '600' }}>SuperAdmin Root</div>
          </div>
        </div>

        {onLogout && (
          <button
            onClick={onLogout}
            title="Cerrar sesión"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </aside>
  );
}
