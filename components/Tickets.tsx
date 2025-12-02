
import React, { useState, useRef, useEffect } from 'react';
import { Ticket, TicketStatus, TicketPriority, User, Asset, UserRole, TicketHistoryEntry } from '../types';
import { generateId, exportToExcel, processImportFile, formatDate } from '../utils';
import { Plus, Search, Filter, Download, MessageSquare, Sparkles, X, Trash2, Upload, FileText, Calendar, BookOpen, ExternalLink, Send, Clock, User as UserIcon, HelpCircle } from 'lucide-react';
import { analyzeTicketAI } from '../services/geminiService';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

interface TicketSystemProps {
  tickets: Ticket[];
  assets: Asset[];
  user: User;
  setTickets: React.Dispatch<React.SetStateAction<Ticket[]>>;
  onNotify: (userId: string, subject: string, message: string) => void;
}

export const TicketSystem: React.FC<TicketSystemProps> = ({ tickets, assets, user, setTickets, onNotify }) => {
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportConfig, setExportConfig] = useState({
    dateRange: 'all', // all, 30days, thisMonth, custom
    startDate: '',
    endDate: '',
    status: 'All'
  });
  
  // AI State
  const [aiAnalysis, setAiAnalysis] = useState<{ suggestion: string; estimatedPriority: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Discussion State
  const [newComment, setNewComment] = useState('');

  // New Ticket State
  const [newTicket, setNewTicket] = useState<Partial<Ticket>>({
    title: '',
    description: '',
    priority: TicketPriority.LOW,
    status: TicketStatus.OPEN,
    department: user.department,
    requesterName: user.name,
    requesterEmail: user.email,
  });
  const [ticketType, setTicketType] = useState('Service Request');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '' });

  const canManage = user.role === UserRole.ADMIN || user.role === UserRole.STAFF;

  // Filter Logic
  const visibleTickets = tickets.filter(t => !t.deleted);
  const userScopedTickets = user.role === UserRole.USER 
    ? visibleTickets.filter(t => t.requesterId === user.id)
    : visibleTickets;

  const filteredTickets = userScopedTickets.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.requesterName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateTicket = async () => {
    if (!newTicket.title || !newTicket.description) return;
    
    const fullDescription = `**Type:** ${ticketType}\n\n${newTicket.description}`;

    const ticket: Ticket = {
      id: generateId(),
      title: newTicket.title!,
      description: fullDescription,
      status: TicketStatus.OPEN,
      priority: newTicket.priority as TicketPriority,
      requesterId: canManage && newTicket.requesterName !== user.name ? 'manual-entry' : user.id,
      requesterName: newTicket.requesterName || user.name,
      requesterEmail: newTicket.requesterEmail || user.email,
      department: newTicket.department || user.department, 
      createdAt: Date.now(),
      updatedAt: Date.now(),
      attachments: [],
      relatedAssetId: newTicket.relatedAssetId,
      history: [{
        id: generateId(),
        type: 'system',
        authorName: 'System',
        content: 'Ticket created',
        timestamp: Date.now()
      }],
      deleted: false,
    };
    
    await api.tickets.create(ticket);
    setTickets([ticket, ...tickets]);
    
    if (ticket.requesterId === user.id) {
        onNotify(ticket.requesterId, 'Ticket Received', `We received your ticket "${ticket.title}". ID: #${ticket.id}`);
    }
    
    setView('list');
    setNewTicket({ 
        title: '', 
        description: '', 
        priority: TicketPriority.LOW,
        requesterName: user.name,
        requesterEmail: user.email,
        department: user.department
    });
    setTicketType('Service Request');
  };

  const handleUpdateTicket = async (id: string, updates: Partial<Ticket>) => {
    const oldTicket = tickets.find(t => t.id === id);
    if (!oldTicket) return;

    let historyUpdates: TicketHistoryEntry[] = oldTicket.history || [];

    // Log changes
    if (updates.status && updates.status !== oldTicket.status) {
      historyUpdates.push({
        id: generateId(),
        type: 'system',
        authorName: user.name,
        content: `Status changed from ${oldTicket.status} to ${updates.status}`,
        timestamp: Date.now()
      });
    }
    if (updates.priority && updates.priority !== oldTicket.priority) {
      historyUpdates.push({
        id: generateId(),
        type: 'system',
        authorName: user.name,
        content: `Priority changed from ${oldTicket.priority} to ${updates.priority}`,
        timestamp: Date.now()
      });
    }
    if (updates.assignedToName && updates.assignedToName !== oldTicket.assignedToName) {
      historyUpdates.push({
        id: generateId(),
        type: 'system',
        authorName: user.name,
        content: `Assigned to ${updates.assignedToName}`,
        timestamp: Date.now()
      });
    }

    const finalUpdates = { ...updates, history: historyUpdates, updatedAt: Date.now() };
    await api.tickets.update({ id, ...finalUpdates });

    const updatedTickets = tickets.map(t => t.id === id ? { ...t, ...finalUpdates } : t);
    setTickets(updatedTickets);
    if (selectedTicket) setSelectedTicket({ ...selectedTicket, ...finalUpdates });

    if (oldTicket.requesterId !== 'manual-entry') {
       if (updates.status && updates.status !== oldTicket.status) {
          onNotify(oldTicket.requesterId, 'Ticket Status Updated', `Your ticket "${oldTicket.title}" is now ${updates.status}.`);
       }
    }
  };

  const handleEditTicket = async () => {
    if (!selectedTicket || !editForm.title) return;
    await handleUpdateTicket(selectedTicket.id, {
        title: editForm.title,
        description: editForm.description
    });
    setIsEditModalOpen(false);
  };

  const handleAddComment = async () => {
    if (!selectedTicket || !newComment.trim()) return;
    
    const entry: TicketHistoryEntry = {
      id: generateId(),
      type: 'comment',
      authorName: user.name,
      content: newComment,
      timestamp: Date.now()
    };

    const updatedHistory = [...(selectedTicket.history || []), entry];
    await api.tickets.update({ id: selectedTicket.id, history: updatedHistory });
    
    const updatedTicket = { ...selectedTicket, history: updatedHistory };
    setSelectedTicket(updatedTicket);
    setTickets(tickets.map(t => t.id === updatedTicket.id ? updatedTicket : t));
    setNewComment('');
  };

  const handleDeleteTicket = async (id: string) => {
    if (user.role !== UserRole.ADMIN) return;
    if (window.confirm("Are you sure you want to move this ticket to the recycle bin?")) {
      await handleUpdateTicket(id, { deleted: true });
      if (selectedTicket?.id === id) {
        setView('list');
        setSelectedTicket(null);
      }
    }
  };

  const getExportData = () => {
    let data = visibleTickets;
    const now = new Date();
    if (exportConfig.dateRange === '30days') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        data = data.filter(t => t.createdAt >= thirtyDaysAgo.getTime());
    } else if (exportConfig.dateRange === 'thisMonth') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        data = data.filter(t => t.createdAt >= startOfMonth.getTime());
    } else if (exportConfig.dateRange === 'custom' && exportConfig.startDate && exportConfig.endDate) {
        const start = new Date(exportConfig.startDate).getTime();
        const end = new Date(exportConfig.endDate).getTime() + 86400000;
        data = data.filter(t => t.createdAt >= start && t.createdAt <= end);
    }
    if (exportConfig.status !== 'All') {
        data = data.filter(t => t.status === exportConfig.status);
    }
    return data;
  };

  const handleExport = () => {
    const rawData = getExportData();
    const exportData = rawData.map(t => ({
      ID: t.id,
      Subject: t.title,
      Priority: t.priority,
      Status: t.status,
      Requester: t.requesterName,
      Email: t.requesterEmail || 'N/A',
      Department: t.department,
      Created_Date: formatDate(t.createdAt),
      Description: t.description
    }));
    exportToExcel(exportData, 'IT_Tickets_Report.xls', 'IT Support Tickets Overview');
    setIsExportModalOpen(false);
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        Subject: 'Issue Title Example',
        Priority: 'Medium',
        Status: 'Open',
        Requester: 'John Doe',
        Department: 'Sales',
        Description: 'Detailed description of the issue...'
      }
    ];
    exportToExcel(templateData, 'Ticket_Import_Template.xls', 'Ticket Import Template');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsedData = await processImportFile(file);
      if (parsedData.length === 0) {
        alert("No valid data found.");
        return;
      }

      const newTickets: Ticket[] = parsedData.map(row => ({
        id: generateId(),
        title: row['Subject'] || 'Imported Ticket',
        description: row['Description'] || '',
        status: (row['Status'] as TicketStatus) || TicketStatus.OPEN,
        priority: (row['Priority'] as TicketPriority) || TicketPriority.LOW,
        requesterId: user.id,
        requesterName: row['Requester'] || user.name,
        department: row['Department'] || user.department,
        requesterEmail: row['Email'] || user.email,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        attachments: [],
        history: [],
        deleted: false
      }));

      await api.tickets.import(newTickets);
      setTickets(prev => [...newTickets, ...prev]);
      alert(`Successfully imported ${newTickets.length} tickets.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      alert("Failed to parse file.");
    }
  };

  const runAiAnalysis = async (ticket: Ticket) => {
    setIsAnalyzing(true);
    setAiAnalysis(null);
    const result = await analyzeTicketAI(ticket);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  const handleTroubleshootAsset = async () => {
    if (!selectedTicket || !selectedTicket.relatedAssetId) return;
    const asset = assets.find(a => a.id === selectedTicket.relatedAssetId);
    if (!asset) return;

    setIsAnalyzing(true);
    setAiAnalysis(null);
    
    // Simulate AI thinking for specific asset troubleshooting
    setTimeout(() => {
        setAiAnalysis({
            suggestion: `Troubleshooting for ${asset.name} (${asset.model}): 1. Check physical connections. 2. Verify drivers. 3. Restart device.`,
            estimatedPriority: "Medium" 
        });
        setIsAnalyzing(false);
    }, 1500);
  };

  const renderStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'Open': 'bg-blue-100 text-blue-700',
      'In Progress': 'bg-amber-100 text-amber-700',
      'Resolved': 'bg-emerald-100 text-emerald-700',
      'Closed': 'bg-slate-100 text-slate-700',
      'On Hold': 'bg-purple-100 text-purple-700',
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[status] || 'bg-gray-100'}`}>{status}</span>;
  };

  if (view === 'create') {
    return (
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900">New Support Ticket</h2>
          <button onClick={() => setView('list')} className="text-slate-400 hover:text-slate-600"><X /></button>
        </div>
        <div className="space-y-5">
          <div className="bg-[#E3E3E3] p-4 rounded-lg flex items-start gap-3 text-sm text-[#456882] mb-4 border border-slate-300">
             <BookOpen className="shrink-0 mt-0.5" size={18} />
             <div>
                <span className="font-semibold">Before you submit:</span> Have you checked the manual?
                <Link to="/kb" className="block text-[#456882] underline mt-1 font-medium hover:text-[#2f4759]">Browse Knowledge Base &rarr;</Link>
             </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
            <input 
              type="text" 
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#456882] outline-none"
              placeholder="e.g., Cannot access shared drive"
              value={newTicket.title}
              onChange={e => setNewTicket({...newTicket, title: e.target.value})}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ticket Type</label>
                <div className="flex gap-4 mt-2">
                   <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="ticketType" value="Service Request" checked={ticketType === 'Service Request'} onChange={e => setTicketType(e.target.value)} className="text-[#456882]" />
                      <span className="text-sm">Service Request</span>
                   </label>
                   <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="ticketType" value="Incident" checked={ticketType === 'Incident'} onChange={e => setTicketType(e.target.value)} className="text-red-600" />
                      <span className="text-sm">Incident</span>
                   </label>
                </div>
             </div>
             
             {canManage && (
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Requestor Name</label>
                   <input 
                     type="text" 
                     className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#456882] outline-none bg-slate-50"
                     value={newTicket.requesterName}
                     onChange={e => setNewTicket({...newTicket, requesterName: e.target.value})}
                   />
                </div>
             )}
          </div>

          {canManage && (
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Requestor Email</label>
                <input 
                  type="email" 
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#456882] outline-none bg-slate-50"
                  value={newTicket.requesterEmail}
                  onChange={e => setNewTicket({...newTicket, requesterEmail: e.target.value})}
                  placeholder="user@nexgen.com"
                />
             </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
            <select 
              className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none"
              value={newTicket.priority}
              onChange={e => setNewTicket({...newTicket, priority: e.target.value as TicketPriority})}
            >
              {Object.values(TicketPriority).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea 
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#456882] outline-none h-32"
              placeholder="Describe the issue in detail..."
              value={newTicket.description}
              onChange={e => setNewTicket({...newTicket, description: e.target.value})}
            />
          </div>
          <div className="pt-4 flex justify-end space-x-3">
            <button onClick={() => setView('list')} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
            <button onClick={handleCreateTicket} className="px-6 py-2 bg-[#456882] text-white font-medium rounded-lg hover:bg-[#375368] transition-colors">Submit Ticket</button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'detail' && selectedTicket) {
    const canEdit = user.role === UserRole.ADMIN || user.role === UserRole.STAFF;

    return (
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
        <div className="flex-1 flex flex-col space-y-6 overflow-y-auto pr-2">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <button onClick={() => { setView('list'); setAiAnalysis(null); }} className="text-sm text-[#456882] hover:underline mb-2">&larr; Back to Tickets</button>
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-slate-900">{selectedTicket.title}</h2>
                    {canEdit && (
                        <button 
                            onClick={() => { setEditForm({ title: selectedTicket.title, description: selectedTicket.description }); setIsEditModalOpen(true); }}
                            className="p-1.5 text-slate-400 hover:text-[#456882] rounded hover:bg-slate-50"
                        >
                            <FileText size={16} />
                        </button>
                    )}
                </div>
                <div className="flex items-center space-x-3 mt-2 text-sm text-slate-500">
                  <span>Requested by <strong>{selectedTicket.requesterName}</strong></span>
                  <span>•</span>
                  <span>{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {renderStatusBadge(selectedTicket.status)}
                <span className="px-2 py-1 rounded-full text-xs font-semibold border border-slate-200 text-slate-600">{selectedTicket.priority} Priority</span>
                {user.role === UserRole.ADMIN && (
                  <button onClick={() => handleDeleteTicket(selectedTicket.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-full hover:bg-red-50 ml-2">
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>

            <div className="prose max-w-none text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-100 mb-6 whitespace-pre-wrap">
              {selectedTicket.description}
            </div>
            
            {canEdit && (
              <div className="bg-[#E3E3E3] border border-slate-300 rounded-xl p-5 mb-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10">
                   <Sparkles size={64} className="text-[#456882]" />
                </div>
                <div className="flex items-center justify-between mb-3 relative z-10">
                  <h3 className="font-semibold text-[#456882] flex items-center gap-2"><Sparkles size={18} /> AI Assistant</h3>
                  <button 
                    onClick={() => runAiAnalysis(selectedTicket)} 
                    disabled={isAnalyzing}
                    className="text-xs bg-[#456882] text-white px-3 py-1.5 rounded-md hover:bg-[#375368] disabled:opacity-50 transition-colors"
                  >
                    {isAnalyzing ? 'Analyzing...' : 'Analyze Issue'}
                  </button>
                </div>
                
                {aiAnalysis && (
                  <div className="space-y-2 relative z-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <p className="text-sm text-slate-800"><strong>Suggested Action:</strong> {aiAnalysis.suggestion}</p>
                    <p className="text-sm text-slate-800"><strong>AI Priority Assessment:</strong> {aiAnalysis.estimatedPriority}</p>
                    {aiAnalysis.estimatedPriority !== selectedTicket.priority && (
                       <button 
                         onClick={() => handleUpdateTicket(selectedTicket.id, { priority: aiAnalysis.estimatedPriority as TicketPriority })}
                         className="text-xs text-[#456882] underline"
                       >
                         Update priority to {aiAnalysis.estimatedPriority}
                       </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col">
             <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><MessageSquare size={18} /> Activity & Discussion</h3>
             
             <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                {!selectedTicket.history || selectedTicket.history.length === 0 ? (
                   <div className="text-center py-8 text-slate-400 text-sm">No comments yet.</div>
                ) : (
                   selectedTicket.history.sort((a,b) => a.timestamp - b.timestamp).map(entry => (
                      <div key={entry.id} className={`flex gap-3 ${entry.type === 'system' ? 'justify-center' : 'items-start'}`}>
                         {entry.type === 'system' ? (
                            <span className="text-xs text-slate-500 bg-[#E3E3E3] px-3 py-1 rounded-full border border-slate-200">
                               {entry.content} &bull; {formatDate(entry.timestamp)}
                            </span>
                         ) : (
                            <>
                               <div className="w-8 h-8 rounded-full bg-[#E3E3E3] flex items-center justify-center flex-shrink-0">
                                  <UserIcon size={14} className="text-[#456882]" />
                               </div>
                               <div className="flex-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                  <div className="flex justify-between items-center mb-1">
                                     <span className="font-semibold text-sm text-slate-800">{entry.authorName}</span>
                                     <span className="text-xs text-slate-400">{formatDate(entry.timestamp)}</span>
                                  </div>
                                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{entry.content}</p>
                               </div>
                            </>
                         )}
                      </div>
                   ))
                )}
             </div>

             <div className="border-t border-slate-100 pt-4">
                <textarea 
                   className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#456882] outline-none mb-2"
                   placeholder="Type a comment..."
                   rows={3}
                   value={newComment}
                   onChange={e => setNewComment(e.target.value)}
                ></textarea>
                <div className="flex justify-end">
                   <button 
                     onClick={handleAddComment}
                     disabled={!newComment.trim()}
                     className="px-4 py-2 bg-[#456882] text-white rounded-lg text-sm font-medium hover:bg-[#375368] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                   >
                      <Send size={14} /> Post Comment
                   </button>
                </div>
             </div>
          </div>
        </div>

        <div className="w-full lg:w-80 space-y-6">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-800 mb-4">Ticket Controls</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                <select 
                  disabled={!canEdit && selectedTicket.status === TicketStatus.CLOSED}
                  value={selectedTicket.status}
                  onChange={(e) => handleUpdateTicket(selectedTicket.id, { status: e.target.value as TicketStatus })}
                  className="w-full p-2 text-sm border border-slate-300 rounded-md focus:border-[#456882]"
                >
                  {Object.values(TicketStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {canEdit && (
                <div>
                   <label className="block text-xs font-medium text-slate-500 mb-1">Assigned To</label>
                   <input 
                     type="text" 
                     placeholder="Assignee Name" 
                     className="w-full p-2 text-sm border border-slate-300 rounded-md focus:border-[#456882]"
                     value={selectedTicket.assignedToName || ''}
                     onChange={(e) => handleUpdateTicket(selectedTicket.id, { assignedToName: e.target.value })}
                   />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Related Asset</label>
                {canEdit ? (
                  <div className="flex gap-2">
                    <select
                        className="flex-1 p-2 text-sm border border-slate-300 rounded-md focus:border-[#456882]"
                        value={selectedTicket.relatedAssetId || ''}
                        onChange={(e) => handleUpdateTicket(selectedTicket.id, { relatedAssetId: e.target.value })}
                    >
                        <option value="">No Asset</option>
                        {assets.filter(a => !a.deleted).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    {selectedTicket.relatedAssetId && (
                        <button 
                            onClick={handleTroubleshootAsset}
                            className="p-2 bg-[#E3E3E3] hover:bg-slate-200 text-slate-600 rounded-md"
                            title="Troubleshoot this asset"
                        >
                            <HelpCircle size={16} />
                        </button>
                    )}
                  </div>
                ) : (
                  <div className="p-2 bg-slate-50 rounded border border-slate-200 text-sm">
                    {selectedTicket.relatedAssetId 
                      ? assets.find(a => a.id === selectedTicket.relatedAssetId)?.name || 'Unknown Asset'
                      : 'No asset linked'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Tickets</h1>
        <div className="flex gap-2">
          {(user.role === UserRole.ADMIN || user.role === UserRole.STAFF) && (
            <>
              <button onClick={handleDownloadTemplate} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-sm font-medium transition-colors">
                <FileText size={16} /> Template
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-sm font-medium transition-colors">
                <Upload size={16} /> Import
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept=".csv, .xls" onChange={handleImport} />
              <button onClick={() => setIsExportModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-sm font-medium transition-colors">
                <Download size={16} /> Export
              </button>
            </>
          )}
          <button onClick={() => setView('create')} className="flex items-center gap-2 px-4 py-2 bg-[#456882] text-white rounded-lg hover:bg-[#375368] text-sm font-medium shadow-sm transition-colors">
            <Plus size={18} /> New Ticket
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search tickets..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#456882] text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
           <Filter size={18} className="text-slate-400" />
           <select 
             className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#456882]"
             value={statusFilter}
             onChange={(e) => setStatusFilter(e.target.value)}
           >
             <option value="All">All Statuses</option>
             {Object.values(TicketStatus).map(s => <option key={s} value={s}>{s}</option>)}
           </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#E3E3E3] border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-700">ID</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Subject</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Requester</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Priority</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Created</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTickets.map(ticket => (
                <tr key={ticket.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-slate-500">#{ticket.id}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">{ticket.title}</td>
                  <td className="px-6 py-4 text-slate-600">{ticket.requesterName}</td>
                  <td className="px-6 py-4">
                     <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                       ticket.priority === TicketPriority.CRITICAL ? 'bg-red-500' : 
                       ticket.priority === TicketPriority.HIGH ? 'bg-orange-500' :
                       ticket.priority === TicketPriority.MEDIUM ? 'bg-blue-500' : 'bg-green-500'
                     }`} />
                     {ticket.priority}
                  </td>
                  <td className="px-6 py-4">{renderStatusBadge(ticket.status)}</td>
                  <td className="px-6 py-4 text-slate-500">{new Date(ticket.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => { setSelectedTicket(ticket); setView('detail'); }}
                      className="text-[#456882] hover:text-[#2f4759] font-medium hover:underline"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTickets.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No tickets found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Preview Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl w-full max-w-3xl shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-900">Export Tickets</h2>
                    <button onClick={() => setIsExportModalOpen(false)}><X size={20} className="text-slate-400" /></button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Time Period</label>
                        <select 
                            className="w-full p-2 border rounded" 
                            value={exportConfig.dateRange} 
                            onChange={(e) => setExportConfig({...exportConfig, dateRange: e.target.value})}
                        >
                            <option value="all">All Time</option>
                            <option value="30days">Last 30 Days</option>
                            <option value="thisMonth">This Month</option>
                            <option value="custom">Custom Range</option>
                        </select>
                    </div>
                    {exportConfig.dateRange === 'custom' && (
                        <div className="col-span-2 flex gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
                                <input type="date" className="w-full p-2 border rounded" value={exportConfig.startDate} onChange={e => setExportConfig({...exportConfig, startDate: e.target.value})} />
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
                                <input type="date" className="w-full p-2 border rounded" value={exportConfig.endDate} onChange={e => setExportConfig({...exportConfig, endDate: e.target.value})} />
                            </div>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Filter Status</label>
                        <select 
                            className="w-full p-2 border rounded" 
                            value={exportConfig.status} 
                            onChange={(e) => setExportConfig({...exportConfig, status: e.target.value})}
                        >
                            <option value="All">All Statuses</option>
                            {Object.values(TicketStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
                    <h3 className="text-sm font-bold text-slate-700 mb-3">Preview (First 3 Records)</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs bg-white rounded border border-slate-200">
                            <thead className="bg-[#E3E3E3]">
                                <tr>
                                    <th className="p-2 border-b font-semibold text-slate-700">ID</th>
                                    <th className="p-2 border-b font-semibold text-slate-700">Subject</th>
                                    <th className="p-2 border-b font-semibold text-slate-700">Status</th>
                                    <th className="p-2 border-b font-semibold text-slate-700">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {getExportData().slice(0, 3).map(t => (
                                    <tr key={t.id}>
                                        <td className="p-2 border-b">#{t.id}</td>
                                        <td className="p-2 border-b truncate max-w-[200px]">{t.title}</td>
                                        <td className="p-2 border-b">{t.status}</td>
                                        <td className="p-2 border-b">{formatDate(t.createdAt)}</td>
                                    </tr>
                                ))}
                                {getExportData().length === 0 && <tr><td colSpan={4} className="p-4 text-center text-slate-500">No matching records found.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-2 text-right text-xs text-slate-500">
                        Total Records to Export: <strong>{getExportData().length}</strong>
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <button onClick={() => setIsExportModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
                    <button onClick={handleExport} className="px-6 py-2 bg-[#456882] text-white font-medium rounded hover:bg-[#375368]">Download Excel Report</button>
                </div>
            </div>
        </div>
      )}

      {/* Edit Ticket Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl w-full max-w-lg shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-slate-900">Edit Ticket Details</h2>
                    <button onClick={() => setIsEditModalOpen(false)}><X size={20} className="text-slate-400" /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                        <input 
                            className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-[#456882] outline-none"
                            value={editForm.title}
                            onChange={e => setEditForm({...editForm, title: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                        <textarea 
                            className="w-full p-2 border border-slate-300 rounded h-32 focus:ring-2 focus:ring-[#456882] outline-none"
                            value={editForm.description}
                            onChange={e => setEditForm({...editForm, description: e.target.value})}
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
                        <button onClick={handleEditTicket} className="px-6 py-2 bg-[#456882] text-white rounded hover:bg-[#375368]">Save Changes</button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
