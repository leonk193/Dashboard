# Troubleshooting NVIDIA NIM Proxy

If you're seeing "Could not reach the AI service: HTTP 500" after updating to use the proxy, this means:
1. ✅ CORS is fixed (request is reaching your proxy)
2. ❌ The proxy is having trouble communicating with NVIDIA NIM

## Steps to Diagnose:

### 1. Check Your NVIDIA NIM API Key
- Verify your API key is correct and has access to the `nvidia/nemotron-3-super-120b-a12b` model
- Go to [https://build.nvidia.com/nim](https://build.nvidia.com/nim) → API Keys
- Ensure the key is active and not expired

### 2. Check Vercel Deployment
- Make sure your latest code (including `api/nim-proxy.js`) is deployed to Vercel
- In Vercel Dashboard → Your Project → Deployments → Check the latest deployment includes your changes
- If not, redeploy by pushing to your git repo or clicking "Redeploy" in Vercel

### 3. Verify Environment Variable
- In Vercel Dashboard → Your Project → Settings → Environment Variables
- Ensure `NIM_API_KEY` is set with your actual NVIDIA NIM API key
- Make sure it's set for the **Production** environment (and Preview if testing there)

### 4. Check Proxy Logs
- Go to Vercel Dashboard → Your Project → Deployments → Latest Deployment → Logs
- Look for output from `npm-proxy.js` (our proxy)
- You should see error messages like:
  - `NIM Proxy Error: FetchError: invalid json response body at https://integrate.api.nvidia.com/v1/chat/completions reason: Unexpected token < in JSON at position 0`
  - This indicates NVIDIA returned HTML (likely an error page) instead of JSON

### 5. Common NVIDIA NIM Errors
- **401 Unauthorized**: Invalid or missing API key
- **403 Forbidden**: API key doesn't have access to the model
- **404 Not Found**: Incorrect endpoint or model name
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: NVIDIA NIM service issue

## Expected Working Flow:
1. Your browser → `/api/nim-proxy` (same origin, no CORS)
2. Proxy → `https://integrate.api.nvidia.com/v1/chat/completions` (server-to-server, no CORS)
3. NVIDIA NIM → Returns JSON response
4. Proxy → Returns same JSON to browser
5. Browser → Displays Nova's response

## If You're Still Seeing Issues:
1. Try a different model name temporarily (check available models at build.nvidia.com)
2. Test the proxy directly with curl:
   ```bash
   curl -X POST https://your-vercel-domain.com/api/nim-proxy \
     -H "Content-Type: application/json" \
     -d '{"model":"nvidia/nemotron-3-super-120b-a12b","messages":[{"role":"user","content":"test"}]}'
   ```
3. Check if your network/cloudflare/VPS is blocking api.nvidia.com

The proxy now handles non-JSON responses gracefully, so you should see a more informative error message in the Nova chat interface instead of the raw "Failed to fetch" error.