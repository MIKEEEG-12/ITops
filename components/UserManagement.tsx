
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { generateId } from '../utils';
import { Plus, Trash2, Edit2, X, Search, Key } from 'lucide-react';
import { api } from '../services/api';

interface UserManagementProps {
  currentUser: User;
  allUsers: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

export const UserManagement: React.FC<UserManagementProps> = ({ currentUser, allUsers, setUsers }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    email: '',
    department: '',
    role: UserRole.USER,
    password: ''
  });

  if (currentUser.role !== UserRole.ADMIN) {
    return <div className="text-center p-10 text-red-500">Access Denied. Admin only.</div>;
  }

  const handleSaveUser = async () => {
    if (!formData.name || !formData.email) return;

    if (editingUser) {
      await api.users.update({ id: editingUser.id, ...formData });
      setUsers(allUsers.map(u => u.id === editingUser.id ? { ...u, ...formData } as User : u));
    } else {
      if (!formData.password) {
        alert("Password is required for new users.");
        return;
      }
      const newUser: User = {
        id: generateId(),
        name: formData.name!,
        email: formData.email!,
        department: formData.department || 'General',
        role: formData.role || UserRole.USER,
        password: formData.password
      };
      await api.users.create(newUser);
      setUsers([...allUsers, newUser]);
    }
    closeModal();
  };

  const handleDeleteUser = async (id: string) => {
    if (id === currentUser.id) {
      alert("You cannot delete your own account.");
      return;
    }
    if (window.confirm("Are you sure you want to delete this user?")) {
      await api.users.delete(id);
      setUsers(allUsers.filter(u => u.id !== id));
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    // Don't pre-fill password for edit for security, only if they want to change it
    setFormData({ ...user, password: '' });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData({ name: '', email: '', department: '', role: UserRole.USER, password: '' });
  };

  const filteredUsers = allUsers.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 border-2 border-dashed border-blue-300 p-6 rounded-xl bg-slate-50/50">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus size={18} /> Add User
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
         <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search users..." 
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-slate-600">Name</th>
              <th className="px-6 py-4 font-semibold text-slate-600">Email</th>
              <th className="px-6 py-4 font-semibold text-slate-600">Role</th>
              <th className="px-6 py-4 font-semibold text-slate-600">Department</th>
              <th className="px-6 py-4 font-semibold text-slate-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.map(user => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-900">{user.name}</td>
                <td className="px-6 py-4 text-slate-600">{user.email}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' :
                    user.role === UserRole.STAFF ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-600">{user.department}</td>
                <td className="px-6 py-4 text-right space-x-2">
                   <button onClick={() => openEditModal(user)} className="text-blue-600 hover:text-blue-800"><Edit2 size={16} /></button>
                   <button onClick={() => handleDeleteUser(user.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-4">
               <h2 className="text-xl font-bold">{editingUser ? 'Edit User' : 'Add New User'}</h2>
               <button onClick={closeModal}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input type="email" className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    className="w-full pl-10 pr-2 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                    placeholder={editingUser ? "(Unchanged)" : "Set Password"}
                    value={formData.password} 
                    onChange={e => setFormData({...formData, password: e.target.value})} 
                  />
                </div>
                {editingUser && <p className="text-xs text-slate-400 mt-1">Leave blank to keep existing password.</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                  <input type="text" className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <select className="w-full p-2 border border-slate-300 rounded bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})}>
                     {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={handleSaveUser} className="w-full py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 mt-4 shadow-sm">
                {editingUser ? 'Update User' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
