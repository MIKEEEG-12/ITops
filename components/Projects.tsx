
import React, { useState } from 'react';
import { Project, User, UserRole, Task, TaskStatus } from '../types';
import { generateId } from '../utils';
import { Plus, X, Calendar, MoreHorizontal, Clock, CheckCircle, Trash2, Settings, Edit2 } from 'lucide-react';
import { api } from '../services/api';

interface ProjectBoardProps {
  projects: Project[];
  user: User;
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
}

export const ProjectBoard: React.FC<ProjectBoardProps> = ({ projects, user, setProjects }) => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
  
  // Forms
  const [newProject, setNewProject] = useState<Partial<Project>>({ name: '', description: '', duration: '' });
  const [newTask, setNewTask] = useState<Partial<Task>>({ title: '', description: '', status: 'Todo' });

  const canManage = user.role === UserRole.ADMIN || user.role === UserRole.STAFF;

  if (!canManage) {
    return <div className="text-center p-10 text-slate-500">Access Denied. Only IT Staff can view projects.</div>;
  }

  const handleCreateProject = async () => {
    if (!newProject.name) return;
    const project: Project = {
      id: generateId(),
      name: newProject.name!,
      description: newProject.description || '',
      duration: newProject.duration || 'TBD',
      status: 'Active',
      tasks: [],
      createdBy: user.id,
      createdAt: Date.now(),
      deleted: false
    };
    await api.projects.create(project);
    setProjects([project, ...projects]);
    setIsCreateModalOpen(false);
    setNewProject({ name: '', description: '', duration: '' });
  };

  const handleDeleteProject = async (projectId: string) => {
      if (window.confirm("Are you sure you want to delete this project?")) {
        await api.projects.delete(projectId);
        setProjects(projects.filter(p => p.id !== projectId));
        if (selectedProject?.id === projectId) setSelectedProject(null);
      }
  };

  const handleAddTask = async () => {
    if (!selectedProject || !newTask.title) return;
    const task: Task = {
      id: generateId(),
      title: newTask.title!,
      description: newTask.description || '',
      status: newTask.status as TaskStatus,
    };
    
    const updatedProject = {
      ...selectedProject,
      tasks: [...selectedProject.tasks, task]
    };

    await updateProject(updatedProject);
    setIsTaskModalOpen(false);
    setNewTask({ title: '', description: '', status: 'Todo' });
  };

  const updateProject = async (updated: Project) => {
    await api.projects.update(updated);
    setProjects(projects.map(p => p.id === updated.id ? updated : p));
    setSelectedProject(updated);
  };

  const onDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
  };

  const onDrop = async (e: React.DragEvent, status: TaskStatus) => {
    const taskId = e.dataTransfer.getData("taskId");
    if (!selectedProject) return;

    const updatedTasks = selectedProject.tasks.map(t => 
      t.id === taskId ? { ...t, status } : t
    );
    
    await updateProject({ ...selectedProject, tasks: updatedTasks });
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // ... (Render logic same as before, preserved in output)
  const ProjectList = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div onClick={() => setIsCreateModalOpen(true)} className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
        <Plus size={32} className="text-slate-400 mb-2" />
        <span className="font-medium text-slate-500">New Project</span>
      </div>
      {projects.filter(p => !p.deleted).map(project => (
        <div key={project.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative">
          <div className="flex justify-between items-start mb-4">
             <div onClick={() => setSelectedProject(project)} className="cursor-pointer">
                <h3 className="text-lg font-bold text-slate-800">{project.name}</h3>
                <p className="text-sm text-slate-500 line-clamp-2 mt-1">{project.description}</p>
             </div>
             <button onClick={() => handleDeleteProject(project.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
             <div className="flex items-center gap-1"><Calendar size={14} /> {project.duration}</div>
             <div className="flex items-center gap-1"><CheckCircle size={14} /> {project.tasks.filter(t => t.status === 'Done').length}/{project.tasks.length}</div>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
             <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${project.tasks.length > 0 ? (project.tasks.filter(t => t.status === 'Done' || t.status === 'Close').length / project.tasks.length) * 100 : 0}%` }} />
          </div>
          <button onClick={() => setSelectedProject(project)} className="mt-4 w-full py-2 bg-slate-50 text-slate-600 font-medium rounded-lg hover:bg-slate-100 text-sm">Open Board</button>
        </div>
      ))}
    </div>
  );

  const KanbanBoard = () => {
    if (!selectedProject) return null;
    const columns: TaskStatus[] = ['Todo', 'Processing', 'Done', 'Close'];
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedProject(null)} className="text-sm text-slate-500 hover:text-slate-800">&larr; Back</button>
            <h2 className="text-2xl font-bold text-slate-900">{selectedProject.name}</h2>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">{selectedProject.status}</span>
            <div className="relative">
               <button onClick={() => setIsProjectSettingsOpen(!isProjectSettingsOpen)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"><MoreHorizontal /></button>
               {isProjectSettingsOpen && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                     <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Edit2 size={14} /> Edit Details</button>
                     <button onClick={() => handleDeleteProject(selectedProject.id)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={14} /> Delete Project</button>
                  </div>
               )}
            </div>
          </div>
          <button onClick={() => setIsTaskModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"><Plus size={16} /> Add Task</button>
        </div>
        <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
          {columns.map(status => (
            <div key={status} onDrop={(e) => onDrop(e, status)} onDragOver={onDragOver} className="min-w-[280px] w-full max-w-sm flex flex-col bg-slate-100 rounded-xl p-4">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="font-semibold text-slate-700">{status}</h3>
                 <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full">{selectedProject.tasks.filter(t => t.status === status).length}</span>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto min-h-[200px]">
                {selectedProject.tasks.filter(t => t.status === status).map(task => (
                  <div key={task.id} draggable onDragStart={(e) => onDragStart(e, task.id)} className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 cursor-move hover:shadow-md transition-shadow group">
                    <div className="flex justify-between items-start">
                      <p className="font-medium text-slate-800 text-sm">{task.title}</p>
                      <button onClick={async () => {
                            const newTasks = selectedProject.tasks.filter(t => t.id !== task.id);
                            await updateProject({ ...selectedProject, tasks: newTasks });
                         }} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14} /></button>
                    </div>
                    {task.description && <p className="text-xs text-slate-500 mt-1">{task.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      {selectedProject ? <KanbanBoard /> : (
        <div className="space-y-6">
           <div className="flex justify-between items-center"><h1 className="text-2xl font-bold text-slate-900">Projects</h1></div>
           <ProjectList />
        </div>
      )}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create Project</h2>
            <div className="space-y-4">
              <input className="w-full p-2 border rounded" placeholder="Project Name" value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} />
              <textarea className="w-full p-2 border rounded" placeholder="Description" value={newProject.description} onChange={e => setNewProject({...newProject, description: e.target.value})} />
              <input className="w-full p-2 border rounded" placeholder="Duration (e.g., 2 weeks)" value={newProject.duration} onChange={e => setNewProject({...newProject, duration: e.target.value})} />
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-slate-600">Cancel</button>
                <button onClick={handleCreateProject} className="px-4 py-2 bg-blue-600 text-white rounded">Create</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Task</h2>
            <div className="space-y-4">
              <input className="w-full p-2 border rounded" placeholder="Task Title" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
              <textarea className="w-full p-2 border rounded" placeholder="Description" value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} />
              <select className="w-full p-2 border rounded" value={newTask.status} onChange={e => setNewTask({...newTask, status: e.target.value as TaskStatus})}>
                <option value="Todo">Todo</option>
                <option value="Processing">Processing</option>
                <option value="Done">Done</option>
                <option value="Close">Close</option>
              </select>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setIsTaskModalOpen(false)} className="px-4 py-2 text-slate-600">Cancel</button>
                <button onClick={handleAddTask} className="px-4 py-2 bg-blue-600 text-white rounded">Add Task</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
