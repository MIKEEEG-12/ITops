

import { 
  User, Ticket, Asset, Project, KnowledgeArticle, ChangeRequest, 
  SoftwareLicense, Vendor, Announcement, PMSTask, SystemData, EmailSettings,
  UserRole, TicketStatus, TicketPriority, AssetStatus, PMSStatus 
} from '../types';
import { generateId } from '../utils';
import { ticketData, kbData, assetData, projectData, changeData, licenseData, vendorData } from './mockData';

// --- Types & Interfaces ---

interface StorageData {
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
  emailSettings: EmailSettings;
}

const STORAGE_KEYS = {
  DB: 'nexgen_db_v1',
  USER: 'nexgen_current_user'
};

// --- Initial Seeding Helper ---

const seedData = (): StorageData => {
  // 1. Users - Default Admin with requested password
  const users: User[] = [
    { 
      id: 'u1', 
      name: 'System Administrator', 
      email: 'admin@nexgen.com', 
      role: UserRole.ADMIN, 
      department: 'IT Operations', 
      phone: '+1 234 567 890',
      password: 'megapassword0' 
    },
    {
      id: 'u2',
      name: 'IT Support',
      email: 'staff@nexgen.com',
      role: UserRole.STAFF,
      department: 'IT Support',
      password: 'password123'
    },
    {
      id: 'u3',
      name: 'User User',
      email: 'user@nexgen.com',
      role: UserRole.USER,
      department: 'Sales',
      password: 'user123'
    }
  ];

  // 2. Tickets
  const currentYear = new Date().getFullYear();
  const monthMap: { [key: string]: number } = {
    'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
    'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
  };

  const tickets: Ticket[] = ticketData.map((item, index) => {
    let createdTs = Date.now();
    const createdDateStr = (item as any).Created_Date;
    if (monthMap[createdDateStr] !== undefined) {
      const d = new Date();
      d.setFullYear(currentYear);
      d.setMonth(monthMap[createdDateStr]);
      d.setDate(1 + (index % 28));
      if (d.getTime() > Date.now()) d.setFullYear(currentYear - 1);
      createdTs = d.getTime();
    }

    const requesterName = (item as any).Subject.split('-')[0].trim() || 'NexGen Employee';

    return {
      id: generateId(),
      title: (item as any).Subject,
      description: (item as any).Description,
      status: ((item as any).Status === 'Closed' ? TicketStatus.CLOSED : (item as any).Status === 'Resolved' ? TicketStatus.RESOLVED : TicketStatus.OPEN),
      priority: ((item as any).Priority === 'Low' ? TicketPriority.LOW : (item as any).Priority === 'Medium' ? TicketPriority.MEDIUM : TicketPriority.HIGH),
      requesterId: 'imported-user-' + index,
      requesterName: requesterName,
      requesterEmail: 'employee@nexgen.com',
      department: (item as any).Department,
      assignedToName: (item as any).Assigned_To,
      createdAt: createdTs,
      updatedAt: createdTs,
      attachments: [],
      relatedAssetId: (item as any).Asset_ID !== 'N/A' ? (item as any).Asset_ID : undefined,
      history: [
        {
            id: generateId(),
            type: 'system',
            authorName: 'System',
            content: `Ticket created by ${requesterName}`,
            timestamp: createdTs
        },
        {
            id: generateId(),
            type: 'system',
            authorName: 'System',
            content: `Assigned to ${(item as any).Assigned_To}`,
            timestamp: createdTs + 60000 // +1 min
        }
      ],
      deleted: false
    };
  });

  // 3. Knowledge Base
  const articles: KnowledgeArticle[] = kbData.map(item => ({
    ...item,
    category: item.category as any,
    authorId: 'u1',
    createdAt: item.updatedAt,
    deleted: false
  }));

  // 4. Assets
  const assets: Asset[] = assetData.map(item => ({
    id: generateId(),
    name: item.Asset_Name,
    type: item.Type,
    serialNumber: item.Serial_Number,
    model: item.Model,
    location: item.Location,
    department: item.Department,
    status: (item.Status as AssetStatus) || AssetStatus.AVAILABLE,
    assignedUserName: item.Assigned_User !== 'Unassigned' ? item.Assigned_User : undefined,
    purchaseDate: new Date(item.Purchase_Date).getTime() || Date.now(),
    maintenanceLog: [],
    assignmentLog: [],
    deleted: false
  }));

  // 5. Projects
  const projects: Project[] = projectData.map(item => ({
    id: generateId(),
    name: item.name,
    description: item.description,
    duration: item.duration,
    status: item.status as any,
    tasks: item.tasks.map(t => ({...t, status: t.status as any})),
    createdBy: 'u1',
    createdAt: Date.now(),
    deleted: false
  }));

  // 6. Changes
  const changes: ChangeRequest[] = changeData.map(item => ({
    id: generateId(),
    title: item.title,
    description: item.description,
    reason: item.reason,
    impact: item.impact as any,
    priority: item.priority as any,
    status: item.status as any,
    requesterId: 'u1',
    requesterName: item.requesterName,
    scheduledDate: new Date(item.scheduledDate).getTime(),
    createdAt: Date.now(),
    deleted: false
  }));

  // 7. Licenses
  const licenses: SoftwareLicense[] = licenseData.map(item => ({
    id: generateId(),
    softwareName: item.softwareName,
    vendor: item.vendor,
    seatsTotal: item.seatsTotal,
    seatsUsed: item.seatsUsed,
    licenseKey: item.licenseKey,
    status: item.status as any,
    expirationDate: new Date(item.expirationDate).getTime(),
    deleted: false
  }));

  // 8. Vendors
  const vendors: Vendor[] = vendorData.map(item => ({
    id: generateId(),
    name: item.name,
    contactPerson: item.contactPerson,
    email: item.email,
    phone: item.phone,
    serviceType: item.serviceType,
    rating: item.rating as any,
    deleted: false
  }));

  // 9. Email Settings Default
  const emailSettings: EmailSettings = {
    smtpHost: 'smtp.gmail.com',
    smtpPort: '587',
    smtpUser: '',
    smtpPass: '',
    senderName: 'IT Helpdesk',
    senderEmail: 'helpdesk@nexgen.com',
    enabled: true
  };

  return {
    users,
    tickets,
    assets,
    projects,
    articles,
    changes,
    licenses,
    vendors,
    announcements: [],
    pmsTasks: [],
    emailSettings
  };
};

