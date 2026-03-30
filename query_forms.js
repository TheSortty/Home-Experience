import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
    console.log("Fetching forms from Supabase...");
    const { data, error } = await supabase.from('forms').select('id, slug, title');
    if (error) {
        console.error("Error fetching forms:", error);
    } else {
        console.log("Data:", data);
    }
}
main();
