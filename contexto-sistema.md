# Contexto del Sistema — Control de Invitados en Ceremonias de Graduación
**Universidad Continental.** Documento de referencia final antes de construir. Pensado para pegarse como contexto inicial en `opencode`.

## Qué problema resuelve
Cada ceremonia de graduación tiene un aforo de invitados limitado. Hoy se reparte con una regla fija ("3 invitados por egresado") que desperdicia espacio: unos usan menos cupo del asignado, otros necesitan más, y no hay forma de reasignar ese espacio sobrante en el momento. El sistema debe repartir el aforo de forma dinámica y dar visibilidad en tiempo real a quienes manejan la puerta y a sus jefes.

## Roles del sistema

| Rol | Quién | Acceso | Permisos clave |
|---|---|---|---|
| `admin_general` | Nivel nacional, el "mandamás" | Login con usuario/contraseña (Supabase Auth) | Ve y administra **todas** las sedes, ceremonias, usuarios |
| `encargado` | Jefe de Grados y Títulos y su equipo, por sede | Login con usuario/contraseña | Crea/edita ceremonias de su sede, importa lista de egresados, ve dashboard y reportes de su sede |
| `operario` | Personal en sitio el día del evento | Login con usuario/contraseña | Check-in de invitados (QR/DNI), aprobar lista de espera, agregar invitados de último momento, control de entrega de toga/equipo, ve dashboard en tiempo real |
| `egresado` | El graduando | **Sin contraseña**: ingresa con DNI + Nombres + Apellidos, validado contra la lista que cargó el encargado | Registrar/editar sus propios invitados, confirmar asistencia |

No hay rol para el invitado: el invitado nunca entra al sistema, solo recibe/muestra su QR o dicta su DNI en la puerta.

## Flujo del egresado
1. Entra a la web pública, escribe su **DNI + Nombres + Apellidos**.
2. El sistema lo busca en la tabla `egresados` (cargada previamente por el encargado) y, si coincide, le abre su página personal — sin correos, sin links que puedan fallar, sin contraseñas que olvidar.
3. Ahí registra a sus invitados: DNI, nombres, apellidos. Si el invitado es menor de 7 años, se marca y se muestra un aviso (no se bloquea el registro).
4. Los primeros `cupo_base_invitado` (3 por defecto, configurable por ceremonia) quedan **aprobados** automáticamente. Del siguiente en adelante quedan **pendientes** (lista de espera).
5. Cada invitado aprobado obtiene una **invitación digital con QR**, con buen diseño visual (mencionar el nombre de la ceremonia, el invitado, y un QR grande y limpio), para que el egresado pueda compartirla por WhatsApp si quiere.
6. El egresado puede marcar "confirmo que voy a asistir" (función simple, beta).

## El problema de aforo, resuelto en dos capas
1. **Cupo base garantizado**: aprobado al instante, sin intervención humana.
2. **Lista de espera dinámica**: invitados adicionales quedan pendientes. Se liberan de dos formas posibles (a decidir cuál implementar primero):
   - **Manual**: el operario o encargado presiona un botón "Liberar lista de espera" el día del evento, y el sistema aprueba pendientes en orden de llegada (FIFO) hasta llenar el aforo libre.
   - **Programada**: cada ceremonia tiene un campo `hora_liberacion_espera` (ej. cuando los egresados ya están entrando). A esa hora, automáticamente se intenta liberar pendientes según el aforo libre real (egresados/invitados base que no llegaron).
   - Recomendación: implementar primero la versión manual (más simple y controlable), y dejar la automática como mejora posterior con un job programado.
   - El campo `espera_liberada` evita que el proceso se ejecute dos veces por error.

## Punto de control físico del egresado (entrega de equipo)
- Cada egresado recibe un **número correlativo** (`numero_orden`), asignado por orden alfabético de apellido al momento de importar la lista.
- Cuando el egresado llega a recoger su toga/equipo, el operario lo ubica por ese número, marca `equipo_entregado_at` y **retiene su DNI como garantía** (`dni_retenido = true`).
- El DNI se devuelve después (`dni_devuelto_at`), normalmente al término de la ceremonia.

