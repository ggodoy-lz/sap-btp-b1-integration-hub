# Especificación Técnica de Arquitectura

## 1. Visión General
Esta solución establece una interfaz desacoplada y orientada a eventos para interactuar con **SAP Business One Service Layer (versión 2)** utilizando **SAP Cloud Integration (CPI)** en SAP BTP.

El objetivo central es eliminar conexiones punto a punto frágiles y garantizar alta disponibilidad, trazabilidad y gobernanza de nivel enterprise.

---

## 2. Componentes y Responsabilidades

```
┌──────────────────────────────┐
│       App Consumidora        │
│  (Portal Web / CRM / Móvil)  │
└──────────────┬───────────────┘
               │ HTTPS (JSON + Bearer Token / Basic Auth)
               ▼
┌──────────────────────────────┐
│    SAP Integration Suite     │
│   (Cloud Integration / CPI)  │
│                              │
│ • Validación de Payload      │
│ • Gestión de Sesión B1       │
│ • Groovy Script Engine       │
│ • Exception Subprocess       │
└──────────────┬───────────────┘
               │ HTTPS (OData v2 / v3 / v4)
               │ Cookie: B1SESSION=...; ROUTEID=.node1
               ▼
┌──────────────────────────────┐
│  SAP B1 Service Layer Server │
│   (HANA / MS SQL Backend)    │
└──────────────────────────────┘
```

### 2.1 App Consumidora
* Emite transacciones hacia el endpoint expuesto por SAP Cloud Integration.
* Envía un identificador único de trazabilidad en el encabezado: `X-Correlation-ID: <UUID>`.

### 2.2 SAP Cloud Integration (Middleware)
* **Punto de Entrada (Inbound Channel)**: Adaptador HTTPS con seguridad por roles (`ESBMessaging.send`).
* **Session Cache Manager**: Mantiene en memoria o en variables globales el par `(B1SESSION, ROUTEID)` junto con una marca de tiempo de expiración.
* **Manejo de Errores y Circuit Breaker**:
  * Si el Service Layer responde `401 Unauthorized`, un subproceso de excepción intercepta el código de respuesta, descarta la sesión de la caché, solicita un nuevo login a `/b1s/v2/Login` y reintenta la llamada original de forma transparente.
  * Si el Service Layer responde `500` o timeout, se enruta el mensaje hacia una cola de reintentos (*JMS Queue* o *Dead Letter Queue*) sin perder la transacción.

### 2.3 SAP Business One Service Layer
* Recibe solicitudes autenticadas a través de cookies de sesión.
* Ejecuta validaciones transaccionales nativas de B1 (reglas de negocio, stock, límites de crédito, listas de precios).
* Responde con códigos HTTP estándar (`200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized`).

---

## 3. Modelo de Autenticación y Ciclo de Vida de Sesión

### Petición de Login a SAP B1:
* **Endpoint**: `POST /b1s/v2/Login`
* **Headers**: `Content-Type: application/json`
* **Cuerpo de Petición**:
  ```json
  {
    "CompanyDB": "{{B1_COMPANY_DB}}",
    "UserName": "{{B1_USER}}",
    "Password": "{{B1_PASSWORD}}"
  }
  ```
* **Cabeceras de Respuesta Esperadas**:
  ```http
  Set-Cookie: B1SESSION=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx; HttpOnly; Path=/b1s/v2
  Set-Cookie: ROUTEID=.node1; Path=/b1s/v2
  ```
* **Cuerpo de Respuesta**:
  ```json
  {
    "odata.metadata": "https://server:50000/b1s/v2/$metadata#B1Sessions/@Element",
    "SessionId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "Version": "1000190",
    "SessionTimeout": 30
  }
  ```

---

## 4. Normalización de Datos (Contrato de Órdenes)

### Payload Inbound (Consumidor Externo hacia CPI):
```json
{
  "externalReference": "EXT-ORD-90812",
  "customerCode": "C20000",
  "orderDate": "2026-11-10",
  "deliveryDate": "2026-11-15",
  "currency": "USD",
  "lines": [
    {
      "itemCode": "A00001",
      "quantity": 5,
      "unitPrice": 120.00
    },
    {
      "itemCode": "A00002",
      "quantity": 2,
      "unitPrice": 45.50
    }
  ]
}
```

### Payload Outbound (CPI hacia B1 Service Layer `/b1s/v2/Orders`):
```json
{
  "CardCode": "C20000",
  "NumAtCard": "EXT-ORD-90812",
  "DocDate": "2026-11-10",
  "DocDueDate": "2026-11-15",
  "DocCurrency": "USD",
  "DocumentLines": [
    {
      "LineNum": 0,
      "ItemCode": "A00001",
      "Quantity": 5.0,
      "UnitPrice": 120.00
    },
    {
      "LineNum": 1,
      "ItemCode": "A00002",
      "Quantity": 2.0,
      "UnitPrice": 45.50
    }
  ]
}
```
