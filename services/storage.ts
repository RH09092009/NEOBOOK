import { User, Post, Message } from '../types';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  updateDoc,
  arrayUnion,
  arrayRemove,
  addDoc,
  limit
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';

// --- FIREBASE CONFIGURATION ---
// 🔴 REPLACE THE CONFIG BELOW WITH YOUR OWN FROM FIREBASE CONSOLE 🔴
const firebaseConfig = {
  apiKey: "REPLACE_WITH_YOUR_API_KEY",
  authDomain: "REPLACE_WITH_YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "REPLACE_WITH_YOUR_PROJECT_ID",
  storageBucket: "REPLACE_WITH_YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "REPLACE_WITH_YOUR_MESSAGING_SENDER_ID",
  appId: "REPLACE_WITH_YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Helper to convert custom User ID to Email for Firebase Auth
const getEmailFromId = (userId: string) => `${userId.toLowerCase()}@neobook.app`;

export const StorageService = {
  // --- Authentication ---
  
  auth, // Export auth instance for direct usage if needed

  observeAuth: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch full user profile from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          callback(userDoc.data() as User);
        } else {
          // Fallback if doc doesn't exist yet (rare race condition)
          callback(null);
        }
      } else {
        callback(null);
      }
    });
  },

  login: async (userId: string, password: string): Promise<User> => {
    const email = getEmailFromId(userId);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    if (!userDoc.exists()) throw new Error('User profile not found');
    return userDoc.data() as User;
  },

  signup: async (user: User, password: string): Promise<User> => {
    const email = getEmailFromId(user.userId);
    
    // 1. Create Auth User
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    
    // 2. Create Firestore Document
    const finalUser: User = { ...user, id: uid, email };
    await setDoc(doc(db, 'users', uid), finalUser);
    
    return finalUser;
  },

  logout: async () => {
    await signOut(auth);
  },

  // --- Users ---

  findUserByCustomId: async (customId: string): Promise<User | undefined> => {
    const q = query(collection(db, 'users'), where('userId', '==', customId));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return undefined;
    return querySnapshot.docs[0].data() as User;
  },

  getUser: async (uid: string): Promise<User | undefined> => {
    const userDoc = await getDoc(doc(db, 'users', uid));
    return userDoc.exists() ? (userDoc.data() as User) : undefined;
  },

  updateUser: async (updatedUser: User): Promise<boolean> => {
    try {
      // Check uniqueness of userId if it changed
      // Note: In a real app, you'd use a Cloud Function or specific rules, 
      // here we do a quick client-side check which isn't race-condition proof but works for prototype.
      
      const userRef = doc(db, 'users', updatedUser.id);
      await updateDoc(userRef, { ...updatedUser });
      return true;
    } catch (e) {
      console.error("Error updating user:", e);
      return false;
    }
  },

  checkIdAvailability: async (userId: string, currentUid?: string): Promise<boolean> => {
    const q = query(collection(db, 'users'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return true;
    // If found, check if it's me
    if (currentUid && querySnapshot.docs[0].id === currentUid) return true;
    return false;
  },

  // --- Friends ---

  sendFriendRequest: async (fromId: string, toCustomId: string): Promise<{ success: boolean, message: string }> => {
    try {
        const targetUser = await StorageService.findUserByCustomId(toCustomId);
        
        if (!targetUser) return { success: false, message: 'User ID not found.' };
        if (targetUser.id === fromId) return { success: false, message: 'Cannot add yourself.' };
        
        const senderDoc = await getDoc(doc(db, 'users', fromId));
        const sender = senderDoc.data() as User;

        if (sender.friends.includes(targetUser.id)) return { success: false, message: 'Already friends.' };
        if (targetUser.friendRequests.includes(fromId)) return { success: false, message: 'Request already sent.' };

        // Update target user's friendRequests
        await updateDoc(doc(db, 'users', targetUser.id), {
            friendRequests: arrayUnion(fromId)
        });

        return { success: true, message: 'Friend request sent!' };
    } catch (e) {
        console.error(e);
        return { success: false, message: 'Error sending request.' };
    }
  },

  acceptFriendRequest: async (userId: string, requesterId: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      const requesterRef = doc(db, 'users', requesterId);

      // Update both users
      await updateDoc(userRef, {
          friends: arrayUnion(requesterId),
          friendRequests: arrayRemove(requesterId)
      });
      
      await updateDoc(requesterRef, {
          friends: arrayUnion(userId)
      });

      // Auto-generate system message
      const requesterDoc = await getDoc(requesterRef);
      const requester = requesterDoc.data() as User;
      
      const msg: Message = {
          id: `sys-${Date.now()}`,
          fromId: requesterId,
          toId: userId,
          content: `You are now friends with ${requester.name}. Start chatting now!`,
          timestamp: Date.now(),
          read: false
      };
      
      await addDoc(collection(db, 'messages'), msg);

    } catch (e) {
        console.error("Error accepting friend:", e);
    }
  },

  // --- Posts ---

  createPost: async (post: Post): Promise<boolean> => {
    try {
      // We use addDoc to let Firestore generate ID, or setDoc if we want to control it.
      // Using setDoc with post.id since we generated it on client for now.
      await setDoc(doc(db, 'posts', post.id), post);
      return true;
    } catch (e) {
      console.error("Error creating post:", e);
      return false;
    }
  },

  subscribeToPosts: (callback: (posts: Post[]) => void) => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50));
    return onSnapshot(q, (snapshot) => {
      const posts = snapshot.docs.map(doc => doc.data() as Post);
      callback(posts);
    });
  },

  // --- Messages ---

  sendMessage: async (msg: Message) => {
    try {
        await addDoc(collection(db, 'messages'), msg);
    } catch (e) {
        console.error("Error sending message:", e);
    }
  },

  subscribeToMessages: (userId: string, friendId: string, callback: (msgs: Message[]) => void) => {
    // Firestore OR queries are tricky. We usually query all messages involving userId and filter client side 
    // or have a specific conversationID. For prototype, we fetch all messages where (from==me & to==friend) OR (from==friend & to==me)
    // Realtime listener on entire messages collection filtered client side is easier for small prototypes,
    // but inefficient at scale. 
    // Better: Store conversation ID.
    
    // For this prototype with low volume:
    const q = query(
        collection(db, 'messages'), 
        orderBy('timestamp', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
        const allMsgs = snapshot.docs.map(d => d.data() as Message);
        const filtered = allMsgs.filter(m => 
            (m.fromId === userId && m.toId === friendId) ||
            (m.fromId === friendId && m.toId === userId)
        );
        callback(filtered);
    });
  },

  // --- Storage (Images) ---

  uploadImage: async (file: File, path: string): Promise<string> => {
      try {
          const storageRef = ref(storage, path);
          const snapshot = await uploadBytes(storageRef, file);
          const url = await getDownloadURL(snapshot.ref);
          return url;
      } catch (e) {
          console.error("Upload failed", e);
          throw e;
      }
  },
  
  // --- Admin ---
  getAllUsers: async (): Promise<User[]> => {
      const q = query(collection(db, 'users'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => d.data() as User);
  },
  
  deleteUser: async (uid: string) => {
      // Note: This doesn't delete Auth user, only Firestore doc. 
      // Deleting Auth user requires Admin SDK or Cloud Functions.
      await setDoc(doc(db, 'users', uid), { deleted: true }, { merge: true }); 
      // Or actually delete: deleteDoc(doc(db, 'users', uid));
  },

  deletePost: async (postId: string) => {
      // deleteDoc(doc(db, 'posts', postId));
  }
};
