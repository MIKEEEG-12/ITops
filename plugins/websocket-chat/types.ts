
export interface User {
  id: string;
  username: string;
  isOnline: boolean;
  lastSeen: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  roomId?: string; // If null, it's a global broadcast
  toUserId?: string; // If set, it's a private message
  timestamp: number;
}

export interface ServerToClientEvents {
  message: (msg: ChatMessage) => void;
  userStatus: (user: User) => void;
  typing: (data: { userId: string; username: string; roomId?: string }) => void;
  error: (err: { code: string; message: string }) => void;
  history: (messages: ChatMessage[]) => void;
}

export interface ClientToServerEvents {
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  sendMessage: (data: { content: string; roomId?: string; toUserId?: string }) => void;
  typing: (data: { roomId?: string }) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  user: User;
}
