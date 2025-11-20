import React, { useState, useEffect } from 'react';
import { Trash2, Shield, Activity } from 'lucide-react';
import { User, Post } from '../../types';
import { StorageService } from '../../services/storage';

export const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);

  const loadData = () => {
    setUsers(StorageService.getUsers());
    setPosts(StorageService.getPosts());
  };

  useEffect(() => {
    loadData();
  }, []);

  const deleteUser = (id: string) => {
    if (confirm('Are you sure? This action cannot be undone.')) {
        const newUsers = users.filter(u => u.id !== id);
        StorageService.saveUsers(newUsers);
        loadData();
    }
  };

  const deletePost = (id: string) => {
      const newPosts = posts.filter(p => p.id !== id);
      StorageService.savePosts(newPosts);
      loadData();
  };

  return (
    <div className="max-w-6xl mx-auto p-8 pb-24">
      <div className="flex items-center gap-4 mb-8">
          <Shield size={40} className="text-neon-purple" />
          <h1 className="text-3xl font-bold text-white">System Admin Panel</h1>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="glass-card p-6 rounded-xl border-l-4 border-neon-blue">
              <h3 className="text-gray-400 mb-1 flex items-center gap-2"><Activity size={16}/> Total Users</h3>
              <p className="text-4xl font-bold text-white">{users.length}</p>
          </div>
          <div className="glass-card p-6 rounded-xl border-l-4 border-neon-pink">
              <h3 className="text-gray-400 mb-1">Total Posts</h3>
              <p className="text-4xl font-bold text-white">{posts.length}</p>
          </div>
          <div className="glass-card p-6 rounded-xl border-l-4 border-neon-cyan">
              <h3 className="text-gray-400 mb-1">Server Status</h3>
              <p className="text-xl font-bold text-green-400">OPERATIONAL</p>
          </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
          {/* Users List */}
          <div className="glass-panel rounded-xl overflow-hidden">
              <div className="bg-white/5 p-4 border-b border-white/10">
                  <h3 className="font-bold text-lg text-white">User Database</h3>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                  <table className="w-full text-left text-sm text-gray-300">
                      <thead className="bg-black/20 text-gray-400 uppercase text-xs">
                          <tr>
                              <th className="p-4">User</th>
                              <th className="p-4">ID</th>
                              <th className="p-4">Action</th>
                          </tr>
                      </thead>
                      <tbody>
                          {users.map(user => (
                              <tr key={user.id} className="border-b border-white/5 hover:bg-white/5">
                                  <td className="p-4 flex items-center gap-3">
                                      <img src={user.avatar} className="w-8 h-8 rounded-full" />
                                      {user.name}
                                  </td>
                                  <td className="p-4 font-mono text-neon-cyan">{user.userId}</td>
                                  <td className="p-4">
                                      {!user.isAdmin && (
                                          <button onClick={() => deleteUser(user.id)} className="text-red-400 hover:text-red-300"><Trash2 size={18}/></button>
                                      )}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>

          {/* Posts List */}
          <div className="glass-panel rounded-xl overflow-hidden">
              <div className="bg-white/5 p-4 border-b border-white/10">
                  <h3 className="font-bold text-lg text-white">Recent Posts</h3>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                 {posts.map(post => (
                     <div key={post.id} className="p-4 border-b border-white/5 flex justify-between gap-4 hover:bg-white/5">
                         <div>
                             <p className="text-gray-300 text-sm line-clamp-2">{post.content}</p>
                             <p className="text-xs text-gray-500 mt-1">ID: {post.id}</p>
                         </div>
                         <button onClick={() => deletePost(post.id)} className="text-red-400 hover:text-red-300 self-start"><Trash2 size={18}/></button>
                     </div>
                 ))}
              </div>
          </div>
      </div>
    </div>
  );
};
