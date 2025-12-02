
# WebSocket Chat Plugin

## Installation
1. Install dependencies: `npm install socket.io socket.io-client uuid`
2. Install types: `npm install -D @types/node @types/uuid`

## Server Usage (Express/NestJS/Fastify)
This plugin attaches to the standard Node.js `http.Server`.

```typescript
import { ChatServer } from './plugins/websocket-chat/server';

// In Express:
const server = app.listen(3000);
new ChatServer(server);

// In Fastify:
await fastify.ready();
new ChatServer(fastify.server);
```

## Client Usage (React/Vue/Vanilla)

```typescript
import { ChatClient } from './plugins/websocket-chat/client';

const chat = new ChatClient({
  url: 'http://localhost:3000',
  token: 'my-auth-token',
  username: 'Alice'
});

chat.onMessage = (msg) => console.log('New Message:', msg);
chat.sendBroadcast('Hello World');
```
