import React from 'react';
import { Home, Users, MessageSquare, User as UserIcon, Settings, LogOut, Search, Menu, Code } from 'lucide-react';
import { User, ViewState } from '../../types';

interface SidebarProps {
  currentUser: User;
  currentView: ViewState;
  setView: (view: ViewState) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentUser, currentView, setView, onLogout }) => {
  const navItems = [
    { id: 'feed', icon: Home, label: 'Home Feed' },
    { id: 'friends', icon: Users, label: 'Friends' },
    { id: 'messages', icon: MessageSquare, label: 'Messenger' },
    { id: 'profile', icon: UserIcon, label: 'My Profile' },
  ];

  if (currentUser.isAdmin) {
      navItems.push({ id: 'admin', icon: Code, label: 'Admin Panel' });
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 glass-panel border-r border-white/10 z-50">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-purple to-neon-blue flex items-center justify-center shadow-lg shadow-neon-purple/20">
            <span className="text-white font-bold text-xl">N</span>
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 tracking-wide">
            NEOBOOK
          </h1>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id as ViewState)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden ${
                currentView === item.id
                  ? 'bg-neon-purple/10 text-neon-purple border border-neon-purple/20 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon size={22} className={`${currentView === item.id ? 'animate-pulse' : ''}`} />
              <span className="font-medium">{item.label}</span>
              {currentView === item.id && (
                <div className="absolute left-0 top-0 h-full w-1 bg-neon-purple shadow-[0_0_10px_#a855f7]" />
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 mb-4">
            <img src={currentUser.avatar} alt="Profile" className="w-10 h-10 rounded-full border border-neon-cyan/50" />
            <div className="overflow-hidden">
                <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
                <p className="text-xs text-gray-500 truncate">@{currentUser.userId}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full glass-panel border-t border-white/10 z-50 pb-safe">
        <div className="flex justify-around items-center p-4">
          {navItems.slice(0, 5).map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id as ViewState)}
              className={`flex flex-col items-center gap-1 ${
                currentView === item.id ? 'text-neon-purple' : 'text-gray-500'
              }`}
            >
              <item.icon size={24} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
};
