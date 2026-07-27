# Finance Receipt Scanner Enhancement with NVIDIA NIM Vision Model

## Context
The user wants to enhance the "scan received" option in finance.html to work with an NVIDIA NIM vision model for receipt processing. Currently, the receipt scanning feature exists but isn't working properly, likely because the `/api/receipt` endpoint is missing or not functioning correctly. The user needs a vision-capable model since their current model doesn't support image uploads.

They have specifically requested to use the `nemotron-ocr-v2` model, which is an NVIDIA NIM model optimized for Optical Character Recognition (OCR) tasks.

## Current Implementation Review
- **finance.html** (lines 1770-1833): Contains the receipt scanner UI with drop zone, file input, and state management
- **finance.html** (lines 3756-4039): `initReceiptScanner()` IIFE that handles:
  - Image reading and downscaling (to 1568px max dimension)
  - POST request to `/api/receipt` with image data
  - Response processing for merchant, total, currency, date, line items
  - Balance deduction/account selection logic
- **api/nim-proxy.js**: Existing NVIDIA NIM proxy for chat completions that handles CORS issues
- **sync.js**: Cloud synchronization service between localStorage and Supabase

## Requirements & Constraints
1. Must use NVIDIA NIM nemotron-ocr-v2 model for OCR/text extraction from receipt images
2. Must extract receipt data: merchant name, total amount, currency, date, and line items
3. Must maintain existing UI flow and user experience
4. Must integrate with existing balance/account system
5. Should reuse existing NVIDIA NIM API key infrastructure
6. Should handle image downscaling (already implemented in frontend)

## Design: Dedicated NIM Vision Proxy

### Overview
Create a dedicated API endpoint (`/api/nim-vision-proxy`) that proxies requests to the NVIDIA NIM nemotron-ocr-v2 model, following the same pattern as the existing `nim-proxy.js` but optimized for vision/OCR tasks.

### Components

#### 1. Vision Proxy (`api/nim-vision-proxy.js`)
- Follows identical CORS pattern as `nim-proxy.js`
- Accepts POST requests with base64-encoded image data
- Forwards requests to `https://integrate.api.nvidia.com/v1/chat/completions`
- Uses Authorization header with `Bearer ${process.env.NIM_API_KEY}`
- Formats request according to nemotron-ocr-v2 API expectations
- Parses model response to extract structured receipt data
- Returns JSON matching the format expected by existing frontend:
  ```json
  {
    "receipt": {
      "merchant": "string",
      "total": number,
      "currency": "string (3-letter ISO)",
      "date": "string (YYYY-MM-DD)",
      "items": [{ "name": "string", "amount": number }]
    }
  }
  ```
- Error handling matches current `/api/receipt` behavior

#### 2. Frontend Changes (`finance.html`)
- Modify `handleFile()` function to POST to `/api/nim-vision-proxy` instead of `/api/receipt`
- Maintain existing image processing (downscaling to 1568px)
- Preserve all existing UI logic (confirmation form, balance updates, account selection)
- No changes needed to image data format (base64 with mediaType)

### Data Flow
1. User selects/drops receipt image
2. Frontend reads image, downscales to 1568px max dimension (unchanged)
3. Frontend POSTs `{image: base64, mediaType: "image/jpeg|png"}` to `/api/nim-vision-proxy`
4. Vision proxy:
   - Validates NIM_API_KEY exists
   - Constructs nemotron-ocr-v2 request (messages array with image content)
   - Calls NVIDIA NIM API
   - Extracts text from model response
   - Parses text to identify merchant, total, date, line items
   - Returns structured JSON receipt data
5. Frontend receives response and proceeds with existing logic:
   - Shows confirmation form with extracted data
   - Handles balance updates, account selection, etc.

### Response Format Requirements
The nemotron-ocr-v2 model will return text extracted from the receipt image. The vision proxy must parse this text to extract:
- **Merchant**: Typically the store/business name at top of receipt
- **Total**: Final amount (usually largest number or labeled "TOTAL")
- **Currency**: 3-letter ISO code (USD, EUR, CHF, etc.) - may need inference from context
- **Date**: Usually in format like MM/DD/YYYY or DD/MM/YYYY
- **Line Items**: Individual purchases with description and price