// --- Mock API Implementation ---

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class MockApi {
  private data: StorageData;

  constructor() {
    const saved = localStorage.getItem(STORAGE_KEYS.DB);
    if (saved) {
      this.data = JSON.parse(saved);
    } else {
      this.data = seedData();
      this.save();
    }
  }

  private save() {
    localStorage.setItem(STORAGE_KEYS.DB, JSON.stringify(this.data));
  }

  // --- Generic Helpers ---
  private async getList<T>(key: keyof StorageData): Promise<T[]> {
    await delay(200); // Simulate network
    return this.data[key] as unknown as T[];
  }

  private async createItem<T>(key: keyof StorageData, item: T): Promise<T> {
    await delay(300);
    (this.data[key] as unknown as T[]).unshift(item);
    this.save();
    return item;
  }

  private async updateItem<T extends { id: string }>(key: keyof StorageData, item: Partial<T> & { id: string }): Promise<T> {
    await delay(200);
    const list = this.data[key] as unknown as T[];
    const index = list.findIndex(i => i.id === item.id);
    if (index === -1) throw new Error(`${String(key)} not found`);
    
    const updated = { ...list[index], ...item };
    list[index] = updated;
    this.data[key] = list as any; // Type assertion needed for generic assignment
    this.save();
    return updated;
  }

  private async deleteItem(key: keyof StorageData, id: string): Promise<void> {
    await delay(200);
    const list = this.data[key] as any[];
    this.data[key] = list.filter(i => i.id !== id) as any;
    this.save();
  }

  // --- Public Methods ---

  public async fetchAll(): Promise<StorageData> {
    await delay(500); // Simulate longer initial load
    return { ...this.data };
  }

  public async restoreDatabase(data: SystemData): Promise<void> {
    await delay(1000);
    this.data = {
      users: data.users || [],
      tickets: data.tickets || [],
      assets: data.assets || [],
      projects: data.projects || [],
      articles: data.articles || [],
      changes: data.changes || [],
      licenses: data.licenses || [],
      vendors: data.vendors || [],
      announcements: data.announcements || [],
      pmsTasks: data.pmsTasks || [],
      emailSettings: data.emailSettings || seedData().emailSettings
    };
    this.save();
  }

  // Authentication (NoSQL Authenticator Simulation)
  public auth = {
    login: async (email: string, password: string): Promise<User | null> => {
      await delay(500);
      const user = this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (user && user.password === password) {
        const { password, ...userWithoutPass } = user;
        return userWithoutPass as User;
      }
      return null;
    }
  };

  // Entities
  public tickets = {
    getAll: () => this.getList<Ticket>('tickets'),
    create: (item: Ticket) => this.createItem('tickets', item),
    update: (item: Partial<Ticket> & { id: string }) => this.updateItem('tickets', item),
    delete: (id: string) => this.deleteItem('tickets', id),
    import: async (items: Ticket[]) => {
      await delay(500);
      this.data.tickets = [...items, ...this.data.tickets];
      this.save();
      return this.data.tickets;
    }
  };

  public assets = {
    getAll: () => this.getList<Asset>('assets'),
    create: (item: Asset) => this.createItem('assets', item),
    update: (item: Partial<Asset> & { id: string }) => this.updateItem('assets', item),
    delete: (id: string) => this.deleteItem('assets', id),
    import: async (items: Asset[]) => {
      await delay(500);
      this.data.assets = [...items, ...this.data.assets];
      this.save();
      return this.data.assets;
    }
  };

  public users = {
    getAll: () => this.getList<User>('users'),
    create: (item: User) => this.createItem('users', item),
    update: (item: Partial<User> & { id: string }) => this.updateItem('users', item),
    delete: (id: string) => this.deleteItem('users', id)
  };

  public projects = {
    getAll: () => this.getList<Project>('projects'),
    create: (item: Project) => this.createItem('projects', item),
    update: (item: Partial<Project> & { id: string }) => this.updateItem('projects', item),
    delete: (id: string) => this.deleteItem('projects', id)
  };

  public articles = {
    getAll: () => this.getList<KnowledgeArticle>('articles'),
    create: (item: KnowledgeArticle) => this.createItem('articles', item),
    update: (item: Partial<KnowledgeArticle> & { id: string }) => this.updateItem('articles', item),
    delete: (id: string) => this.deleteItem('articles', id)
  };

  public changes = {
    getAll: () => this.getList<ChangeRequest>('changes'),
    create: (item: ChangeRequest) => this.createItem('changes', item),
    update: (item: Partial<ChangeRequest> & { id: string }) => this.updateItem('changes', item),
    delete: (id: string) => this.deleteItem('changes', id)
  };

  public licenses = {
    getAll: () => this.getList<SoftwareLicense>('licenses'),
    create: (item: SoftwareLicense) => this.createItem('licenses', item),
    update: (item: Partial<SoftwareLicense> & { id: string }) => this.updateItem('licenses', item),
    delete: (id: string) => this.deleteItem('licenses', id)
  };

  public vendors = {
    getAll: () => this.getList<Vendor>('vendors'),
    create: (item: Vendor) => this.createItem('vendors', item),
    update: (item: Partial<Vendor> & { id: string }) => this.updateItem('vendors', item),
    delete: (id: string) => this.deleteItem('vendors', id)
  };

  public announcements = {
    getAll: () => this.getList<Announcement>('announcements'),
    create: (item: Announcement) => this.createItem('announcements', item),
    update: (item: Partial<Announcement> & { id: string }) => this.updateItem('announcements', item),
    delete: (id: string) => this.deleteItem('announcements', id)
  };

  public pms = {
    getAll: () => this.getList<PMSTask>('pmsTasks'),
    create: (item: PMSTask) => this.createItem('pmsTasks', item),
    update: (item: Partial<PMSTask> & { id: string }) => this.updateItem('pmsTasks', item),
    delete: (id: string) => this.deleteItem('pmsTasks', id)
  };

  public settings = {
    getEmail: async () => {
      await delay(200);
      return this.data.emailSettings;
    },
    updateEmail: async (settings: EmailSettings) => {
      await delay(300);
      this.data.emailSettings = settings;
      this.save();
      return settings;
    }
  }
}

export const api = new MockApi();
