import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import AdminLogin from './components/AdminLogin';
import MetricsOverviewView from './views/MetricsOverviewView';
import LiveMonitorView from './views/LiveMonitorView';
import VenuesScheduleView from './views/VenuesScheduleView';
import DisputeResolutionView from './views/DisputeResolutionView';
import PlayerAuditView from './views/PlayerAuditView';
import SportsConfigView from './views/SportsConfigView';
import { adminSocket } from './services/socket';
import { fetchAdminMetrics, fetchLiveActivity, getStoredAdmin, logoutAdmin } from './services/api';

export default function App() {
  const [adminUser, setAdminUser] = useState(() => getStoredAdmin());
  const [currentView, setView] = useState('metrics');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [activeMatches, setActiveMatches] = useState([]);
  const [metrics, setMetrics] = useState({ totalUsers: 0, totalMatches: 0, activeMatches: 0, activeSearches: 0, disputes: 0, sportsCount: 4 });

  useEffect(() => {
    if (!adminUser) return;

    // 1. Cargar datos iniciales
    fetchAdminMetrics().then((res) => {
      if (res.metrics) setMetrics(res.metrics);
    });

    fetchLiveActivity().then((res) => {
      if (res.onlineUsers) setOnlineUsers(res.onlineUsers);
      if (res.activeMatches) setActiveMatches(res.activeMatches);
    });

    // 2. Suscripciones a sockets administrativos en tiempo real
    const onOnlineUsersUpdate = (payload) => {
      if (payload.users) {
        setOnlineUsers(payload.users);
      }
    };

    const onMatchDisputed = () => {
      fetchLiveActivity().then((res) => {
        if (res.activeMatches) setActiveMatches(res.activeMatches);
      });
      fetchAdminMetrics().then((res) => {
        if (res.metrics) setMetrics(res.metrics);
      });
    };

    adminSocket.on('onlineUsersUpdate', onOnlineUsersUpdate);
    adminSocket.on('matchDisputed', onMatchDisputed);

    return () => {
      adminSocket.off('onlineUsersUpdate', onOnlineUsersUpdate);
      adminSocket.off('matchDisputed', onMatchDisputed);
    };
  }, [adminUser]);

  const handleLogout = () => {
    logoutAdmin();
    setAdminUser(null);
  };

  // Si no está autenticado como administrador, mostrar pantalla de Login
  if (!adminUser) {
    return <AdminLogin onLoginSuccess={(user) => setAdminUser(user)} />;
  }

  return (
    <div className="admin-shell">
      <Sidebar
        currentView={currentView}
        setView={setView}
        onlineCount={onlineUsers.length}
        disputesCount={metrics.disputes || 0}
        onLogout={handleLogout}
      />
      <div className="admin-main">
        <Header
          onlineCount={onlineUsers.length}
          disputesCount={metrics.disputes || 0}
          activeMatchesCount={activeMatches.length}
        />
        <main className="admin-content">
          {currentView === 'metrics' && (
            <MetricsOverviewView
              metrics={metrics}
              onlineCount={onlineUsers.length}
              activeMatchesCount={activeMatches.length}
            />
          )}
          {currentView === 'live-monitor' && (
            <LiveMonitorView
              onlineUsers={onlineUsers}
              activeMatches={activeMatches}
            />
          )}
          {currentView === 'venues' && <VenuesScheduleView />}
          {currentView === 'disputes' && (
            <DisputeResolutionView
              activeMatches={activeMatches}
            />
          )}
          {currentView === 'players' && <PlayerAuditView />}
          {currentView === 'sports' && <SportsConfigView />}
        </main>
      </div>
    </div>
  );
}
