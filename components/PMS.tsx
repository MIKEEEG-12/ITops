
import React, { useState } from 'react';
import { PMSTask, PMSStatus, Asset, User, UserRole } from '../types';
import { generateId, formatDate, exportToExcel } from '../utils';
import { Calendar, ChevronLeft, ChevronRight, Plus, Download, CheckCircle, Clock, AlertTriangle, X, List, CalendarDays } from 'lucide-react';
import { api } from '../services/api';

interface PMSCalendarProps {
  pmsTasks: PMSTask[];
  setPmsTasks: React.Dispatch<React.SetStateAction<PMSTask[]>>;
  assets: Asset[];
  users: User[];
  currentUser: User;
}

export const PMSCalendar: React.FC<PMSCalendarProps> = ({ pmsTasks, setPmsTasks, assets, users, currentUser }) => {
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<PMSTask | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Create Form State
  const [newTask, setNewTask] = useState<Partial<PMSTask>>({
    title: '',
    description: '',
    status: PMSStatus.SCHEDULED,
    scheduledDate: Date.now()
  });

  const activeTasks = pmsTasks.filter(t => !t.deleted);
  const canEdit = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.STAFF;

  // Calendar Helpers
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const handleSaveTask = async () => {
    if (!newTask.title || !newTask.assetId || !newTask.assignedToId) return;

    if (selectedTask && selectedTask.id) {
        await api.pms.update({ id: selectedTask.id, ...newTask });
        setPmsTasks(pmsTasks.map(t => t.id === selectedTask.id ? { ...t, ...newTask } as PMSTask : t));
    } else {
        const asset = assets.find(a => a.id === newTask.assetId);
        const assignee = users.find(u => u.id === newTask.assignedToId);
        
        const task: PMSTask = {
            id: generateId(),
            title: newTask.title!,
            description: newTask.description || '',
            assetId: newTask.assetId!,
            assetName: asset?.name || 'Unknown Asset',
            assignedToId: newTask.assignedToId!,
            assignedToName: assignee?.name || 'Unknown User',
            scheduledDate: newTask.scheduledDate || Date.now(),
            status: PMSStatus.SCHEDULED,
            deleted: false
        };
        await api.pms.create(task);
        setPmsTasks([...pmsTasks, task]);
    }
    closeModal();
  };

  const handleUpdateStatus = async (task: PMSTask, status: PMSStatus) => {
    const updated = { 
        ...task, 
        status, 
        completedDate: status === PMSStatus.COMPLETED ? Date.now() : undefined 
    };
    await api.pms.update({ id: task.id, status, completedDate: updated.completedDate });
    setPmsTasks(pmsTasks.map(t => t.id === task.id ? updated : t));
    if (selectedTask && selectedTask.id === task.id) {
        setSelectedTask(updated);
    }
  };

  const handleDelete = async (id: string) => {
    if (currentUser.role !== UserRole.ADMIN) return;
    if (window.confirm("Are you sure you want to delete this maintenance task?")) {
        await api.pms.update({ id, deleted: true });
        setPmsTasks(pmsTasks.map(t => t.id === id ? { ...t, deleted: true } : t));
        closeModal();
    }
  };

  const openModal = (task?: PMSTask) => {
    if (task) {
        setSelectedTask(task);
        setNewTask(task);
    } else {
        setSelectedTask(null);
        setNewTask({
            title: '',
            description: '',
            status: PMSStatus.SCHEDULED,
            scheduledDate: Date.now()
        });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  const handleExport = () => {
    const data = activeTasks.map(t => ({
        Task_Title: t.title,
        Asset: t.assetName,
        Assignee: t.assignedToName,
        Scheduled_Date: formatDate(t.scheduledDate),
        Status: t.status,
        Description: t.description,
        Completed_Date: t.completedDate ? formatDate(t.completedDate) : 'N/A'
    }));
    exportToExcel(data, 'PMS_Report.xls', 'Preventive Maintenance Schedule');
  };

  // ... (Render Logic same as before)
  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];

    // Empty cells for days before the 1st
    for (let i = 0; i < firstDay; i++) {
        days.push(<div key={`empty-${i}`} className="h-32 bg-slate-50 border border-slate-100"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dateTimestamp = new Date(year, month, day).setHours(0,0,0,0);
        const dayTasks = activeTasks.filter(t => {
            const tDate = new Date(t.scheduledDate).setHours(0,0,0,0);
            return tDate === dateTimestamp;
        });

        days.push(
            <div key={day} className="h-32 border border-slate-200 p-2 overflow-y-auto hover:bg-slate-50 transition-colors">
                <div className="font-semibold text-slate-500 text-sm mb-1">{day}</div>
                <div className="space-y-1">
                    {dayTasks.map(task => (
                        <div 
                            key={task.id}
                            onClick={() => openModal(task)}
                            className={`text-xs p-1.5 rounded cursor-pointer truncate shadow-sm border-l-2 ${
                                task.status === PMSStatus.COMPLETED ? 'bg-green-100 text-green-800 border-green-500' :
                                task.status === PMSStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-800 border-blue-500' :
                                task.status === PMSStatus.MISSED ? 'bg-red-100 text-red-800 border-red-500' :
                                'bg-white border-slate-300 text-slate-700'
                            }`}
                        >
                            {task.title}
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return days;
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Preventive Maintenance Schedule</h1>
                <p className="text-slate-500">Plan and track asset maintenance.</p>
            </div>
            <div className="flex gap-2">
                <div className="bg-white border border-slate-200 rounded-lg flex p-1">
                    <button onClick={() => setViewMode('calendar')} className={`p-2 rounded ${viewMode === 'calendar' ? 'bg-slate-100 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}><CalendarDays size={20} /></button>
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-slate-100 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}><List size={20} /></button>
                </div>
                <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 font-medium">
                    <Download size={18} /> Export Report
                </button>
                {canEdit && (
                    <button onClick={() => openModal()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                        <Plus size={18} /> Schedule Task
                    </button>
                )}
            </div>
        </div>

        {viewMode === 'calendar' ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-slate-200">
                    <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 rounded-full"><ChevronLeft /></button>
                    <h2 className="text-xl font-bold text-slate-800">{currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
                    <button onClick={handleNextMonth} className="p-2 hover:bg-slate-100 rounded-full"><ChevronRight /></button>
                </div>
                <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="p-3 text-center text-sm font-semibold text-slate-500 uppercase">{day}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 bg-slate-200 gap-px border-b border-slate-200">
                    {renderCalendar()}
                </div>
            </div>
        ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-slate-600">Task</th>
                            <th className="px-6 py-4 font-semibold text-slate-600">Asset</th>
                            <th className="px-6 py-4 font-semibold text-slate-600">Assignee</th>
                            <th className="px-6 py-4 font-semibold text-slate-600">Date</th>
                            <th className="px-6 py-4 font-semibold text-slate-600">Status</th>
                            <th className="px-6 py-4 font-semibold text-slate-600">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {activeTasks.sort((a,b) => b.scheduledDate - a.scheduledDate).map(task => (
                            <tr key={task.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-medium text-slate-900">{task.title}</td>
                                <td className="px-6 py-4 text-slate-600">{task.assetName}</td>
                                <td className="px-6 py-4 text-slate-600">{task.assignedToName}</td>
                                <td className="px-6 py-4 text-slate-600">{formatDate(task.scheduledDate)}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                        task.status === PMSStatus.COMPLETED ? 'bg-green-100 text-green-700' :
                                        task.status === PMSStatus.MISSED ? 'bg-red-100 text-red-700' :
                                        'bg-blue-100 text-blue-700'
                                    }`}>
                                        {task.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <button onClick={() => openModal(task)} className="text-blue-600 hover:underline">Manage</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        {/* Create/Edit Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-xl w-full max-w-lg shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-900">{selectedTask ? 'Manage Task' : 'Schedule Maintenance'}</h2>
                        <button onClick={closeModal}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Task Title</label>
                            <input 
                                className="w-full p-2 border rounded bg-white" 
                                value={newTask.title} 
                                onChange={e => setNewTask({...newTask, title: e.target.value})}
                                disabled={!!selectedTask && currentUser.role !== UserRole.ADMIN && newTask.assignedToId !== currentUser.id}
                            />
                        </div>

                        {(!selectedTask || currentUser.role === UserRole.ADMIN) && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Asset</label>
                                    <select className="w-full p-2 border rounded" value={newTask.assetId} onChange={e => setNewTask({...newTask, assetId: e.target.value})}>
                                        <option value="">Select Asset</option>
                                        {assets.filter(a => !a.deleted).map(a => (
                                            <option key={a.id} value={a.id}>{a.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Assignee</label>
                                    <select className="w-full p-2 border rounded" value={newTask.assignedToId} onChange={e => setNewTask({...newTask, assignedToId: e.target.value})}>
                                        <option value="">Select User</option>
                                        {users.filter(u => u.role !== UserRole.USER).map(u => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Scheduled Date</label>
                            <input 
                                type="date"
                                className="w-full p-2 border rounded"
                                value={new Date(newTask.scheduledDate || Date.now()).toISOString().split('T')[0]}
                                onChange={e => setNewTask({...newTask, scheduledDate: new Date(e.target.value).getTime()})}
                                disabled={!!selectedTask && currentUser.role !== UserRole.ADMIN}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                            <textarea 
                                className="w-full p-2 border rounded h-24" 
                                value={newTask.description} 
                                onChange={e => setNewTask({...newTask, description: e.target.value})}
                                disabled={!!selectedTask && currentUser.role !== UserRole.ADMIN}
                            />
                        </div>

                        {/* Status Update Area - Available to Assignee */}
                        {selectedTask && (
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Update Status</label>
                                <div className="flex gap-2 flex-wrap">
                                    {[PMSStatus.SCHEDULED, PMSStatus.IN_PROGRESS, PMSStatus.COMPLETED].map(status => (
                                        <button 
                                            key={status}
                                            onClick={() => handleUpdateStatus(selectedTask, status)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                                                selectedTask.status === status 
                                                ? 'bg-blue-600 text-white border-blue-600' 
                                                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                                            }`}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-3">
                                    <label className="block text-xs text-slate-500 mb-1">Completion Notes</label>
                                    <input className="w-full p-2 border rounded text-sm" placeholder="Add notes..." value={newTask.notes || ''} onChange={e => setNewTask({...newTask, notes: e.target.value})} />
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-4">
                            {selectedTask && currentUser.role === UserRole.ADMIN ? (
                                <button onClick={() => handleDelete(selectedTask.id)} className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1"><X size={16} /> Delete Task</button>
                            ) : <div></div>}
                            <div className="flex gap-2">
                                <button onClick={closeModal} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
                                <button onClick={handleSaveTask} className="px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700">{selectedTask ? 'Save Changes' : 'Schedule Task'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
