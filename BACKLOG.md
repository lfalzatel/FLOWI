# Backlog de Funciones (FLOWI)

Este documento registra las futuras funcionalidades de la aplicación, ordenadas desde las de mayor prioridad, menor dificultad y mayor impacto (más urgentes) hasta las más complejas y/o de pago.

## Prioridad Alta / Impacto Inmediato
1. **Multi-moneda (Fix formato COP)**
   - *Urgente / Dificultad Muy Baja*: Corregir el formato numérico base que actualmente está en pesos mexicanos (es-MX) a pesos colombianos (es-CO). 
   - *Multi-moneda (Futuro)*: Soporte real para múltiples divisas y conversión. (Dificultad Alta).
2. **Proyección de cierre de mes**
   - *Impacto Alto / Dificultad Baja*: Gráfica o métrica que indica en cuánto cerrará el mes el usuario según su ritmo de gasto diario.
3. **Bloqueo con PIN / Biometría (WebAuthn)**
   - *Impacto Alto / Dificultad Media*: Agregar capa de privacidad esencial al iniciar la PWA.

## Prioridad Media / Funciones Clave (Core)
4. **Metas de ahorro**
   - *Impacto Alto / Dificultad Media-Baja*: Crear metas específicas (vacaciones, fondo de emergencias) con barras de progreso visuales.
5. **Presupuesto por categoría**
   - *Impacto Alto / Dificultad Media*: Establecer un límite máximo de gasto mensual por categoría específica (ej. "máximo $300.000 en restaurantes").
6. **Reporte mensual inteligente**
   - *Impacto Alto / Dificultad Media*: Resumen automático tipo "Spotify Wrapped" al terminar el mes (Ej. "Gastaste 18% más que el mes anterior").
7. **Gastos recurrentes automáticos**
   - *Impacto Alto / Dificultad Media-Alta*: Transacciones programadas que se crean solas cada mes (Netflix, EPM, Arriendo). Requiere Cloud Functions (Servidor backend).

## Prioridad Baja / Alta Complejidad
8. **Gastos compartidos / División**
   - *Impacto Medio / Dificultad Alta*: Flujos de dividir cuentas ("¿Cuánto me deben?"). Requiere validación cruzada entre usuarios y notificaciones P2P.
9. **Escáner de recibos / facturas**
   - *Impacto Alto / Dificultad Muy Alta*: Tomar una foto al recibo y extraer montos y comercios. Requiere integración de pago con APIs de IA (Google Cloud Vision o GPT-4o-mini).
10. **Widget de pantalla de inicio**
    - *Impacto Medio / Dificultad Muy Alta*: Los widgets para PWAs web en iOS son prácticamente inviables nativamente en la Home Screen. Requiere Workarounds con Shortcuts de iOS o volver la app nativa.