## Carga de la lista de egresados
- **100% manual para esta versión**: el encargado sube un archivo Excel (columnas: DNI, Nombres, Apellidos, Programa académico, opcionalmente teléfono/email) al crear la ceremonia.
- El sistema ordena automáticamente por apellido y asigna `numero_orden` de forma correlativa al importar.
- No hay integración con el sistema académico de la universidad por ahora (queda como posible mejora futura).

## Operarios y dispositivos
- Usarán principalmente **sus propios celulares** (BYOD). Si el sistema funciona bien, la universidad evaluará comprar tablets Samsung Galaxy Tab S6 institucionales.
- Por eso el sistema **debe ser una PWA responsiva** (no una app nativa de tienda): funciona igual en celular personal, tablet institucional o computadora, sin instalación previa más que "agregar a pantalla de inicio".
- Debe soportar **modo con conexión inestable**: seguir registrando ingresos localmente y sincronizar cuando vuelva la señal.

## Invitados sin QR ni celular
- Si no tienen el QR pero recuerdan su DNI, el operario los busca por DNI (camino principal para estos casos).
- Si tampoco tienen eso a la mano, se contempla una **versión imprimible** de la invitación (PDF con el QR), aunque se espera que se use poco. La invitación digital debe verse bien (cuidar el diseño), porque también funciona como recuerdo bonito de la ceremonia, no solo como ticket funcional.

## Reportes
- Se necesitan **reportes post-ceremonia** (Excel y/o PDF) para la oficina de Grados y Títulos: total de egresados, cuántos confirmaron, cuántos llegaron, total de invitados por estado (aprobados/pendientes/rechazados), cuántos ingresaron, aforo usado vs. disponible.
- Se generan a demanda desde el dashboard del encargado/admin_general, ya con la ceremonia finalizada (aunque debe poder generarse en cualquier momento, incluso a media ceremonia).

## Seguridad y privacidad (decisiones para esta versión beta)
- No hay autenticación fuerte para el egresado: una vez que entra con DNI + nombre, puede gestionar sus invitados. Riesgo aceptado conscientemente para esta versión por simplicidad; se podría reforzar más adelante (ej. código adicional enviado por SMS) si se detecta abuso.
- Los datos personales de invitados se archivan/anonimizan después de cada ceremonia; se conservan solo las cifras agregadas para los reportes históricos.
- Toda acción sensible (aprobar pendientes, agregar invitados de última hora, crear/editar ceremonias) se registra en la tabla `auditoria`.

## Idioma
- Solo español por ahora. Quechua queda como posible mejora futura (quienes usan el formulario de invitados son los egresados, que manejan español).

## Notificaciones
- Fuera de alcance para esta versión: avisar al egresado por WhatsApp/correo cuando su invitado pendiente pasa a aprobado. Queda para una versión futura.

## Decisiones de arquitectura
- **Frontend:** Next.js (React) + Tailwind CSS, como PWA responsiva (web/tablet/celular).
- **Backend:** Supabase (Postgres + Auth + tiempo real) — los roles `admin_general`, `encargado` y `operario` usan Supabase Auth con políticas RLS por sede; el `egresado` no usa Supabase Auth, se valida por DNI+apellido contra la tabla `egresados` mediante una función propia.
- **Modelo de datos:** ya definido en `schema.sql` — tablas `sedes`, `usuarios`, `ceremonias`, `egresados`, `invitados`, `auditoria`, vista `v_resumen_ceremonia`.
- **Herramientas de construcción:** `opencode` (agente de código en terminal) para escribir y modificar el proyecto; `Google Stitch` para generar los primeros bocetos visuales de cada pantalla, que luego se afinan con `opencode`.

## Pantallas necesarias (resumen)
1. Login de egresado (DNI + nombres + apellidos).
2. Página personal del egresado (lista de invitados, botón agregar, estado de cada uno, confirmar asistencia).
3. Invitación digital del invitado (QR + datos, diseño bonito, compartible).
4. Login de staff (encargado/operario/admin_general).
5. Panel del operario: control de puerta (buscar por QR/DNI, marcar ingreso, aprobar pendientes, agregar invitado de última hora, control de entrega de equipo).
6. Dashboard en tiempo real (compartido por encargado, operario y admin_general, con distinto nivel de detalle).
7. Panel del encargado: crear/editar ceremonia, importar Excel de egresados, generar reportes.
8. Panel del admin_general: selector de sede, vista comparativa entre sedes, gestión de usuarios encargados/operarios.
