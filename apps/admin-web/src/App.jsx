import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import AdminLogin from './components/AdminLogin';
import MetricsOverviewView from './views/MetricsOverviewView';
import LiveMonitorView from './views/LiveMonitorView';
import DisputeResolutionView from './views/DisputeResolutionView';
import PlayerAuditView from './views/PlayerAuditView';
import SportsConfigView from './views/SportsConfigView';
import { adminSocket, connectAdmin } from './services/socket';
import { fetchAdminMetrics, fetchLiveActivity, fetchDisputes, restoreAdmin, logoutAdmin, onAdminSessionExpired, getAdminToken } from './services/api';

export default function App() {
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [dataError, setDataError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [currentView, setView] = useState('metrics');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [activeMatches, setActiveMatches] = useState([]);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    let mounted = true;
    const unsubscribe = onAdminSessionExpired(() => {
      if (mounted) { setAdminUser(null); setOnlineUsers([]); setActiveMatches([]); setMetrics(null); setDisputes([]); setView('metrics'); }
      adminSocket.disconnect();
    });
    setLoading(true); setSessionError('');
    restoreAdmin().then(user => { if (mounted) setAdminUser(user); })
      .catch(error => { if (mounted && error.status !== 401) setSessionError('No pudimos verificar la sesión. Revisa la conexión con el servidor.'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; unsubscribe(); };
  }, [attempt]);

  useEffect(() => {
    if (!adminUser) return;

    const disconnect = connectAdmin(adminUser, getAdminToken());
    let mounted = true;
    const showError = error => { if (mounted) setDataError(error.message); };
    setDataError('');
    const loadDisputes = () => fetchDisputes().then(res => { if (mounted) setDisputes(res.disputes); }).catch(showError);
    loadDisputes();
    // 1. Cargar datos iniciales
    fetchAdminMetrics().then((res) => {
      if (mounted && res.metrics) setMetrics(res.metrics);
    }).catch(showError);

    fetchLiveActivity().then((res) => {
      if (mounted && res.onlineUsers) setOnlineUsers(res.onlineUsers);
      if (mounted && res.activeMatches) setActiveMatches(res.activeMatches);
    }).catch(showError);

    // 2. Suscripciones a sockets administrativos en tiempo real
    const onOnlineUsersUpdate = (payload) => {
      if (payload.users) {
        setOnlineUsers(payload.users);
      }
    };

    const onMatchDisputed = () => {
      loadDisputes();
      fetchLiveActivity().then((res) => {
        if (mounted && res.activeMatches) setActiveMatches(res.activeMatches);
      }).catch(showError);
      fetchAdminMetrics().then((res) => {
        if (mounted && res.metrics) setMetrics(res.metrics);
      }).catch(showError);
    };

    adminSocket.on('onlineUsersUpdate', onOnlineUsersUpdate);
    adminSocket.on('matchDisputed', onMatchDisputed);

    return () => {
      mounted = false; disconnect();
      adminSocket.off('onlineUsersUpdate', onOnlineUsersUpdate);
      adminSocket.off('matchDisputed', onMatchDisputed);
    };
  }, [adminUser]);

  const handleLogout = async () => {
    setLoading(true); adminSocket.disconnect();
    try { await logoutAdmin(); }
    catch (error) { console.warn('Cierre remoto no confirmado:', error.message); }
    finally { setAdminUser(null); setLoading(false); }
  };

  if (loading) return <p role="status">Verificando sesión…</p>;
  if (sessionError) return <div role="alert">{sessionError} <button onClick={() => setAttempt(value => value + 1)}>Reintentar</button></div>;

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
        disputesCount={metrics?.disputes || 0}
        onLogout={handleLogout}
      />
      <div className="admin-main">
        <Header
          onlineCount={onlineUsers.length}
          disputesCount={metrics?.disputes || 0}
          activeMatchesCount={activeMatches.length}
        />
        <main className="admin-content">
          {dataError && <p role="alert">No se pudieron actualizar los datos: {dataError} <button onClick={() => setAttempt(value => value + 1)}>Reintentar</button></p>}
          {currentView === 'metrics' && !metrics && !dataError && <p role="status">Cargando métricas…</p>}
          {currentView === 'metrics' && metrics && (
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
          {currentView === 'disputes' && (
            <DisputeResolutionView
              activeMatches={disputes}
            />
          )}
          {currentView === 'players' && <PlayerAuditView />}
          {currentView === 'sports' && <SportsConfigView />}
        </main>
      </div>
    </div>
  );
}
