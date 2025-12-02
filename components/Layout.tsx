
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Ticket, Monitor, LogOut, Menu, X, User as UserIcon, KanbanSquare, Users, Settings, Book, GitPullRequest, Key, Truck, Bell, Mail, Info, ChevronUp, RefreshCw, Shield, CalendarDays, Edit2 } from 'lucide-react';
import { User, UserRole, Notification, Announcement } from '../types';
import { formatDate } from '../utils';
import { ChatWidget } from './ChatWidget';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
  onUpdateUser: (user: User) => void;
  notifications: Notification[];
  announcements: Announcement[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, onUpdateUser, notifications, announcements, setNotifications }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  
  // Profile Form
  const [profileForm, setProfileForm] = useState({ name: user.name, phone: user.phone || '' });

  const location = useLocation();
  const navigate = useNavigate();

  const activeAnnouncement = announcements.find(a => a.active);
  const myNotifications = notifications.filter(n => n.userId === user.id);
  const unreadCount = myNotifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => n.userId === user.id ? { ...n, read: true } : n));
  };

  const handleSwitchAccount = () => {
    // Logout first to force login screen
    onLogout();
    navigate('/login');
  };

  const handleSaveProfile = () => {
    onUpdateUser({ ...user, name: profileForm.name, phone: profileForm.phone });
    setIsEditProfileOpen(false);
  };

  const getNavItems = () => {
    // Common items
    const items = [
      { label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/' },
      { label: 'Tickets', icon: <Ticket size={20} />, path: '/tickets' },
      { label: 'Knowledge Base', icon: <Book size={20} />, path: '/kb' },
    ];

    // IT Staff & Admin items
    if (user.role === UserRole.STAFF || user.role === UserRole.ADMIN) {
       items.push(
         { label: 'Assets', icon: <Monitor size={20} />, path: '/assets' },
         { label: 'Projects', icon: <KanbanSquare size={20} />, path: '/projects' },
         { label: 'Maintenance', icon: <CalendarDays size={20} />, path: '/pms' },
         { label: 'Change Mgmt', icon: <GitPullRequest size={20} />, path: '/changes' },
         { label: 'Licenses', icon: <Key size={20} />, path: '/licenses' },
         { label: 'Vendors', icon: <Truck size={20} />, path: '/vendors' }
       );
    }

    // Admin only items
    if (user.role === UserRole.ADMIN) {
      items.push(
        { label: 'Users', icon: <Users size={20} />, path: '/users' },
        { label: 'Settings', icon: <Settings size={20} />, path: '/settings' }
      );
    }

    return items;
  };

  const navItems = getNavItems();

  return (
    <div className="flex h-screen bg-[#E3E3E3] overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-[#456882] text-white shadow-xl z-20">
        <div className="p-6 flex items-center space-x-2 border-b border-[#5a7d96]">
          <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center font-bold text-lg text-[#456882]">N</div>
          <span className="text-xl font-bold tracking-tight">NexGen IT</span>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive ? 'bg-[#2f4759] text-white shadow-md' : 'text-slate-200 hover:bg-[#375368] hover:text-white'
                }`}
              >
                {item.icon}
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#5a7d96] relative">
          <button 
            onClick={() => setIsAuthModalOpen(!isAuthModalOpen)}
            className="flex items-center space-x-3 w-full p-2 rounded-lg hover:bg-[#375368] transition-colors text-left group"
          >
            <div className="h-10 w-10 rounded-full bg-[#2f4759] flex items-center justify-center text-slate-200 group-hover:text-white transition-colors border border-[#5a7d96]">
              <UserIcon size={20} />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold truncate group-hover:text-white transition-colors">{user.name}</p>
              <p className="text-xs text-slate-300 truncate">{user.role}</p>
            </div>
            <ChevronUp size={16} className="text-slate-300 group-hover:text-white" />
          </button>

          {/* Auth Modal / Popover */}
          {isAuthModalOpen && (
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-[#456882] rounded-xl shadow-2xl border border-[#5a7d96] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 ring-1 ring-white/10">
               <div className="p-4 border-b border-[#5a7d96] bg-[#375368]">
                  <div className="flex items-center justify-between mb-2">
                     <p className="text-xs text-slate-300 uppercase font-bold tracking-wider">Current Session</p>
                     <button onClick={() => { setIsEditProfileOpen(true); setIsAuthModalOpen(false); }} className="text-xs text-white hover:text-blue-200 flex items-center gap-1">
                        <Edit2 size={10} /> Edit
                     </button>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                     <Shield size={14} className="text-white" />
                     <span className="text-sm font-medium text-white">{user.role}</span>
                  </div>
                  <p className="text-xs text-slate-300 truncate">{user.email}</p>
                  {user.phone && <p className="text-xs text-slate-300 truncate mt-1">{user.phone}</p>}
               </div>
               <div className="p-2">
                  <button 
                    onClick={handleSwitchAccount}
                    className="flex items-center w-full gap-3 px-3 py-2.5 text-slate-200 hover:bg-[#5a7d96] hover:text-white rounded-lg text-sm transition-colors"
                  >
                    <RefreshCw size={16} /> Switch Account
                  </button>
                  <button 
                    onClick={onLogout}
                    className="flex items-center w-full gap-3 px-3 py-2.5 text-red-200 hover:bg-red-900/20 hover:text-red-100 rounded-lg text-sm transition-colors"
                  >
                    <LogOut size={16} /> Sign Out
                  </button>
               </div>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      
      {/* Mobile Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-[#456882] text-white transform transition-transform duration-200 ease-in-out z-40 md:hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 flex justify-between items-center border-b border-[#5a7d96]">
           <span className="text-xl font-bold">NexGen IT</span>
           <button onClick={() => setSidebarOpen(false)}><X size={24} /></button>
        </div>
        <nav className="px-4 space-y-2 mt-4">
           {navItems.map(item => (
             <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)} className="flex items-center space-x-3 px-4 py-3 text-slate-200 hover:bg-[#375368] rounded-md">
               {item.icon} <span>{item.label}</span>
             </Link>
           ))}
           <button onClick={onLogout} className="flex items-center space-x-3 px-4 py-3 text-red-300 w-full mt-4 hover:bg-red-900/20 rounded-md">
             <LogOut size={20} /> <span>Sign Out</span>
           </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Global Announcement */}
        {activeAnnouncement && (
          <div className={`w-full px-4 py-2 text-white flex items-center justify-center gap-2 text-sm font-medium ${
            activeAnnouncement.type === 'critical' ? 'bg-red-600' :
            activeAnnouncement.type === 'warning' ? 'bg-amber-600' : 'bg-[#2f4759]'
          }`}>
             <Info size={16} /> {activeAnnouncement.message}
          </div>
        )}

        <header className="bg-white shadow-sm border-b border-slate-200 h-16 flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center">
             <button onClick={() => setSidebarOpen(true)} className="text-slate-600 md:hidden mr-4">
               <Menu size={24} />
             </button>
             <span className="font-semibold text-slate-800 md:hidden">NexGen IT Ops</span>
          </div>

          <div className="flex items-center space-x-4">
             {/* Notifications */}
             <div className="relative">
                <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="p-2 text-[#456882] hover:bg-slate-100 rounded-full relative transition-colors">
                   <Bell size={20} />
                   {unreadCount > 0 && (
                     <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                       {unreadCount > 9 ? '9+' : unreadCount}
                     </span>
                   )}
                </button>

                {isNotifOpen && (
                   <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                      <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                         <h3 className="font-bold text-slate-700">Notifications</h3>
                         <button onClick={markAllRead} className="text-xs text-[#456882] hover:underline font-semibold">Mark all read</button>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                         {myNotifications.length === 0 ? (
                            <div className="p-6 text-center text-slate-400 text-sm">No new notifications</div>
                         ) : (
                            myNotifications.map(n => (
                               <div key={n.id} className={`p-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${!n.read ? 'bg-[#E3E3E3]/50' : ''}`}>
                                  <div className="flex items-start gap-3">
                                     <div className="mt-1 text-[#456882]"><Mail size={16} /></div>
                                     <div>
                                        <p className="font-semibold text-sm text-slate-800">{n.subject}</p>
                                        <p className="text-xs text-slate-500 line-clamp-2">{n.message}</p>
                                        <p className="text-[10px] text-slate-400 mt-1">{formatDate(n.timestamp)}</p>
                                     </div>
                                  </div>
                               </div>
                            ))
                         )}
                      </div>
                   </div>
                )}
             </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8 relative">
          <div className="max-w-7xl mx-auto pb-16">
            {children}
          </div>
          {/* Chat Widget */}
          <ChatWidget user={user} />
        </main>
      </div>

      {/* Edit Profile Modal */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
           <div className="bg-white p-6 rounded-xl w-full max-w-sm border border-slate-200 shadow-2xl">
              <h2 className="text-xl font-bold mb-4 text-slate-800">Edit Profile</h2>
              <div className="space-y-4">
                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                   <input className="w-full p-2 border border-slate-300 rounded focus:ring-[#456882] focus:border-[#456882]" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                   <input className="w-full p-2 border border-slate-300 rounded focus:ring-[#456882] focus:border-[#456882]" value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} placeholder="+1 234 567 890" />
                 </div>
                 <div className="flex justify-end gap-2 pt-2">
                    <button onClick={() => setIsEditProfileOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
                    <button onClick={handleSaveProfile} className="px-4 py-2 bg-[#456882] text-white rounded hover:bg-[#375368]">Save Changes</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Global Backdrop for Auth Modal if needed */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-10" onClick={() => setIsAuthModalOpen(false)} />
      )}
    </div>
  );
};
