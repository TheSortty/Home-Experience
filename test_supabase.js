const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const url = urlMatch ? urlMatch[1].trim() : null;
const key = keyMatch ? keyMatch[1].trim() : null;

if (!url || !key) {
  console.error("Could not find Supabase credentials in .env.local");
  process.exit(1);
}

async function fetchForms() {
  try {
    const response = await fetch(`${url}/rest/v1/forms?select=id,slug,title,is_deleted`, {
      method: 'GET',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log("Forms Data:");
    console.log(JSON.stringify(data, null, 2));
  } catch(e) {
    console.error("Fetch error: ", e);
  }
}

fetchForms();
