

import React, { useState, useRef, useEffect } from 'react';
import { User, UserRole, Ticket, Asset, Announcement, SystemData, EmailSettings } from '../types';
import { RotateCcw, Trash2, Megaphone, Plus, X, Database, Download, Upload, CheckSquare, Square, Mail, Save } from 'lucide-react';
import { generateId, formatDate, exportDatabaseToJSON } from '../utils';
import { api } from '../services/api';

interface SettingsProps {
  user: User;
  tickets: Ticket[];
  setTickets: React.Dispatch<React.SetStateAction<Ticket[]>>;
  assets: Asset[];
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  announcements: Announcement[];
  setAnnouncements: React.Dispatch<React.SetStateAction<Announcement[]>>;
  onBackup: () => void;
  onRestore: (data: SystemData) => void;
}

export const Settings: React.FC<SettingsProps> = ({ user, tickets, setTickets, assets, setAssets, announcements, setAnnouncements, onBackup, onRestore }) => {
  const [activeTab, setActiveTab] = useState<'recovery' | 'announcements' | 'data' | 'email'>('recovery');
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Backup Modal State
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [backupOptions, setBackupOptions] = useState({
    tickets: true,
    assets: true,
    users: true,
    projects: true,
    kb: true,
    settings: true
  });

  // Email Settings State
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    smtpHost: '', smtpPort: '', smtpUser: '', smtpPass: '', senderName: '', senderEmail: '', enabled: false
  });

  useEffect(() => {
    if (activeTab === 'email') {
      const loadEmailSettings = async () => {
        const settings = await api.settings.getEmail();
        if (settings) setEmailSettings(settings);
      };
      loadEmailSettings();
    }
  }, [activeTab]);

  if (user.role !== UserRole.ADMIN) {
    return <div className="text-center p-10 text-red-500">Access Denied. Admin only.</div>;
  }

  // Recovery Logic
  const deletedTickets = tickets.filter(t => t.deleted);
  const deletedAssets = assets.filter(a => a.deleted);

  const restoreTicket = async (id: string) => {
    await api.tickets.update({ id, deleted: false });
    setTickets(tickets.map(t => t.id === id ? { ...t, deleted: false } : t));
  };
  
  const permDeleteTicket = async (id: string) => {
    await api.tickets.delete(id);
    setTickets(tickets.filter(t => t.id !== id));
  };

  const restoreAsset = async (id: string) => {
    await api.assets.update({ id, deleted: false });
    setAssets(assets.map(a => a.id === id ? { ...a, deleted: false } : a));
  };

  const permDeleteAsset = async (id: string) => {
    await api.assets.delete(id);
    setAssets(assets.filter(a => a.id !== id));
  };

  // Announcement Logic
  const addAnnouncement = async () => {
    if (!newAnnouncement) return;
    const item: Announcement = { 
       id: generateId(), 
       message: newAnnouncement, 
       type: 'info', 
       active: true, 
       createdAt: Date.now() 
    };
    await api.announcements.create(item);
    setAnnouncements([...announcements, item]);
    setNewAnnouncement('');
  };

  const deleteAnnouncement = async (id: string) => {
    await api.announcements.delete(id);
    setAnnouncements(announcements.filter(a => a.id !== id));
  };

  const toggleAnnouncement = async (id: string) => {
     const ann = announcements.find(a => a.id === id);
     if (ann) {
        await api.announcements.update({ id, active: !ann.active });
        setAnnouncements(announcements.map(a => a.id === id ? { ...a, active: !a.active } : a));
     }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
       try {
          const json = JSON.parse(e.target?.result as string);
          if (json && json.version) {
             onRestore(json as SystemData);
          } else {
             alert("Invalid Database File");
          }
       } catch (err) {
          alert("Error parsing JSON file");
       }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCustomBackup = async () => {
    // Fetch fresh data for backup
    const allData = await api.fetchAll();
    
    const exportData: Partial<SystemData> = {
        version: '1.0',
        timestamp: Date.now(),
        // Always include these
        announcements: allData.announcements,
        emailSettings: allData.emailSettings
    };

    if (backupOptions.tickets) exportData.tickets = allData.tickets;
    if (backupOptions.assets) exportData.assets = allData.assets;
    if (backupOptions.users) exportData.users = allData.users;
    if (backupOptions.projects) exportData.projects = allData.projects;
    if (backupOptions.kb) exportData.articles = allData.articles;
    if (backupOptions.settings) {
        exportData.changes = allData.changes;
        exportData.licenses = allData.licenses;
        exportData.vendors = allData.vendors;
        exportData.pmsTasks = allData.pmsTasks;
    }

    exportDatabaseToJSON(exportData, `NexGen_Custom_Backup_${new Date().toISOString().split('T')[0]}.json`);
    setIsBackupModalOpen(false);
  };

  const saveEmailSettings = async () => {
    await api.settings.updateEmail(emailSettings);
    alert('Email settings saved successfully.');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>

      <div className="flex gap-4 mb-4 border-b border-slate-200 pb-1 overflow-x-auto">
         <button onClick={() => setActiveTab('recovery')} className={`px-4 py-2 rounded-t-lg font-medium transition-colors border-b-2 ${activeTab === 'recovery' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'}`}>Recovery Center</button>
         <button onClick={() => setActiveTab('announcements')} className={`px-4 py-2 rounded-t-lg font-medium transition-colors border-b-2 ${activeTab === 'announcements' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'}`}>Announcements</button>
         <button onClick={() => setActiveTab('data')} className={`px-4 py-2 rounded-t-lg font-medium transition-colors border-b-2 ${activeTab === 'data' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'}`}>Data Management</button>
         <button onClick={() => setActiveTab('email')} className={`px-4 py-2 rounded-t-lg font-medium transition-colors border-b-2 ${activeTab === 'email' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'}`}>Email Settings</button>
      </div>

      {activeTab === 'recovery' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Trash2 size={20} /> Deleted Items</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div>
                <h3 className="font-semibold text-slate-700 mb-3">Tickets</h3>
                {deletedTickets.length === 0 && <p className="text-slate-400 text-sm">Empty</p>}
                <div className="space-y-2">
                   {deletedTickets.map(t => (
                      <div key={t.id} className="p-3 bg-slate-50 border border-slate-100 rounded flex justify-between items-center">
                         <span className="text-sm truncate w-48">{t.title}</span>
                         <div className="flex gap-2">
                            <button onClick={() => restoreTicket(t.id)} className="text-green-600 text-xs hover:underline">Restore</button>
                            <button onClick={() => permDeleteTicket(t.id)} className="text-red-600 text-xs hover:underline">Delete</button>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
             <div>
                <h3 className="font-semibold text-slate-700 mb-3">Assets</h3>
                {deletedAssets.length === 0 && <p className="text-slate-400 text-sm">Empty</p>}
                <div className="space-y-2">
                   {deletedAssets.map(a => (
                      <div key={a.id} className="p-3 bg-slate-50 border border-slate-100 rounded flex justify-between items-center">
                         <span className="text-sm truncate w-48">{a.name}</span>
                         <div className="flex gap-2">
                            <button onClick={() => restoreAsset(a.id)} className="text-green-600 text-xs hover:underline">Restore</button>
                            <button onClick={() => permDeleteAsset(a.id)} className="text-red-600 text-xs hover:underline">Delete</button>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'announcements' && (
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Megaphone size={20} /> System Announcements</h2>
            <div className="flex gap-2 mb-6">
               <input className="flex-1 p-2 border border-slate-300 rounded" placeholder="Enter announcement message..." value={newAnnouncement} onChange={e => setNewAnnouncement(e.target.value)} />
               <button onClick={addAnnouncement} className="px-4 py-2 bg-blue-600 text-white rounded flex items-center gap-2"><Plus size={18} /> Add</button>
            </div>
            <div className="space-y-3">
               {announcements.map(ann => (
                  <div key={ann.id} className="p-4 border border-slate-200 rounded-lg flex justify-between items-center">
                     <div>
                        <p className="font-medium text-slate-800">{ann.message}</p>
                        <p className="text-xs text-slate-500">Created {formatDate(ann.createdAt)}</p>
                     </div>
                     <div className="flex items-center gap-3">
                        <button onClick={() => toggleAnnouncement(ann.id)} className={`px-3 py-1 text-xs rounded-full ${ann.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{ann.active ? 'Active' : 'Inactive'}</button>
                        <button onClick={() => deleteAnnouncement(ann.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-full"><X size={16} /></button>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      )}

      {activeTab === 'data' && (
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Database size={20} /> Database Management</h2>
            <p className="text-slate-500 mb-6">Backup the entire system including tickets, assets, users, and settings to a JSON file, or restore from a previous backup.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3"><Download size={24} /></div>
                  <h3 className="font-bold text-slate-800 mb-2">Backup Database</h3>
                  <p className="text-sm text-slate-500 mb-4">Select data modules to include in the backup file.</p>
                  <button onClick={() => setIsBackupModalOpen(true)} className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 w-full">Backup Options</button>
               </div>
               <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3"><Upload size={24} /></div>
                  <h3 className="font-bold text-slate-800 mb-2">Restore Database</h3>
                  <p className="text-sm text-slate-500 mb-4">Upload a previously exported JSON file to restore the system state.</p>
                  <button onClick={() => fileInputRef.current?.click()} className="px-6 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 w-full">Upload JSON</button>
                  <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />
               </div>
            </div>
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex gap-2 items-start">
               <div className="mt-0.5 font-bold">⚠️ Warning:</div>
               <div>Restoring a database will completely overwrite all current tickets, assets, users, and configurations. This action cannot be undone. Please ensure you have backed up your current data before proceeding.</div>
            </div>
         </div>
      )}

      {activeTab === 'email' && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Mail size={20} /> SMTP Email Configuration</h2>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-2">
                 <div className="flex items-center gap-2 mb-4">
                    <input type="checkbox" id="emailEnabled" checked={emailSettings.enabled} onChange={e => setEmailSettings({...emailSettings, enabled: e.target.checked})} className="w-4 h-4 text-blue-600" />
                    <label htmlFor="emailEnabled" className="text-sm font-medium text-slate-700">Enable Email Notifications</label>
                 </div>
              </div>
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Host</label>
                 <input className="w-full p-2 border rounded" placeholder="smtp.gmail.com" value={emailSettings.smtpHost} onChange={e => setEmailSettings({...emailSettings, smtpHost: e.target.value})} />
              </div>
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Port</label>
                 <input className="w-full p-2 border rounded" placeholder="587" value={emailSettings.smtpPort} onChange={e => setEmailSettings({...emailSettings, smtpPort: e.target.value})} />
              </div>
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                 <input className="w-full p-2 border rounded" value={emailSettings.smtpUser} onChange={e => setEmailSettings({...emailSettings, smtpUser: e.target.value})} />
              </div>
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                 <input type="password" className="w-full p-2 border rounded" value={emailSettings.smtpPass} onChange={e => setEmailSettings({...emailSettings, smtpPass: e.target.value})} />
              </div>
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Sender Email</label>
                 <input className="w-full p-2 border rounded" placeholder="helpdesk@nexgen.com" value={emailSettings.senderEmail} onChange={e => setEmailSettings({...emailSettings, senderEmail: e.target.value})} />
              </div>
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Sender Name</label>
                 <input className="w-full p-2 border rounded" placeholder="IT Support" value={emailSettings.senderName} onChange={e => setEmailSettings({...emailSettings, senderName: e.target.value})} />
              </div>
           </div>
           <div className="mt-6 flex justify-end">
              <button onClick={saveEmailSettings} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">
                 <Save size={18} /> Save Settings
              </button>
           </div>
        </div>
      )}

      {/* Backup Modal */}
      {isBackupModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-900">Backup Options</h2>
                    <button onClick={() => setIsBackupModalOpen(false)}><X size={20} className="text-slate-400" /></button>
                </div>
                <div className="space-y-3 mb-6">
                    {Object.keys(backupOptions).map(key => (
                        <div key={key} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50" onClick={() => setBackupOptions({...backupOptions, [key]: !backupOptions[key as keyof typeof backupOptions]})}>
                            <span className="capitalize font-medium text-slate-700">{key === 'kb' ? 'Knowledge Base' : key}</span>
                            {backupOptions[key as keyof typeof backupOptions] ? <CheckSquare className="text-blue-600" /> : <Square className="text-slate-400" />}
                        </div>
                    ))}
                </div>
                <button onClick={handleCustomBackup} className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Download Backup</button>
            </div>
        </div>
      )}
    </div>
  );
};