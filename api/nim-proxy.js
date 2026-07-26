// ============================================================
// POST /api/nim-proxy
// Proxies the request to https://integrate.api.nvidia.com/v1/chat/completions
// and returns the JSON. Needed because NVIDIA NIM's API doesn't send
// CORS headers, so the browser can't call it directly.
// ============================================================
export default async function handler(req, res) {
  // Enable CORS for all origins (adjust as needed for security)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  // Get the NVIDIA NIM API key from environment variable
  // IMPORTANT: Set NIM_API_KEY in your Vercel project settings
  const apiKey = process.env.NIM_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'NIM API key not configured on server' });
  }

  try {
    // Forward the request to NVIDIA NIM
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${apiKey}`
      },
      body: req.body // Forward the raw body from the client
    });

    // Get the response data
    const data = await response.json();

    // Return the response with appropriate status code
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('NIM Proxy Error:', error);
    return res.status(500).json({
      error: 'proxy fetch failed: ' + (error.message || String(error))
    });
  }
}