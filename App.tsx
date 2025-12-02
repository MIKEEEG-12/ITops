
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { TicketSystem } from './components/Tickets';
import { AssetManager } from './components/Assets';
import { ProjectBoard } from './components/Projects';
import { UserManagement } from './components/UserManagement';
import { Settings } from './components/Settings';
import { KnowledgeBase } from './components/KnowledgeBase';
import { ChangeManagement } from './components/ChangeManagement';
import { LicenseManager } from './components/LicenseManager';
import { VendorManager } from './components/VendorManager';
import { PMSCalendar } from './components/PMS';
import { SubmitTicketPage } from './components/SubmitTicketPage';
import { Login } from './components/Auth';
import { generateId, exportDatabaseToJSON } from './utils';
import { User, UserRole, Ticket, Asset, Project, KnowledgeArticle, ChangeRequest, SoftwareLicense, Vendor, Announcement, Notification, PMSTask, SystemData } from './types';
import { api } from './services/api';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  
  // Data States
  const [users, setUsers] = useState<User[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [changes, setChanges] = useState<ChangeRequest[]>([]);
  const [licenses, setLicenses] = useState<SoftwareLicense[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [pmsTasks, setPmsTasks] = useState<PMSTask[]>([]);
  
  // Local UI State
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load from API on mount
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        const data = await api.fetchAll();
        setUsers(data.users);
        setTickets(data.tickets);
        setAssets(data.assets);
        setProjects(data.projects);
        setArticles(data.articles);
        setChanges(data.changes);
        setLicenses(data.licenses);
        setVendors(data.vendors);
        setAnnouncements(data.announcements);
        setPmsTasks(data.pmsTasks);
        
        // Restore session
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) setUser(JSON.parse(savedUser));
      } catch (err) {
        console.error("Failed to load data", err);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  // Persist Current User Session only
  useEffect(() => {
    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [user]);

  const handleLogin = (u: User) => setUser(u);
  const handleLogout = () => setUser(null);

  const updateUser = async (updatedUser: User) => {
    // Optimistic update
    setUser(updatedUser);
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
    // API Call
    await api.users.update(updatedUser);
  };

  // Notification System
  const addNotification = (userId: string, subject: string, message: string, type: 'email' | 'system' = 'email') => {
    const newNote: Notification = {
      id: generateId(),
      userId,
      subject,
      message,
      read: false,
      timestamp: Date.now(),
      type
    };
    setNotifications(prev => [newNote, ...prev]);
  };

  // Database Management
  const handleBackupDatabase = () => {
    const systemData: SystemData = {
      users, tickets, assets, projects, articles, changes, licenses, vendors, announcements, pmsTasks,
      timestamp: Date.now(),
      version: '1.0'
    };
    exportDatabaseToJSON(systemData, `NexGen_DB_Backup_${new Date().toISOString().split('T')[0]}.json`);
  };

  const handleRestoreDatabase = async (data: SystemData) => {
    setLoading(true);
    await api.restoreDatabase(data);
    // Refresh local state from the restored DB
    const freshData = await api.fetchAll();
    setUsers(freshData.users);
    setTickets(freshData.tickets);
    setAssets(freshData.assets);
    setProjects(freshData.projects);
    setArticles(freshData.articles);
    setChanges(freshData.changes);
    setLicenses(freshData.licenses);
    setVendors(freshData.vendors);
    setAnnouncements(freshData.announcements);
    setPmsTasks(freshData.pmsTasks);
    setLoading(false);
    alert("Database restored successfully.");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-500">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p>Loading System Data...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />
        
        <Route path="/ticketings/forms/client.php" element={
          user ? (
            <SubmitTicketPage user={user} tickets={tickets} setTickets={setTickets} />
          ) : (
            <Navigate to="/login" />
          )
        } />

        <Route path="/*" element={
          user ? (
            <Layout 
              user={user} 
              onLogout={handleLogout} 
              onUpdateUser={updateUser}
              notifications={notifications} 
              announcements={announcements} 
              setNotifications={setNotifications}
            >
              <Routes>
                <Route path="/" element={
                  <Dashboard 
                    user={user}
                    tickets={tickets} 
                    assets={assets} 
                    projects={projects} 
                    changes={changes}
                    licenses={licenses}
                    announcements={announcements}
                  />
                } />
                <Route path="/tickets" element={
                  <TicketSystem 
                    tickets={tickets} 
                    assets={assets}
                    user={user} 
                    setTickets={setTickets} 
                    onNotify={addNotification}
                  />
                } />
                <Route path="/kb" element={
                  <KnowledgeBase 
                    articles={articles}
                    user={user}
                    setArticles={setArticles}
                  />
                } />
                
                {(user.role === UserRole.STAFF || user.role === UserRole.ADMIN) && (
                  <>
                    <Route path="/assets" element={
                      <AssetManager 
                        assets={assets} 
                        tickets={tickets} 
                        user={user} 
                        setAssets={setAssets}
                        setTickets={setTickets}
                        onNotify={addNotification}
                      />
                    } />
                    <Route path="/projects" element={
                      <ProjectBoard 
                        projects={projects}
                        user={user}
                        setProjects={setProjects}
                      />
                    } />
                    <Route path="/changes" element={
                      <ChangeManagement 
                        changes={changes}
                        user={user}
                        setChanges={setChanges}
                      />
                    } />
                    <Route path="/licenses" element={
                      <LicenseManager 
                        licenses={licenses}
                        user={user}
                        setLicenses={setLicenses}
                      />
                    } />
                    <Route path="/vendors" element={
                      <VendorManager
                        vendors={vendors}
                        user={user}
                        setVendors={setVendors}
                      />
                    } />
                    <Route path="/pms" element={
                      <PMSCalendar
                        pmsTasks={pmsTasks}
                        setPmsTasks={setPmsTasks}
                        assets={assets}
                        users={users}
                        currentUser={user}
                      />
                    } />
                  </>
                )}

                {user.role === UserRole.ADMIN && (
                  <>
                    <Route path="/users" element={
                      <UserManagement 
                        currentUser={user}
                        allUsers={users}
                        setUsers={setUsers}
                      />
                    } />
                    <Route path="/settings" element={
                      <Settings 
                        user={user}
                        tickets={tickets}
                        setTickets={setTickets}
                        assets={assets}
                        setAssets={setAssets}
                        announcements={announcements}
                        setAnnouncements={setAnnouncements}
                        onBackup={handleBackupDatabase}
                        onRestore={handleRestoreDatabase}
                      />
                    } />
                  </>
                )}
              </Routes>
            </Layout>
          ) : (
            <Navigate to="/login" />
          )
        } />
      </Routes>
    </Router>
  );
}
