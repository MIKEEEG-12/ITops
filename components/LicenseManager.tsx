
import React, { useState } from 'react';
import { SoftwareLicense, User, UserRole } from '../types';
import { Key, AlertCircle, CheckCircle, Plus, Edit2, Trash2, X } from 'lucide-react';
import { formatDate, generateId } from '../utils';
import { api } from '../services/api';

interface LicenseManagerProps {
  licenses: SoftwareLicense[];
  user: User;
  setLicenses: React.Dispatch<React.SetStateAction<SoftwareLicense[]>>;
}

export const LicenseManager: React.FC<LicenseManagerProps> = ({ licenses, user, setLicenses }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<SoftwareLicense | null>(null);
  const [formData, setFormData] = useState<Partial<SoftwareLicense>>({
    softwareName: '',
    vendor: '',
    seatsTotal: 0,
    seatsUsed: 0,
    licenseKey: '',
    status: 'Active'
  });

  const canEdit = user.role === UserRole.ADMIN || user.role === UserRole.STAFF;
  const activeLicenses = licenses.filter(l => !l.deleted);

  const handleOpenModal = (license?: SoftwareLicense) => {
    if (license) {
      setEditingLicense(license);
      setFormData(license);
    } else {
      setEditingLicense(null);
      setFormData({
        softwareName: '',
        vendor: '',
        seatsTotal: 10,
        seatsUsed: 0,
        licenseKey: '',
        status: 'Active',
        expirationDate: Date.now() + 31536000000 // +1 Year
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.softwareName || !formData.licenseKey) return;

    if (editingLicense) {
      await api.licenses.update({ id: editingLicense.id, ...formData });
      setLicenses(licenses.map(l => l.id === editingLicense.id ? { ...l, ...formData } as SoftwareLicense : l));
    } else {
      const newLicense: SoftwareLicense = {
        id: generateId(),
        softwareName: formData.softwareName!,
        vendor: formData.vendor || 'Unknown',
        seatsTotal: Number(formData.seatsTotal) || 0,
        seatsUsed: Number(formData.seatsUsed) || 0,
        licenseKey: formData.licenseKey!,
        status: formData.status as any || 'Active',
        expirationDate: formData.expirationDate || Date.now(),
        deleted: false
      };
      await api.licenses.create(newLicense);
      setLicenses([...licenses, newLicense]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this license?")) {
      await api.licenses.update({ id, deleted: true });
      setLicenses(licenses.map(l => l.id === id ? { ...l, deleted: true } : l));
    }
  };

  // ... (Render logic same as before, preserved)
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
         <div>
            <h1 className="text-2xl font-bold text-slate-900">Software Licenses</h1>
            <p className="text-slate-500">Track expirations and seat usage.</p>
         </div>
         {canEdit && (
           <button onClick={() => handleOpenModal()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
             <Plus size={18} /> Add License
           </button>
         )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-slate-600">Software</th>
              <th className="px-6 py-4 font-semibold text-slate-600">Vendor</th>
              <th className="px-6 py-4 font-semibold text-slate-600">Usage</th>
              <th className="px-6 py-4 font-semibold text-slate-600">Expires</th>
              <th className="px-6 py-4 font-semibold text-slate-600">Status</th>
              {canEdit && <th className="px-6 py-4 font-semibold text-slate-600 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {activeLicenses.map(lic => {
               const usagePercent = (lic.seatsUsed / lic.seatsTotal) * 100;
               return (
                 <tr key={lic.id} className="hover:bg-slate-50">
                   <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-2">
                      <Key size={16} className="text-slate-400" /> {lic.softwareName}
                   </td>
                   <td className="px-6 py-4 text-slate-600">{lic.vendor}</td>
                   <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                         <div className="flex-1 w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className={`h-full ${usagePercent > 90 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${usagePercent}%` }}></div>
                         </div>
                         <span className="text-xs text-slate-500">{lic.seatsUsed}/{lic.seatsTotal}</span>
                      </div>
                   </td>
                   <td className="px-6 py-4 text-slate-600 font-mono text-xs">{formatDate(lic.expirationDate)}</td>
                   <td className="px-6 py-4">
                      {lic.status === 'Expiring Soon' ? (
                         <span className="flex items-center gap-1 text-amber-600 font-medium"><AlertCircle size={14} /> Expiring</span>
                      ) : lic.status === 'Expired' ? (
                         <span className="flex items-center gap-1 text-red-600 font-medium"><AlertCircle size={14} /> Expired</span>
                      ) : (
                         <span className="flex items-center gap-1 text-green-600 font-medium"><CheckCircle size={14} /> Active</span>
                      )}
                   </td>
                   {canEdit && (
                     <td className="px-6 py-4 text-right">
                       <div className="flex justify-end gap-2">
                          <button onClick={() => handleOpenModal(lic)} className="p-1 text-slate-400 hover:text-blue-600"><Edit2 size={16} /></button>
                          <button onClick={() => handleDelete(lic.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                       </div>
                     </td>
                   )}
                 </tr>
               );
            })}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl w-full max-w-lg">
               <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">{editingLicense ? 'Edit License' : 'New License'}</h2>
                  <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
               </div>
               <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Software Name</label>
                    <input className="w-full p-2 border rounded" value={formData.softwareName} onChange={e => setFormData({...formData, softwareName: e.target.value})} placeholder="e.g. Microsoft 365" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Vendor</label>
                       <input className="w-full p-2 border rounded" value={formData.vendor} onChange={e => setFormData({...formData, vendor: e.target.value})} placeholder="e.g. Microsoft" />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                       <select className="w-full p-2 border rounded" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                          <option value="Active">Active</option>
                          <option value="Expiring Soon">Expiring Soon</option>
                          <option value="Expired">Expired</option>
                       </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">License Key</label>
                    <input className="w-full p-2 border rounded font-mono text-sm" value={formData.licenseKey} onChange={e => setFormData({...formData, licenseKey: e.target.value})} placeholder="XXXX-YYYY-ZZZZ" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Total Seats</label>
                       <input type="number" className="w-full p-2 border rounded" value={formData.seatsTotal} onChange={e => setFormData({...formData, seatsTotal: Number(e.target.value)})} />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Used Seats</label>
                       <input type="number" className="w-full p-2 border rounded" value={formData.seatsUsed} onChange={e => setFormData({...formData, seatsUsed: Number(e.target.value)})} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                     <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600">Cancel</button>
                     <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded font-medium">Save License</button>
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};
