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

    // Parse to get image data
    const { image, mediaType } = JSON.parse(requestBody);

    // Construct llama-3.1-nemotron-nano-vl-8b-v1 request
    const visionRequest = {
      model: "llama-3.1-nemotron-nano-vl-8b-v1",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Extract all text from this receipt image and structure it as JSON with fields: merchant, total, currency, date, items (array of objects with name and amount)." },
            { type: "image_url", image_url: { url: `data:${mediaType};base64,${image}` } }
          ]
        }
      ],
      max_tokens: 1000
    };

    // Forward to NVIDIA NIM
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(visionRequest)
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

    // Parse vision model output to extract receipt structure
    const receiptData = parseVisionResponse(data);

    // Return in expected format
    return res.status(response.status).json({ receipt: receiptData });
  } catch (error) {
    console.error('NIM Vision Proxy Error:', error);
    return res.status(500).json({
      error: 'proxy fetch failed: ' + (error.message || String(error)),
      type: error.name
    });
  }
}

// Helper function to parse vision model text output into receipt structure
function parseVisionResponse(visionResponse) {
  // Extract text from llama-3.1-nemotron-nano-vl-8b-v1 response
  const textContent = visionResponse.choices?.[0]?.message?.content || '';

  // Parse text to extract receipt fields
  // This would use regex patterns, NLP heuristics, etc.
  // For now, return a basic structure - implementation would refine this
  return {
    merchant: extractMerchant(textContent) || 'Unknown Merchant',
    total: extractTotal(textContent) || 0,
    currency: extractCurrency(textContent) || 'USD',
    date: extractDate(textContent) || '',
    items: extractLineItems(textContent) || []
  };
}

// Placeholder extraction functions (would be implemented with actual parsing logic)
function extractMerchant(text) { /* TODO: Implement merchant extraction */ }
function extractTotal(text) { /* TODO: Implement total extraction */ }
function extractCurrency(text) { /* TODO: Implement currency extraction */ }
function extractDate(text) { /* TODO: Implement date extraction */ }
function extractLineItems(text) { /* TODO: Implement line items extraction */ }