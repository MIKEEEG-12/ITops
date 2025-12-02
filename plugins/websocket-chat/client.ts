
import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents, ChatMessage, User } from './types';

export type ChatConfig = {
  url: string;
  token: string;
  username: string;
};

export class ChatClient {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  
  public onMessage?: (msg: ChatMessage) => void;
  public onTyping?: (data: { userId: string; username: string }) => void;
  public onStatusChange?: (user: User) => void;
  public onError?: (err: any) => void;

  constructor(config: ChatConfig) {
    this.socket = io(config.url, {
      auth: {
        token: config.token,
        username: config.username
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true
    });

    this.initListeners();
  }

  private initListeners() {
    this.socket.on('connect', () => {
      console.log('✅ Connected to Chat Server:', this.socket.id);
    });

    this.socket.on('connect_error', (err) => {
      console.warn('⚠️ Chat Connection Failed (Server might be offline):', err.message);
    });

    this.socket.on('message', (msg) => {
      if (this.onMessage) this.onMessage(msg);
    });

    this.socket.on('typing', (data) => {
      if (this.onTyping) this.onTyping(data);
    });

    this.socket.on('userStatus', (user) => {
      if (this.onStatusChange) this.onStatusChange(user);
    });

    this.socket.on('error', (err) => {
      console.error('Chat Error:', err);
      if (this.onError) this.onError(err);
    });
    
    this.socket.on('history', (msgs) => {
      msgs.forEach(m => {
        if (this.onMessage) this.onMessage(m);
      });
    });
  }

  // --- Public Actions ---

  public joinRoom(roomId: string) {
    this.socket.emit('joinRoom', roomId);
  }

  public leaveRoom(roomId: string) {
    this.socket.emit('leaveRoom', roomId);
  }

  public sendBroadcast(content: string) {
    this.socket.emit('sendMessage', { content });
  }

  public sendToRoom(roomId: string, content: string) {
    this.socket.emit('sendMessage', { content, roomId });
  }

  public sendPrivate(toUserId: string, content: string) {
    this.socket.emit('sendMessage', { content, toUserId });
  }

  public sendTyping(roomId?: string) {
    this.socket.emit('typing', { roomId });
  }

  public disconnect() {
    this.socket.disconnect();
  }
}
