import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qvdjpmcprbinvrcczyhp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2ZGpwbWNwcmJpbnZyY2N6eWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3OTExODEsImV4cCI6MjA4MDM2NzE4MX0.vmTXYtXOFtbVHtpOZTN4ZNfBseR63utXat7o6hBRQy4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
    .from('forms')
    .select('id, slug, is_deleted, title');
    
  console.log("Error:", error);
  console.log("All Forms:", JSON.stringify(data, null, 2));
}

test();
