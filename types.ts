export interface User {
  id: string;
  userId: string; // Custom ID (e.g., "NeoKing77")
  username: string; // Display name or handle
  password?: string; // Stored for prototype simplicity (insecure in real app)
  name: string;
  email?: string;
  avatar: string;
  coverPhoto: string;
  bio: string;
  joinedAt: number;
  friends: string[]; // Array of User UUIDs
  friendRequests: string[]; // Array of User UUIDs (incoming)
  isAdmin?: boolean;
  status: 'online' | 'offline' | 'busy';
}

export interface Post {
  id: string;
  authorId: string;
  content: string;
  image?: string;
  likes: string[]; // User UUIDs
  comments: Comment[];
  createdAt: number;
  sharedFromId?: string; // ID of the original post if this is a share
  targetUserIds?: string[]; // If present, only visible to these users (and author)
}

export interface Comment {
  id: string;
  authorId: string;
  content: string;
  createdAt: number;
}

export interface Message {
  id: string;
  fromId: string;
  toId: string;
  content: string;
  timestamp: number;
  read: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'friend_request' | 'like' | 'comment' | 'message';
  data: any;
  read: boolean;
  createdAt: number;
}

export type ViewState = 'login' | 'signup' | 'feed' | 'friends' | 'messages' | 'profile' | 'admin';