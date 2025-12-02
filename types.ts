

export enum UserRole {
  ADMIN = 'Admin',
  STAFF = 'IT Staff',
  USER = 'User',
}

export enum TicketStatus {
  OPEN = 'Open',
  IN_PROGRESS = 'In Progress',
  ON_HOLD = 'On Hold',
  RESOLVED = 'Resolved',
  CLOSED = 'Closed',
}

export enum TicketPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical',
}

export enum AssetStatus {
  IN_USE = 'In Use',
  IN_REPAIR = 'In Repair',
  RETIRED = 'Retired',
  MISSING = 'Missing',
  AVAILABLE = 'Available',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  phone?: string;
  password?: string; // For mock auth
  deleted?: boolean;
}

export interface TicketHistoryEntry {
  id: string;
  type: 'comment' | 'system';
  authorName: string;
  content: string;
  timestamp: number;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  requesterId: string;
  requesterName: string;
  requesterEmail?: string;
  department: string;
  assignedToId?: string; // IT Staff ID
  assignedToName?: string;
  relatedAssetId?: string;
  createdAt: number;
  updatedAt: number;
  attachments: string[]; // Mock URLs
  history?: TicketHistoryEntry[];
  deleted?: boolean;
}

export interface MaintenanceRecord {
  id: string;
  date: number;
  description: string;
  cost?: number;
  performedBy: string;
}

export interface AssetAssignmentRecord {
  id: string;
  date: number;
  action: 'Assignment' | 'Return' | 'Transfer' | 'Update';
  details: string;
  performedBy: string;
}

export interface Asset {
  id: string;
  name: string; // e.g. "MacBook Pro 16"
  serialNumber: string;
  model: string;
  type: string; // Laptop, Server, Printer
  status: AssetStatus;
  assignedUserId?: string;
  assignedUserName?: string;
  location: string;
  department: string;
  purchaseDate: number;
  maintenanceLog: MaintenanceRecord[];
  assignmentLog?: AssetAssignmentRecord[];
  deleted?: boolean;
}

export interface AuditLog {
  id: string;
  action: string;
  userId: string;
  userName: string;
  timestamp: number;
  details: string;
}

// Project Management
export type TaskStatus = 'Todo' | 'Processing' | 'Done' | 'Close';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignedTo?: string; // User ID
}

export interface Project {
  id: string;
  name: string;
  description: string;
  duration: string; // e.g. "2 Weeks"
  status: 'Active' | 'Completed' | 'Archived';
  tasks: Task[];
  createdBy: string;
  createdAt: number;
  deleted?: boolean;
}

// Knowledge Base
export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category: 'SOP' | 'Troubleshooting' | 'Policy' | 'FAQ' | 'General';
  tags: string[];
  authorId: string;
  authorName: string;
  createdAt: number;
  updatedAt: number;
  deleted?: boolean;
}

// Change Management
export interface ChangeRequest {
  id: string;
  title: string;
  description: string;
  reason: string;
  impact: 'Low' | 'Medium' | 'High';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'In Progress' | 'Completed' | 'Rejected';
  requesterId: string;
  requesterName: string;
  scheduledDate: number;
  createdAt: number;
  deleted?: boolean;
}

// License Management
export interface SoftwareLicense {
  id: string;
  softwareName: string;
  licenseKey: string;
  seatsTotal: number;
  seatsUsed: number;
  expirationDate: number;
  vendor: string;
  status: 'Active' | 'Expiring Soon' | 'Expired';
  deleted?: boolean;
}

// Vendor Management
export interface Vendor {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  serviceType: string; // e.g., Hardware, Software, ISP
  contractExpiry?: number;
  rating: 1 | 2 | 3 | 4 | 5;
  deleted?: boolean;
}

// System Announcements
export interface Announcement {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'critical';
  active: boolean;
  createdAt: number;
}

// Email/Notifications
export interface Notification {
  id: string;
  userId: string; // Recipient
  subject: string;
  message: string;
  read: boolean;
  timestamp: number;
  type: 'email' | 'system';
}

export interface EmailSettings {
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  senderName: string;
  senderEmail: string;
  enabled: boolean;
}

// System Health Dashboard
export interface SystemHealth {
  serverStatus: 'Online' | 'Degraded' | 'Offline';
  databaseStatus: 'Online' | 'Degraded' | 'Offline';
  networkLatency: number; // ms
  lastBackup: number;
}

// PMS (Preventive Maintenance System)
export enum PMSStatus {
  SCHEDULED = 'Scheduled',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  MISSED = 'Missed'
}

export interface PMSTask {
  id: string;
  title: string;
  description: string;
  assetId: string;
  assetName: string;
  assignedToId: string;
  assignedToName: string;
  scheduledDate: number; // Timestamp
  status: PMSStatus;
  completedDate?: number;
  notes?: string;
  deleted?: boolean;
}

// Full System Backup Structure
export interface SystemData {
  users: User[];
  tickets: Ticket[];
  assets: Asset[];
  projects: Project[];
  articles: KnowledgeArticle[];
  changes: ChangeRequest[];
  licenses: SoftwareLicense[];
  vendors: Vendor[];
  announcements: Announcement[];
  pmsTasks: PMSTask[];
  emailSettings?: EmailSettings;
  timestamp: number;
  version: string;
}