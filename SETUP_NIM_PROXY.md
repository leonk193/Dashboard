# Setting up NVIDIA NIM Proxy for Nova Lite

To get your Nova Lite dashboard working with NVIDIA NIM API through the Vercel proxy, follow these steps:

## 1. Get Your NVIDIA NIM API Key

1. Go to [https://build.nvidia.com/nim](https://build.nvidia.com/nim)
2. Sign in or create an account
3. Navigate to the API keys section
4. Generate a new API key
5. Copy the key (it should look something like `nvapi-...`)

## 2. Deploy the Proxy to Vercel

Your dashboard is already deployed on Vercel, so you just need to add the environment variable:

### Option A: Through Vercel Dashboard (Recommended)
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Find your dashboard project (likely named something like `dashboard` or similar)
3. Go to **Settings** → **Environment Variables**
4. Add a new environment variable:
   - **Name**: `NIM_API_KEY`
   - **Value**: `[your-nvidia-nim-api-key-here]`
   - **Environment**: Production (and optionally Preview Development)
5. Click **Save**
6. Vercel will automatically redeploy your application

### Option B: Using Vercel CLI
If you have the Vercel CLI installed:

```bash
vercel env add NIM_API_KEY production
# Paste your API key when prompted
vercel --prod  # to redeploy
```

## 3. Verify the Deployment

After deploying:
1. Visit your dashboard URL (e.g., `https://dashboard-mtgojetdl-leon-c9e8.vercel.app`)
2. Click the 🔑 button in the Nova Lite widget
3. Enter any value in the API key field (it will be sent to your proxy, which uses the server-side key)
4. Ask Nova a question
5. You should see a response if everything is configured correctly

Note: The API key you enter in the browser is only used to trigger the request - the proxy ignores it and uses the server-side `NIM_API_KEY` environment variable instead. This keeps your actual API key secure.

## 4. Troubleshooting

### If you see "Could not reach the AI service":
1. Check that you've set the `NIM_API_KEY` environment variable correctly in Vercel
2. Verify your NVIDIA NIM API key is valid and has access to the `nvidia/nemotron-3-super-120b-a12b` model
3. Check the Vercel deployment logs for any proxy errors
4. Ensure your dashboard has been redeployed after setting the environment variable

### If you see CORS errors:
1. Double-check that you're pointing to `/api/nim-proxy` (not the direct NVIDIA URL)
2. Make sure you've redeployed after adding the proxy file (`api/nim-proxy.js`)
3. Clear your browser cache and try again

### Testing the Proxy Directly
You can test if your proxy is working by sending a POST request to:
```
[your-vercel-url]/api/nim-proxy
```

With a JSON body like:
```json
{
  "model": "nvidia/nemotron-3-super-120b-a12b",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Hello" }
  ]
}
```

## 5. Security Notes

- Your actual NVIDIA NIM API key is stored securely in Vercel environment variables
- The proxy does not log or store your API key
- The client-side API key field is only used to trigger requests (the value is ignored by the proxy)
- Consider restricting the proxy to only accept requests from your domain in production for added security

## 6. Model Information

This setup uses the `nvidia/nemotron-3-super-120b-a12b` model via NVIDIA NIM. If you want to use a different model, simply change the model name in both:
1. `nova-lite.html` (in the `ask` function)
2. `api/nim-proxy.js` (if you want to lock it down server-side)

For the latest available models, check: [https://build.nvidia.com/nim](https://build.nvidia.com/nim)