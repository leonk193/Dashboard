// ============================================================
// POST /api/nova
// Nova money coach endpoint: proxies to NVIDIA NIM with financial context.
// Returns { text: "response content" } to match frontend expectations.
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
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get the NVIDIA NIM API key from environment variable
  const apiKey = process.env.NIM_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'NIM API key not configured on server' });
  }

  try {
    // Prepare the body - handle both string and object cases (same pattern as nim-proxy)
    let requestBodyString;
    if (typeof req.body === 'string') {
      // Already a string (e.g., if sent with Content-Type: text/plain)
      requestBodyString = req.body;
    } else if (req.body && typeof req.body === 'object') {
      // Object (common when Vercel auto-parses JSON)
      requestBodyString = JSON.stringify(req.body);
    } else {
      // Fallback - try to stringify whatever we got
      requestBodyString = JSON.stringify(req.body || {});
    }

    // Parse the incoming JSON to extract messages and finance
    let parsed = {};
    try {
      parsed = JSON.parse(requestBodyString);
    } catch (e) {
      // If cannot parse, treat as empty
      parsed = {};
    }
    const { messages = [], finance = {} } = parsed;

    // Build system message with financial context
    const systemMessage = {
      role: 'system',
      content: `You are Nova, a helpful money coach. Use the following financial snapshot to inform your advice: ${JSON.stringify(
        finance
      )}. Provide concise, friendly, and actionable guidance.`
    };

    // Construct final messages array: system + conversation
    const finalMessages = [systemMessage, ...messages];

    // Prepare the request body for NVIDIA NIM
    const requestBody = {
      model: 'nvidia/nemotron-3-super-120b-a12b', // same as other sections
      messages: finalMessages,
      temperature: 0.7,
      max_tokens: 512,
      stream: false
    };

    // Forward the request to NVIDIA NIM
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    // Get the response data - handle both JSON and non-JSON responses safely
    let nimResponse;
    const contentType = response.headers.get('content-type') || '';

    try {
      // Try to parse as JSON regardless of content type
      const text = await response.text();
      try {
        nimResponse = JSON.parse(text);
      } catch (jsonError) {
        // If not JSON, create an error object
        return res.status(500).json({
          error: 'Invalid JSON response from NVIDIA NIM',
          details: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
          receivedContentType: contentType,
          statusCode: response.status
        });
      }
    } catch (textError) {
      // If we can't even read the response as text
      return res.status(500).json({
        error: 'Unable to read response from NVIDIA NIM',
        details: textError.message,
        statusCode: response.status
      });
    }

    // Extract the text content from NIM response format
    // NIM returns: { choices: [{ message: { content: "actual response" } }] }
    const replyText = (nimResponse.choices &&
                      nimResponse.choices[0] &&
                      nimResponse.choices[0].message &&
                      nimResponse.choices[0].message.content) ||
                     '(no response)';

    // Return in the format expected by the frontend: { text: "response content" }
    return res.status(200).json({ text: replyText.trim() });
  } catch (error) {
    console.error('Nova Error:', error);
    return res.status(500).json({
      error: 'Internal server error: ' + (error.message || String(error))
    });
  }
}