export const FUB_API_BASE = 'https://api.followupboss.com/v1';

export async function fetchFUB(endpoint: string, apiKey: string) {
  const creds = Buffer.from(apiKey.trim() + ':').toString('base64');
  const headers = {
    'Authorization': `Basic ${creds}`,
    'Accept': 'application/json',
  };

  try {
    const res = await fetch(`${FUB_API_BASE}${endpoint}`, { headers });
    if (!res.ok) {
      throw new Error(`FUB API error: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error(`FUB API error for ${endpoint}:`, error);
    throw error;
  }
}
