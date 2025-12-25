# AI-Powered Chatbot with Persistent Memory

A serverless conversational AI agent built on Cloudflare's edge infrastructure, featuring Meta's Llama 3.3 70B model and persistent conversation memory.

## Features

- **Advanced AI**: Powered by Meta's Llama 3.3 70B instruction-tuned model
- **Persistent Memory**: Conversations saved across sessions using Cloudflare KV
- **Serverless**: Runs on Cloudflare Workers (edge computing)
- **Fast**: Global distribution with low latency
- **Modern UI**: Beautiful, responsive chat interface
- **No Backend Required**: Single-file deployment

##  Architecture
```
User Browser → Cloudflare Worker → Workers AI (Llama 3.3)
                     ↓
                 KV Storage (Memory)
```

### Components

1. **Cloudflare Worker**: Orchestrates requests and responses
2. **Workers AI**: Runs Llama 3.3 70B model for AI generation
3. **KV Storage**: Persistent key-value store for conversation history
4. **Frontend**: HTML/CSS/JavaScript chat interface

## Cloudflare Assignment Requirements

✅ **LLM Integration**: Meta Llama 3.3 70B via Workers AI  
✅ **Workflow/Coordination**: Cloudflare Worker orchestrating all components  
✅ **User Input**: Chat interface with text input  
✅ **Memory/State**: KV storage for persistent conversation history  

##  Deployment

### Prerequisites

- Cloudflare account with Workers Paid plan ($5/month)
- Access to Workers AI
- KV namespace created

### Steps

1. **Clone the repository**
```bash
   git clone https://github.com/yourusername/ai-chatbot-cloudflare.git
   cd ai-chatbot-cloudflare
```

2. **Install Wrangler CLI**
```bash
   npm install -g wrangler
```

3. **Login to Cloudflare**
```bash
   wrangler login
```

4. **Create KV Namespace**
```bash
   wrangler kv:namespace create KV
```
   Copy the ID and update `wrangler.toml`

5. **Deploy**
```bash
   wrangler deploy
```

### Manual Deployment (Cloudflare Dashboard)

1. Go to Cloudflare Dashboard → Workers & Pages
2. Create new Worker
3. Copy code from `worker.js` into the editor
4. Add bindings:
   - Workers AI: Variable name `AI`
   - KV Namespace: Variable name `KV`
5. Save and Deploy

## Usage

Once deployed, visit your Worker URL (e.g., `https://ai-chatbot.your-account.workers.dev`)

### Features

- **Chat**: Type messages and receive AI responses
- **Memory**: Conversation persists across sessions
- **Clear**: Reset conversation history
- **Context**: AI remembers previous 20 messages

### Example Conversations
```
User: What is Cloudflare Workers?
AI: Cloudflare Workers is a serverless platform that runs JavaScript 
    on Cloudflare's global edge network...

User: How does it differ from traditional servers?
AI: Unlike traditional servers that run in specific data centers, 
    Workers run on Cloudflare's edge network across 300+ cities...
```

##  Configuration

### Model Settings

- **Model**: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`
- **Max Tokens**: 512 (adjustable)
- **Temperature**: 0.7 (adjustable for creativity)
- **Context Window**: 20 messages (adjustable)

### Storage

- **Key Format**: `chat:{sessionId}`
- **Data**: JSON array of message objects
- **Retention**: Indefinite (until manually cleared)

## Technical Details

### API Endpoints

#### POST /api/chat
Send a message to the AI

**Request:**
```json
{
  "message": "Hello, how are you?",
  "sessionId": "session_1234567890_abc"
}
```

**Response:**
```json
{
  "response": "I'm doing well, thank you! How can I help you today?",
  "sessionId": "session_1234567890_abc"
}
```

#### POST /api/clear
Clear conversation history

**Request:**
```json
{
  "sessionId": "session_1234567890_abc"
}
```

**Response:**
```json
{
  "success": true
}
```

### Session Management

- Session IDs generated client-side
- Stored in browser localStorage
- Format: `session_{timestamp}_{random}`
- Unique per browser/device

##  Customization

### Change AI Personality

Edit the system message in `worker.js`:
```javascript
const llmMessages = [
  { role: 'system', content: 'Your custom prompt here...' },
  // ...
];
```

### Adjust Memory Length

Change the slice parameter:
```javascript
const trimmedHistory = history.slice(-20);  // Keep last 20 messages
```

### Modify Styling

Edit the CSS in the `getHTML()` function for custom themes.

##  Security Considerations

- CORS enabled for API access
- No authentication (add if needed for production)
- Session IDs are client-generated (consider server-side generation for security)
- Rate limiting recommended for production use

##  Performance

- **Response Time**: ~2-5 seconds (depending on prompt length)
- **Scalability**: Handles concurrent users automatically
- **Global**: Runs on Cloudflare's edge network worldwide
- **Cost**: Pay-per-use model (Workers AI + KV storage)

##  Troubleshooting

### "Cannot read properties of undefined (reading 'get')"
- Check KV binding is correctly configured
- Ensure variable name is exactly `KV`
- Redeploy after adding bindings

### "AI binding missing"
- Add Workers AI binding in Settings → Bindings
- Variable name must be `AI`
- Requires Workers Paid plan

### Slow Responses
- Normal for first request (cold start)
- Subsequent requests are faster
- Consider using smaller model for speed

