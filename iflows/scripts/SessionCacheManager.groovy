import com.sap.gateway.ip.core.customdev.util.Message
import java.util.HashMap
import java.time.Instant

/**
 * Script Groovy para gestión inteligente de sesión en SAP Cloud Integration (CPI).
 * Reutiliza cookies B1SESSION y ROUTEID almacenadas en Global Variables para evitar
 * sobrecargar el Service Layer con llamadas de Login innecesarias.
 */
def Message processData(Message message) {
    // 1. Obtener acceso al contexto de propiedades y variables globales
    def properties = message.getProperties()
    def headers = message.getHeaders()
    
    // 2. Intentar recuperar la sesión en caché desde Global Variables
    // En Cloud Integration, se puede usar MessageContext o DataStore API
    String cachedB1Session = message.getProperty("B1_CACHED_SESSION")
    String cachedRouteId = message.getProperty("B1_CACHED_ROUTEID")
    Long sessionExpiresAt = message.getProperty("B1_SESSION_EXPIRES_AT") ? Long.parseLong(message.getProperty("B1_SESSION_EXPIRES_AT").toString()) : 0L
    
    long currentTime = Instant.now().getEpochSecond()
    
    // Margen de seguridad de 60 segundos antes de la expiración real
    boolean isSessionValid = (cachedB1Session != null && cachedB1Session.trim().length() > 0 && currentTime < (sessionExpiresAt - 60))

    if (isSessionValid) {
        // La sesión está vigente en caché: inyectar las cookies de sesión en las cabeceras HTTP
        String cookieHeader = "B1SESSION=" + cachedB1Session + "; ROUTEID=" + (cachedRouteId ?: ".node1")
        message.setHeader("Cookie", cookieHeader)
        message.setProperty("PerformLogin", "false")
    } else {
        // La sesión no existe o caducó: marcar para ejecutar la sub-ruta de POST /Login
        message.setProperty("PerformLogin", "true")
    }

    return message
}
