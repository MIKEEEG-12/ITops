
import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { 
  ClientToServerEvents, 
  ServerToClientEvents, 
  InterServerEvents, 
  SocketData, 
  ChatMessage,
  User 
} from './types';

// Simple in-memory storage (Replace with Redis/DB for production)
const messageHistory: ChatMessage[] = [];
const connectedUsers = new Map<string, User>();
const MAX_HISTORY = 50;

// Rate Limiting Configuration
const RATE_LIMIT_WINDOW = 1000; // 1 second
const RATE_LIMIT_MAX_MSG = 5; // 5 messages per second
const rateLimitMap = new Map<string, number[]>();

export class ChatServer {
  private io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

  constructor(httpServer: HttpServer, corsOrigin: string = '*') {
    this.io = new Server(httpServer, {
      cors: {
        origin: corsOrigin,
        methods: ["GET", "POST"]
      }
    });

    this.initializeMiddlewares();
    this.initializeEvents();
    console.log('✅ WebSocket Chat Server Initialized');
  }

  private initializeMiddlewares() {
    // Authentication Middleware
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      const username = socket.handshake.auth.username;

      // TODO: Validate your actual JWT/Token here
      if (!token || !username) {
        return next(new Error('Authentication error: Missing credentials'));
      }

      // Mock User Session
      socket.data.user = {
        id: socket.id, // In production, use userId from DB
        username: username,
        isOnline: true,
        lastSeen: Date.now()
      };
      
      connectedUsers.set(socket.id, socket.data.user);
      next();
    });
  }

  private isRateLimited(socketId: string): boolean {
    const now = Date.now();
    const timestamps = rateLimitMap.get(socketId) || [];
    
    // Filter timestamps within the window
    const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
    
    if (recent.length >= RATE_LIMIT_MAX_MSG) {
      return true;
    }

    recent.push(now);
    rateLimitMap.set(socketId, recent);
    return false;
  }

  private initializeEvents() {
    this.io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) => {
      const user = socket.data.user!;
      
      // Broadcast online status
      socket.broadcast.emit('userStatus', user);
      
      // Send last global history
      const globalHistory = messageHistory.filter(m => !m.roomId && !m.toUserId);
      socket.emit('history', globalHistory);

      // --- Event: Join Room ---
      socket.on('joinRoom', (roomId) => {
        socket.join(roomId);
        // Send room specific history (filtered)
        const roomHistory = messageHistory.filter(m => m.roomId === roomId);
        socket.emit('history', roomHistory);
      });

      // --- Event: Leave Room ---
      socket.on('leaveRoom', (roomId) => {
        socket.leave(roomId);
      });

      // --- Event: Typing ---
      socket.on('typing', (data) => {
        if (data.roomId) {
          socket.to(data.roomId).emit('typing', { userId: user.id, username: user.username, roomId: data.roomId });
        } else {
          socket.broadcast.emit('typing', { userId: user.id, username: user.username });
        }
      });

      // --- Event: Send Message ---
      socket.on('sendMessage', (data) => {
        if (this.isRateLimited(socket.id)) {
          socket.emit('error', { code: 'RATE_LIMIT', message: 'You are sending messages too fast.' });
          return;
        }

        const newMessage: ChatMessage = {
          id: uuidv4(),
          senderId: user.id,
          senderName: user.username,
          content: data.content,
          timestamp: Date.now(),
          roomId: data.roomId,
          toUserId: data.toUserId
        };

        // Storage logic
        messageHistory.push(newMessage);
        if (messageHistory.length > MAX_HISTORY) messageHistory.shift();

        // Routing logic
        if (data.toUserId) {
          // Private Message
          this.io.to(data.toUserId).emit('message', newMessage);
          socket.emit('message', newMessage); // Echo back to sender
        } else if (data.roomId) {
          // Room Message
          this.io.to(data.roomId).emit('message', newMessage);
        } else {
          // Broadcast Message
          this.io.emit('message', newMessage);
        }
      });

      // --- Disconnect ---
      socket.on('disconnect', () => {
        if (user) {
          user.isOnline = false;
          user.lastSeen = Date.now();
          connectedUsers.delete(socket.id);
          rateLimitMap.delete(socket.id);
          this.io.emit('userStatus', user);
        }
      });
    });
  }
}
