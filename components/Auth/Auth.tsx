import React, { useState } from 'react';
import { User } from '../../types';
import { StorageService } from '../../services/storage';
import { Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react';

interface AuthProps {
  onLogin: (user: User) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    userId: '', // Custom User ID
    username: '', // Display Name
    password: ''
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isLogin) {
      // Login Logic
      const users = StorageService.getUsers();
      const user = users.find(
        u => (u.userId === formData.userId) && u.password === formData.password
      );

      if (user) {
        onLogin(user);
      } else {
        setError('Invalid credentials. Please check your User ID and password.');
      }
    } else {
      // Signup Logic
      if (!formData.userId || !formData.password || !formData.username) {
        setError('All fields are required.');
        return;
      }
      
      // Validation for ID
      if(formData.userId.length < 3) {
          setError('User ID must be at least 3 characters.');
          return;
      }

      const newUser: User = {
        id: crypto.randomUUID(),
        userId: formData.userId,
        username: formData.username, // Actually acts as handle/ID in some contexts, but we use userId as unique
        name: formData.username, // Display name
        password: formData.password,
        avatar: `https://picsum.photos/seed/${formData.userId}/200`,
        coverPhoto: `https://picsum.photos/seed/${formData.userId}/800/300`,
        bio: 'Hello Neo World!',
        joinedAt: Date.now(),
        friends: [],
        friendRequests: [],
        status: 'online'
      };

      const success = StorageService.createUser(newUser);
      if (success) {
        onLogin(newUser);
      } else {
        setError('User ID already exists. Please choose a unique ID.');
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0f172a] relative overflow-hidden p-4">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-neon-purple/30 rounded-full mix-blend-screen blur-[128px] animate-pulse-slow"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-neon-blue/30 rounded-full mix-blend-screen blur-[128px] animate-pulse-slow" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="glass-panel p-8 rounded-2xl shadow-2xl shadow-black/50 border border-white/10 backdrop-blur-xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-tr from-neon-blue to-neon-purple mb-4 shadow-lg shadow-neon-purple/30">
              <Sparkles className="text-white" size={32} />
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight mb-1">
              {isLogin ? 'Welcome Back' : 'Join the Future'}
            </h2>
            <p className="text-gray-400">
              {isLogin ? 'Enter the Neo-Network' : 'Create your digital identity'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Neo"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-neon-blue focus:ring-1 focus:ring-neon-blue outline-none transition-all"
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                 {isLogin ? 'User ID' : 'Create User ID'}
              </label>
              <input
                type="text"
                placeholder="e.g. NeoKing77"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-neon-blue focus:ring-1 focus:ring-neon-blue outline-none transition-all font-mono"
                value={formData.userId}
                onChange={e => setFormData({...formData, userId: e.target.value})}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-neon-blue focus:ring-1 focus:ring-neon-blue outline-none transition-all"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-neon-blue to-neon-purple text-white font-bold py-3.5 rounded-xl shadow-lg shadow-neon-purple/25 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 group"
            >
              {isLogin ? 'Initialize Session' : 'Create Account'}
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setFormData({ userId: '', password: '', username: '' });
              }}
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              {isLogin ? "Don't have an ID? Create one" : "Already have an ID? Login"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
