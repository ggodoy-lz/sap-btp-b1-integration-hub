import com.sap.gateway.ip.core.customdev.util.Message
import java.util.HashMap

/**
 * Script Groovy para captura y guardado de nuevas cookies de sesión tras un POST /b1s/v2/Login exitoso.
 */
def Message processData(Message message) {
    def headers = message.getHeaders()
    
    // Obtener cabecera Set-Cookie devuelta por SAP B1 Service Layer
    def setCookieHeader = headers.get("Set-Cookie")
    
    String b1Session = null
    String routeId = ".node1"
    
    if (setCookieHeader != null) {
        def cookies = (setCookieHeader instanceof List) ? setCookieHeader : [setCookieHeader.toString()]
        
        for (cookie in cookies) {
            if (cookie.contains("B1SESSION=")) {
                def matcher = (cookie =~ /B1SESSION=([^;]+)/)
                if (matcher.find()) {
                    b1Session = matcher.group(1)
                }
            }
            if (cookie.contains("ROUTEID=")) {
                def matcher = (cookie =~ /ROUTEID=([^;]+)/)
                if (matcher.find()) {
                    routeId = matcher.group(1)
                }
            }
        }
    }
    
    if (b1Session != null) {
        // Guardar sesión en propiedades del mensaje para posterior almacenamiento en Global Variable
        message.setProperty("B1_CACHED_SESSION", b1Session)
        message.setProperty("B1_CACHED_ROUTEID", routeId)
        
        // Timeout estándar de B1 = 30 minutos (1800 segundos)
        long expiresAt = java.time.Instant.now().getEpochSecond() + 1800
        message.setProperty("B1_SESSION_EXPIRES_AT", expiresAt.toString())
        
        // Inyectar en la petición saliente actual
        message.setHeader("Cookie", "B1SESSION=" + b1Session + "; ROUTEID=" + routeId)
    }

    return message
}
