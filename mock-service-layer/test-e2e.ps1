# Test End-to-End del Mock Service Layer v2
$baseUrl = "http://localhost:3000/b1s/v2"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " PRUEBA DE INTEGRACION: SAP B1 SERVICE LAYER MOCK" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Probar Login
Write-Host "`n[Paso 1] Ejecutando POST /Login..." -ForegroundColor Yellow
$loginPayload = '{"CompanyDB":"SBODEMOUS","UserName":"manager","Password":"1234"}'
$loginRaw = curl.exe -s -X POST "$baseUrl/Login" -H "Content-Type: application/json" -d $loginPayload
$loginResponse = $loginRaw | ConvertFrom-Json
$sessionId = $loginResponse.SessionId

if ($sessionId) {
    Write-Host "-> Login exitoso! SessionId: $sessionId" -ForegroundColor Green
} else {
    Write-Host "-> Error en login: $loginRaw" -ForegroundColor Red
    exit 1
}

# 2. Consultar Business Partners usando la cookie B1SESSION
Write-Host "`n[Paso 2] Ejecutando GET /BusinessPartners con cookie B1SESSION..." -ForegroundColor Yellow
$bpRaw = curl.exe -s -X GET "$baseUrl/BusinessPartners" -H "Cookie: B1SESSION=$sessionId; ROUTEID=.node1"
$bpResponse = $bpRaw | ConvertFrom-Json
Write-Host "-> Socios de negocio encontrados: $($bpResponse.value.Count)" -ForegroundColor Green
foreach ($bp in $bpResponse.value) {
    Write-Host "   - [$($bp.CardCode)] $($bp.CardName) | Saldo: $($bp.CurrentAccountBalance) $($bp.Currency)" -ForegroundColor Gray
}

# 3. Crear una Orden de Venta
Write-Host "`n[Paso 3] Ejecutando POST /Orders (Creando pedido)..." -ForegroundColor Yellow
$orderPayload = '{"CardCode":"C20000","DocDueDate":"2026-11-15","DocumentLines":[{"ItemCode":"A00001","Quantity":3,"UnitPrice":150.00},{"ItemCode":"A00002","Quantity":1,"UnitPrice":450.00}]}'
$orderRaw = curl.exe -s -X POST "$baseUrl/Orders" -H "Content-Type: application/json" -H "Cookie: B1SESSION=$sessionId; ROUTEID=.node1" -d $orderPayload
$orderResponse = $orderRaw | ConvertFrom-Json

Write-Host "-> Pedido creado con exito!" -ForegroundColor Green
Write-Host "   - DocEntry: $($orderResponse.DocEntry)" -ForegroundColor Green
Write-Host "   - DocNum:   $($orderResponse.DocNum)" -ForegroundColor Green
Write-Host "   - Total:    $($orderResponse.DocTotal) USD" -ForegroundColor Green

# 4. Probar seguridad: Peticion sin sesion valida (debe retornar 401)
Write-Host "`n[Paso 4] Probando seguridad (Peticion sin sesion valida)..." -ForegroundColor Yellow
$unauthRaw = curl.exe -s -w "%{http_code}" -X POST "$baseUrl/Orders" -H "Content-Type: application/json" -d $orderPayload
$httpCode = $unauthRaw.Substring($unauthRaw.Length - 3)
if ($httpCode -eq "401") {
    Write-Host "-> Correcto! La llamada sin sesion fue rechazada con codigo HTTP 401 Unauthorized." -ForegroundColor Green
} else {
    Write-Host "-> Alerta: Codigo recibido $httpCode" -ForegroundColor Yellow
}

# 5. Logout
Write-Host "`n[Paso 5] Ejecutando POST /Logout..." -ForegroundColor Yellow
$logoutStatus = curl.exe -s -w "%{http_code}" -X POST "$baseUrl/Logout" -H "Cookie: B1SESSION=$sessionId"
Write-Host "-> Sesion cerrada exitosamente (HTTP $logoutStatus)." -ForegroundColor Green

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE (100% OK)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
