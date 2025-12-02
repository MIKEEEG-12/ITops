
import React, { useState } from 'react';
import { Vendor, User, UserRole } from '../types';
import { generateId } from '../utils';
import { Plus, Search, Trash2, Edit2, Truck, Star } from 'lucide-react';
import { api } from '../services/api';

interface VendorManagerProps {
  vendors: Vendor[];
  user: User;
  setVendors: React.Dispatch<React.SetStateAction<Vendor[]>>;
}

export const VendorManager: React.FC<VendorManagerProps> = ({ vendors, user, setVendors }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState<Partial<Vendor>>({ name: '', contactPerson: '', email: '', rating: 3 });

  const activeVendors = vendors.filter(v => !v.deleted);

  const handleSave = async () => {
    if (!formData.name) return;
    if (editingVendor) {
       await api.vendors.update({ id: editingVendor.id, ...formData });
       setVendors(vendors.map(v => v.id === editingVendor.id ? { ...v, ...formData } as Vendor : v));
    } else {
       const newVendor: Vendor = {
          id: generateId(),
          name: formData.name!,
          contactPerson: formData.contactPerson || '',
          email: formData.email || '',
          phone: formData.phone || '',
          serviceType: formData.serviceType || 'General',
          rating: (formData.rating as any) || 3,
          deleted: false
       };
       await api.vendors.create(newVendor);
       setVendors([...vendors, newVendor]);
    }
    closeModal();
  };

  const handleDelete = async (id: string) => {
     if (user.role !== UserRole.ADMIN) return;
     if (window.confirm("Delete this vendor?")) {
        await api.vendors.update({ id, deleted: true });
        setVendors(vendors.map(v => v.id === id ? { ...v, deleted: true } : v));
     }
  };

  const openModal = (vendor?: Vendor) => {
     if (vendor) {
        setEditingVendor(vendor);
        setFormData(vendor);
     } else {
        setEditingVendor(null);
        setFormData({ name: '', rating: 3 });
     }
     setIsModalOpen(true);
  };

  const closeModal = () => {
     setIsModalOpen(false);
     setEditingVendor(null);
  };

  // ... (Render logic same as before)
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Vendor Management</h1>
        <button onClick={() => openModal()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
           <Plus size={18} /> Add Vendor
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {activeVendors.map(vendor => (
            <div key={vendor.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
               <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Truck size={20} /></div>
                     <div>
                        <h3 className="font-bold text-slate-800">{vendor.name}</h3>
                        <p className="text-xs text-slate-500">{vendor.serviceType}</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-1 text-amber-400">
                     <Star size={14} fill="currentColor" /> <span className="text-slate-600 text-xs font-medium">{vendor.rating}</span>
                  </div>
               </div>
               
               <div className="space-y-2 text-sm text-slate-600 mb-6">
                  <p><strong>Contact:</strong> {vendor.contactPerson}</p>
                  <p><strong>Email:</strong> {vendor.email}</p>
                  <p><strong>Phone:</strong> {vendor.phone}</p>
               </div>

               <div className="flex gap-2 pt-4 border-t border-slate-100">
                  <button onClick={() => openModal(vendor)} className="flex-1 py-1.5 text-slate-600 hover:bg-slate-50 rounded text-sm">Edit</button>
                  {user.role === UserRole.ADMIN && (
                     <button onClick={() => handleDelete(vendor.id)} className="flex-1 py-1.5 text-red-600 hover:bg-red-50 rounded text-sm">Delete</button>
                  )}
               </div>
            </div>
         ))}
      </div>

      {isModalOpen && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl w-full max-w-md">
               <h2 className="text-xl font-bold mb-4">{editingVendor ? 'Edit Vendor' : 'Add New Vendor'}</h2>
               <div className="space-y-4">
                  <input className="w-full p-2 border rounded" placeholder="Vendor Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  <input className="w-full p-2 border rounded" placeholder="Service Type (e.g. Hardware)" value={formData.serviceType} onChange={e => setFormData({...formData, serviceType: e.target.value})} />
                  <input className="w-full p-2 border rounded" placeholder="Contact Person" value={formData.contactPerson} onChange={e => setFormData({...formData, contactPerson: e.target.value})} />
                  <input className="w-full p-2 border rounded" placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  <input className="w-full p-2 border rounded" placeholder="Phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  
                  <div>
                     <label className="text-xs text-slate-500">Rating</label>
                     <select className="w-full p-2 border rounded" value={formData.rating} onChange={e => setFormData({...formData, rating: Number(e.target.value) as any})}>
                        <option value="1">1 Star</option>
                        <option value="2">2 Stars</option>
                        <option value="3">3 Stars</option>
                        <option value="4">4 Stars</option>
                        <option value="5">5 Stars</option>
                     </select>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                     <button onClick={closeModal} className="px-4 py-2 text-slate-600">Cancel</button>
                     <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};
