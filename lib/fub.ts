export const FUB_API_BASE = 'https://api.followupboss.com/v1';

export async function fetchFUB(
  endpoint: string,
  apiKey: string,
  options?: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
  }
) {
  const creds = Buffer.from(apiKey.trim() + ':').toString('base64');
  const headers: Record<string, string> = {
    'Authorization': `Basic ${creds}`,
    'Accept': 'application/json',
  };
  if (options?.body) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const res = await fetch(`${FUB_API_BASE}${endpoint}`, {
      method: options?.method || 'GET',
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });
    if (!res.ok) {
      throw new Error(`FUB API error: ${res.status}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  } catch (error) {
    console.error(`FUB API error for ${endpoint}:`, error);
    throw error;
  }
}
