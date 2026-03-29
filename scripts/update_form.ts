import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: form, error } = await supabase
    .from('forms')
    .select('schema')
    .eq('slug', 'inscripcion-creser')
    .single();

  if (error) {
    console.error('Error fetching form:', error);
    return;
  }

  let schema = form.schema;
  if (typeof schema === 'string') schema = JSON.parse(schema);
  
  console.log('Current schema length:', schema.length);

  const hasServiceField = schema.some((f: any) => f.id === 'selectedService');
  if (!hasServiceField) {
    const newField = {
      id: 'selectedService',
      type: 'radio',
      label: '¿Qué experiencia o combo buscás iniciar?',
      required: true,
      section: 'personal',
      options: [
        'CRESER (Programa Inicial)',
        'COMBO 1 (Inicial + Avanzado)',
        'COMBO 2 (Inicial + Avanzado + Liderazgo)'
      ]
    };

    const personalIndex = schema.findIndex((f: any) => f.section === 'personal');
    if (personalIndex !== -1) {
      schema.splice(personalIndex + 1, 0, newField);
    } else {
      schema.unshift(newField);
    }

    const { error: updateError } = await supabase
      .from('forms')
      .update({ schema })
      .eq('slug', 'inscripcion-creser');

    if (updateError) {
      console.error('Update error:', updateError);
    } else {
      console.log('Successfully updated schema!');
    }
  } else {
    console.log('Field already exists.');
  }
}

main();
