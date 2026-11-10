# Guía de Configuración: SAP BTP Destination para B1 Service Layer

Esta guía documenta los pasos para registrar el **Service Layer de SAP Business One** como un servicio de destino (*Destination*) seguro dentro de tu subcuenta de SAP BTP.

---

## 1. Por qué usar BTP Destinations
* **Centralización**: Si la IP, puerto o credenciales de B1 cambian, solo se actualiza el Destination sin necesidad de re-desplegar ni modificar los flujos de integración (*iFlows*).
* **Seguridad Zero-Trust**: Las contraseñas maestras de SAP B1 nunca se exponen a desarrolladores ni a los logs de Cloud Integration.

---

## 2. Tipos de Conectividad

Dependiendo de dónde resida el servidor de SAP Business One:

| Escenario | Ubicación de B1 | Tipo de Proxy en BTP | Herramienta Requerida |
| :--- | :--- | :--- | :--- |
| **Escenario A: On-Premise / Servidor Local** | Red interna de la empresa / VPN | `OnPremise` | **SAP Cloud Connector (SCC)** instalado localmente |
| **Escenario B: B1 Cloud / Servidor Público** | Servidor con IP pública / FQDN SSL | `Internet` | Certificado SSL público válido |

---

## 3. Configuración del Destination en BTP Cockpit

1. Ingresa a tu **Subaccount** de SAP BTP:
   `https://cockpit.hanatrial.ondemand.com/trial/#/subaccount/228df003-f6c6-47eb-b1c0-6b73496c6035`
2. En el menú lateral izquierdo, ve a **Connectivity** $\rightarrow$ **Destinations**.
3. Haz clic en **Create Destination** y completa los siguientes parámetros:

### Parámetros Principales:
* **Name**: `B1_SERVICE_LAYER`
* **Type**: `HTTP`
* **Description**: `Conexión al Service Layer de SAP Business One`
* **URL**:
  * Para Cloud: `https://tu-servidor-b1.com:50000/b1s/v2`
  * Para OnPremise (vía Cloud Connector): `http://virtual-b1-host:50000/b1s/v2`
* **Proxy Type**: `Internet` (o `OnPremise`)
* **Authentication**: `BasicAuthentication`
* **User**: `manager` (o tu usuario técnico de B1)
* **Password**: `********`

---

## 4. Propiedades Adicionales (*Additional Properties*)

Agrega las siguientes propiedades clave haciendo clic en **New Property**:

| Clave | Valor | Descripción |
| :--- | :--- | :--- |
| `B1_CompanyDB` | `SBODEMOUS` | Nombre de la base de datos de la compañía en B1 |
| `TrustAll` | `true` *(solo pruebas)* | Para aceptar certificados autofirmados de laboratorio |
| `WebIDEEnabled` | `true` | Permite el consumo desde herramientas de desarrollo SAP |
| `HTML5.DynamicDestination` | `true` | Habilita el enrutamiento dinámico |

---

## 5. Comprobación de Conectividad (Check Connection)
1. Haz clic en **Save**.
2. Presiona el botón **Check Connection**.
3. Debe retornar el estado:  
   `Connection to "B1_SERVICE_LAYER" established. Response code: 200 / 401`.

---

## 6. Consumo desde SAP Cloud Integration (iFlow)
En el adaptador HTTP del iFlow:
* **Address**: `{{B1_SERVICE_LAYER_URL}}/Orders`
* **Authentication**: Seleccionar la credencial configurada en el **Security Material** o usar el servicio de Destination mediante el componente de llamada externa.
