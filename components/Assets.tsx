
import React, { useState, useRef } from 'react';
import { Asset, AssetStatus, Ticket, User, UserRole, MaintenanceRecord, AssetAssignmentRecord, TicketPriority, TicketStatus } from '../types';
import { generateId, exportToExcel, processImportFile, formatDate } from '../utils';
import { suggestAssetMaintenance } from '../services/geminiService';
import { Monitor, Plus, Search, Download, X, Laptop, Server, Printer, Trash2, Upload, FileText, Wrench, Calendar, DollarSign, User as UserIcon, RefreshCw, MapPin, Building, History, AlertTriangle, Edit2 } from 'lucide-react';
import { api } from '../services/api';

interface AssetManagerProps {
  assets: Asset[];
  tickets: Ticket[];
  user: User;
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  setTickets: React.Dispatch<React.SetStateAction<Ticket[]>>;
  onNotify: (userId: string, subject: string, message: string) => void;
}

export const AssetManager: React.FC<AssetManagerProps> = ({ assets, tickets, user, setAssets, setTickets, onNotify }) => {
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [aiSuggestion, setAiSuggestion] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Maintenance Form State
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState({
    description: '',
    date: new Date().toISOString().split('T')[0],
    cost: '',
    performedBy: user.name
  });

  // Ticket Form State (Report Issue)
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    title: '',
    description: '',
    priority: TicketPriority.MEDIUM
  });

  // Edit Asset State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Asset>>({});

  const [newAsset, setNewAsset] = useState<Partial<Asset>>({
    name: '',
    status: AssetStatus.AVAILABLE,
    type: 'Laptop'
  });

  const canEdit = user.role === UserRole.ADMIN || user.role === UserRole.STAFF;
  const canDelete = user.role === UserRole.ADMIN;

  const filteredAssets = assets.filter(a => !a.deleted).filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          a.serialNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'All' || a.type === filterType;
    return matchesSearch && matchesType;
  });

  const getIconForType = (type: string) => {
    switch (type.toLowerCase()) {
      case 'server': return <Server size={18} />;
      case 'printer': return <Printer size={18} />;
      case 'monitor': return <Monitor size={18} />;
      default: return <Laptop size={18} />;
    }
  };

  const calculateAge = (timestamp: number) => {
    const start = new Date(timestamp);
    const end = new Date();
    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    
    if (months < 0) { years--; months += 12; }
    if (years < 0) return 'New';

    const parts = [];
    if (years > 0) parts.push(`${years} year${years !== 1 ? 's' : ''}`);
    if (months > 0) parts.push(`${months} month${months !== 1 ? 's' : ''}`);
    
    return parts.length > 0 ? parts.join(', ') : 'New';
  };

  const handleAddAsset = async () => {
    if (!newAsset.name || !newAsset.serialNumber) return;
    const asset: Asset = {
      id: generateId(),
      name: newAsset.name!,
      serialNumber: newAsset.serialNumber!,
      model: newAsset.model || 'Generic',
      type: newAsset.type || 'Laptop',
      status: AssetStatus.AVAILABLE,
      department: newAsset.department || 'IT',
      location: newAsset.location || 'Storage',
      purchaseDate: Date.now(),
      maintenanceLog: [],
      assignmentLog: [],
      deleted: false
    };
    
    await api.assets.create(asset);
    setAssets([...assets, asset]);
    setView('list');
    setNewAsset({ type: 'Laptop', status: AssetStatus.AVAILABLE });
  };

  const handleUpdateAsset = async (id: string, updates: Partial<Asset>) => {
    await api.assets.update({ id, ...updates });
    const updated = assets.map(a => a.id === id ? { ...a, ...updates } : a);
    setAssets(updated);
    if (selectedAsset?.id === id) setSelectedAsset({ ...selectedAsset, ...updates });
  };

  // Helper to log changes to the assignment history
  const trackHistory = async (field: string, newValue: string) => {
    if (!selectedAsset) return;
    const previousValue = (selectedAsset as any)[field] || 'Unassigned';
    
    if (previousValue === newValue) return; // No change

    const historyRecord: AssetAssignmentRecord = {
      id: generateId(),
      date: Date.now(),
      action: 'Update',
      details: `Changed ${field === 'assignedUserName' ? 'Assignment' : field} from "${previousValue}" to "${newValue}"`,
      performedBy: user.name
    };

    const newLog = [historyRecord, ...(selectedAsset.assignmentLog || [])];
    await handleUpdateAsset(selectedAsset.id, { [field]: newValue, assignmentLog: newLog });
  };

  const handleDeleteAsset = async (id: string) => {
    if (!canDelete) return;
    if (window.confirm("Are you sure you want to move this asset to the recycle bin?")) {
      await handleUpdateAsset(id, { deleted: true });
      if (selectedAsset?.id === id) {
        setView('list');
        setSelectedAsset(null);
      }
    }
  };

  const openEditModal = () => {
    if (!selectedAsset) return;
    setEditForm({ ...selectedAsset });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedAsset || !editForm.name) return;
    // Convert date string back to timestamp if needed, currently editForm uses timestamp
    await handleUpdateAsset(selectedAsset.id, editForm);
    setIsEditModalOpen(false);
  };

  const handleAddMaintenance = async () => {
    if (!selectedAsset || !maintenanceForm.description) return;
    
    const newRecord: MaintenanceRecord = {
        id: generateId(),
        date: new Date(maintenanceForm.date).getTime(),
        description: maintenanceForm.description,
        cost: maintenanceForm.cost ? parseFloat(maintenanceForm.cost) : 0,
        performedBy: maintenanceForm.performedBy
    };

    const updatedLog = [newRecord, ...selectedAsset.maintenanceLog];
    await handleUpdateAsset(selectedAsset.id, { maintenanceLog: updatedLog });
    
    setIsMaintenanceModalOpen(false);
    setMaintenanceForm({
        description: '',
        date: new Date().toISOString().split('T')[0],
        cost: '',
        performedBy: user.name
    });
  };

  const handleCreateTicket = async () => {
    if (!selectedAsset || !ticketForm.title) return;

    const ticket: Ticket = {
      id: generateId(),
      title: ticketForm.title,
      description: ticketForm.description,
      status: TicketStatus.OPEN,
      priority: ticketForm.priority,
      requesterId: user.id,
      requesterName: user.name,
      department: user.department,
      assignedToName: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      attachments: [],
      relatedAssetId: selectedAsset.id,
      deleted: false
    };

    await api.tickets.create(ticket);
    setTickets([ticket, ...tickets]);
    onNotify(user.id, 'Ticket Created', `Created ticket #${ticket.id} for asset ${selectedAsset.name}`);
    
    setIsTicketModalOpen(false);
    setTicketForm({ title: '', description: '', priority: TicketPriority.MEDIUM });
  };

  const handleMaintenanceCheck = async (asset: Asset) => {
    setAiSuggestion('Asking Gemini...');
    const ageMonths = Math.floor((Date.now() - asset.purchaseDate) / (1000 * 60 * 60 * 24 * 30));
    const suggestion = await suggestAssetMaintenance(asset.model, ageMonths);
    setAiSuggestion(suggestion);
  };

  const handleExport = () => {
    const exportData = filteredAssets.map(a => ({
      Asset_Name: a.name,
      Type: a.type,
      Model: a.model,
      Serial_Number: a.serialNumber,
      Status: a.status,
      Location: a.location,
      Department: a.department,
      Assigned_User: a.assignedUserName || 'Unassigned',
      Purchase_Date: formatDate(a.purchaseDate)
    }));
    exportToExcel(exportData, 'IT_Assets_Inventory.xls', 'IT Assets Inventory');
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        Asset_Name: 'Example Laptop',
        Type: 'Laptop',
        Model: 'X1 Carbon',
        Serial_Number: 'SN-12345',
        Status: 'In Use',
        Location: 'Office A',
        Department: 'Sales',
        Assigned_User: 'John Doe'
      }
    ];
    exportToExcel(templateData, 'Asset_Import_Template.xls', 'Asset Import Template');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsedData = await processImportFile(file);
      if (parsedData.length === 0) {
        alert("No valid data found. Please ensure you are using the Template format.");
        return;
      }

      const newAssets: Asset[] = parsedData.map(row => ({
        id: generateId(),
        name: row['Asset_Name'] || 'Imported Asset',
        serialNumber: row['Serial_Number'] || 'Unknown',
        model: row['Model'] || 'Generic',
        type: row['Type'] || 'Laptop',
        status: (row['Status'] as AssetStatus) || AssetStatus.AVAILABLE,
        location: row['Location'] || 'Storage',
        department: row['Department'] || 'IT',
        purchaseDate: Date.now(),
        assignedUserName: row['Assigned_User'] !== 'Unassigned' ? row['Assigned_User'] : undefined,
        maintenanceLog: [],
        assignmentLog: [],
        deleted: false
      }));

      await api.assets.import(newAssets);
      setAssets(prev => [...newAssets, ...prev]);
      alert(`Successfully imported ${newAssets.length} assets.`);

      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
       console.error("Import failed", err);
       alert("Failed to parse file. Please use the 'Template' button to download a compatible format.");
    }
  };

  if (view === 'create') {
    return (
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200">
         <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Register New Asset</h2>
          <button onClick={() => setView('list')} className="text-slate-400 hover:text-slate-600"><X /></button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Asset Name</label>
              <input type="text" className="w-full p-2 border border-slate-300 rounded" placeholder="e.g. MacBook Pro M3" value={newAsset.name} onChange={e => setNewAsset({...newAsset, name: e.target.value})} />
           </div>
           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Serial Number</label>
              <input type="text" className="w-full p-2 border border-slate-300 rounded" placeholder="Serial #" value={newAsset.serialNumber || ''} onChange={e => setNewAsset({...newAsset, serialNumber: e.target.value})} />
           </div>
           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
              <input type="text" className="w-full p-2 border border-slate-300 rounded" placeholder="Model ID" value={newAsset.model || ''} onChange={e => setNewAsset({...newAsset, model: e.target.value})} />
           </div>
           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select className="w-full p-2 border border-slate-300 rounded" value={newAsset.type} onChange={e => setNewAsset({...newAsset, type: e.target.value})}>
                <option value="Laptop">Laptop</option>
                <option value="Desktop">Desktop</option>
                <option value="Monitor">Monitor</option>
                <option value="Printer">Printer</option>
                <option value="Server">Server</option>
                <option value="Network">Network Device</option>
                <option value="Mobile">Mobile</option>
                <option value="Tablet">Tablet</option>
              </select>
           </div>
           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
              <input type="text" className="w-full p-2 border border-slate-300 rounded" placeholder="Assigned Dept" value={newAsset.department || ''} onChange={e => setNewAsset({...newAsset, department: e.target.value})} />
           </div>
           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
              <input type="text" className="w-full p-2 border border-slate-300 rounded" placeholder="e.g. Office 101" value={newAsset.location || ''} onChange={e => setNewAsset({...newAsset, location: e.target.value})} />
           </div>
        </div>
        <div className="mt-8 flex justify-end gap-3">
          <button onClick={() => setView('list')} className="px-4 py-2 text-slate-600">Cancel</button>
          <button onClick={handleAddAsset} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save Asset</button>
        </div>
      </div>
    );
  }

  if (view === 'detail' && selectedAsset) {
    const assetTickets = tickets.filter(t => t.relatedAssetId === selectedAsset.id);
    
    return (
       <div className="space-y-6">
          <button onClick={() => setView('list')} className="text-sm text-blue-600 hover:underline">&larr; Back to Assets</button>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             {/* Left Column: Asset Info & Maintenance */}
             <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                   <div className="flex justify-between items-start">
                      <div>
                         <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                           {getIconForType(selectedAsset.type)} {selectedAsset.name}
                         </h1>
                         <p className="text-slate-500 mt-1">SN: {selectedAsset.serialNumber}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {canEdit && (
                          <button onClick={openEditModal} className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded text-sm transition-colors">
                            <Edit2 size={14} /> Edit
                          </button>
                        )}
                        <select 
                          className={`px-3 py-1.5 rounded text-sm font-medium outline-none border-none cursor-pointer ${
                            selectedAsset.status === AssetStatus.IN_USE ? 'bg-green-100 text-green-800' :
                            selectedAsset.status === AssetStatus.IN_REPAIR ? 'bg-amber-100 text-amber-800' :
                            'bg-slate-100 text-slate-800'
                          }`}
                          value={selectedAsset.status}
                          onChange={(e) => trackHistory('status', e.target.value)}
                        >
                           {Object.values(AssetStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        {canDelete && (
                          <button onClick={() => handleDeleteAsset(selectedAsset.id)} className="p-2 text-slate-400 hover:text-red-600">
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-6 mt-6">
                      <div>
                         <p className="text-sm text-slate-500 mb-1">Model</p>
                         <p className="font-medium">{selectedAsset.model}</p>
                      </div>
                      <div>
                         <p className="text-sm text-slate-500 mb-1 flex items-center gap-1"><UserIcon size={14} /> Assigned To</p>
                         {canEdit ? (
                           <input 
                             className="border-b border-slate-300 focus:border-blue-500 outline-none w-full bg-transparent" 
                             defaultValue={selectedAsset.assignedUserName || ''} 
                             onBlur={(e) => trackHistory('assignedUserName', e.target.value)}
                             placeholder="Unassigned"
                           />
                         ) : (
                           <p className="font-medium">{selectedAsset.assignedUserName || 'Unassigned'}</p>
                         )}
                      </div>
                      <div>
                         <p className="text-sm text-slate-500 mb-1 flex items-center gap-1"><MapPin size={14} /> Location</p>
                         {canEdit ? (
                           <input 
                             className="border-b border-slate-300 focus:border-blue-500 outline-none w-full bg-transparent" 
                             defaultValue={selectedAsset.location || ''} 
                             onBlur={(e) => trackHistory('location', e.target.value)}
                             placeholder="Unknown"
                           />
                         ) : (
                           <p className="font-medium">{selectedAsset.location}</p>
                         )}
                      </div>
                      <div>
                         <p className="text-sm text-slate-500 mb-1 flex items-center gap-1"><Building size={14} /> Department</p>
                         {canEdit ? (
                           <input 
                             className="border-b border-slate-300 focus:border-blue-500 outline-none w-full bg-transparent" 
                             defaultValue={selectedAsset.department || ''} 
                             onBlur={(e) => trackHistory('department', e.target.value)}
                             placeholder="General"
                           />
                         ) : (
                           <p className="font-medium">{selectedAsset.department}</p>
                         )}
                      </div>
                      <div>
                         <p className="text-sm text-slate-500 mb-1">Purchase Date</p>
                         <p className="font-medium">{formatDate(selectedAsset.purchaseDate)}</p>
                         <p className="text-xs text-slate-500 mt-0.5">({calculateAge(selectedAsset.purchaseDate)} old)</p>
                      </div>
                   </div>

                   <div className="mt-8 pt-6 border-t border-slate-100">
                     <div className="flex justify-between items-center mb-4">
                       <h3 className="font-semibold text-slate-800">AI Lifecycle Advice</h3>
                       <button onClick={() => handleMaintenanceCheck(selectedAsset)} className="text-xs text-blue-600 border border-blue-200 px-3 py-1 rounded hover:bg-blue-50">Check Lifecycle</button>
                     </div>
                     {aiSuggestion && (
                       <div className="bg-indigo-50 text-indigo-900 p-4 rounded-lg text-sm">
                         ✨ {aiSuggestion}
                       </div>
                     )}
                   </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                   <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-slate-800">Maintenance History</h3>
                      {canEdit && (
                        <button 
                          onClick={() => setIsMaintenanceModalOpen(true)}
                          className="text-xs flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg text-slate-700 transition-colors"
                        >
                          <Plus size={14} /> Log Maintenance
                        </button>
                      )}
                   </div>
                   
                   {selectedAsset.maintenanceLog.length === 0 ? (
                     <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-100 rounded-lg">
                       <Wrench size={24} className="mx-auto mb-2 opacity-50" />
                       <p className="text-sm">No maintenance records found.</p>
                     </div>
                   ) : (
                     <div className="space-y-4">
                       {selectedAsset.maintenanceLog.map(log => (
                         <div key={log.id} className="flex items-start justify-between p-4 bg-slate-50 rounded-lg border border-slate-100 hover:border-blue-200 transition-colors">
                            <div>
                               <div className="font-medium text-slate-800">{log.description}</div>
                               <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                  <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(log.date)}</span>
                                  <span className="flex items-center gap-1"><UserIcon size={12} /> {log.performedBy}</span>
                               </div>
                            </div>
                            {log.cost && (
                              <div className="text-sm font-semibold text-slate-700 flex items-center gap-0.5">
                                 <DollarSign size={14} className="text-slate-400" /> {log.cost.toLocaleString()}
                              </div>
                            )}
                         </div>
                       ))}
                     </div>
                   )}
                </div>
             </div>

             {/* Right Column: Related Tickets & Asset History */}
             <div className="space-y-6">
                {/* Related Tickets */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                   <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-slate-800">Related Tickets</h3>
                      <button onClick={() => setIsTicketModalOpen(true)} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                         <Plus size={12} /> Report Issue
                      </button>
                   </div>
                   {assetTickets.length === 0 ? (
                      <p className="text-slate-400 text-sm italic">No tickets linked to this asset.</p>
                   ) : (
                      <div className="space-y-3">
                        {assetTickets.map(t => (
                          <div key={t.id} className="p-3 bg-slate-50 rounded border border-slate-100">
                             <p className="font-medium text-sm truncate">{t.title}</p>
                             <div className="flex justify-between mt-2 text-xs">
                               <span className={`px-1.5 py-0.5 rounded ${t.status === 'Open' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200'}`}>{t.status}</span>
                               <span className="text-slate-500">{new Date(t.createdAt).toLocaleDateString()}</span>
                             </div>
                          </div>
                        ))}
                      </div>
                   )}
                </div>

                {/* Asset Tracking History */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                   <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <History size={18} /> Asset History & Tracking
                   </h3>
                   <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                      {(!selectedAsset.assignmentLog || selectedAsset.assignmentLog.length === 0) ? (
                         <div className="text-center py-6 text-slate-400 border-2 border-dashed border-slate-100 rounded-lg text-sm">
                            No tracking history available.
                         </div>
                      ) : (
                         selectedAsset.assignmentLog.map((log) => (
                            <div key={log.id} className="relative pl-4 border-l-2 border-slate-200 pb-4 last:pb-0">
                               <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                               <p className="text-xs text-slate-500 mb-1">{formatDate(log.date)}</p>
                               <p className="text-sm font-medium text-slate-800">{log.action}</p>
                               <p className="text-xs text-slate-600 mt-1">{log.details}</p>
                               <p className="text-[10px] text-slate-400 mt-1">By: {log.performedBy}</p>
                            </div>
                         ))
                      )}
                   </div>
                </div>
             </div>
          </div>

          {/* Edit Asset Modal */}
          {isEditModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
               <div className="bg-white p-6 rounded-xl w-full max-w-lg shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                     <h2 className="text-xl font-bold text-slate-900">Edit Asset Details</h2>
                     <button onClick={() => setIsEditModalOpen(false)}><X size={20} className="text-slate-400" /></button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Asset Name</label>
                        <input className="w-full p-2 border border-slate-300 rounded" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
                        <input className="w-full p-2 border border-slate-300 rounded" value={editForm.model || ''} onChange={e => setEditForm({...editForm, model: e.target.value})} />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Serial Number</label>
                        <input className="w-full p-2 border border-slate-300 rounded" value={editForm.serialNumber || ''} onChange={e => setEditForm({...editForm, serialNumber: e.target.value})} />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                        <input className="w-full p-2 border border-slate-300 rounded" value={editForm.location || ''} onChange={e => setEditForm({...editForm, location: e.target.value})} />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                        <input className="w-full p-2 border border-slate-300 rounded" value={editForm.department || ''} onChange={e => setEditForm({...editForm, department: e.target.value})} />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                        <select className="w-full p-2 border border-slate-300 rounded" value={editForm.type} onChange={e => setEditForm({...editForm, type: e.target.value})}>
                           <option value="Laptop">Laptop</option>
                           <option value="Desktop">Desktop</option>
                           <option value="Monitor">Monitor</option>
                           <option value="Printer">Printer</option>
                           <option value="Server">Server</option>
                           <option value="Network">Network Device</option>
                           <option value="Mobile">Mobile</option>
                           <option value="Tablet">Tablet</option>
                        </select>
                     </div>
                     <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Date</label>
                        <input 
                          type="date" 
                          className="w-full p-2 border border-slate-300 rounded" 
                          value={editForm.purchaseDate ? new Date(editForm.purchaseDate).toISOString().split('T')[0] : ''} 
                          onChange={e => setEditForm({...editForm, purchaseDate: new Date(e.target.value).getTime()})} 
                        />
                     </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-6">
                     <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
                     <button onClick={handleSaveEdit} className="px-6 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700">Save Changes</button>
                  </div>
               </div>
            </div>
          )}

          {/* Maintenance Modal */}
          {isMaintenanceModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
               <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
                  <div className="flex justify-between items-center mb-4">
                     <h2 className="text-xl font-bold text-slate-900">Log Maintenance</h2>
                     <button onClick={() => setIsMaintenanceModalOpen(false)}><X size={20} className="text-slate-400" /></button>
                  </div>
                  <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                        <input 
                          className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                          placeholder="e.g. Battery Replacement" 
                          value={maintenanceForm.description} 
                          onChange={e => setMaintenanceForm({...maintenanceForm, description: e.target.value})} 
                        />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                           <input 
                             type="date" 
                             className="w-full p-2 border border-slate-300 rounded" 
                             value={maintenanceForm.date} 
                             onChange={e => setMaintenanceForm({...maintenanceForm, date: e.target.value})} 
                           />
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-slate-700 mb-1">Cost</label>
                           <input 
                             type="number" 
                             className="w-full p-2 border border-slate-300 rounded" 
                             placeholder="0.00" 
                             value={maintenanceForm.cost} 
                             onChange={e => setMaintenanceForm({...maintenanceForm, cost: e.target.value})} 
                           />
                        </div>
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Technician / Performed By</label>
                        <input 
                          className="w-full p-2 border border-slate-300 rounded" 
                          value={maintenanceForm.performedBy} 
                          onChange={e => setMaintenanceForm({...maintenanceForm, performedBy: e.target.value})} 
                        />
                     </div>
                     <div className="flex justify-end gap-2 pt-4">
                        <button onClick={() => setIsMaintenanceModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
                        <button onClick={handleAddMaintenance} className="px-6 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700">Save Record</button>
                     </div>
                  </div>
               </div>
            </div>
          )}

          {/* New Ticket Modal */}
          {isTicketModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
               <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
                  <div className="flex justify-between items-center mb-4">
                     <h2 className="text-xl font-bold text-slate-900">Report Issue for {selectedAsset.name}</h2>
                     <button onClick={() => setIsTicketModalOpen(false)}><X size={20} className="text-slate-400" /></button>
                  </div>
                  <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                        <input 
                          className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                          placeholder="e.g. Screen flickering" 
                          value={ticketForm.title} 
                          onChange={e => setTicketForm({...ticketForm, title: e.target.value})} 
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                        <textarea 
                          className="w-full p-2 border border-slate-300 rounded h-24 focus:ring-2 focus:ring-blue-500 outline-none" 
                          placeholder="Describe the problem..." 
                          value={ticketForm.description} 
                          onChange={e => setTicketForm({...ticketForm, description: e.target.value})} 
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                        <select 
                           className="w-full p-2 border border-slate-300 rounded"
                           value={ticketForm.priority}
                           onChange={e => setTicketForm({...ticketForm, priority: e.target.value as TicketPriority})}
                        >
                           {Object.values(TicketPriority).map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                     </div>
                     <div className="flex justify-end gap-2 pt-4">
                        <button onClick={() => setIsTicketModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
                        <button onClick={handleCreateTicket} className="px-6 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700">Create Ticket</button>
                     </div>
                  </div>
               </div>
            </div>
          )}
       </div>
    );
  }

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Asset Management</h1>
        <div className="flex gap-2">
          {canEdit && (
            <>
              <button onClick={handleDownloadTemplate} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-sm font-medium transition-colors" title="Download Excel Template">
                <FileText size={16} /> Template
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-sm font-medium transition-colors">
                <Upload size={16} /> Import
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept=".csv, .xls" onChange={handleImport} />
              <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-sm font-medium transition-colors">
                <Download size={16} /> Export
              </button>
              <button onClick={() => setView('create')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm transition-colors">
                <Plus size={18} /> Register Asset
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name or serial..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-600">Asset Name</th>
                <th className="px-6 py-4 font-semibold text-slate-600">Type</th>
                <th className="px-6 py-4 font-semibold text-slate-600">Serial</th>
                <th className="px-6 py-4 font-semibold text-slate-600">Location</th>
                <th className="px-6 py-4 font-semibold text-slate-600">Department</th>
                <th className="px-6 py-4 font-semibold text-slate-600">Status</th>
                <th className="px-6 py-4 font-semibold text-slate-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAssets.map(asset => (
                <tr key={asset.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-2">
                    {getIconForType(asset.type)} {asset.name}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{asset.type}</td>
                  <td className="px-6 py-4 font-mono text-slate-500 text-xs">{asset.serialNumber}</td>
                  <td className="px-6 py-4 text-slate-600">{asset.location}</td>
                  <td className="px-6 py-4 text-slate-600">{asset.department}</td>
                  <td className="px-6 py-4">
                     <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        asset.status === AssetStatus.IN_USE ? 'bg-green-50 text-green-700 ring-1 ring-green-600/20' : 
                        asset.status === AssetStatus.IN_REPAIR ? 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-600/20' :
                        'bg-gray-50 text-gray-600 ring-1 ring-gray-500/10'
                     }`}>
                       {asset.status}
                     </span>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => { setSelectedAsset(asset); setView('detail'); }}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
