import { User, Post, Message } from '../types';

const KEYS = {
  USERS: 'neobook_users',
  POSTS: 'neobook_posts',
  MESSAGES: 'neobook_messages',
  SESSION: 'neobook_session',
};

// --- Initial Seed Data ---
const seedData = () => {
  try {
    if (!localStorage.getItem(KEYS.USERS)) {
      const adminUser: User = {
        id: 'admin-uuid',
        userId: 'admin',
        username: 'System Admin',
        name: 'Neo Admin',
        password: 'admin', // Insecure, demo only
        avatar: 'https://picsum.photos/200',
        coverPhoto: 'https://picsum.photos/800/300',
        bio: 'System Administrator',
        email: 'admin@neobook.com',
        joinedAt: Date.now(),
        friends: [],
        friendRequests: [],
        isAdmin: true,
        status: 'online'
      };
      const demoUser: User = {
          id: 'demo-uuid',
          userId: 'neo_user',
          username: 'Neo User',
          name: 'John Doe',
          password: '123',
          avatar: 'https://picsum.photos/201',
          coverPhoto: 'https://picsum.photos/800/301',
          bio: 'Loving the future!',
          email: 'john@example.com',
          joinedAt: Date.now(),
          friends: [],
          friendRequests: [],
          status: 'online'
      };
      localStorage.setItem(KEYS.USERS, JSON.stringify([adminUser, demoUser]));
    }
    if (!localStorage.getItem(KEYS.POSTS)) {
      const initialPost: Post = {
        id: 'post-1',
        authorId: 'admin-uuid',
        content: 'Welcome to NEOBOOK! This is the future of social connection.',
        likes: [],
        comments: [],
        createdAt: Date.now(),
        image: 'https://picsum.photos/600/400'
      };
      localStorage.setItem(KEYS.POSTS, JSON.stringify([initialPost]));
    }
    if (!localStorage.getItem(KEYS.MESSAGES)) {
      localStorage.setItem(KEYS.MESSAGES, JSON.stringify([]));
    }
  } catch (e) {
    console.error("Initial seed failed", e);
  }
};

seedData();

// --- Helpers ---

const safeSetItem = (key: string, value: string): boolean => {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (e: any) {
        if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            alert("Storage full! Please delete some posts or clear data.");
        } else {
            console.error("Storage error", e);
        }
        return false;
    }
};

export const StorageService = {
  getUsers: (): User[] => JSON.parse(localStorage.getItem(KEYS.USERS) || '[]'),
  
  saveUsers: (users: User[]) => safeSetItem(KEYS.USERS, JSON.stringify(users)),

  getPosts: (): Post[] => JSON.parse(localStorage.getItem(KEYS.POSTS) || '[]'),
  
  savePosts: (posts: Post[]) => safeSetItem(KEYS.POSTS, JSON.stringify(posts)),

  getMessages: (): Message[] => JSON.parse(localStorage.getItem(KEYS.MESSAGES) || '[]'),
  
  saveMessages: (msgs: Message[]) => safeSetItem(KEYS.MESSAGES, JSON.stringify(msgs)),

  getCurrentUser: (): User | null => {
    const session = localStorage.getItem(KEYS.SESSION);
    return session ? JSON.parse(session) : null;
  },

  setCurrentUser: (user: User | null) => {
    if (user) {
      safeSetItem(KEYS.SESSION, JSON.stringify(user));
    } else {
      localStorage.removeItem(KEYS.SESSION);
    }
  },

  // --- Logic ---

  findUserById: (uuid: string): User | undefined => {
    const users = StorageService.getUsers();
    return users.find(u => u.id === uuid);
  },

  findUserByCustomId: (customId: string): User | undefined => {
    const users = StorageService.getUsers();
    return users.find(u => u.userId === customId);
  },

  createUser: (user: User): boolean => {
    const users = StorageService.getUsers();
    if (users.some(u => u.userId === user.userId)) return false;
    users.push(user);
    return StorageService.saveUsers(users);
  },

  updateUser: (updatedUser: User): boolean => {
    let users = StorageService.getUsers();
    // Check if userId is taken by someone else
    const existing = users.find(u => u.userId === updatedUser.userId && u.id !== updatedUser.id);
    if (existing) return false;

    users = users.map(u => u.id === updatedUser.id ? updatedUser : u);
    const saved = StorageService.saveUsers(users);
    if (saved) {
        StorageService.setCurrentUser(updatedUser); // Update session too
    }
    return saved;
  },

  createPost: (post: Post) => {
    const posts = StorageService.getPosts();
    // Limit total posts to 50 to save space in this prototype
    if (posts.length > 50) {
        posts.pop(); 
    }
    posts.unshift(post); // Add to top
    StorageService.savePosts(posts);
  },

  sendFriendRequest: (fromId: string, toCustomId: string): { success: boolean, message: string } => {
    const users = StorageService.getUsers();
    const target = users.find(u => u.userId === toCustomId);
    const sender = users.find(u => u.id === fromId);

    if (!target) return { success: false, message: 'User ID not found.' };
    if (!sender) return { success: false, message: 'Session error.' };
    if (target.id === fromId) return { success: false, message: 'Cannot add yourself.' };
    if (sender.friends.includes(target.id)) return { success: false, message: 'Already friends.' };
    if (target.friendRequests.includes(fromId)) return { success: false, message: 'Request already sent.' };

    target.friendRequests.push(fromId);
    StorageService.saveUsers(users);
    return { success: true, message: 'Friend request sent!' };
  },

  acceptFriendRequest: (userId: string, requesterId: string) => {
    const users = StorageService.getUsers();
    const user = users.find(u => u.id === userId);
    const requester = users.find(u => u.id === requesterId);

    if (user && requester) {
      user.friends.push(requesterId);
      requester.friends.push(userId);
      user.friendRequests = user.friendRequests.filter(id => id !== requesterId);
      StorageService.saveUsers(users);
      
      // Auto-generate message
      const messages = StorageService.getMessages();
      const timestamp = Date.now();
      
      // Message for User
      messages.push({
          id: `sys-${timestamp}-1`,
          fromId: requesterId,
          toId: userId,
          content: `You are now friends with ${requester.name}. Start chatting now!`,
          timestamp: timestamp,
          read: false
      });
      
      StorageService.saveMessages(messages);

      // Refresh session
      const currentUser = StorageService.getCurrentUser();
      if (currentUser && currentUser.id === userId) {
          StorageService.setCurrentUser(user);
      }
    }
  },

  sendMessage: (msg: Message) => {
      const messages = StorageService.getMessages();
      messages.push(msg);
      // Limit messages history per conversation or global to avoid storage issues
      if (messages.length > 500) messages.splice(0, 100);
      StorageService.saveMessages(messages);
  }
};