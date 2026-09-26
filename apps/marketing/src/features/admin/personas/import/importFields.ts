// Diccionario de campos destino para el importador histórico (CRM, Etapa 2).
//
// Cada columna del archivo que sube el staff se mapea a uno de estos campos (o
// se ignora). `raw` en import_staging_rows queda guardado con estas claves, así
// que applyStagingRow (ver ImportarClient) sabe exactamente dónde escribir cada
// valor sin volver a interpretar encabezados.

export type DestinationField =
  | 'ignore'
  // Persona
  | 'first_name' | 'last_name' | 'email' | 'phone' | 'dni' | 'birth_date' | 'gender'
  | 'address_street' | 'address_city' | 'address_province' | 'current_occupation'
  | 'referred_by_name' | 'instagram' | 'bio'
  // Ficha (formulario de inscripción)
  | 'dream1' | 'dream2' | 'dream3' | 'qualities' | 'context' | 'daily_routine'
  | 'energy_leaks' | 'life_history' | 'under_treatment' | 'medical_notes'
  // Inscripción
  | 'program_name' | 'program_type' | 'enrolled_at' | 'completed_at'
  | 'enrollment_status' | 'payment_status' | 'enrollment_notes'
  | 'enrolled_by_name' | 'channel' | 'payment_amount' | 'deal_status' | 'balance_due'
  | 'deal_notes' | 'completed_flag' | 'dropped_flag' | 'shirt_size'
  // Seguimiento (BACKS)
  | 'follow_up_status' | 'follow_up_owner' | 'follow_up_notes';

export type FieldGroup = 'Persona' | 'Ficha' | 'Inscripción' | 'Seguimiento';
export const FIELD_GROUPS: FieldGroup[] = ['Persona', 'Ficha', 'Inscripción', 'Seguimiento'];

interface FieldDef {
  key: DestinationField;
  label: string;
  group: FieldGroup;
  /** Encabezados típicos (normalizados: minúsculas, sin acentos/espacios) que matchean este campo. */
  aliases: string[];
}

