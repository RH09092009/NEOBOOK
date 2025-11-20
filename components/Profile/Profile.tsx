import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Calendar, Link as LinkIcon, Camera, MessageSquare, UserPlus, Check, Edit2, X, Download, Save } from 'lucide-react';
import { User, Post } from '../../types';
import { StorageService } from '../../services/storage';

interface ProfileProps {
  currentUser: User;
  viewedProfileId: string;
  onNavigateToChat: (userId: string) => void;
  onRefresh: () => void;
}

// Helper to compress images
const compressImage = (base64Str: string, maxWidth = 800, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = (maxWidth / width) * height;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            } else {
                resolve(base64Str);
            }
        };
        img.onerror = () => resolve(base64Str);
    });
};

export const Profile: React.FC<ProfileProps> = ({ currentUser, viewedProfileId, onNavigateToChat, onRefresh }) => {
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [friendStatus, setFriendStatus] = useState<'none' | 'friend' | 'sent' | 'received'>('none');
  
  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
      name: '',
      userId: '',
      bio: '',
      email: ''
  });
  const [editError, setEditError] = useState('');

  // Refs for file inputs
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const loadProfileData = () => {
      const users = StorageService.getUsers();
      const foundUser = users.find(u => u.id === viewedProfileId) || currentUser;
      
      setProfileUser(foundUser);
      setIsOwnProfile(foundUser.id === currentUser.id);
      setEditForm({
          name: foundUser.name,
          userId: foundUser.userId,
          bio: foundUser.bio,
          email: foundUser.email || ''
      });

      // Get User Posts
      const allPosts = StorageService.getPosts();
      const myPosts = allPosts.filter(p => p.authorId === foundUser.id);
      setUserPosts(myPosts);

      // Determine Friend Status
      if (currentUser.friends.includes(foundUser.id)) {
          setFriendStatus('friend');
      } else if (foundUser.friendRequests.includes(currentUser.id)) {
          setFriendStatus('sent');
      } else if (currentUser.friendRequests.includes(foundUser.id)) {
          setFriendStatus('received');
      } else {
          setFriendStatus('none');
      }
  };

  useEffect(() => {
      loadProfileData();
  }, [viewedProfileId, currentUser]);

  const handlePhotoUpload = (type: 'avatar' | 'cover', e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && profileUser) {
          const reader = new FileReader();
          reader.onloadend = async () => {
              const rawBase64 = reader.result as string;
              const compressed = await compressImage(rawBase64);
              
              const updatedUser = { ...profileUser };
              if (type === 'avatar') updatedUser.avatar = compressed;
              if (type === 'cover') updatedUser.coverPhoto = compressed;
              
              const success = StorageService.updateUser(updatedUser);
              if (success) {
                  setProfileUser(updatedUser);
                  onRefresh(); // Refresh global user data to update avatar everywhere
              } else {
                  alert("Could not update photo. Storage may be full.");
              }
          };
          reader.readAsDataURL(file);
      }
  };

  const handleDownload = (src: string, name: string) => {
      const link = document.createElement('a');
      link.href = src;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleFriendAction = () => {
      if (!profileUser) return;

      if (friendStatus === 'none') {
          StorageService.sendFriendRequest(currentUser.id, profileUser.userId);
          setFriendStatus('sent');
          onRefresh();
      } else if (friendStatus === 'received') {
          StorageService.acceptFriendRequest(currentUser.id, profileUser.id);
          setFriendStatus('friend');
          onRefresh();
      }
  };

  const handleSaveProfile = () => {
      if (!profileUser) return;
      setEditError('');
      
      if (!editForm.userId || !editForm.name) {
          setEditError('Name and User ID are required.');
          return;
      }

      const updatedUser: User = {
          ...profileUser,
          name: editForm.name,
          userId: editForm.userId,
          bio: editForm.bio,
          email: editForm.email
      };

      const success = StorageService.updateUser(updatedUser);
      if (success) {
          setProfileUser(updatedUser);
          setIsEditing(false);
          onRefresh();
      } else {
          setEditError('User ID is already taken or storage is full.');
      }
  };

  if (!profileUser) return <div>Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto pb-24">
      {/* Header Image */}
      <div className="h-60 w-full relative group">
          <img src={profileUser.coverPhoto} className="w-full h-full object-cover" alt="Cover" />
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100">
              {isOwnProfile && (
                <button 
                    onClick={() => coverInputRef.current?.click()}
                    className="text-white flex items-center gap-2 bg-black/50 px-4 py-2 rounded-full hover:bg-neon-purple transition-colors backdrop-blur-sm"
                >
                    <Camera size={20}/> Change Cover
                </button>
              )}
              <button 
                    onClick={() => handleDownload(profileUser.coverPhoto, `neobook_cover_${profileUser.userId}.png`)}
                    className="text-white flex items-center gap-2 bg-black/50 px-4 py-2 rounded-full hover:bg-neon-blue transition-colors backdrop-blur-sm"
                >
                    <Download size={20}/> Download
              </button>
              <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={(e) => handlePhotoUpload('cover', e)} />
          </div>
          <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[#0f172a] to-transparent"></div>
      </div>

      {/* Profile Info */}
      <div className="px-8 relative -mt-16 mb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="relative group">
                  <div className="w-32 h-32 rounded-2xl p-1 glass-panel">
                      <img src={profileUser.avatar} className="w-full h-full rounded-xl object-cover" alt="Avatar" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity text-white">
                      {isOwnProfile && (
                          <button onClick={() => avatarInputRef.current?.click()} className="p-2 hover:text-neon-purple"><Camera size={24} /></button>
                      )}
                      <button onClick={() => handleDownload(profileUser.avatar, `neobook_avatar_${profileUser.userId}.png`)} className="p-2 hover:text-neon-blue"><Download size={24} /></button>
                  </div>
                  <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => handlePhotoUpload('avatar', e)} />
                  <div className={`absolute bottom-2 right-2 w-4 h-4 rounded-full border-2 border-white ${profileUser.status === 'online' ? 'bg-green-500' : 'bg-gray-500'}`}></div>
              </div>
              
              <div className="flex-1 pb-2">
                  <h1 className="text-3xl font-bold text-white">{profileUser.name}</h1>
                  <p className="text-neon-purple font-mono">@{profileUser.userId}</p>
              </div>

              <div className="flex gap-3 pb-4">
                  {isOwnProfile ? (
                      <>
                        <button 
                            onClick={() => setIsEditing(true)}
                            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg border border-white/10 transition-all flex items-center gap-2"
                        >
                            <Edit2 size={18} /> Edit Profile
                        </button>
                      </>
                  ) : (
                      <>
                        {friendStatus !== 'friend' && (
                            <button 
                                onClick={handleFriendAction}
                                className={`px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${
                                    friendStatus === 'sent' ? 'bg-gray-600 text-gray-300 cursor-default' :
                                    friendStatus === 'received' ? 'bg-green-600 text-white hover:bg-green-500' :
                                    'bg-neon-blue text-white hover:bg-neon-blue/80'
                                }`}
                            >
                                {friendStatus === 'sent' ? <Check size={20}/> : <UserPlus size={20}/>}
                                {friendStatus === 'sent' ? 'Request Sent' : 
                                 friendStatus === 'received' ? 'Accept Request' : 'Add Friend'}
                            </button>
                        )}
                        
                        <button 
                            onClick={() => onNavigateToChat(profileUser.id)}
                            className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg font-bold border border-white/10 flex items-center gap-2"
                        >
                            <MessageSquare size={20} />
                            Message
                        </button>
                      </>
                  )}
              </div>
          </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8 px-8">
          {/* Sidebar Info */}
          <div className="space-y-6">
              <div className="glass-panel p-6 rounded-xl space-y-4">
                  <h3 className="font-bold text-white text-lg">Intro</h3>
                  <p className="text-gray-300 text-sm leading-relaxed text-center italic">"{profileUser.bio}"</p>
                  <div className="border-t border-white/10 pt-4 space-y-3 text-sm text-gray-400">
                      {profileUser.email && (
                          <div className="flex items-center gap-3">
                              <MessageSquare size={18} className="text-neon-cyan" />
                              <span>{profileUser.email}</span>
                          </div>
                      )}
                      <div className="flex items-center gap-3">
                          <MapPin size={18} className="text-neon-cyan" />
                          <span>Neo Tokyo, Sector 7</span>
                      </div>
                      <div className="flex items-center gap-3">
                          <Calendar size={18} className="text-neon-cyan" />
                          <span>Joined {new Date(profileUser.joinedAt).getFullYear()}</span>
                      </div>
                  </div>
              </div>
              
              {/* Friends Grid */}
              <div className="glass-panel p-6 rounded-xl">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-white">Friends</h3>
                      <span className="text-neon-purple text-sm">{profileUser.friends.length}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                       {/* Placeholder for friends grid visualization */}
                       {profileUser.friends.slice(0, 9).map((fid, i) => (
                           <div key={i} className="bg-white/5 rounded-lg aspect-square border border-white/5"></div>
                       ))}
                       {profileUser.friends.length === 0 && <p className="col-span-3 text-xs text-gray-500">No connections yet.</p>}
                  </div>
              </div>
          </div>

          {/* User Posts Feed */}
          <div className="md:col-span-2 space-y-6">
              {userPosts.length > 0 ? (
                  userPosts.map(post => (
                    <div key={post.id} className="glass-card p-5 rounded-2xl">
                        <div className="flex gap-3 items-center mb-4">
                            <img src={profileUser.avatar} className="w-10 h-10 rounded-full border border-white/10" />
                            <div>
                                <h3 className="font-bold text-white">{profileUser.name}</h3>
                                <p className="text-xs text-gray-400">{new Date(post.createdAt).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <p className="text-gray-200 mb-3">{post.content}</p>
                        {post.image && (
                             <div className="relative group rounded-xl overflow-hidden">
                                <img src={post.image} className="w-full border border-white/10" />
                                <button 
                                    onClick={() => handleDownload(post.image!, `neobook_post_${post.id}.png`)}
                                    className="absolute bottom-2 right-2 p-2 bg-black/60 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-neon-purple"
                                >
                                    <Download size={20} />
                                </button>
                             </div>
                        )}
                    </div>
                  ))
              ) : (
                <div className="glass-panel p-8 rounded-xl flex flex-col items-center justify-center text-center min-h-[200px]">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 text-gray-500">
                        <Camera size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-white">No Posts Yet</h3>
                    <p className="text-gray-400 mt-2">This user hasn't shared any futuristic moments.</p>
                </div>
              )}
          </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-neon-purple/20 shadow-2xl shadow-neon-purple/10">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-white">Edit Profile</h2>
                      <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-white"><X size={24}/></button>
                  </div>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm text-gray-400 mb-1">Display Name</label>
                          <input 
                              type="text" 
                              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-neon-blue outline-none"
                              value={editForm.name}
                              onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                          />
                      </div>
                      
                      <div>
                          <label className="block text-sm text-gray-400 mb-1">User ID (Unique)</label>
                          <input 
                              type="text" 
                              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-neon-blue outline-none font-mono"
                              value={editForm.userId}
                              onChange={(e) => setEditForm({...editForm, userId: e.target.value})}
                          />
                      </div>

                      <div>
                          <label className="block text-sm text-gray-400 mb-1">Email</label>
                          <input 
                              type="email" 
                              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-neon-blue outline-none"
                              value={editForm.email}
                              onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                          />
                      </div>

                      <div>
                          <label className="block text-sm text-gray-400 mb-1">Bio</label>
                          <textarea 
                              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-neon-blue outline-none min-h-[100px]"
                              value={editForm.bio}
                              onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                          />
                      </div>

                      {editError && <p className="text-red-400 text-sm">{editError}</p>}
                  </div>

                  <div className="mt-8 flex gap-4">
                      <button 
                          onClick={() => setIsEditing(false)}
                          className="flex-1 py-3 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 transition-colors"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={handleSaveProfile}
                          className="flex-1 py-3 rounded-xl bg-gradient-to-r from-neon-blue to-neon-purple text-white font-bold shadow-lg hover:shadow-neon-purple/30 transition-shadow flex justify-center items-center gap-2"
                      >
                          <Save size={18} /> Save Changes
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};