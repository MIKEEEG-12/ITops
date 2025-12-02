
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, TicketStatus, TicketPriority, User } from '../types';
import { generateId } from '../utils';
import { ArrowLeft, CheckCircle, AlertTriangle, Wrench } from 'lucide-react';
import { api } from '../services/api';

interface SubmitTicketPageProps {
  user: User;
  tickets: Ticket[];
  setTickets: React.Dispatch<React.SetStateAction<Ticket[]>>;
}

export const SubmitTicketPage: React.FC<SubmitTicketPageProps> = ({ user, tickets, setTickets }) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    type: 'service_request',
    name: user?.name || '',
    email: user?.email || '',
    viber: '',
    department: user?.department || '',
    priority: 'medium',
    category: '',
    title: '',
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const fullDescription = `
**Request Type:** ${formData.type === 'incident' ? '🚨 Incident' : '🔧 Service Request'}
**Category:** ${formData.category || 'N/A'}
**Contact Number:** ${formData.viber || 'N/A'}

---
${formData.description}
    `.trim();

    const priorityMap: Record<string, TicketPriority> = {
      low: TicketPriority.LOW,
      medium: TicketPriority.MEDIUM,
      high: TicketPriority.HIGH,
      critical: TicketPriority.CRITICAL
    };

    const newTicket: Ticket = {
      id: generateId(),
      title: formData.title,
      description: fullDescription,
      status: TicketStatus.OPEN,
      priority: priorityMap[formData.priority] || TicketPriority.MEDIUM,
      requesterId: user?.id || 'guest',
      requesterName: formData.name,
      department: formData.department,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      attachments: [],
      deleted: false
    };

    // Use API
    await api.tickets.create(newTicket);
    setTickets([newTicket, ...tickets]);
    
    setSuccess(true);
    setIsSubmitting(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ... (Rest of UI render code same as previous version)
  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center border border-slate-200">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Ticket Submitted!</h2>
          <p className="text-slate-500 mb-6">Your request has been successfully created. The IT team will review it shortly.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate('/')} className="px-6 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200">
              Return to Dashboard
            </button>
            <button onClick={() => { setSuccess(false); setFormData(prev => ({ ...prev, title: '', description: '' })); }} className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">
              Submit Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <div className="sticky top-0 z-50 flex justify-between items-center px-5 py-3 border-b border-slate-200 bg-white shadow-sm print:hidden">
        <div>
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded hover:bg-slate-50 font-medium text-sm transition-all"
          >
            <ArrowLeft size={16} /> Back
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-5 md:p-10">
        <div className="mb-8">
          <div className="text-2xl font-bold tracking-tight text-slate-800">IT Helpdesk</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Submit a Ticket</h2>
          <p className="text-slate-500 mb-8">Choose the appropriate ticket type and provide details about your request.</p>

          <div className="mb-8">
            <label className="block text-sm font-semibold text-slate-700 mb-3">Ticket Type</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="relative cursor-pointer group">
                <input type="radio" name="type" value="incident" checked={formData.type === 'incident'} onChange={handleInputChange} className="peer sr-only" />
                <div className="p-5 rounded-lg border-2 border-slate-200 hover:border-slate-300 peer-checked:border-red-500 peer-checked:bg-red-50 transition-all h-full">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className={`w-5 h-5 ${formData.type === 'incident' ? 'text-red-600' : 'text-slate-400'}`} />
                    <h3 className={`font-bold ${formData.type === 'incident' ? 'text-red-800' : 'text-slate-700'}`}>Incident</h3>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">Report an IT problem or outage that needs immediate attention</p>
                  <small className="text-xs text-slate-400">Examples: System down, network issues, hardware failures</small>
                </div>
              </label>

              <label className="relative cursor-pointer group">
                <input type="radio" name="type" value="service_request" checked={formData.type === 'service_request'} onChange={handleInputChange} className="peer sr-only" />
                <div className="p-5 rounded-lg border-2 border-slate-200 hover:border-slate-300 peer-checked:border-blue-500 peer-checked:bg-blue-50 transition-all h-full">
                  <div className="flex items-center gap-2 mb-2">
                    <Wrench className={`w-5 h-5 ${formData.type === 'service_request' ? 'text-blue-600' : 'text-slate-400'}`} />
                    <h3 className={`font-bold ${formData.type === 'service_request' ? 'text-blue-800' : 'text-slate-700'}`}>Service Request</h3>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">Request IT services like software installation or access permissions</p>
                  <small className="text-xs text-slate-400">Examples: Software installation, password reset, new equipment</small>
                </div>
              </label>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="col-span-1 space-y-4">
              <h4 className="font-semibold text-slate-900 border-b border-slate-100 pb-2">Your Information</h4>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Your Name *</label>
                <input name="name" value={formData.name} onChange={handleInputChange} placeholder="IT Mike" required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Your Email *</label>
                <input name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="itmike@megapaint.com" required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone/Viber Number</label>
                <input name="viber" type="tel" value={formData.viber} onChange={handleInputChange} placeholder="+63 912 345 6789" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Department *</label>
                <input name="department" type="text" value={formData.department} onChange={handleInputChange} placeholder="e.g., IT, HR, Production" required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"/>
              </div>
            </div>

            <div className="col-span-1 space-y-4">
              <h4 className="font-semibold text-slate-900 border-b border-slate-100 pb-2">Request Details</h4>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Priority Level</label>
                <select name="priority" value={formData.priority} onChange={handleInputChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white">
                  <option value="low">Low - General request</option>
                  <option value="medium">Medium - Standard priority</option>
                  <option value="high">High - Urgent but not critical</option>
                  <option value="critical">Critical - Business impacting</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select name="category" value={formData.category} onChange={handleInputChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white">
                  <option value="">Select Category</option>
                  <option value="Hardware">Hardware</option>
                  <option value="Software">Software</option>
                  <option value="Network">Network</option>
                  <option value="Access">Access & Security</option>
                  <option value="Email">Email & Communication</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="col-span-1 md:col-span-2 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                <input name="title" value={formData.title} onChange={handleInputChange} placeholder="Brief description of your issue/request" required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                <textarea name="description" rows={4} value={formData.description} onChange={handleInputChange} placeholder="Provide detailed information about your issue or request..." required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow resize-y"></textarea>
              </div>
            </div>

            <div className="col-span-1 md:col-span-2 pt-4">
              <button type="submit" disabled={isSubmitting} className="w-full md:w-auto px-8 py-3 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 focus:ring-4 focus:ring-slate-300 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-md">
                {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
