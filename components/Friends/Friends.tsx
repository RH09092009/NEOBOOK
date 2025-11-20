import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Check, X, User as UserIcon, MessageSquare } from 'lucide-react';
import { User } from '../../types';
import { StorageService } from '../../services/storage';

interface FriendsProps {
  currentUser: User;
  onNavigateToProfile: (userId: string) => void;
  onNavigateToChat: (userId: string) => void;
  onRefresh: () => void;
}

export const Friends: React.FC<FriendsProps> = ({ currentUser, onNavigateToProfile, onNavigateToChat, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [friendRequests, setFriendRequests] = useState<User[]>([]);
  const [myFriends, setMyFriends] = useState<User[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loadData = async () => {
      // 1. Fetch Friend Requests
      const requestPromises = currentUser.friendRequests.map(id => StorageService.getUser(id));
      const reqUsers = await Promise.all(requestPromises);
      setFriendRequests(reqUsers.filter(u => !!u) as User[]);

      // 2. Fetch Friends
      const friendPromises = currentUser.friends.map(id => StorageService.getUser(id));
      const friendUsers = await Promise.all(friendPromises);
      setMyFriends(friendUsers.filter(u => !!u) as User[]);
  };

  useEffect(() => {
      loadData();
  }, [currentUser]);

  const handleSearch = async () => {
    if (!searchTerm) return;
    setIsLoading(true);
    
    // We can only efficiently search by exact custom User ID in Firebase without indexing everything 
    // or using a full text search service like Algolia.
    // For prototype, we'll search by exact custom ID.
    const user = await StorageService.findUserByCustomId(searchTerm);
    if (user) {
        setSearchResults([user]);
    } else {
        setSearchResults([]);
        setMessage('User not found');
        setTimeout(() => setMessage(''), 3000);
    }
    setIsLoading(false);
  };

  const sendRequest = async (targetUserId: string) => {
    const result = await StorageService.sendFriendRequest(currentUser.id, targetUserId);
    setMessage(result.message);
    setTimeout(() => setMessage(''), 3000);
  };

  const acceptRequest = async (requesterId: string) => {
      await StorageService.acceptFriendRequest(currentUser.id, requesterId);
      onRefresh(); // Trigger global refresh to update currentUser object
  };

  return (
    <div className="max-w-3xl mx-auto p-6 pb-24">
      <div className="mb-10">
          <h2 className="text-3xl font-bold text-white mb-6 neon-text">Find Friends</h2>
          <div className="flex gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                    type="text" 
                    placeholder="Enter exact User ID (e.g. NeoKing77)..."
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-neon-purple focus:outline-none backdrop-blur-md"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
            </div>
            <button 
                onClick={handleSearch}
                disabled={isLoading}
                className="bg-neon-purple text-white px-8 rounded-xl font-bold hover:bg-neon-purple/80 transition-colors disabled:opacity-50"
            >
                {isLoading ? '...' : 'Search'}
            </button>
          </div>
          {message && <p className="mt-2 text-neon-cyan animate-pulse">{message}</p>}
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="mb-12 animate-in slide-in-from-left-4 duration-500">
            <h3 className="text-xl font-bold text-gray-300 mb-4">Search Results</h3>
            <div className="grid gap-4 md:grid-cols-2">
                {searchResults.map(user => (
                    <div key={user.id} className="glass-card p-4 rounded-xl flex items-center gap-4">
                        <img src={user.avatar} className="w-12 h-12 rounded-full cursor-pointer" onClick={() => onNavigateToProfile(user.id)} alt={user.name} />
                        <div className="flex-1 overflow-hidden">
                            <h4 className="font-bold text-white truncate cursor-pointer hover:text-neon-blue" onClick={() => onNavigateToProfile(user.id)}>{user.name}</h4>
                            <p className="text-sm text-gray-400 truncate">@{user.userId}</p>
                        </div>
                        {user.id !== currentUser.id && !currentUser.friends.includes(user.id) && (
                            <button 
                                onClick={() => sendRequest(user.userId)}
                                className="p-2 bg-neon-blue/20 text-neon-blue rounded-lg hover:bg-neon-blue hover:text-white transition-colors"
                            >
                                <UserPlus size={20} />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* Friend Requests */}
      {friendRequests.length > 0 && (
          <div className="mb-12">
              <h3 className="text-xl font-bold text-gray-300 mb-4">Incoming Requests <span className="bg-neon-pink text-white text-xs px-2 py-1 rounded-full ml-2">{friendRequests.length}</span></h3>
              <div className="space-y-3">
                  {friendRequests.map(req => (
                      <div key={req.id} className="bg-white/5 border border-neon-pink/30 p-4 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                              <img src={req.avatar} className="w-10 h-10 rounded-full cursor-pointer" onClick={() => onNavigateToProfile(req.id)} />
                              <div>
                                  <p className="text-white font-bold cursor-pointer" onClick={() => onNavigateToProfile(req.id)}>{req.name}</p>
                                  <p className="text-xs text-gray-400">wants to be friends</p>
                              </div>
                          </div>
                          <div className="flex gap-2">
                              <button onClick={() => acceptRequest(req.id)} className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500 hover:text-white"><Check size={20} /></button>
                              <button className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500 hover:text-white"><X size={20} /></button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* My Friends */}
      <div>
          <h3 className="text-xl font-bold text-gray-300 mb-4">My Friends</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {myFriends.map(friend => (
                  <div key={friend.id} className="glass-panel p-4 rounded-xl text-center hover:border-neon-cyan/50 transition-colors group relative">
                      <div className="relative inline-block mb-3">
                          <img 
                            src={friend.avatar} 
                            className="w-20 h-20 rounded-full mx-auto object-cover group-hover:scale-105 transition-transform cursor-pointer"
                            onClick={() => onNavigateToProfile(friend.id)}
                           />
                          <div className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-[#111928] ${friend.status === 'online' ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                      </div>
                      <h4 
                        className="font-bold text-white truncate cursor-pointer hover:text-neon-blue"
                        onClick={() => onNavigateToProfile(friend.id)}
                      >
                          {friend.name}
                      </h4>
                      <p className="text-xs text-neon-cyan truncate">@{friend.userId}</p>
                      
                      <div className="mt-3 flex gap-2">
                          <button 
                            onClick={() => onNavigateToProfile(friend.id)}
                            className="flex-1 py-1.5 text-xs bg-white/5 hover:bg-white/10 rounded-lg text-gray-300"
                          >
                              Profile
                          </button>
                          <button 
                            onClick={() => onNavigateToChat(friend.id)}
                            className="flex-1 py-1.5 text-xs bg-neon-blue/10 hover:bg-neon-blue/20 text-neon-blue rounded-lg"
                          >
                              <MessageSquare size={14} className="mx-auto"/>
                          </button>
                      </div>
                  </div>
              ))}
              {myFriends.length === 0 && (
                  <div className="col-span-full text-center py-8 text-gray-500">
                      You haven't added any friends yet. Search for User IDs above!
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};