async function testAuth() {
  console.log('🧪 Probando flujo de registro con deporte favorito, posición y tope de 70...');

  // 1. Registro nuevo eligiendo PÁDEL como deporte favorito y REVÉS como posición
  const regRes = await fetch('http://localhost:3001/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'rodrigo.padel@test.pe',
      password: 'password123',
      name: 'Rodrigo Pádel',
      district: 'Miraflores, Lima',
      favoriteSports: ['padel', 'futbol'],
      primarySport: 'padel',
      position: 'REVES',
      declaredLevel: 'Avanzado'
    })
  });

  const regData = await regRes.json();
  if (!regRes.ok || !regData.user) {
    console.error('❌ Error en registro:', regData);
    process.exit(1);
  }

  const u = regData.user;
  console.log(`✓ Usuario registrado: ${u.name} (${u.email})`);
  console.log(`  Deporte Principal: ${u.primarySport} | Posición: ${u.position}`);
  console.log(`  Deportes Favoritos: ${u.favoriteSports.join(', ')}`);
  console.log(`  Carta FUT Inicial: RIT ${u.futStats.rit}, TIR ${u.futStats.tir}, PAS ${u.futStats.pas}, REG ${u.futStats.reg}, DEF ${u.futStats.def}, FÍS ${u.futStats.fis} | OVR: ${u.futStats.ovr}`);

  // Verificar que NINGÚN número supere 70
  const stats = [u.futStats.rit, u.futStats.tir, u.futStats.pas, u.futStats.reg, u.futStats.def, u.futStats.fis, u.futStats.ovr];
  const maxStat = Math.max(...stats);
  console.log(`  Valor máximo en la tarjeta: ${maxStat}`);
  if (maxStat > 70) {
    console.error(`❌ Falló la condición: una estadística supera 70 (${maxStat})`);
    process.exit(1);
  } else {
    console.log(`✓ Verificación exitosa: Ningún número supera el tope de 70 para recién registrados.`);
  }

  // 2. Probar Inicio de Sesión
  const loginRes = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'rodrigo.padel@test.pe',
      password: 'password123'
    })
  });
  const loginData = await loginRes.json();
  if (loginRes.ok && loginData.user) {
    console.log(`✓ Inicio de sesión exitoso para: ${loginData.user.name}`);
  } else {
    console.error('❌ Error en login:', loginData);
    process.exit(1);
  }

  console.log('🎉 ¡TODAS LAS PRUEBAS DE AUTENTICACIÓN PASARON AL 100%!');
  process.exit(0);
}

testAuth().catch(err => {
  console.error(err);
  process.exit(1);
});
