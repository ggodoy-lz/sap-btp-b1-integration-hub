import com.sap.gateway.ip.core.customdev.util.Message
import groovy.json.JsonSlurper
import groovy.json.JsonOutput

/**
 * Normaliza y transforma el payload entrante (JSON plano de e-commerce/CRM)
 * al esquema OData requerido por SAP Business One Orders (/b1s/v2/Orders).
 */
def Message processData(Message message) {
    def body = message.getBody(String)
    def jsonSlurper = new JsonSlurper()
    def input = jsonSlurper.parseText(body)

    // Construcción del documento de pedido para SAP Business One
    def b1Order = [
        CardCode     : input.customerCode,
        NumAtCard    : input.externalReference ?: ("EXT-" + System.currentTimeMillis()),
        DocDate      : input.orderDate ?: java.time.LocalDate.now().toString(),
        DocDueDate   : input.deliveryDate ?: java.time.LocalDate.now().plusDays(3).toString(),
        DocCurrency  : input.currency ?: "USD",
        Comments     : "Creado automáticamente vía SAP BTP Cloud Integration",
        DocumentLines: []
    ]

    // Mapeo iterativo de las líneas de detalle
    input.lines.eachWithIndex { line, index ->
        b1Order.DocumentLines.add([
            LineNum   : index,
            ItemCode  : line.itemCode,
            Quantity  : (line.quantity as Double) ?: 1.0,
            UnitPrice : (line.unitPrice as Double) ?: 0.0,
            TaxCode   : line.taxCode ?: "IVA_10" // Código de impuesto según localización
        ])
    }

    // Convertir de nuevo a formato JSON estructurado
    String outputJson = JsonOutput.toJson(b1Order)
    message.setBody(outputJson)
    message.setHeader("Content-Type", "application/json")

    return message
}
