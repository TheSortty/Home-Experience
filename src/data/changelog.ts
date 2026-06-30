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
    version: '1.6',
    date: '30 jun 2026',
    title: 'Accesos rápidos en módulos',
    description: 'Menos clicks para gestionar entregas desde la vista de cursos.',
    items: [
      { type: 'nuevo',    text: 'Toggle de un click para activar/desactivar entregas por clase, directamente desde la vista de módulos sin abrir el formulario completo.' },
      { type: 'nuevo',    text: 'Botón "Ver entregas" por clase: lleva directo a las submissions de esa lección específica, sin pasar por el listado general.' },
    ],
  },
  {
    version: '1.5',
    date: '25 jun 2026',
    title: 'Acceso de coaches al campus',
    items: [
      { type: 'corregido', text: 'Los coaches eran devueltos al campus cada vez que intentaban entrar a la sección de entregas. Ahora tienen acceso correcto a /admin/lms y todas sus subsecciones.' },
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
    date: 'mayo 2026',
    title: 'Nuevo panel de administración',
    description: 'Rediseño completo del panel admin con su propio layout y estructura.',
    items: [
      { type: 'nuevo',    text: 'Panel de administración con sidebar propio, topbar con búsqueda global y menú de perfil.' },
      { type: 'nuevo',    text: 'Módulo de Personas: gestión de alumnos, coaches y contactos desde el admin.' },
      { type: 'nuevo',    text: 'Modal de bienvenida para alumnos que ingresan por primera vez: les pide completar su perfil.' },
      { type: 'nuevo',    text: 'Recortador de imagen integrado para fotos de perfil.' },
      { type: 'mejorado', text: 'Foro de la comunidad reorganizado con componentes más estables.' },
      { type: 'corregido', text: 'Errores de I/O en el worker de Cloudflare al recuperar sesiones con alta carga.' },
    ],
  },
  {
    version: '1.2',
    date: 'mayo 2026',
    title: 'CAMPUS, actividad del staff y coaches',
    description: 'Infraestructura completa del campus y sistema de roles diferenciados.',
    items: [
      { type: 'nuevo',    text: 'Sistema de actividad del staff: todas las acciones importantes quedan registradas en la bandeja de actividad.' },
      { type: 'nuevo',    text: 'Rol de coach con permisos diferenciados: pueden revisar entregas pero no acceder a herramientas de admin.' },
      { type: 'nuevo',    text: 'Soporte para múltiples videos por clase en el LMS.' },
      { type: 'nuevo',    text: 'Formularios con opciones dinámicas: el editor permite agregar/quitar opciones sin tocar código.' },
      { type: 'mejorado', text: 'Dashboard carga todos los datos en paralelo (Promise.all): inicio notablemente más rápido.' },
      { type: 'mejorado', text: 'Datos en tiempo real con Supabase Realtime: el conteo de inscripciones, alumnos y actividad se actualiza solo.' },
      { type: 'corregido', text: 'El contador de alumnos en el dashboard mostraba un número incorrecto.' },
      { type: 'corregido', text: 'Parpadeo de datos al cargar el dashboard por primera vez.' },
      { type: 'corregido', text: 'Las cookies seguras fallaban en producción causando cierre de sesión inesperado.' },
    ],
  },
  {
    version: '1.1',
    date: 'abril – mayo 2026',
    title: 'LMS completo y autenticación',
    description: 'Cierre del campus LMS con todas sus funcionalidades y estabilización del sistema de auth.',
    items: [
      { type: 'nuevo',    text: 'Los cursos publicados son visibles sin necesidad de estar logueado.' },
      { type: 'nuevo',    text: 'Integración con Google Reviews: las reseñas se sincronizan automáticamente desde Google Maps.' },
      { type: 'nuevo',    text: 'El calendario del campus muestra sesiones de cursos y fechas de ciclos.' },
      { type: 'mejorado', text: 'Sistema de campus completado con currículo, viewer de clases y flujo de entrega.' },
      { type: 'corregido', text: 'Bucle infinito al recuperar contraseña desde ciertos clientes de email.' },
      { type: 'corregido', text: 'Logout del servidor para evitar loops de redirección tras cerrar sesión.' },
      { type: 'corregido', text: 'Carga infinita al ingresar por primera vez desde el link de activación de cuenta.' },
    ],
  },
  {
    version: '1.0',
    date: 'abril 2026',
    title: 'Lanzamiento inicial',
    description: 'Primera versión del sistema de gestión de Home Experience.',
    items: [
      { type: 'nuevo', text: 'Panel de administración con gestión de inscripciones, alumnos, programas y calendario.' },
      { type: 'nuevo', text: 'Sistema LMS: módulos, clases, currículum de cursos y viewer para alumnos.' },
      { type: 'nuevo', text: 'Calendario de admin con modal de detalle de alumno y seguimiento de ciclos.' },
      { type: 'nuevo', text: 'Autenticación completa: login, registro, recuperación de contraseña y setup de cuenta.' },
      { type: 'nuevo', text: 'Deploy en Cloudflare Workers con configuración de Workers y R2 para archivos.' },
    ],
  },
];