export const DESTINATION_FIELDS: FieldDef[] = [
  { key: 'first_name',         label: 'Nombre (o nombre completo)', group: 'Persona', aliases: ['nombre', 'firstname', 'name'] },
  { key: 'last_name',          label: 'Apellido',            group: 'Persona',      aliases: ['apellido', 'lastname', 'surname'] },
  { key: 'email',              label: 'Email',                group: 'Persona',      aliases: ['email', 'correo', 'correoelectronico', 'mail'] },
  { key: 'phone',              label: 'Teléfono',            group: 'Persona',      aliases: ['telefono', 'phone', 'celular', 'whatsapp'] },
  { key: 'dni',                label: 'DNI',                  group: 'Persona',      aliases: ['dni', 'documento', 'cuil', 'cuit'] },
  { key: 'birth_date',         label: 'Fecha de nacimiento',  group: 'Persona',      aliases: ['fechadenac', 'fechanacimiento', 'birthdate', 'nacimiento', 'fnac'] },
  { key: 'gender',             label: 'Género',               group: 'Persona',      aliases: ['genero', 'gender', 'sexo'] },
  { key: 'address_street',     label: 'Dirección',            group: 'Persona',      aliases: ['direccion', 'domicilio', 'address', 'calle'] },
  { key: 'address_city',       label: 'Ciudad',                group: 'Persona',      aliases: ['ciudad', 'localidad', 'city'] },
  { key: 'address_province',   label: 'Provincia',            group: 'Persona',      aliases: ['provincia', 'province', 'state'] },
  { key: 'current_occupation', label: 'Ocupación',            group: 'Persona',      aliases: ['ocupacion', 'occupation', 'profesion', 'trabajo'] },
  { key: 'referred_by_name',   label: 'Quién lo invitó a HOME', group: 'Persona',   aliases: ['recomendadopor', 'referredby', 'referido', 'referidopor', 'quienteinvito'] },
  { key: 'instagram',          label: 'Instagram',            group: 'Persona',      aliases: ['instagram', 'ig'] },
  { key: 'bio',                label: 'Notas de perfil',      group: 'Persona',      aliases: ['bio', 'notaspersonales'] },

  { key: 'dream1',             label: 'Sueño 1',              group: 'Ficha',        aliases: ['sueno1'] },
  { key: 'dream2',             label: 'Sueño 2',              group: 'Ficha',        aliases: ['sueno2'] },
  { key: 'dream3',             label: 'Sueño 3',              group: 'Ficha',        aliases: ['sueno3'] },
  { key: 'qualities',          label: 'Cualidades',           group: 'Ficha',        aliases: ['cualidades'] },
  { key: 'context',            label: 'Contexto actual',      group: 'Ficha',        aliases: ['contexto'] },
  { key: 'daily_routine',      label: 'Cómo es su día',       group: 'Ficha',        aliases: ['undiatuyo', 'rutina'] },
  { key: 'energy_leaks',       label: 'Fugas de energía',     group: 'Ficha',        aliases: ['fugasdeenergia', 'fugas'] },
  { key: 'life_history',       label: 'Historia de vida',     group: 'Ficha',        aliases: ['historiadevida'] },
  { key: 'under_treatment',    label: 'Tratamiento psicológico/psiquiátrico', group: 'Ficha', aliases: ['tratamientopsiquiatrico', 'tratamientopsicologico'] },
  { key: 'medical_notes',      label: 'Salud (se juntan todas las columnas)', group: 'Ficha',
    aliases: ['enfermedad', 'profesionaldecabecera', 'diagnosticado', 'alcohol', 'droga', 'adicciones', 'embarazada', 'medicacion', 'alergia'] },

  { key: 'program_name',       label: 'Programa / camada',    group: 'Inscripción',  aliases: ['programa', 'camada', 'curso', 'ciclo', 'cycle', 'program'] },
  { key: 'program_type',       label: 'Tipo de programa',     group: 'Inscripción',  aliases: ['tipodeprograma', 'programtype', 'nivel'] },
  { key: 'enrolled_by_name',   label: 'Enrolador (quién lo invitó a este programa)', group: 'Inscripción', aliases: ['enrolador', 'enrolante', 'enroladora'] },
  { key: 'channel',            label: 'Inscripción / canal (web, enrolador…)', group: 'Inscripción', aliases: ['inscripcion', 'canal'] },
  { key: 'payment_amount',     label: 'Pago (monto pagado)',  group: 'Inscripción',  aliases: ['pago', 'pagado', 'monto'] },
  { key: 'deal_status',        label: 'Estado del pago (inicial, combo, beca, seña…)', group: 'Inscripción', aliases: ['estado'] },
  { key: 'balance_due',        label: 'A cobrar (lo que falta)', group: 'Inscripción', aliases: ['acobrar', 'saldo', 'debe'] },
  { key: 'deal_notes',         label: 'Acuerdo especial (combo, 2x1, diferencia…)', group: 'Inscripción', aliases: ['difavanzado', 'diferencia', 'acuerdo'] },
  { key: 'enrolled_at',        label: 'Fecha de inscripción', group: 'Inscripción',  aliases: ['fechadeinscripcion', 'fechainscripcion', 'enrolledat', 'fechaingreso'] },
  { key: 'completed_at',       label: 'Fecha de egreso',      group: 'Inscripción',  aliases: ['fechadeegreso', 'fechaegreso', 'completedat', 'fechagraduacion'] },
  { key: 'completed_flag',     label: 'Finalizó (1 / sí)',    group: 'Inscripción',  aliases: ['finalizado', 'finaliado', 'egresado'] },
  { key: 'dropped_flag',       label: 'Baja (1 / sí / motivo)', group: 'Inscripción', aliases: ['baja', 'caido'] },
  { key: 'enrollment_status',  label: 'Estado de la inscripción (activo/finalizado/baja)', group: 'Inscripción', aliases: ['estadoinscripcion', 'status'] },
  { key: 'payment_status',     label: 'Pago saldado (sí/no)', group: 'Inscripción',  aliases: ['estadodepago', 'paymentstatus'] },
  { key: 'enrollment_notes',   label: 'Notas de la inscripción', group: 'Inscripción', aliases: ['nota', 'notas', 'observaciones', 'comentarios'] },
  { key: 'shirt_size',         label: 'Talle de remera',      group: 'Inscripción',  aliases: ['talle'] },

  { key: 'follow_up_status',   label: 'Estado del seguimiento (contactar, duda, sí, no…)', group: 'Seguimiento', aliases: ['estadoseguimiento'] },
  { key: 'follow_up_owner',    label: 'Encargado/a del seguimiento', group: 'Seguimiento', aliases: ['encargada', 'encargado', 'responsable'] },
  { key: 'follow_up_notes',    label: 'En qué está (notas del seguimiento)', group: 'Seguimiento', aliases: ['enqueestan', 'enqueesta'] },
];

function normalizeHeader(header: string): string {
  return header
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

/**
 * Adivina el campo destino de un encabezado. Gana el alias más largo que
 * aparezca en el encabezado, así "¿Quién te invitó? (Nombre y Apellido)" va a
 * "Quién lo invitó" y no a "Nombre". Nunca falla: devuelve 'ignore'.
 */
export function guessDestinationField(header: string): DestinationField {
  const norm = normalizeHeader(header);
  if (!norm) return 'ignore';
  let best: DestinationField = 'ignore';
  let bestLen = 0;
  for (const field of DESTINATION_FIELDS) {
    for (const alias of field.aliases) {
      const len = norm === alias ? alias.length + 100 : norm.includes(alias) ? alias.length : 0;
      if (len > bestLen) { best = field.key; bestLen = len; }
    }
  }
  return best;
}

export function fieldLabel(key: DestinationField): string {
  if (key === 'ignore') return 'Ignorar columna';
  return DESTINATION_FIELDS.find(f => f.key === key)?.label ?? key;
}
