export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Chat endpoint
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      try {
        const { message, sessionId } = await request.json();
        
        if (!message || !sessionId) {
          return new Response(JSON.stringify({ error: 'Missing message or sessionId' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Get conversation history from KV
        const historyKey = `chat:${sessionId}`;
        const historyJson = await env.KV.get(historyKey);
        const history = historyJson ? JSON.parse(historyJson) : [];

        // Prepare messages for LLM
        const llmMessages = [
          { role: 'system', content: 'You are a helpful AI assistant. Be concise and friendly.' },
          ...history,
          { role: 'user', content: message }
        ];

        // Call Workers AI with Llama 3.3
        const aiResponse = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
          messages: llmMessages,
          max_tokens: 512,
          temperature: 0.7,
        });

        const assistantMessage = aiResponse.response || 'Sorry, I could not generate a response.';

        // Update conversation history
        history.push({ role: 'user', content: message });
        history.push({ role: 'assistant', content: assistantMessage });

        // Keep only last 20 messages
        const trimmedHistory = history.slice(-20);
        
        // Save to KV
        await env.KV.put(historyKey, JSON.stringify(trimmedHistory));

        return new Response(JSON.stringify({ 
          response: assistantMessage,
          sessionId: sessionId
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (error) {
        console.error('Chat error:', error);
        return new Response(JSON.stringify({ 
          error: error.message
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Clear conversation endpoint
    if (url.pathname === '/api/clear' && request.method === 'POST') {
      try {
        const { sessionId } = await request.json();
        const historyKey = `chat:${sessionId}`;
        await env.KV.delete(historyKey);
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Serve HTML frontend
    return new Response(getHTML(), {
      headers: { 'Content-Type': 'text/html' }
    });
  }
};

function getHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Chatbot - Cloudflare</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .chat-container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            width: 100%;
            max-width: 800px;
            height: 600px;
            display: flex;
            flex-direction: column;
        }
        .chat-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 20px;
            font-weight: 600;
            border-radius: 20px 20px 0 0;
        }
        .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        .message {
            display: flex;
            gap: 10px;
            animation: fadeIn 0.3s ease-in;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .message.user { justify-content: flex-end; }
        .message-content {
            max-width: 70%;
            padding: 12px 18px;
            border-radius: 18px;
            line-height: 1.5;
        }
        .message.user .message-content {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-bottom-right-radius: 4px;
        }
        .message.assistant .message-content {
            background: #f1f3f4;
            color: #333;
            border-bottom-left-radius: 4px;
        }
        .chat-input-container {
            padding: 20px;
            background: #f8f9fa;
            border-top: 1px solid #e0e0e0;
            display: flex;
            gap: 10px;
        }
        #messageInput {
            flex: 1;
            padding: 12px 18px;
            border: 2px solid #e0e0e0;
            border-radius: 25px;
            font-size: 15px;
            outline: none;
        }
        #messageInput:focus { border-color: #667eea; }
        button {
            padding: 12px 30px;
            border: none;
            border-radius: 25px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
        }
        button:hover { transform: translateY(-2px); }
        button:disabled { opacity: 0.6; cursor: not-allowed; }
        .clear-button { background: #ff6b6b; padding: 8px 20px; font-size: 14px; }
        .loading { display: flex; gap: 5px; padding: 12px 18px; }
        .loading span {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #667eea;
            animation: bounce 1.4s infinite ease-in-out;
        }
        .loading span:nth-child(1) { animation-delay: -0.32s; }
        .loading span:nth-child(2) { animation-delay: -0.16s; }
        @keyframes bounce {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
        }
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="chat-header">
             AI Assistant with Persistent Memory
            <div style="font-size: 12px; opacity: 0.9; margin-top: 5px;">Powered by Llama 3.3 + KV Storage</div>
        </div>
        <div class="chat-messages" id="chatMessages">
            <div class="message assistant">
                <div class="message-content">
                    Hello! I'm your AI assistant with persistent memory. Your conversation is saved even if you close this page. How can I help you?
                </div>
            </div>
        </div>
        <div class="chat-input-container">
            <input type="text" id="messageInput" placeholder="Type your message..." autocomplete="off"/>
            <button id="sendButton">Send</button>
            <button id="clearButton" class="clear-button">Clear</button>
        </div>
    </div>
    <script>
        let sessionId = localStorage.getItem('chatSessionId');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('chatSessionId', sessionId);
        }
        const chatMessages = document.getElementById('chatMessages');
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        const clearButton = document.getElementById('clearButton');

        function addMessage(role, content) {
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${role}\`;
            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            contentDiv.textContent = content;
            messageDiv.appendChild(contentDiv);
            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        function showLoading() {
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'message assistant';
            loadingDiv.id = 'loading';
            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content loading';
            contentDiv.innerHTML = '<span></span><span></span><span></span>';
            loadingDiv.appendChild(contentDiv);
            chatMessages.appendChild(loadingDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        function hideLoading() {
            const loading = document.getElementById('loading');
            if (loading) loading.remove();
        }

        async function sendMessage() {
            const message = messageInput.value.trim();
            if (!message) return;
            messageInput.disabled = true;
            sendButton.disabled = true;
            addMessage('user', message);
            messageInput.value = '';
            showLoading();

            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: message, sessionId: sessionId })
                });
                const data = await response.json();
                hideLoading();
                if (data.error) {
                    addMessage('assistant', 'Error: ' + data.error);
                } else {
                    addMessage('assistant', data.response);
                }
            } catch (error) {
                hideLoading();
                addMessage('assistant', 'Connection error: ' + error.message);
                console.error(error);
            } finally {
                messageInput.disabled = false;
                sendButton.disabled = false;
                messageInput.focus();
            }
        }

        async function clearConversation() {
            if (!confirm('Clear conversation history?')) return;
            try {
                await fetch('/api/clear', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId: sessionId })
                });
                chatMessages.innerHTML = '';
                addMessage('assistant', 'Conversation cleared! How can I help?');
            } catch (error) {
                alert('Failed to clear conversation');
            }
        }

        sendButton.addEventListener('click', sendMessage);
        clearButton.addEventListener('click', clearConversation);
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
        messageInput.focus();
    </script>
</body>
</html>`;
}