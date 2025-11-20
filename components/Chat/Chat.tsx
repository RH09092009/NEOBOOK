import React, { useState, useEffect, useRef } from 'react';
import { Send, MoreVertical, Phone, Video, Smile, MessageSquare } from 'lucide-react';
import { User, Message } from '../../types';
import { StorageService } from '../../services/storage';

interface ChatProps {
  currentUser: User;
  initialChatUserId: string | null;
  onRefresh: () => void;
}

export const Chat: React.FC<ChatProps> = ({ currentUser, initialChatUserId, onRefresh }) => {
  const [friends, setFriends] = useState<User[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(initialChatUserId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync selectedFriendId when prop changes
  useEffect(() => {
    if (initialChatUserId) {
        setSelectedFriendId(initialChatUserId);
    }
  }, [initialChatUserId]);

  const loadData = () => {
    const allUsers = StorageService.getUsers();
    const myFriends = allUsers.filter(u => currentUser.friends.includes(u.id));
    
    // If we are trying to chat with someone who isn't a friend yet (simulated scenario from profile), add them temporarily to list or handle
    // For now, we only show friends. If you messaged a non-friend, we might need to fetch them.
    if (selectedFriendId && !myFriends.find(f => f.id === selectedFriendId)) {
        const target = allUsers.find(u => u.id === selectedFriendId);
        if (target) myFriends.unshift(target);
    }

    setFriends(myFriends);

    if (selectedFriendId) {
      const allMessages = StorageService.getMessages();
      const chatMessages = allMessages.filter(m => 
        (m.fromId === currentUser.id && m.toId === selectedFriendId) ||
        (m.fromId === selectedFriendId && m.toId === currentUser.id)
      );
      // Sort by timestamp
      chatMessages.sort((a, b) => a.timestamp - b.timestamp);
      setMessages(chatMessages);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 1000); // Fast polling for "real-time" feel
    return () => clearInterval(interval);
  }, [selectedFriendId, currentUser]);

  useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputText.trim() || !selectedFriendId) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      fromId: currentUser.id,
      toId: selectedFriendId,
      content: inputText,
      timestamp: Date.now(),
      read: false
    };

    StorageService.sendMessage(newMessage);
    setInputText('');
    loadData();
  };

  const selectedFriend = friends.find(f => f.id === selectedFriendId);

  return (
    <div className="h-[calc(100vh-80px)] md:h-screen flex overflow-hidden bg-[#0f172a]">
      {/* Chat List (Sidebar) */}
      <div className={`w-full md:w-80 border-r border-white/10 glass-panel flex flex-col ${selectedFriendId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {friends.map(friend => {
             // Find last message
             const allMessages = StorageService.getMessages();
             const lastMsg = allMessages
                .filter(m => (m.fromId === currentUser.id && m.toId === friend.id) || (m.fromId === friend.id && m.toId === currentUser.id))
                .sort((a, b) => b.timestamp - a.timestamp)[0];

             return (
                <div 
                    key={friend.id}
                    onClick={() => setSelectedFriendId(friend.id)}
                    className={`p-4 flex gap-3 cursor-pointer transition-colors hover:bg-white/5 ${selectedFriendId === friend.id ? 'bg-white/10 border-r-2 border-neon-blue' : ''}`}
                >
                    <div className="relative">
                        <img src={friend.avatar} className="w-12 h-12 rounded-full object-cover" />
                        {friend.status === 'online' && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#111928]"></div>
                        )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <div className="flex justify-between items-baseline">
                            <h4 className="font-bold text-gray-200 truncate">{friend.name}</h4>
                            <span className="text-[10px] text-gray-500">{lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ''}</span>
                        </div>
                        <p className={`text-sm truncate ${lastMsg && !lastMsg.read && lastMsg.toId === currentUser.id ? 'text-white font-bold' : 'text-gray-500'}`}>
                            {lastMsg ? (lastMsg.fromId === currentUser.id ? 'You: ' + lastMsg.content : lastMsg.content) : 'Start a conversation'}
                        </p>
                    </div>
                </div>
             );
          })}
          {friends.length === 0 && (
              <div className="p-8 text-center text-gray-500 text-sm">
                  Add friends to start chatting!
              </div>
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className={`flex-1 flex flex-col relative bg-gradient-to-br from-[#0f172a] to-[#1e1b4b] ${!selectedFriendId ? 'hidden md:flex' : 'flex'}`}>
         {selectedFriend ? (
             <>
                {/* Chat Header */}
                <div className="h-16 glass-panel border-b border-white/10 flex items-center justify-between px-4 z-10">
                    <div className="flex items-center gap-3">
                        <button className="md:hidden text-gray-400 mr-2" onClick={() => setSelectedFriendId(null)}>←</button>
                        <img src={selectedFriend.avatar} className="w-10 h-10 rounded-full" />
                        <div>
                            <h3 className="font-bold text-white">{selectedFriend.name}</h3>
                            <p className="text-xs text-neon-blue flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-neon-blue rounded-full animate-pulse"></span>
                                Online
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-4 text-neon-purple">
                        <Phone size={20} className="cursor-pointer hover:text-white" />
                        <Video size={20} className="cursor-pointer hover:text-white" />
                        <MoreVertical size={20} className="cursor-pointer hover:text-white" />
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map(msg => {
                        const isMe = msg.fromId === currentUser.id;
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[70%] rounded-2xl p-3 ${isMe ? 'bg-neon-blue text-white rounded-tr-none' : 'bg-white/10 text-gray-200 rounded-tl-none'}`}>
                                    <p>{msg.content}</p>
                                    <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-gray-500'}`}>
                                        {new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 glass-panel border-t border-white/10">
                    <div className="flex items-center gap-2 bg-white/5 rounded-full px-4 py-2 border border-white/10 focus-within:border-neon-blue/50 transition-colors">
                        <Smile size={20} className="text-gray-400 cursor-pointer hover:text-yellow-400" />
                        <input 
                            type="text" 
                            className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none py-1"
                            placeholder="Type a message..."
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        />
                        <button 
                            onClick={handleSendMessage}
                            className={`p-2 rounded-full transition-all ${inputText.trim() ? 'text-neon-blue hover:bg-neon-blue/10' : 'text-gray-600'}`}
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </div>
             </>
         ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                 <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4 animate-pulse">
                    <MessageSquare size={40} className="text-neon-purple/50" />
                 </div>
                 <p className="text-lg font-medium">Select a friend to start messaging</p>
                 <p className="text-sm mt-2">Connect with people on NEOBOOK!</p>
             </div>
         )}
      </div>
    </div>
  );
};