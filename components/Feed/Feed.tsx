import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Share2, Send, Image as ImageIcon, MoreHorizontal, X, Download, CheckCircle, User as UserIcon } from 'lucide-react';
import { User, Post, Comment } from '../../types';
import { StorageService } from '../../services/storage';

interface FeedProps {
  currentUser: User;
  onNavigateToProfile: (userId: string) => void;
  onRefresh: () => void;
}

export const Feed: React.FC<FeedProps> = ({ currentUser, onNavigateToProfile, onRefresh }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, User>>({}); // Cache users
  const [newPostContent, setNewPostContent] = useState('');
  const [showCommentInput, setShowCommentInput] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  
  // Share State
  const [postToShare, setPostToShare] = useState<Post | null>(null);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [shareCaption, setShareCaption] = useState('');

  // Image Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Real-time subscription
    const unsubscribe = StorageService.subscribeToPosts(async (allPosts) => {
        // 1. Filter
        const visiblePosts = allPosts.filter(p => 
            !p.targetUserIds || 
            p.targetUserIds.length === 0 || 
            p.targetUserIds.includes(currentUser.id) || 
            p.authorId === currentUser.id
        );
        
        // 2. Fetch authors if missing
        const authorIds = new Set(visiblePosts.map(p => p.authorId));
        visiblePosts.forEach(p => p.sharedFromId && authorIds.add(p.authorId)); // Simplified logic
        
        // Note: In robust app, check cache before fetching. For prototype, we'll fetch individually or rely on cache logic.
        // We'll do a quick fetch of missing.
        const newMap = { ...usersMap };
        for (const uid of authorIds) {
            if (!newMap[uid]) {
                const u = await StorageService.getUser(uid);
                if (u) newMap[uid] = u;
            }
        }
        setUsersMap(newMap);
        setPosts(visiblePosts);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim() && !selectedFile) return;
    setIsUploading(true);

    let imageUrl = undefined;
    if (selectedFile) {
        try {
            imageUrl = await StorageService.uploadImage(selectedFile, `posts/${currentUser.id}/${Date.now()}_${selectedFile.name}`);
        } catch (e) {
            alert("Failed to upload image");
            setIsUploading(false);
            return;
        }
    }
    
    const newPost: Post = {
      id: `post-${Date.now()}`,
      authorId: currentUser.id,
      content: newPostContent,
      likes: [],
      comments: [],
      createdAt: Date.now(),
      image: imageUrl
    };

    await StorageService.createPost(newPost);
    setNewPostContent('');
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsUploading(false);
  };

  const handleSharePost = async () => {
      if (!postToShare) return;
      setIsUploading(true);

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

      await StorageService.createPost(newPost);
      setPostToShare(null);
      setShareCaption('');
      setSelectedFriends([]);
      setIsUploading(false);
  };

  const handleLike = (post: Post) => {
      // Firestore handles updates async, but optimistic UI is tricky with simple array updates without transactions.
      // For prototype, we just call update.
      // In real app: arrayUnion/arrayRemove
      const isLiked = post.likes.includes(currentUser.id);
      
      // Re-save post with modified likes (Naive approach, race conditions possible)
      // Better: StorageService.toggleLike(postId, userId) which uses db transaction
      
      // Since we didn't implement specific toggleLike, we use createPost(overwrite) or generic update
      // We need generic update for this.
      // Implementing manual toggle locally and saving.
      const updatedLikes = isLiked 
        ? post.likes.filter(id => id !== currentUser.id)
        : [...post.likes, currentUser.id];
      
      // We can't easily use StorageService.createPost to update because it does setDoc.
      // We'll cast to any to piggyback on createPost which does setDoc (merge is false usually). 
      // Actually StorageService.createPost does setDoc.
      StorageService.createPost({ ...post, likes: updatedLikes });
  };

  const handleComment = (post: Post) => {
      if(!commentText.trim()) return;
      
      const newComment: Comment = {
          id: `c-${Date.now()}`,
          authorId: currentUser.id,
          content: commentText,
          createdAt: Date.now()
      };

      StorageService.createPost({
          ...post,
          comments: [...post.comments, newComment]
      });
      
      setCommentText('');
      setShowCommentInput(null);
  }

  const handleDownload = (e: React.MouseEvent, src: string, filename: string) => {
      e.stopPropagation();
      const link = document.createElement('a');
      link.href = src;
      link.download = filename;
      link.target = "_blank"; // For Firebase URLs
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

  const getUser = (id: string) => usersMap[id];
  
  // Need to fetch my friends list details for sharing modal
  const [myFriendDetails, setMyFriendDetails] = useState<User[]>([]);
  useEffect(() => {
      if (postToShare) {
          Promise.all(currentUser.friends.map(fid => StorageService.getUser(fid)))
             .then(users => setMyFriendDetails(users.filter(u => !!u) as User[]));
      }
  }, [postToShare, currentUser]);

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
            
            {previewUrl && (
                <div className="relative mt-2 mb-2 rounded-xl overflow-hidden group">
                    <img src={previewUrl} alt="Preview" className="max-h-60 w-auto object-cover rounded-lg border border-white/10" />
                    <button 
                        onClick={() => { setPreviewUrl(null); setSelectedFile(null); }}
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
                disabled={isUploading}
                className="text-gray-400 hover:text-neon-cyan transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <ImageIcon size={20} />
                <span className="text-sm">Add Photo</span>
              </button>
              <button 
                onClick={handleCreatePost}
                disabled={isUploading}
                className="bg-gradient-to-r from-neon-blue to-neon-purple text-white px-6 py-2 rounded-lg font-bold shadow-[0_0_15px_rgba(59,130,246,0.4)] hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
              >
                {isUploading ? 'Posting...' : 'Post'}
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
          // For shared post content, we'd ideally fetch the original post. 
          // For now, if sharedFromId exists but we don't have the content, we might show loading or look it up.
          // The subscription fetches ordered posts, so original might be down the list or missing.
          // We'll do a simple lookup if needed or just display what we have if we had a structured "sharedPost" object (which we don't, just ID).
          // *Simplification*: We won't fetch recursive shared posts in this prototype feed loop to avoid N+1 requests. 
          // We only show if it happens to be in 'posts' or if we embedded it.
          const originalPost = post.sharedFromId ? posts.find(p => p.id === post.sharedFromId) : null;
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
                        {author?.name || 'Loading...'}
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
                          // Ideally fetch comment authors. For now assume cached or just show name if we had it.
                          // Since Comment struct only has authorId, we look up in our map.
                          const cAuthor = getUser(c.authorId);
                          return (
                              <div key={c.id} className="flex gap-2">
                                  <img 
                                    src={cAuthor?.avatar || 'https://picsum.photos/50'} 
                                    className="w-6 h-6 rounded-full cursor-pointer" 
                                    onClick={() => cAuthor && onNavigateToProfile(cAuthor.id)}
                                  />
                                  <div className="bg-white/5 p-2 rounded-lg rounded-tl-none">
                                      <p 
                                        className="text-xs font-bold text-gray-300 cursor-pointer hover:text-neon-blue"
                                        onClick={() => cAuthor && onNavigateToProfile(cAuthor.id)}
                                      >
                                          {cAuthor?.name || 'Unknown'}
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
                             <button onClick={() => handleComment(post)} className="p-2 text-neon-blue"><Send size={18} /></button>
                         </div>
                      )}
                  </div>
              )}
            </div>
          );
        })}
        
        {posts.length === 0 && (
             <div className="text-center py-10 text-gray-500">
                 <p>Loading posts or no activity...</p>
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
                          {myFriendDetails.map(friend => (
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
                          {myFriendDetails.length === 0 && <p className="text-xs text-gray-500">No friends to share privately with.</p>}
                      </div>
                  </div>

                  <button 
                    onClick={handleSharePost}
                    disabled={isUploading}
                    className="w-full bg-gradient-to-r from-neon-blue to-neon-purple text-white font-bold py-3 rounded-xl hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-shadow disabled:opacity-50"
                  >
                      {isUploading ? 'Sharing...' : 'Share Now'}
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};