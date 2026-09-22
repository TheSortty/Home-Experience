// Diccionario de campos destino para el importador histórico (CRM, Etapa 2).
//
// Cada columna del CSV que sube el staff se mapea a uno de estos campos (o se
// ignora). `raw` en import_staging_rows queda guardado con estas claves, así
// que aplicarStep (ver ImportarClient) sabe exactamente dónde escribir cada
// valor sin volver a interpretar encabezados de CSV.

export type DestinationField =
  | 'ignore'
  | 'first_name' | 'last_name' | 'email' | 'phone' | 'dni' | 'birth_date' | 'gender'
  | 'address_street' | 'address_city' | 'address_province' | 'current_occupation'
  | 'referred_by_name' | 'instagram' | 'bio'
  | 'program_name' | 'program_type' | 'enrolled_at' | 'completed_at'
  | 'enrollment_status' | 'payment_status' | 'enrollment_notes';

interface FieldDef {
  key: DestinationField;
  label: string;
  group: 'Persona' | 'Inscripción';
  /** Encabezados típicos (normalizados: minúsculas, sin acentos/espacios) que matchean este campo. */
  aliases: string[];
}

export const DESTINATION_FIELDS: FieldDef[] = [
  { key: 'first_name',         label: 'Nombre',              group: 'Persona',      aliases: ['nombre', 'firstname', 'name'] },
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
  { key: 'referred_by_name',   label: 'Recomendado por',      group: 'Persona',      aliases: ['recomendadopor', 'referredby', 'referido', 'referidopor'] },
  { key: 'instagram',          label: 'Instagram',            group: 'Persona',      aliases: ['instagram', 'ig'] },
  { key: 'bio',                label: 'Notas de perfil',      group: 'Persona',      aliases: ['bio', 'notas', 'notaspersonales'] },
  { key: 'program_name',       label: 'Programa / camada',    group: 'Inscripción',  aliases: ['programa', 'camada', 'curso', 'ciclo', 'cycle', 'program'] },
  { key: 'program_type',       label: 'Tipo de programa',     group: 'Inscripción',  aliases: ['tipodeprograma', 'tipo', 'programtype', 'nivel'] },
  { key: 'enrolled_at',        label: 'Fecha de inscripción', group: 'Inscripción',  aliases: ['fechadeinscripcion', 'fechainscripcion', 'enrolledat', 'fechaingreso'] },
  { key: 'completed_at',       label: 'Fecha de egreso',      group: 'Inscripción',  aliases: ['fechadeegreso', 'fechaegreso', 'completedat', 'fechagraduacion'] },
  { key: 'enrollment_status',  label: 'Estado (activo/graduado/etc.)', group: 'Inscripción', aliases: ['estado', 'status'] },
  { key: 'payment_status',     label: 'Estado de pago',       group: 'Inscripción',  aliases: ['estadodepago', 'paymentstatus', 'pago'] },
  { key: 'enrollment_notes',   label: 'Notas de la inscripción', group: 'Inscripción', aliases: ['notas', 'notasdeinscripcion', 'observaciones', 'comentarios'] },
];

function normalizeHeader(header: string): string {
  return header
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

/** Adivina el campo destino de un encabezado de CSV por coincidencia de alias. Nunca falla: devuelve 'ignore'. */
export function guessDestinationField(header: string): DestinationField {
  const norm = normalizeHeader(header);
  if (!norm) return 'ignore';
  for (const field of DESTINATION_FIELDS) {
    if (field.aliases.some(alias => norm === alias || norm.includes(alias))) return field.key;
  }
  return 'ignore';
}

export function fieldLabel(key: DestinationField): string {
  if (key === 'ignore') return 'Ignorar columna';
  return DESTINATION_FIELDS.find(f => f.key === key)?.label ?? key;
}
