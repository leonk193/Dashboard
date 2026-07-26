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
    // Prepare the body - handle both string and object cases
    let requestBody;
    if (typeof req.body === 'string') {
      // Already a string (e.g., if sent with Content-Type: text/plain)
      requestBody = req.body;
    } else if (req.body && typeof req.body === 'object') {
      // Object (common when Vercel auto-parses JSON)
      requestBody = JSON.stringify(req.body);
    } else {
      // Fallback - try to stringify whatever we got
      requestBody = JSON.stringify(req.body || {});
    }

    // Forward the request to NVIDIA NIM
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${apiKey}`
      },
      body: requestBody
    });

    // Get the response data - handle both JSON and non-JSON responses safely
    let data;
    const contentType = response.headers.get('content-type') || '';

    try {
      // Try to parse as JSON regardless of content type
      // Some services misreport their content type
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch (jsonError) {
        // If not JSON, create an error object
        data = {
          error: 'Invalid JSON response from NVIDIA NIM',
          details: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
          receivedContentType: contentType,
          statusCode: response.status
        };
      }
    } catch (textError) {
      // If we can't even read the response as text
      data = {
        error: 'Unable to read response from NVIDIA NIM',
        details: textError.message,
        statusCode: response.status
      };
    }

    // Return the response with the same status code
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('NIM Proxy Error:', error);
    return res.status(500).json({
      error: 'proxy fetch failed: ' + (error.message || String(error)),
      type: error.name
    });
  }
}