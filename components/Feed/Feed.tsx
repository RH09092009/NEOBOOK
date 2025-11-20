import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Share2, Send, Image as ImageIcon, MoreHorizontal, X, Download, CheckCircle, User as UserIcon } from 'lucide-react';
import { User, Post, Comment } from '../../types';
import { StorageService } from '../../services/storage';

interface FeedProps {
  currentUser: User;
  onNavigateToProfile: (userId: string) => void;
  onRefresh: () => void;
}

// Helper to compress images before storage
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
                resolve(base64Str); // Fallback
            }
        };
        img.onerror = () => resolve(base64Str);
    });
};

export const Feed: React.FC<FeedProps> = ({ currentUser, onNavigateToProfile, onRefresh }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [showCommentInput, setShowCommentInput] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  
  // Share State
  const [postToShare, setPostToShare] = useState<Post | null>(null);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [shareCaption, setShareCaption] = useState('');

  // Image Upload State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = () => {
    const allPosts = StorageService.getPosts();
    const allUsers = StorageService.getUsers();
    
    // Filter Posts: Show if public (no target) OR target includes me OR I am author
    const visiblePosts = allPosts.filter(p => 
        !p.targetUserIds || 
        p.targetUserIds.length === 0 || 
        p.targetUserIds.includes(currentUser.id) || 
        p.authorId === currentUser.id
    );
    
    setPosts(visiblePosts);
    setUsers(allUsers);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2000); // Poll for updates
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        setIsCompressing(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
            const rawBase64 = reader.result as string;
            const compressed = await compressImage(rawBase64);
            setSelectedImage(compressed);
            setIsCompressing(false);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleCreatePost = () => {
    if (!newPostContent.trim() && !selectedImage) return;
    
    const newPost: Post = {
      id: `post-${Date.now()}`,
      authorId: currentUser.id,
      content: newPostContent,
      likes: [],
      comments: [],
      createdAt: Date.now(),
      image: selectedImage || undefined
    };

    StorageService.createPost(newPost);
    setNewPostContent('');
    setSelectedImage(null);
    loadData();
  };

  const handleSharePost = () => {
      if (!postToShare) return;

      const newPost: Post = {
          id: `post-share-${Date.now()}`,
          authorId: currentUser.id,
          content: shareCaption,
          likes: [],
          comments: [],
          createdAt: Date.now(),
          sharedFromId: postToShare.id,
          targetUserIds: selectedFriends.length > 0 ? selectedFriends : undefined
      };

      StorageService.createPost(newPost);
      setPostToShare(null);
      setShareCaption('');
      setSelectedFriends([]);
      loadData();
  };

  const handleLike = (post: Post) => {
    const isLiked = post.likes.includes(currentUser.id);
    const updatedPost = {
      ...post,
      likes: isLiked 
        ? post.likes.filter(id => id !== currentUser.id)
        : [...post.likes, currentUser.id]
    };
    
    const allPosts = StorageService.getPosts();
    const newAllPosts = allPosts.map(p => p.id === post.id ? updatedPost : p);
    StorageService.savePosts(newAllPosts);
    setPosts(posts.map(p => p.id === post.id ? updatedPost : p));
  };

  const handleComment = (postId: string) => {
      if(!commentText.trim()) return;
      const allPosts = StorageService.getPosts();
      const postIndex = allPosts.findIndex(p => p.id === postId);
      if(postIndex === -1) return;

      const newComment: Comment = {
          id: `c-${Date.now()}`,
          authorId: currentUser.id,
          content: commentText,
          createdAt: Date.now()
      };

      allPosts[postIndex].comments.push(newComment);
      StorageService.savePosts(allPosts);
      setCommentText('');
      setShowCommentInput(null);
      loadData();
  }

  const handleDownload = (e: React.MouseEvent, src: string, filename: string) => {
      e.stopPropagation();
      const link = document.createElement('a');
      link.href = src;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const toggleFriendSelection = (friendId: string) => {
      if (selectedFriends.includes(friendId)) {
          setSelectedFriends(selectedFriends.filter(id => id !== friendId));
      } else {
          setSelectedFriends([...selectedFriends, friendId]);
      }
  };

  const getUser = (id: string) => users.find(u => u.id === id);
  const getPost = (id: string) => {
      // Helper to find post even if it's not in current view state, fetch from storage for source of truth
      return StorageService.getPosts().find(p => p.id === id);
  };

  const myFriends = users.filter(u => currentUser.friends.includes(u.id));

  return (
    <div className="max-w-2xl mx-auto pb-20 pt-6 px-4">
      {/* Create Post Card */}
      <div className="glass-panel p-4 rounded-2xl mb-8 shadow-lg shadow-neon-blue/5 border border-white/10">
        <div className="flex gap-4">
          <img src={currentUser.avatar} alt="Me" className="w-12 h-12 rounded-full object-cover border-2 border-neon-blue/30" />
          <div className="flex-1">
            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="What's on your mind, Neo?"
              className="w-full bg-white/5 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-neon-purple/50 resize-none min-h-[80px]"
            />
            
            {selectedImage && (
                <div className="relative mt-2 mb-2 rounded-xl overflow-hidden group">
                    <img src={selectedImage} alt="Preview" className="max-h-60 w-auto object-cover rounded-lg border border-white/10" />
                    <button 
                        onClick={() => setSelectedImage(null)}
                        className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-red-500 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            <div className="flex justify-between items-center mt-3">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageSelect} 
                accept="image/*" 
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isCompressing}
                className="text-gray-400 hover:text-neon-cyan transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <ImageIcon size={20} />
                <span className="text-sm">{isCompressing ? 'Processing...' : 'Add Photo'}</span>
              </button>
              <button 
                onClick={handleCreatePost}
                disabled={isCompressing}
                className="bg-gradient-to-r from-neon-blue to-neon-purple text-white px-6 py-2 rounded-lg font-bold shadow-[0_0_15px_rgba(59,130,246,0.4)] hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
              >
                Post
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feed List */}
      <div className="space-y-6">
        {posts.map(post => {
          const author = getUser(post.authorId);
          const isLiked = post.likes.includes(currentUser.id);
          const originalPost = post.sharedFromId ? getPost(post.sharedFromId) : null;
          const originalAuthor = originalPost ? getUser(originalPost.authorId) : null;
          
          return (
            <div key={post.id} className="glass-card p-5 rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
              {post.sharedFromId && (
                   <div className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                       <Share2 size={14} />
                       <span>Shared {originalAuthor ? `${originalAuthor.name}'s` : 'a'} post</span>
                   </div>
              )}
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-3 items-center">
                  <img 
                    onClick={() => author && onNavigateToProfile(author.id)}
                    src={author?.avatar || 'https://picsum.photos/200'} 
                    alt="Avatar" 
                    className="w-10 h-10 rounded-full border border-white/10 cursor-pointer hover:border-neon-purple transition-colors" 
                  />
                  <div>
                    <h3 
                        onClick={() => author && onNavigateToProfile(author.id)}
                        className="font-bold text-white cursor-pointer hover:text-neon-blue transition-colors"
                    >
                        {author?.name || 'Unknown User'}
                    </h3>
                    <p className="text-xs text-gray-400">@{author?.userId} • {new Date(post.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    {post.targetUserIds && post.targetUserIds.length > 0 && <span className="ml-2 text-neon-purple">(Private Share)</span>}
                    </p>
                  </div>
                </div>
                <button className="text-gray-500 hover:text-white"><MoreHorizontal size={20} /></button>
              </div>

              <p className="text-gray-200 mb-4 leading-relaxed whitespace-pre-wrap">{post.content}</p>
              
              {post.image && (
                <div className="mb-4 rounded-xl overflow-hidden border border-white/10 shadow-lg relative group">
                  <img src={post.image} alt="Post content" className="w-full h-auto object-cover hover:scale-[1.02] transition-transform duration-700" />
                  <button 
                    onClick={(e) => handleDownload(e, post.image!, `neobook_post_${post.id}.png`)}
                    className="absolute bottom-2 right-2 p-2 bg-black/60 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-neon-purple"
                    title="Download Image"
                  >
                      <Download size={20} />
                  </button>
                </div>
              )}

              {/* Render Shared Post Content */}
              {originalPost && (
                  <div className="mb-4 border border-white/10 rounded-xl p-4 bg-white/5">
                      <div className="flex items-center gap-2 mb-2">
                          <img src={originalAuthor?.avatar} className="w-6 h-6 rounded-full" />
                          <span className="font-bold text-sm text-white">{originalAuthor?.name}</span>
                          <span className="text-xs text-gray-500">@{originalAuthor?.userId}</span>
                      </div>
                      <p className="text-gray-300 text-sm mb-2">{originalPost.content}</p>
                      {originalPost.image && (
                          <div className="rounded-lg overflow-hidden relative group">
                              <img src={originalPost.image} className="w-full h-48 object-cover" />
                                <button 
                                    onClick={(e) => handleDownload(e, originalPost.image!, `neobook_post_${originalPost.id}.png`)}
                                    className="absolute bottom-2 right-2 p-2 bg-black/60 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-neon-purple"
                                >
                                    <Download size={16} />
                                </button>
                          </div>
                      )}
                  </div>
              )}

              <div className="flex items-center gap-6 border-t border-white/10 pt-4">
                <button 
                  onClick={() => handleLike(post)}
                  className={`flex items-center gap-2 transition-all ${isLiked ? 'text-neon-pink drop-shadow-[0_0_5px_#f472b6]' : 'text-gray-400 hover:text-neon-pink'}`}
                >
                  <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} />
                  <span className="text-sm">{post.likes.length}</span>
                </button>
                <button 
                  onClick={() => setShowCommentInput(showCommentInput === post.id ? null : post.id)}
                  className="flex items-center gap-2 text-gray-400 hover:text-neon-blue transition-colors"
                >
                  <MessageCircle size={20} />
                  <span className="text-sm">{post.comments.length}</span>
                </button>
                <button 
                    onClick={() => setPostToShare(post)}
                    className="flex items-center gap-2 text-gray-400 hover:text-neon-cyan transition-colors ml-auto"
                >
                  <Share2 size={20} />
                </button>
              </div>

              {/* Comments Section */}
              {(showCommentInput === post.id || post.comments.length > 0) && (
                  <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                      {post.comments.map(c => {
                          const cAuthor = getUser(c.authorId);
                          return (
                              <div key={c.id} className="flex gap-2">
                                  <img 
                                    src={cAuthor?.avatar} 
                                    className="w-6 h-6 rounded-full cursor-pointer" 
                                    onClick={() => cAuthor && onNavigateToProfile(cAuthor.id)}
                                  />
                                  <div className="bg-white/5 p-2 rounded-lg rounded-tl-none">
                                      <p 
                                        className="text-xs font-bold text-gray-300 cursor-pointer hover:text-neon-blue"
                                        onClick={() => cAuthor && onNavigateToProfile(cAuthor.id)}
                                      >
                                          {cAuthor?.name}
                                      </p>
                                      <p className="text-sm text-gray-400">{c.content}</p>
                                  </div>
                              </div>
                          )
                      })}
                      {showCommentInput === post.id && (
                         <div className="flex gap-2 mt-2">
                             <input 
                                type="text" 
                                className="flex-1 bg-black/20 rounded-full px-4 text-sm text-white border border-white/10 focus:border-neon-blue focus:outline-none"
                                placeholder="Write a comment..."
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                             />
                             <button onClick={() => handleComment(post.id)} className="p-2 text-neon-blue"><Send size={18} /></button>
                         </div>
                      )}
                  </div>
              )}
            </div>
          );
        })}
        
        {posts.length === 0 && (
             <div className="text-center py-10 text-gray-500">
                 <p>No posts yet. Be the first to share something!</p>
             </div>
        )}
      </div>

      {/* Share Modal */}
      {postToShare && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-[#111928] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl shadow-neon-purple/20">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold text-white">Share Post</h3>
                      <button onClick={() => setPostToShare(null)} className="text-gray-400 hover:text-white"><X size={24}/></button>
                  </div>
                  
                  <div className="mb-4 border border-white/10 rounded-xl p-3 bg-white/5 max-h-40 overflow-y-auto">
                      <p className="text-sm text-gray-300">{postToShare.content}</p>
                  </div>

                  <textarea 
                      className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white mb-4 focus:border-neon-purple outline-none"
                      placeholder="Say something about this..."
                      rows={2}
                      value={shareCaption}
                      onChange={(e) => setShareCaption(e.target.value)}
                  />

                  <div className="mb-6">
                      <p className="text-sm font-bold text-gray-400 mb-2">Select Friends (Optional - Default: All)</p>
                      <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                          {myFriends.map(friend => (
                              <div 
                                key={friend.id} 
                                onClick={() => toggleFriendSelection(friend.id)}
                                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer border ${selectedFriends.includes(friend.id) ? 'bg-neon-purple/20 border-neon-purple' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                              >
                                  <div className="flex items-center gap-3">
                                      <img src={friend.avatar} className="w-8 h-8 rounded-full"/>
                                      <span className="text-sm text-white">{friend.name}</span>
                                  </div>
                                  {selectedFriends.includes(friend.id) && <CheckCircle size={16} className="text-neon-purple"/>}
                              </div>
                          ))}
                          {myFriends.length === 0 && <p className="text-xs text-gray-500">Add friends to share privately.</p>}
                      </div>
                  </div>

                  <button 
                    onClick={handleSharePost}
                    className="w-full bg-gradient-to-r from-neon-blue to-neon-purple text-white font-bold py-3 rounded-xl hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-shadow"
                  >
                      Share Now
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};