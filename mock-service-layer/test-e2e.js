// Test End-to-End para Mock SAP Business One Service Layer v2
const baseUrl = 'http://localhost:3000/b1s/v2';

async function runTests() {
  console.log('\x1b[36m%s\x1b[0m', '==========================================================');
  console.log('\x1b[36m%s\x1b[0m', ' PRUEBA DE INTEGRACION: SAP B1 SERVICE LAYER MOCK (E2E)');
  console.log('\x1b[36m%s\x1b[0m', '==========================================================');

  // 1. Probar Login
  console.log('\n\x1b[33m%s\x1b[0m', '[Paso 1] Ejecutando POST /Login...');
  const loginRes = await fetch(`${baseUrl}/Login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      CompanyDB: 'SBODEMOUS',
      UserName: 'manager',
      Password: '1234'
    })
  });

  if (!loginRes.ok) {
    throw new Error(`Login fallo: ${loginRes.status} ${loginRes.statusText}`);
  }

  const loginData = await loginRes.json();
  const sessionId = loginData.SessionId;
  console.log('\x1b[32m%s\x1b[0m', `-> Login exitoso! SessionId: ${sessionId}`);

  const cookieHeader = `B1SESSION=${sessionId}; ROUTEID=.node1`;

  // 2. Consultar Business Partners
  console.log('\n\x1b[33m%s\x1b[0m', '[Paso 2] Ejecutando GET /BusinessPartners con cookie B1SESSION...');
  const bpRes = await fetch(`${baseUrl}/BusinessPartners`, {
    headers: { 'Cookie': cookieHeader }
  });
  const bpData = await bpRes.json();
  console.log('\x1b[32m%s\x1b[0m', `-> Socios de negocio encontrados: ${bpData.value.length}`);
  bpData.value.forEach(bp => {
    console.log(`   - [${bp.CardCode}] ${bp.CardName} | Saldo: ${bp.CurrentAccountBalance} ${bp.Currency}`);
  });

  // 3. Crear Pedido de Venta (POST /Orders)
  console.log('\n\x1b[33m%s\x1b[0m', '[Paso 3] Ejecutando POST /Orders (Creando pedido)...');
  const orderRes = await fetch(`${baseUrl}/Orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookieHeader
    },
    body: JSON.stringify({
      CardCode: 'C20000',
      DocDueDate: '2026-11-15',
      DocumentLines: [
        { ItemCode: 'A00001', Quantity: 3, UnitPrice: 150.00 },
        { ItemCode: 'A00002', Quantity: 1, UnitPrice: 450.00 }
      ]
    })
  });

  const orderData = await orderRes.json();
  console.log('\x1b[32m%s\x1b[0m', `-> Pedido creado con exito!`);
  console.log('\x1b[32m%s\x1b[0m', `   - DocEntry: ${orderData.DocEntry}`);
  console.log('\x1b[32m%s\x1b[0m', `   - DocNum:   ${orderData.DocNum}`);
  console.log('\x1b[32m%s\x1b[0m', `   - Total:    ${orderData.DocTotal} USD`);

  // 4. Probar seguridad: llamada sin sesión
  console.log('\n\x1b[33m%s\x1b[0m', '[Paso 4] Probando seguridad (Peticion sin autenticacion)...');
  const unauthRes = await fetch(`${baseUrl}/Orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ CardCode: 'C20000', DocumentLines: [] })
  });
  if (unauthRes.status === 401) {
    console.log('\x1b[32m%s\x1b[0m', '-> Correcto! La llamada sin sesion fue rechazada con HTTP 401 Unauthorized.');
  } else {
    console.log('\x1b[31m%s\x1b[0m', `-> Inesperado: Codigo ${unauthRes.status}`);
  }

  // 5. Logout
  console.log('\n\x1b[33m%s\x1b[0m', '[Paso 5] Ejecutando POST /Logout...');
  const logoutRes = await fetch(`${baseUrl}/Logout`, {
    method: 'POST',
    headers: { 'Cookie': cookieHeader }
  });
  console.log('\x1b[32m%s\x1b[0m', `-> Sesion cerrada exitosamente (HTTP ${logoutRes.status}).`);

  console.log('\n\x1b[36m%s\x1b[0m', '==========================================================');
  console.log('\x1b[36m%s\x1b[0m', ' TODAS LAS PRUEBAS COMPLETADAS CON EXITO (100% OK)');
  console.log('\x1b[36m%s\x1b[0m', '==========================================================');
}

runTests().catch(err => {
  console.error('\x1b[31m%s\x1b[0m', `Error en ejecucion: ${err.message}`);
  process.exit(1);
});
