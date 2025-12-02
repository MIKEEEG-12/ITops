
import React from 'react';
import { Link } from 'react-router-dom';
import { Ticket, Asset, Project, User, UserRole, TicketStatus, AssetStatus, ChangeRequest, SoftwareLicense, Announcement, SystemHealth } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, AlertCircle, CheckCircle, Clock, KanbanSquare, Plus, Book, GitPullRequest, Key, ShieldAlert, Ticket as TicketIcon, Server, Database, Wifi } from 'lucide-react';
import { formatDate } from '../utils';
import { exportToExcel } from '../utils';

interface DashboardProps {
  user: User;
  tickets: Ticket[];
  assets: Asset[];
  projects: Project[];
  changes: ChangeRequest[];
  licenses: SoftwareLicense[];
  announcements: Announcement[];
}

export const Dashboard: React.FC<DashboardProps> = ({ user, tickets, assets, projects, changes, licenses, announcements }) => {
  if (user.role === UserRole.USER) {
    return <UserDashboard user={user} tickets={tickets} announcements={announcements} />;
  }

  if (user.role === UserRole.STAFF) {
    return <StaffDashboard user={user} tickets={tickets} projects={projects} changes={changes} assets={assets} announcements={announcements} />;
  }

  return <AdminDashboard tickets={tickets} assets={assets} projects={projects} changes={changes} licenses={licenses} announcements={announcements} />;
};

// --- Sub-Components ---

