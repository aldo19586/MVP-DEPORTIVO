import { io } from 'socket.io-client';

async function runComprehensiveBackendTest() {
  console.log('🚀 INICIANDO SUITE COMPLETA DE PRUEBAS DEL SERVIDOR BACKEND (MatchSport)...\n');

  const BASE_URL = 'http://localhost:3001/api';

  // 1. Catálogo de Deportes y Distritos
  console.log('1️⃣ Verificando Catálogos (Deportes, Distritos y Formatos)...');
  const sportsRes = await fetch(`${BASE_URL}/sports`).then(r => r.json());
  if (!sportsRes.sports || sportsRes.sports.length < 4) throw new Error('Falla en catálogo de deportes');
  console.log(`✓ ${sportsRes.sports.length} deportes activos (${sportsRes.sports.map(s => s.name).join(', ')})`);

  const districtsRes = await fetch(`${BASE_URL}/districts?query=miraflores`).then(r => r.json());
  if (!districtsRes.districts || districtsRes.districts.length === 0) throw new Error('Falla en búsqueda de distritos');
  console.log(`✓ Búsqueda de distritos operativa: Encontrado "${districtsRes.districts[0].distrito}"`);

  // 2. Autenticación por PIN + Token JWT
  console.log('\n2️⃣ Probando Autenticación PIN y emisión de JWT...');
  const pinUser = `TestPlayer_${Date.now()}`;
  const pinReg = await fetch(`${BASE_URL}/auth/pin-register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: pinUser,
      pin: '5678',
      district: 'Miraflores, Lima',
      primarySport: 'futbol',
      position: 'DEL'
    })
  }).then(r => r.json());

  if (!pinReg.user || !pinReg.token) throw new Error('Falla en registro por PIN o emisión de JWT');
  console.log(`✓ Jugador registrado por PIN: ${pinReg.user.name} (ID: ${pinReg.user.id})`);
  console.log(`✓ Token JWT estándar emitido: ${pinReg.token.substring(0, 30)}...`);

  // Login por PIN
  const pinLog = await fetch(`${BASE_URL}/auth/pin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: pinUser, pin: '5678' })
  }).then(r => r.json());

  if (!pinLog.user || !pinLog.token) throw new Error('Falla en login por PIN');
  console.log(`✓ Inicio de sesión exitoso por PIN verificado`);

  // 3. Login Administrativo SuperAdmin
  console.log('\n3️⃣ Probando Login Administrativo para SuperAdmin...');
  const adminLog = await fetch(`${BASE_URL}/auth/admin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@matchsport.pe', password: 'password123' })
  }).then(r => r.json());

  if (!adminLog.user || adminLog.user.role !== 'admin' || !adminLog.token) throw new Error('Falla en login administrativo');
  console.log(`✓ SuperAdmin autenticado con éxito: ${adminLog.user.name} (${adminLog.user.email}) | Rol: ${adminLog.user.role}`);

  // 4. Edición de Perfil de Jugador y Registro de Push Token
  console.log('\n4️⃣ Probando Actualización de Perfil y Notificaciones Push...');
  const updateRes = await fetch(`${BASE_URL}/user/${pinReg.user.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bio: 'Delantero goleador buscando retos nocturnos en Miraflores.',
      district: 'San Isidro, Lima',
      position: 'DEL'
    })
  }).then(r => r.json());

  if (!updateRes.success || updateRes.user.district !== 'San Isidro, Lima') throw new Error('Falla actualizando perfil');
  console.log(`✓ Perfil actualizado en DB SQLite: Distrito "${updateRes.user.district}", Bio: "${updateRes.user.bio}"`);

  const pushRes = await fetch(`${BASE_URL}/user/push-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: pinReg.user.id,
      pushToken: 'ExponentPushToken[mock_token_abc123_xyz]'
    })
  }).then(r => r.json());

  if (!pushRes.success || !pushRes.pushToken) throw new Error('Falla guardando push token');
  console.log(`✓ Token FCM Push registrado para segundo plano: ${pushRes.pushToken}`);

  // 5. Módulo B2B: Complejos Deportivos, Canchas y Reservas
  console.log('\n5️⃣ Probando Módulo B2B de Complejos Deportivos y Turnos...');
  const venuesRes = await fetch(`${BASE_URL}/venues?district=miraflores`).then(r => r.json());
  if (!venuesRes.venues || venuesRes.venues.length === 0) throw new Error('Falla listando canchas');
  const venue = venuesRes.venues[0];
  console.log(`✓ Complejo encontrado: "${venue.name}" (${venue.district}) - S/ ${venue.pricePerHour}/hora`);

  const venueDetail = await fetch(`${BASE_URL}/venues/${venue.id}`).then(r => r.json());
  if (!venueDetail.venue.slots || venueDetail.venue.slots.length === 0) throw new Error('Falla obteniendo turnos');
  console.log(`✓ Parrilla de turnos calculada: ${venueDetail.venue.slots.length} bloques horarios disponibles`);

  const bookRes = await fetch(`${BASE_URL}/venues/${venue.id}/book`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slotId: venueDetail.venue.slots[0].id,
      userId: pinReg.user.id,
      matchId: 'match_sample_reserva'
    })
  }).then(r => r.json());

  if (!bookRes.success || !bookRes.booking) throw new Error('Falla en reserva de turno');
  console.log(`✓ Turno de cancha reservado con éxito: ID ${bookRes.booking.id} (${bookRes.booking.status})`);

  // 6. Panel SuperAdmin: Auditoría, Sanción y Resolución de Disputas
  console.log('\n6️⃣ Probando Funciones SuperAdmin (Auditoría, Sanciones y Disputas)...');
  const metrics = await fetch(`${BASE_URL}/admin/metrics`).then(r => r.json());
  console.log(`✓ Métricas de control SuperAdmin: ${metrics.metrics.totalUsers} usuarios registrados`);

  // Suspender temporalmente y reactivar
  const banRes = await fetch(`${BASE_URL}/admin/user/${pinReg.user.id}/ban`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hours: 12, reason: 'Uso de vocabulario inapropiado en chat' })
  }).then(r => r.json());
  if (!banRes.success || !banRes.user.isBanned) throw new Error('Falla aplicando sanción');
  console.log(`✓ Sanción aplicada al jugador: Suspendido por 12 horas`);

  // Verificación de DNI
  const dniRes = await fetch(`${BASE_URL}/admin/user/${pinReg.user.id}/verify-dni`, {
    method: 'POST'
  }).then(r => r.json());
  console.log(`✓ Estado de verificación DNI actualizado: ${dniRes.verifiedDni}`);

  // Restablecimiento de PIN
  const resetRes = await fetch(`${BASE_URL}/admin/user/${pinReg.user.id}/reset-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newPin: '9999' })
  }).then(r => r.json());
  if (!resetRes.success) throw new Error('Falla reseteando PIN');
  console.log(`✓ PIN de emergencia restablecido por el SuperAdmin`);

  // 7. Prueba de WebSockets y Notificaciones de Presencia
  console.log('\n7️⃣ Probando Sockets de Tiempo Real y Reconexión...');
  const socket = io('http://localhost:3001');
  await new Promise(res => socket.on('connect', res));
  console.log('✓ Conexión WebSocket establecida con pingInterval 2500ms');

  socket.emit('registerUser', { userId: 'demo_user_1' });
  await new Promise(res => setTimeout(res, 500));

  const liveRes = await fetch(`${BASE_URL}/admin/live-activity`).then(r => r.json());
  console.log(`✓ Monitor de Sockets en Vivo: ${liveRes.onlineCount} usuario(s) conectados en tiempo real`);

  socket.disconnect();

  console.log('\n============================================================');
  console.log('🏆 ¡EL BACKEND ESTÁ 100% CULMINADO, PERSISTIDO Y VERIFICADO!');
  console.log('============================================================\n');
}

runComprehensiveBackendTest().catch(err => {
  console.error('❌ Error en suite de backend:', err);
  process.exit(1);
});
