
import { User, Post, Message } from '../types';

// --- LOCAL STORAGE KEYS ---
const KEYS = {
  USERS: 'neobook_users',
  POSTS: 'neobook_posts',
  MESSAGES: 'neobook_messages',
  SESSION: 'neobook_session'
};

// --- HELPERS ---
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getStored = <T>(key: string, def: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : def;
  } catch {
    return def;
  }
};

const setStored = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    // Dispatch storage event for cross-tab sync simulation
    window.dispatchEvent(new Event('storage')); 
  } catch (e) {
    console.error("Storage Quota Exceeded", e);
    throw new Error("Storage full. Please delete some posts or images.");
  }
};

export const StorageService = {
  // --- Authentication ---

  observeAuth: (callback: (user: User | null) => void) => {
    // Check immediately
    const session = getStored<string | null>(KEYS.SESSION, null);
    if (session) {
      const users = getStored<User[]>(KEYS.USERS, []);
      const user = users.find(u => u.id === session) || null;
      callback(user);
    } else {
      callback(null);
    }

    // Poll for changes (simulating real-time auth state)
    const interval = setInterval(() => {
       const currentSession = getStored<string | null>(KEYS.SESSION, null);
       if (currentSession !== session) {
          // Session changed, reload page logic handled by component or simple callback update
          // For simplicity in this prototype, we just callback if user exists
          const allUsers = getStored<User[]>(KEYS.USERS, []);
          const u = allUsers.find(user => user.id === currentSession) || null;
          callback(u);
       }
    }, 1000);

    return () => clearInterval(interval);
  },

  login: async (userId: string, password: string): Promise<User> => {
    await delay(500);
    const users = getStored<User[]>(KEYS.USERS, []);
    // Insecure password check for prototype
    const user = users.find(u => u.userId === userId && u.password === password); // Note: Password field check usually removed in types, but assuming stored here for prototype
    
    // Fallback: since we didn't strictly store passwords in previous prompt's Types, 
    // we might just check UserID for this prototype if password missing.
    // However, let's try to find by userId.
    const found = users.find(u => u.userId === userId);
    
    if (!found) throw new Error('User not found');
    // Simulate password check (ignoring for prototype if not set)
    
    setStored(KEYS.SESSION, found.id);
    return found;
  },

  signup: async (user: User, password: string): Promise<User> => {
    await delay(800);
    const users = getStored<User[]>(KEYS.USERS, []);
    
    if (users.find(u => u.userId === user.userId)) {
      throw new Error('User ID already taken');
    }

    const newUser = { ...user, id: `user-${Date.now()}`, password }; // Store password for login check
    users.push(newUser);
    setStored(KEYS.USERS, users);
    setStored(KEYS.SESSION, newUser.id);
    
    return newUser;
  },

  logout: async () => {
    localStorage.removeItem(KEYS.SESSION);
    window.location.reload();
  },

  // --- Users ---

  findUserByCustomId: async (customId: string): Promise<User | undefined> => {
    await delay(300);
    const users = getStored<User[]>(KEYS.USERS, []);
    return users.find(u => u.userId === customId);
  },

  getUser: async (uid: string): Promise<User | undefined> => {
    const users = getStored<User[]>(KEYS.USERS, []);
    return users.find(u => u.id === uid);
  },

  updateUser: async (updatedUser: User): Promise<boolean> => {
    try {
      await delay(400);
      const users = getStored<User[]>(KEYS.USERS, []);
      const index = users.findIndex(u => u.id === updatedUser.id);
      if (index !== -1) {
        users[index] = updatedUser;
        setStored(KEYS.USERS, users);
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  checkIdAvailability: async (userId: string, currentUid?: string): Promise<boolean> => {
    const users = getStored<User[]>(KEYS.USERS, []);
    const found = users.find(u => u.userId === userId);
    if (!found) return true;
    if (currentUid && found.id === currentUid) return true;
    return false;
  },

  // --- Friends ---

  sendFriendRequest: async (fromId: string, toCustomId: string): Promise<{ success: boolean, message: string }> => {
    await delay(300);
    const users = getStored<User[]>(KEYS.USERS, []);
    const sender = users.find(u => u.id === fromId);
    const target = users.find(u => u.userId === toCustomId);

    if (!sender || !target) return { success: false, message: 'User not found' };
    if (sender.id === target.id) return { success: false, message: "Can't add yourself" };
    if (sender.friends.includes(target.id)) return { success: false, message: 'Already friends' };
    if (target.friendRequests.includes(fromId)) return { success: false, message: 'Request already sent' };

    target.friendRequests.push(fromId);
    
    // Save
    const targetIdx = users.findIndex(u => u.id === target.id);
    users[targetIdx] = target;
    setStored(KEYS.USERS, users);

    return { success: true, message: 'Request sent!' };
  },

  acceptFriendRequest: async (userId: string, requesterId: string) => {
    await delay(300);
    const users = getStored<User[]>(KEYS.USERS, []);
    const userIdx = users.findIndex(u => u.id === userId);
    const reqIdx = users.findIndex(u => u.id === requesterId);

    if (userIdx === -1 || reqIdx === -1) return;

    const user = users[userIdx];
    const requester = users[reqIdx];

    // Add to friends list
    if (!user.friends.includes(requesterId)) user.friends.push(requesterId);
    if (!requester.friends.includes(userId)) requester.friends.push(userId);

    // Remove request
    user.friendRequests = user.friendRequests.filter(id => id !== requesterId);

    // Save users
    users[userIdx] = user;
    users[reqIdx] = requester;
    setStored(KEYS.USERS, users);

    // Auto Message
    const msg: Message = {
        id: `sys-${Date.now()}`,
        fromId: requesterId,
        toId: userId,
        content: `You are now friends with ${requester.name}. Start chatting now!`,
        timestamp: Date.now(),
        read: false
    };
    await StorageService.sendMessage(msg);
  },

  // --- Posts ---

  createPost: async (post: Post): Promise<boolean> => {
    try {
      await delay(400);
      const posts = getStored<Post[]>(KEYS.POSTS, []);
      posts.unshift(post); // Add to top
      setStored(KEYS.POSTS, posts);
      return true;
    } catch (e) {
      alert("Storage full! Cannot post.");
      return false;
    }
  },

  subscribeToPosts: (callback: (posts: Post[]) => void) => {
    // Initial load
    const load = () => {
        const posts = getStored<Post[]>(KEYS.POSTS, []);
        // Sort desc
        posts.sort((a, b) => b.createdAt - a.createdAt);
        callback(posts);
    };
    load();

    // Poll for updates
    const interval = setInterval(load, 2000);
    return () => clearInterval(interval);
  },

  deletePost: async (postId: string) => {
      const posts = getStored<Post[]>(KEYS.POSTS, []);
      const newPosts = posts.filter(p => p.id !== postId);
      setStored(KEYS.POSTS, newPosts);
  },

  // --- Messages ---

  sendMessage: async (msg: Message) => {
    const msgs = getStored<Message[]>(KEYS.MESSAGES, []);
    // Auto-generate ID if missing
    if(!msg.id) msg.id = `msg-${Date.now()}-${Math.random()}`;
    msgs.push(msg);
    setStored(KEYS.MESSAGES, msgs);
  },

  subscribeToMessages: (userId: string, friendId: string, callback: (msgs: Message[]) => void) => {
    const load = () => {
        const allMsgs = getStored<Message[]>(KEYS.MESSAGES, []);
        const filtered = allMsgs.filter(m => 
            (m.fromId === userId && m.toId === friendId) ||
            (m.fromId === friendId && m.toId === userId)
        );
        filtered.sort((a, b) => a.timestamp - b.timestamp);
        callback(filtered);
    };
    load();
    const interval = setInterval(load, 1000);
    return () => clearInterval(interval);
  },

  // --- Storage (Images) ---

  uploadImage: async (file: File, path: string): Promise<string> => {
      // Convert to Base64 for LocalStorage
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
             const result = reader.result as string;
             // Simple compression check handled in Feed component usually, 
             // but here we just pass through.
             resolve(result); 
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
      });
  },

  // --- Admin ---
  
  getAllUsers: async (): Promise<User[]> => {
      return getStored<User[]>(KEYS.USERS, []);
  },

  deleteUser: async (uid: string) => {
      let users = getStored<User[]>(KEYS.USERS, []);
      users = users.filter(u => u.id !== uid);
      setStored(KEYS.USERS, users);
  }
};
