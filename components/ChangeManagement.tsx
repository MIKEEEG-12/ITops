
import React, { useState } from 'react';
import { ChangeRequest, User, UserRole } from '../types';
import { GitPullRequest, Plus, AlertTriangle, Calendar, X, MoreHorizontal, FileText, User as UserIcon } from 'lucide-react';
import { formatDate, generateId } from '../utils';
import { api } from '../services/api';

interface ChangeManagementProps {
  changes: ChangeRequest[];
  user: User;
  setChanges: React.Dispatch<React.SetStateAction<ChangeRequest[]>>;
}

export const ChangeManagement: React.FC<ChangeManagementProps> = ({ changes, user, setChanges }) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedChange, setSelectedChange] = useState<ChangeRequest | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const [newChange, setNewChange] = useState<Partial<ChangeRequest>>({
     title: '', description: '', impact: 'Low', priority: 'Low', reason: ''
  });

  const canEdit = user.role === UserRole.ADMIN || user.role === UserRole.STAFF;

  const handleCreate = async () => {
    if (!newChange.title || !newChange.description) return;
    const change: ChangeRequest = {
      id: generateId(),
      title: newChange.title!,
      description: newChange.description!,
      reason: newChange.reason || '',
      impact: newChange.impact as any,
      priority: newChange.priority as any,
      status: 'Pending Approval',
      requesterId: user.id,
      requesterName: user.name,
      scheduledDate: Date.now() + 86400000, 
      createdAt: Date.now(),
      deleted: false
    };
    await api.changes.create(change);
    setChanges([change, ...changes]);
    setIsCreateModalOpen(false);
  };

  const updateStatus = async (id: string, status: any) => {
    await api.changes.update({ id, status });
    setChanges(changes.map(c => c.id === id ? { ...c, status } : c));
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this change request?")) {
       await api.changes.update({ id, deleted: true });
       setChanges(changes.map(c => c.id === id ? { ...c, deleted: true } : c));
    }
  };

  const activeChanges = changes.filter(c => !c.deleted);

  // ... (Render Logic same as before, preserved)
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Change Management</h1>
           <p className="text-slate-500">Track and approve infrastructure changes.</p>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus size={18} /> Request Change
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {activeChanges.map(change => (
           <div key={change.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative group">
              <div className="absolute top-4 right-4 z-10">
                 <button 
                   onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === change.id ? null : change.id); }} 
                   className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                 >
                   <MoreHorizontal size={20} />
                 </button>
                 {menuOpenId === change.id && (
                    <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                       <button 
                         onClick={(e) => { e.stopPropagation(); setSelectedChange(change); setMenuOpenId(null); }}
                         className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                       >
                         View Details
                       </button>
                       {canEdit && (
                         <button 
                           onClick={(e) => { e.stopPropagation(); handleDelete(change.id); setMenuOpenId(null); }}
                           className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                         >
                           Delete
                         </button>
                       )}
                    </div>
                 )}
              </div>

              <div className="cursor-pointer" onClick={() => setSelectedChange(change)}>
                 <div className="flex justify-between items-start mb-4 pr-8">
                    <div className="flex items-start gap-3">
                       <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                          <GitPullRequest size={24} />
                       </div>
                       <div>
                          <h3 className="font-bold text-lg text-slate-800 group-hover:text-blue-600 transition-colors">{change.title}</h3>
                          <p className="text-sm text-slate-500">Req. by {change.requesterName}</p>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-4 mb-4">
                    <p className="text-slate-700 text-sm line-clamp-2">{change.description}</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                       <div className="flex items-center gap-2 text-slate-600">
                          <AlertTriangle size={16} className={change.impact === 'High' ? 'text-red-500' : 'text-orange-500'} /> 
                          Impact: {change.impact}
                       </div>
                       <div className="flex items-center gap-2 text-slate-600">
                          <Calendar size={16} className="text-blue-500" /> {formatDate(change.scheduledDate)}
                       </div>
                    </div>
                 </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                 <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    change.status === 'Approved' ? 'bg-green-100 text-green-700' :
                    change.status === 'Pending Approval' ? 'bg-amber-100 text-amber-700' :
                    change.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-600'
                 }`}>
                    {change.status}
                 </span>
                 
                 {change.status === 'Pending Approval' && canEdit && (
                    <div className="flex gap-2">
                       <button onClick={(e) => { e.stopPropagation(); updateStatus(change.id, 'Rejected'); }} className="px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded">Reject</button>
                       <button onClick={(e) => { e.stopPropagation(); updateStatus(change.id, 'Approved'); }} className="px-3 py-1 text-xs font-medium bg-green-600 text-white hover:bg-green-700 rounded">Approve</button>
                    </div>
                 )}
              </div>
           </div>
         ))}
      </div>

      {/* Detail Modal */}
      {selectedChange && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-100 flex justify-between items-start sticky top-0 bg-white z-10">
                 <div>
                    <h2 className="text-2xl font-bold text-slate-900">{selectedChange.title}</h2>
                    <p className="text-slate-500 text-sm mt-1">ID: #{selectedChange.id}</p>
                 </div>
                 <button onClick={() => setSelectedChange(null)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
              </div>
              
              <div className="p-6 space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-lg">
                       <p className="text-xs text-slate-500 uppercase font-bold mb-1">Status</p>
                       <p className="font-semibold text-slate-800">{selectedChange.status}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                       <p className="text-xs text-slate-500 uppercase font-bold mb-1">Scheduled Date</p>
                       <p className="font-semibold text-slate-800">{formatDate(selectedChange.scheduledDate)}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                       <p className="text-xs text-slate-500 uppercase font-bold mb-1">Impact Level</p>
                       <p className={`font-semibold ${selectedChange.impact === 'High' ? 'text-red-600' : 'text-slate-800'}`}>{selectedChange.impact}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                       <p className="text-xs text-slate-500 uppercase font-bold mb-1">Requester</p>
                       <div className="flex items-center gap-2">
                          <UserIcon size={16} className="text-slate-400" />
                          <span className="font-semibold text-slate-800">{selectedChange.requesterName}</span>
                       </div>
                    </div>
                 </div>

                 <div>
                    <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><FileText size={18} /> Description</h3>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-slate-700 leading-relaxed">
                       {selectedChange.description}
                    </div>
                 </div>

                 {selectedChange.reason && (
                    <div>
                       <h3 className="font-bold text-slate-800 mb-2">Reason for Change</h3>
                       <p className="text-slate-600">{selectedChange.reason}</p>
                    </div>
                 )}
              </div>
              
              <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                 {selectedChange.status === 'Pending Approval' && canEdit && (
                    <>
                       <button onClick={() => { updateStatus(selectedChange.id, 'Rejected'); setSelectedChange(null); }} className="px-4 py-2 border border-red-200 text-red-600 font-medium rounded-lg hover:bg-red-50">Reject</button>
                       <button onClick={() => { updateStatus(selectedChange.id, 'Approved'); setSelectedChange(null); }} className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700">Approve Request</button>
                    </>
                 )}
                 <button onClick={() => setSelectedChange(null)} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50">Close</button>
              </div>
           </div>
        </div>
      )}

      {isCreateModalOpen && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl w-full max-w-lg">
               <div className="flex justify-between mb-4">
                  <h2 className="text-xl font-bold">New Change Request</h2>
                  <button onClick={() => setIsCreateModalOpen(false)}><X /></button>
               </div>
               <div className="space-y-4">
                  <input className="w-full p-2 border rounded" placeholder="Title" value={newChange.title} onChange={e => setNewChange({...newChange, title: e.target.value})} />
                  <textarea className="w-full p-2 border rounded h-24" placeholder="Description" value={newChange.description} onChange={e => setNewChange({...newChange, description: e.target.value})} />
                  <textarea className="w-full p-2 border rounded" placeholder="Reason for Change" value={newChange.reason} onChange={e => setNewChange({...newChange, reason: e.target.value})} />
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-xs text-slate-500">Impact</label>
                        <select className="w-full p-2 border rounded" value={newChange.impact} onChange={e => setNewChange({...newChange, impact: e.target.value as any})}>
                           <option>Low</option><option>Medium</option><option>High</option>
                        </select>
                     </div>
                     <div>
                        <label className="text-xs text-slate-500">Priority</label>
                        <select className="w-full p-2 border rounded" value={newChange.priority} onChange={e => setNewChange({...newChange, priority: e.target.value as any})}>
                           <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
                        </select>
                     </div>
                  </div>
                  <button onClick={handleCreate} className="w-full py-2 bg-blue-600 text-white rounded font-medium mt-2">Submit Request</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};