const UserDashboard = ({ user, tickets, announcements }: { user: User, tickets: Ticket[], announcements: Announcement[] }) => {
  const myTickets = tickets.filter(t => t.requesterId === user.id && !t.deleted);
  const openTickets = myTickets.filter(t => t.status !== TicketStatus.CLOSED && t.status !== TicketStatus.RESOLVED);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#456882] to-[#2f4759] rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
           <h1 className="text-3xl font-bold mb-2">Welcome back, {user.name}</h1>
           <p className="text-slate-200 max-w-2xl">Need assistance? You can submit a support ticket or search our knowledge base for instant answers.</p>
           <div className="flex gap-4 mt-6">
             <Link to="/tickets" className="bg-white text-[#456882] px-6 py-2.5 rounded-lg font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2">
               <Plus size={18} /> Create Ticket
             </Link>
             <Link to="/kb" className="bg-[#2f4759] bg-opacity-60 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-opacity-80 transition-colors flex items-center gap-2">
               <Book size={18} /> Browse Help Articles
             </Link>
           </div>
        </div>
      </div>

      {announcements.length > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm">
           <h3 className="font-bold text-amber-800 mb-1">Latest Announcements</h3>
           {announcements.map(a => <p key={a.id} className="text-sm text-amber-700">{a.message}</p>)}
        </div>
      )}

      {/* Stats & Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
           <h2 className="text-xl font-bold text-slate-800">My Open Tickets</h2>
           {openTickets.length > 0 ? (
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {openTickets.map(ticket => (
                  <div key={ticket.id} className="p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors flex justify-between items-center">
                     <div>
                        <h3 className="font-semibold text-slate-800">{ticket.title}</h3>
                        <p className="text-sm text-slate-500">Submitted on {formatDate(ticket.createdAt)}</p>
                     </div>
                     <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                       ticket.status === 'Open' ? 'bg-blue-100 text-blue-700' : 
                       ticket.status === 'In Progress' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100'
                     }`}>
                       {ticket.status}
                     </span>
                  </div>
                ))}
             </div>
           ) : (
             <div className="bg-white p-8 rounded-xl border border-dashed border-slate-300 text-center text-slate-500 shadow-sm">
               No open tickets. Everything is running smoothly!
             </div>
           )}
        </div>

        <div>
           <h2 className="text-xl font-bold text-slate-800 mb-6">Quick Links</h2>
           <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
              <Link to="/kb" className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors group">
                 <span className="font-medium text-slate-700 group-hover:text-[#456882]">IT Policies</span>
                 <Book size={16} className="text-slate-400 group-hover:text-[#456882]" />
              </Link>
              <Link to="/kb" className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors group">
                 <span className="font-medium text-slate-700 group-hover:text-[#456882]">Troubleshooting Guides</span>
                 <Book size={16} className="text-slate-400 group-hover:text-[#456882]" />
              </Link>
              <div className="pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-400 mb-2">Help Desk Contact</p>
                <p className="text-sm font-semibold text-slate-700">help@nexgen.com</p>
                <p className="text-sm text-slate-600">+1 (800) 555-0199</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const StaffDashboard = ({ user, tickets, projects, changes, assets, announcements }: { user: User, tickets: Ticket[], projects: Project[], changes: ChangeRequest[], assets: Asset[], announcements: Announcement[] }) => {
  const assignedTickets = tickets.filter(t => t.assignedToName === user.name && t.status !== 'Closed');
  const criticalTickets = tickets.filter(t => t.priority === 'Critical' && t.status !== 'Closed');
  const myProjects = projects.filter(p => !p.deleted && p.status === 'Active');
  const pendingChanges = changes.filter(c => c.status === 'Pending Approval' || c.status === 'Approved');

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">IT Operations Dashboard</h1>
        <span className="text-sm text-slate-500">{new Date().toLocaleDateString()}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Assigned to Me" value={assignedTickets.length} icon={<TicketIcon size={24} className="text-[#456882]" />} color="bg-[#E3E3E3]" />
        <StatCard title="Critical Incidents" value={criticalTickets.length} icon={<AlertCircle size={24} className="text-red-600" />} color="bg-red-100" />
        <StatCard title="Active Projects" value={myProjects.length} icon={<KanbanSquare size={24} className="text-[#456882]" />} color="bg-[#E3E3E3]" />
        <StatCard title="Pending Changes" value={pendingChanges.length} icon={<GitPullRequest size={24} className="text-amber-600" />} color="bg-amber-100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4">My Task Queue</h3>
            <div className="space-y-3">
               {assignedTickets.slice(0, 5).map(t => (
                 <div key={t.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="font-medium text-sm text-slate-700">{t.title}</span>
                    <span className="text-xs px-2 py-1 bg-white border border-slate-200 rounded text-slate-600">{t.status}</span>
                 </div>
               ))}
               {assignedTickets.length === 0 && <p className="text-slate-400 text-sm">No active tickets assigned.</p>}
            </div>
         </div>

         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4">Upcoming Scheduled Changes</h3>
            <div className="space-y-3">
               {changes.filter(c => c.status === 'Approved').map(c => (
                 <div key={c.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border-l-4 border-[#456882]">
                    <Clock size={16} className="text-[#456882] mt-1" />
                    <div>
                      <p className="font-medium text-sm text-slate-800">{c.title}</p>
                      <p className="text-xs text-slate-500">{formatDate(c.scheduledDate)}</p>
                    </div>
                 </div>
               ))}
               {changes.filter(c => c.status === 'Approved').length === 0 && <p className="text-slate-400 text-sm">No scheduled changes.</p>}
            </div>
         </div>
      </div>
    </div>
  );
};

const AdminDashboard = ({ tickets, assets, projects, changes, licenses, announcements }: { tickets: Ticket[], assets: Asset[], projects: Project[], changes: ChangeRequest[], licenses: SoftwareLicense[], announcements: Announcement[] }) => {
  // Aggregate Stats
  const openTickets = tickets.filter(t => t.status === TicketStatus.OPEN).length;
  const criticalTickets = tickets.filter(t => t.priority === 'Critical' && t.status !== TicketStatus.CLOSED).length;
  const expiringLicenses = licenses.filter(l => l.status === 'Expiring Soon' || l.status === 'Expired').length;
  const assetValue = assets.filter(a => !a.deleted).length * 1200; // Mock value avg $1200

  // Chart Data
  const statusData = [
    { name: 'Open', value: openTickets },
    { name: 'In Progress', value: tickets.filter(t => t.status === TicketStatus.IN_PROGRESS).length },
    { name: 'Resolved', value: tickets.filter(t => t.status === TicketStatus.RESOLVED).length },
  ];

  const handleDownloadReport = () => {
    const report = [
        { Metric: 'Total Tickets', Value: tickets.length },
        { Metric: 'Open Tickets', Value: openTickets },
        { Metric: 'Critical Issues', Value: criticalTickets },
        { Metric: 'Total Assets', Value: assets.length },
        { Metric: 'Asset Value (Est)', Value: `$${assetValue.toLocaleString()}` },
        { Metric: 'Expiring Licenses', Value: expiringLicenses }
    ];
    exportToExcel(report, 'System_Summary_Report.xls', 'System Executive Summary');
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Executive Overview</h1>
        <div className="flex gap-2">
           <button onClick={handleDownloadReport} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-[#456882] hover:bg-slate-50 font-medium shadow-sm transition-colors">Download Report</button>
        </div>
      </div>

      {/* System Health Widget */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-700 rounded-full"><Server size={24} /></div>
            <div>
               <p className="text-sm text-slate-500">Servers</p>
               <p className="font-bold text-slate-800">100% Online</p>
            </div>
         </div>
         <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="p-3 bg-[#E3E3E3] text-[#456882] rounded-full"><Database size={24} /></div>
            <div>
               <p className="text-sm text-slate-500">Databases</p>
               <p className="font-bold text-slate-800">Healthy</p>
            </div>
         </div>
         <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="p-3 bg-purple-100 text-purple-700 rounded-full"><Wifi size={24} /></div>
            <div>
               <p className="text-sm text-slate-500">Network</p>
               <p className="font-bold text-slate-800">24ms Latency</p>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Ticket Volume" value={tickets.length} icon={<Activity size={24} className="text-[#456882]" />} color="bg-[#E3E3E3]" />
        <StatCard title="Critical Issues" value={criticalTickets} icon={<ShieldAlert size={24} className="text-red-600" />} color="bg-red-100" />
        <StatCard title="License Alerts" value={expiringLicenses} icon={<Key size={24} className="text-amber-600" />} color="bg-amber-100" />
        <StatCard title="Total Assets Est." value={`$${assetValue.toLocaleString()}`} icon={<CheckCircle size={24} className="text-emerald-600" />} color="bg-emerald-100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Main Chart */}
         <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-6">Ticket Resolution Trends</h3>
            {tickets.length > 0 ? (
                <div className="h-64">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statusData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: '#f1f5f9' }} />
                        <Bar dataKey="value" fill="#456882" radius={[4, 4, 0, 0]} barSize={50} />
                      </BarChart>
                   </ResponsiveContainer>
                </div>
            ) : (
                <div className="h-64 flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-lg">
                    No ticket data available yet.
                </div>
            )}
         </div>

         {/* Compliance / Health */}
         <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
               <h3 className="font-bold text-slate-800 mb-4">Compliance & Health</h3>
               <div className="space-y-4">
                  <div>
                     <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">SLA Breach Rate</span>
                        <span className="font-bold text-green-600">0%</span>
                     </div>
                     <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-green-500 h-full w-[0%]"></div>
                     </div>
                  </div>
                  <div>
                     <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">Asset Utilization</span>
                        <span className="font-bold text-[#456882]">0%</span>
                     </div>
                     <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-[#456882] h-full w-[0%]"></div>
                     </div>
                  </div>
                  <div>
                     <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">Budget Consumption</span>
                        <span className="font-bold text-amber-600">0%</span>
                     </div>
                     <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full w-[0%]"></div>
                     </div>
                  </div>
               </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
               <h3 className="font-bold text-slate-800 mb-4">Recent Audit Logs</h3>
               <div className="space-y-3">
                  <p className="text-xs text-slate-500 border-l-2 border-slate-300 pl-2">
                     <span className="font-semibold text-slate-700">System</span> initialized.<br/>
                     <span className="opacity-75">Just now</span>
                  </p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color }: { title: string, value: string | number, icon: React.ReactNode, color: string }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
    <div className={`p-3 rounded-full ${color}`}>
      {icon}
    </div>
  </div>
);