If the model output is not structured, the proxy will need to use heuristics or regex patterns to extract this information from the OCR text.

### Error Handling
- Missing API key: 500 error with "NIM API key not configured on server"
- Network errors: 500 error with proxy fetch details
- Invalid responses: 500 error with details from NVIDIA response
- HTTP errors: Forward NVIDIA status code with error information
- Frontend maintains existing image validation (`/^image\//.test(file.type)`)

## Implementation Plan

### Files to Create/Modify
1. **NEW**: `api/nim-vision-proxy.js` - Dedicated proxy for nemotron-ocr-v2 requests
2. **MODIFY**: `finance.html` - Change endpoint from `/api/receipt` to `/api/nim-vision-proxy`

### Key Implementation Details

#### Vision Proxy (`api/nim-vision-proxy.js`):
```javascript
// Follow exact pattern from nim-proxy.js
export default async function handler(req, res) {
  // CORS headers (identical to nim-proxy.js)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  // Get NIM API key
  const apiKey = process.env.NIM_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'NIM API key not configured on server' });
  }

  try {
    // Handle request body (same as nim-proxy.js)
    let requestBody;
    if (typeof req.body === 'string') {
      requestBody = req.body;
    } else if (req.body && typeof req.body === 'object') {
      requestBody = JSON.stringify(req.body);
    } else {
      requestBody = JSON.stringify(req.body || {});
    }

    // Parse to get image data
    const { image, mediaType } = JSON.parse(requestBody);
    
    // Construct nemotron-ocr-v2 request
    const visionRequest = {
      model: "nemotron-ocr-v2",
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

    // Handle response (similar pattern to nim-proxy.js)
    let data;
    const contentType = response.headers.get('content-type') || '';

    try {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch (jsonError) {
        data = {
          error: 'Invalid JSON response from NVIDIA NIM',
          details: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
          receivedContentType: contentType,
          statusCode: response.status
        };
      }
    } catch (textError) {
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
  // Extract text from nemotron-ocr-v2 response
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
function extractMerchant(text) { /* ... */ }
function extractTotal(text) { /* ... */ }
function extractCurrency(text) { /* ... */ }
function extractDate(text) { /* ... */ }
function extractLineItems(text) { /* ... */ }
```

#### Frontend Changes (`finance.html`):
In the `handleFile()` function (around line 3941):
```javascript
// Change from:
const r = await fetch('/api/receipt', {
// To:
const r = await fetch('/api/nim-vision-proxy', {
```

### Verification Steps
1. Verify NIM_API_KEY is configured in Vercel environment variables
2. Test new endpoint with sample receipt images returns correct JSON structure
3. Verify existing UI flow works end-to-end with new backend response
4. Test edge cases:
   - Invalid/non-image files
   - Network errors
   - Malformed or empty OCR responses
   - API key missing/misconfigured
5. Ensure balance update and account selection logic remains unchanged
6. Verify error handling matches existing behavior

### Dependencies
- NVIDIA NIM API key must be set in environment variables (`NIM_API_KEY`)
- nemotron-ocr-v2 model must be accessible via NVIDIA NIM API
- Existing CORS solution pattern will continue to work (no changes needed)

### Open Questions
1. **Response Parsing**: Should the vision model be prompted to return structured JSON directly, or should we parse raw text output? (Structured JSON would be preferable but depends on model capabilities)
2. **Fallback Parsing**: What heuristics/patterns should we use for extracting receipt fields from OCR text if model doesn't return structured data?
3. **Currency Detection**: How should we determine currency when not explicitly stated on receipt? (Could infer from location/store or default to user's preferred currency)
4. **Date Formats**: How to handle various date formats found on receipts?

## Next Steps
Upon approval of this design document:
1. Implement `api/nim-vision-proxy.js` with the vision proxy logic
2. Update `finance.html` to use the new endpoint
3. Implement receipt field parsing logic based on nemotron-ocr-v2 output
4. Test end-to-end flow with sample receipt images
5. Verify all existing functionality remains intact