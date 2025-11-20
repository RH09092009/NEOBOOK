import React, { useState, useEffect } from 'react';
import { Auth } from './components/Auth/Auth';
import { Sidebar } from './components/UI/Layout';
import { Feed } from './components/Feed/Feed';
import { Friends } from './components/Friends/Friends';
import { Chat } from './components/Chat/Chat';
import { Profile } from './components/Profile/Profile';
import { AdminPanel } from './components/Admin/AdminPanel';
import { StorageService } from './services/storage';
import { User, ViewState } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewState>('login');
  const [isLoading, setIsLoading] = useState(true);
  
  // Navigation State
  const [viewedProfileId, setViewedProfileId] = useState<string | null>(null);
  const [chatTargetId, setChatTargetId] = useState<string | null>(null);

  useEffect(() => {
    // Simulate initial splash screen loading
    setTimeout(() => {
      const sessionUser = StorageService.getCurrentUser();
      if (sessionUser) {
        setUser(sessionUser);
        setView('feed');
      }
      setIsLoading(false);
    }, 1500);
  }, []);

  const refreshUser = () => {
      const updatedUser = StorageService.getCurrentUser();
      if (updatedUser) {
          setUser(updatedUser);
      }
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    StorageService.setCurrentUser(loggedInUser);
    setView('feed');
  };

  const handleLogout = () => {
    StorageService.setCurrentUser(null);
    setUser(null);
    setView('login');
    setViewedProfileId(null);
    setChatTargetId(null);
  };

  const handleViewProfile = (userId: string) => {
    setViewedProfileId(userId);
    setView('profile');
  };

  const handleStartChat = (userId: string) => {
    setChatTargetId(userId);
    setView('messages');
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-[#0f172a] flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neon-purple/20 via-[#0f172a] to-[#0f172a]"></div>
        <div className="text-center z-10">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-neon-blue to-neon-purple rounded-2xl shadow-[0_0_40px_rgba(168,85,247,0.5)] animate-float mb-8 flex items-center justify-center">
             <span className="text-4xl font-bold text-white">N</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-[0.2em] animate-pulse">NEOBOOK</h1>
          <p className="text-neon-cyan mt-2 text-sm uppercase tracking-widest">Loading Future Interface...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-gray-200 font-sans selection:bg-neon-pink selection:text-white">
      <Sidebar 
        currentUser={user} 
        currentView={view} 
        setView={(v) => {
          setView(v);
          if (v === 'profile') setViewedProfileId(user.id); // Default to my profile
          if (v !== 'messages') setChatTargetId(null);
        }} 
        onLogout={handleLogout} 
      />

      <main className="md:ml-64 min-h-screen relative">
        {/* Dynamic Background Blobs */}
        <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-neon-purple/20 rounded-full blur-[100px] opacity-50 animate-pulse-slow"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-neon-blue/20 rounded-full blur-[100px] opacity-50 animate-pulse-slow" style={{animationDelay: '1.5s'}}></div>
        </div>

        {view === 'feed' && (
          <Feed 
            currentUser={user} 
            onNavigateToProfile={handleViewProfile} 
            onRefresh={refreshUser}
          />
        )}
        
        {view === 'friends' && (
          <Friends 
            currentUser={user} 
            onNavigateToProfile={handleViewProfile}
            onNavigateToChat={handleStartChat}
            onRefresh={refreshUser}
          />
        )}
        
        {view === 'messages' && (
          <Chat 
            currentUser={user} 
            initialChatUserId={chatTargetId}
            onRefresh={refreshUser}
          />
        )}
        
        {view === 'profile' && (
          <Profile 
            currentUser={user} 
            viewedProfileId={viewedProfileId || user.id}
            onNavigateToChat={handleStartChat}
            onRefresh={refreshUser}
          />
        )}
        
        {view === 'admin' && user.isAdmin && <AdminPanel />}
      </main>
    </div>
  );
};

export default App;