const TOKEN = '3|msyp2adKkdfGS4LZDYbn2c9EQDjwEPxuli5HoE6O1f1fe420';
const BASE_URL = 'http://192.168.100.112:8000/api/v1';

async function main() {
  try {
    const res = await fetch(`${BASE_URL}/deployments`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Accept': 'application/json'
      }
    });
    console.log(`\n=== Deployments (Status: ${res.status}) ===`);
    const data = await res.json();
    console.log(data);
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
