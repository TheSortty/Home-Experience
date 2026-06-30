export type ChangelogItemType = 'nuevo' | 'mejorado' | 'corregido' | 'removido';

export interface ChangelogItem {
  type: ChangelogItemType;
  text: string;
}

export interface ChangelogVersion {
  version: string;
  date: string;
  title: string;
  description?: string;
  items: ChangelogItem[];
}

export const CHANGELOG: ChangelogVersion[] = [
  {
    version: '1.7',
    date: '30 jun 2026',
    title: 'Novedades del sistema y accesos rápidos en LMS',
    description: 'Panel de changelog en el admin y mejoras de usabilidad para la gestión de entregas.',
    items: [
      { type: 'nuevo',    text: 'Esta página: historial de cambios del sistema accesible desde el sidebar y el menú de perfil.' },
      { type: 'nuevo',    text: 'Toggle de un click para activar/desactivar entregas por clase directamente desde la vista de módulos, sin abrir el formulario completo.' },
      { type: 'nuevo',    text: 'Botón "Ver entregas" por clase: lleva directo a las submissions de esa lección sin pasar por el listado general.' },
    ],
  },
  {
    version: '1.6',
    date: '25 jun 2026',
    title: 'Acceso de coaches al LMS',
    items: [
      { type: 'corregido', text: 'Los coaches eran devueltos al campus cada vez que intentaban entrar a la sección de entregas. Ahora tienen acceso correcto a /admin/lms y todas sus subsecciones.' },
    ],
  },
  {
    version: '1.5',
    date: '23 jun 2026',
    title: 'Expansión de base de datos',
    description: 'Infraestructura para funcionalidades futuras.',
    items: [
      { type: 'nuevo',    text: 'Nuevas tablas para información médica y de salud de alumnos.' },
      { type: 'nuevo',    text: 'Sistema de notificaciones: tabla y estructura para enviar notificaciones dentro del campus.' },
      { type: 'nuevo',    text: 'Tabla de objetivos: los alumnos podrán registrar y trackear sus metas.' },
      { type: 'nuevo',    text: 'Módulos LMS extendidos con nuevos campos de seguimiento y progreso.' },
      { type: 'mejorado', text: 'Consolidación de todas las migraciones históricas en un único script de inicialización.' },
    ],
  },
  {
    version: '1.4',
    date: '20 jun 2026',
    title: 'Coaches, entregas múltiples e inscripción masiva',
    description: 'La actualización más grande del sistema de entregas hasta la fecha.',
    items: [
      { type: 'nuevo',    text: 'Los coaches pueden ver y gestionar las entregas de sus alumnos asignados desde /admin/lms.' },
      { type: 'nuevo',    text: 'Inscripción masiva: podés seleccionar e inscribir múltiples alumnos a un programa en una sola acción.' },
      { type: 'nuevo',    text: 'Devoluciones con múltiples archivos: un coach puede adjuntar varios archivos corregidos al responder una entrega.' },
      { type: 'nuevo',    text: 'Entregas adicionales: el coach puede habilitar que un alumno sume archivos extra a una entrega ya enviada.' },
      { type: 'mejorado', text: 'Límite de archivos subido de 3 MB a 5 MB por archivo.' },
      { type: 'mejorado', text: 'Límite del servidor elevado a 50 MB para soportar uploads de múltiples archivos pesados.' },
      { type: 'mejorado', text: 'Los admins ya no generan registros en el panel de actividad (elimina ruido en la bandeja).' },
      { type: 'corregido', text: 'Solo los admins pueden borrar publicaciones del foro; antes los coaches también podían.' },
    ],
  },
  {
    version: '1.3',
    date: 'may 2026',
    title: 'Nuevo panel de administración',
    description: 'Rediseño completo del panel admin con su propio layout y estructura.',
    items: [
      { type: 'nuevo',    text: 'Panel de administración con sidebar propio, topbar con búsqueda global y menú de perfil.' },
      { type: 'nuevo',    text: 'Módulo de Personas: gestión de alumnos, coaches y contactos desde el admin.' },
      { type: 'nuevo',    text: 'Modal de bienvenida para alumnos que ingresan por primera vez: les pide completar su perfil.' },
      { type: 'nuevo',    text: 'Recortador de imagen integrado para fotos de perfil.' },
      { type: 'mejorado', text: 'Renderizado del contenido de cursos extraído a un componente dedicado, mejorando la performance.' },
      { type: 'mejorado', text: 'Foro de la comunidad reorganizado con componentes más estables.' },
      { type: 'corregido', text: 'Errores de I/O en el worker de Cloudflare al recuperar sesiones con alta carga.' },
    ],
  },
  {
    version: '1.2',
    date: 'may 2026',
    title: 'CAMPUS, actividad del staff y sistema de coaches',
    description: 'Infraestructura completa del campus y sistema de roles diferenciados.',
    items: [
      { type: 'nuevo',    text: 'Sistema de actividad del staff: todas las acciones importantes quedan registradas en la bandeja de actividad con timestamps.' },
      { type: 'nuevo',    text: 'Rol de coach con permisos diferenciados: pueden revisar entregas y chatear con alumnos, pero no acceden a herramientas de admin.' },
      { type: 'nuevo',    text: 'Soporte para múltiples videos por clase en el LMS, con nueva tabla de video asociada.' },
      { type: 'nuevo',    text: 'Formularios con opciones dinámicas: el editor permite agregar/quitar opciones de selección sin tocar código.' },
      { type: 'nuevo',    text: 'Infraestructura de revisión de entregas: formulario inline, estado de entrega, hilo de chat privado alumno-coach.' },
      { type: 'nuevo',    text: 'Cursos publicados visibles públicamente sin necesidad de login.' },
      { type: 'mejorado', text: 'Dashboard carga todos los datos en paralelo (Promise.all): inicio notablemente más rápido.' },
      { type: 'mejorado', text: 'Datos en tiempo real con Supabase Realtime: inscripciones, alumnos y actividad se actualizan solos.' },
      { type: 'mejorado', text: 'Carga de cursos en el admin reescrita para evitar pérdida de datos y soportar edición concurrente.' },
      { type: 'corregido', text: 'El contador de alumnos en el dashboard mostraba un número incorrecto.' },
      { type: 'corregido', text: 'Parpadeo de datos al cargar el dashboard por primera vez.' },
      { type: 'corregido', text: 'Las cookies seguras fallaban en producción causando cierre de sesión inesperado.' },
      { type: 'corregido', text: 'El badge de notificaciones no se actualizaba de forma inmediata al llegar nuevas actividades.' },
      { type: 'corregido', text: 'Los materiales sin guardar se perdían si el admin navegaba antes de hacer click en "Guardar".' },
    ],
  },
  {
    version: '1.1',
    date: 'abr – may 2026',
    title: 'LMS completo, Google Reviews y auth estable',
    description: 'Cierre del campus LMS con todas sus funcionalidades y estabilización total del sistema de autenticación.',
    items: [
      { type: 'nuevo',    text: 'Integración con Google Reviews: las reseñas se sincronizan automáticamente desde Google Maps.' },
      { type: 'nuevo',    text: 'El calendario del campus muestra sesiones de cursos y fechas de ciclos.' },
      { type: 'mejorado', text: 'Campus LMS completado: currículo de cursos, viewer de clases, sistema de entrega de trabajos y permisos por alumno.' },
      { type: 'mejorado', text: 'Migraciones unificadas en un único archivo de inicialización. Credenciales seguras fuera del repositorio.' },
      { type: 'corregido', text: 'Bucle infinito al recuperar contraseña desde ciertos clientes de email.' },
      { type: 'corregido', text: 'Spinner infinito al ingresar por primera vez desde el link de activación de cuenta.' },
      { type: 'corregido', text: 'Logout del servidor ahora invalida la sesión antes de redirigir, evitando loops.' },
      { type: 'corregido', text: 'El formulario de email en inscripciones no guardaba la dirección de correo.' },
      { type: 'corregido', text: 'Varios bugs críticos de CRUD encontrados en auditoría: edición, borrado y creación fallaban en ciertos casos.' },
      { type: 'corregido', text: 'Crash al inicializar Supabase en tiempo de build (lazy-init implementado).' },
      { type: 'corregido', text: 'Errores de seguridad CSP: Cloudflare Insights y recursos externos bloqueados por las cabeceras.' },
    ],
  },
  {
    version: '1.0',
    date: 'abr 2026',
    title: 'Lanzamiento del sistema de gestión',
    description: 'Primera versión del sistema de administración interno de Home Experience.',
    items: [
      { type: 'nuevo', text: 'Panel de administración con gestión de inscripciones, alumnos, programas y calendario.' },
      { type: 'nuevo', text: 'Sistema LMS: módulos, clases, currículum de cursos y viewer para alumnos.' },
      { type: 'nuevo', text: 'Calendario de admin con modal de detalle de alumno y seguimiento de ciclos.' },
      { type: 'nuevo', text: 'Autenticación completa: login, registro, recuperación de contraseña y setup de cuenta nueva.' },
      { type: 'nuevo', text: 'Deploy en Cloudflare Workers con configuración de bindings y R2 para almacenamiento de archivos.' },
    ],
  },
  {
    version: '0.9',
    date: '31 mar 2026',
    title: 'Realtime y dashboard estable',
    description: 'El dashboard deja de depender de polling manual y pasa a ser reactivo en tiempo real.',
    items: [
      { type: 'nuevo',    text: 'Supabase Realtime integrado en el dashboard: inscripciones, alumnos y calendario se actualizan solos sin recargar.' },
      { type: 'nuevo',    text: 'Auto-refresh del dashboard al volver a poner el foco en la pestaña.' },
      { type: 'corregido', text: 'Race condition al iniciar: el dashboard a veces cargaba vacío en el primer render porque los datos llegaban antes que el rol del usuario.' },
      { type: 'corregido', text: 'getSession() reemplazado por getUser() para evitar lecturas de token expirado en caché.' },
    ],
  },
  {
    version: '0.8',
    date: 'mar 2026',
    title: 'WhatsApp, coaches y retiros',
    description: 'Mejoras en el flujo comercial y actualización de la sección de retiros.',
    items: [
      { type: 'nuevo',    text: 'Redirects a WhatsApp desde los botones de programas y selección de coach para coaching individual.' },
      { type: 'nuevo',    text: 'Vivi agregada al equipo de coaches en la sección pública.' },
      { type: 'nuevo',    text: 'Logos de OIEP y Cámara Argentina en la sección de Coaching.' },
      { type: 'nuevo',    text: 'Vistas de papelera e historial en el panel de inscripciones.' },
      { type: 'mejorado', text: 'Retiros: ahora muestra solo Patagonia y Uruguay (Neptunia, Eco Hostel) con carrusel de 2 items.' },
      { type: 'mejorado', text: 'Mensajes de WhatsApp personalizados con el nombre del programa seleccionado.' },
      { type: 'corregido', text: 'Problema de RLS en envío de formularios: se resolvió eliminando la dependencia de select() post-insert.' },
      { type: 'corregido', text: 'Los badges de estado de revisión no mostraban correctamente todos los estados posibles.' },
      { type: 'corregido', text: 'El selector de fecha del formulario de registro tenía problemas de alineación visual.' },
      { type: 'corregido', text: 'Los logos de certificaciones aparecían en escala de grises; ahora se muestran a color.' },
    ],
  },
  {
    version: '0.7',
    date: 'mar 2026',
    title: 'RBAC, toasts y deploy en Cloudflare',
    items: [
      { type: 'nuevo',    text: 'Control de acceso basado en roles (RBAC): admins ven el panel completo, alumnos van al campus, el resto es redirigido.' },
      { type: 'nuevo',    text: 'Sistema de notificaciones toast personalizadas para feedback de acciones en el admin.' },
      { type: 'nuevo',    text: 'Flujo de recuperación de contraseña completo con formulario propio.' },
      { type: 'mejorado', text: 'Sección de retiros refactorizada como carrusel premium.' },
      { type: 'removido', text: 'Banner de demo eliminado del panel.' },
    ],
  },
  {
    version: '0.6',
    date: 'feb 2026',
    title: 'Login 3D y mejoras de auth',
    items: [
      { type: 'nuevo',    text: 'Nueva UI de login con flip 3D animado entre las vistas de ingreso y registro.' },
      { type: 'nuevo',    text: 'Modal premium de inscripciones con integración de portal.' },
      { type: 'mejorado', text: 'Texto de marca en color celeste (#00A9CE) en toda la UI.' },
      { type: 'mejorado', text: 'Flujo post-click del botón "Empezar" optimizado con animaciones más fluidas.' },
      { type: 'mejorado', text: 'Toggle de auth localizado al español con flechas visuales.' },
    ],
  },
  {
    version: '0.5',
    date: 'ene – feb 2026',
    title: 'Integración Supabase y rediseño UI/UX',
    description: 'El sitio pasa de ser estático a estar conectado a Supabase.',
    items: [
      { type: 'nuevo',    text: 'Formulario de inscripción conectado a Supabase: los leads quedan guardados en la base de datos.' },
      { type: 'nuevo',    text: 'Testimonios migrados a Supabase con rating y fallback visual.' },
      { type: 'nuevo',    text: 'Sección de Canvas con fondo animado global.' },
      { type: 'mejorado', text: 'Rediseño completo de Hero, Coaching, Programas, Equipo, Impacto, Retiros y Contacto.' },
      { type: 'mejorado', text: 'Imágenes del equipo actualizadas y reorganizadas por sección.' },
      { type: 'corregido', text: 'Página en blanco en primer carga por IntersectionObserver aplicado sobre elementos con opacity-0 inicial.' },
    ],
  },
  {
    version: '0.4',
    date: 'ene 2026',
    title: 'Limpieza y organización de assets',
    items: [
      { type: 'mejorado', text: 'Todos los assets de imagen reorganizados en carpetas por sección.' },
      { type: 'mejorado', text: 'Actualización de testimonios y formulario de registro con los últimos cambios de contenido.' },
      { type: 'removido', text: 'Archivos de imagen sin usar eliminados del repositorio.' },
    ],
  },
  {
    version: '0.3',
    date: 'dic 2025',
    title: 'Landing page v2: branding y video',
    items: [
      { type: 'nuevo',    text: 'Integración de video en la landing page.' },
      { type: 'mejorado', text: 'Actualización de branding: tipografía, colores y espaciados.' },
      { type: 'mejorado', text: 'Formulario de registro mejorado con servicio de email.' },
      { type: 'corregido', text: 'Correcciones de alineación en múltiples secciones.' },
    ],
  },
  {
    version: '0.2',
    date: 'dic 2025',
    title: 'Landing page inicial con secciones y formulario',
    items: [
      { type: 'nuevo', text: 'Secciones de landing: programas, equipo, impacto, retiros, testimonios y contacto.' },
      { type: 'nuevo', text: 'Formulario de registro inicial con validación.' },
      { type: 'nuevo', text: 'Componentes base de UI y estructura de carpetas del proyecto.' },
    ],
  },
  {
    version: '0.1',
    date: 'dic 2025',
    title: 'Primer commit',
    items: [
      { type: 'nuevo', text: 'Proyecto iniciado en Next.js + Tailwind con configuración base para Cloudflare.' },
    ],
  },
];
