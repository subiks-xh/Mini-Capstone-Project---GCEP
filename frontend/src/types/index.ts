// User Types
export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  department?: string;
  role: "user" | "staff" | "admin";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Complaint Types
export interface Complaint {
  _id: string;
  ticketId: string;
  title: string;
  description: string;
  category: Category;
  priority: "low" | "medium" | "high" | "urgent";
  status:
    | "submitted"
    | "assigned"
    | "in-progress"
    | "escalated"
    | "resolved"
    | "closed";
  user: User;
  assignedTo?: User;
  contactMethod: "email" | "phone" | "in-person";
  deadline: string;
  resolvedAt?: string;
  escalation: {
    isEscalated: boolean;
    escalatedAt?: string;
    escalatedBy?: string;
    reason?: string;
  };
  statusHistory: StatusHistoryItem[];
  attachments: Attachment[];
  internalNotes: InternalNote[];
  createdAt: string;
  updatedAt: string;
}

export interface StatusHistoryItem {
  status: string;
  timestamp: string;
  updatedBy: string;
  remarks?: string;
}

export interface Attachment {
  _id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  uploadedAt: string;
  uploadedBy: {
    name: string;
    email: string;
  };
}

export interface InternalNote {
  note: string;
  addedBy: User;
  addedAt: string;
}

// Category Types
export interface Category {
  _id: string;
  name: string;
  description: string;
  department: string;
  resolutionTimeHours: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Feedback Types
export interface Feedback {
  _id: string;
  complaint: string;
  user: string;
  overallRating: number;
  responseTimeRating: number;
  resolutionQualityRating: number;
  communicationRating: number;
  comments?: string;
  createdAt: string;
}

// Dashboard Analytics Types
export interface DashboardStats {
  overview: {
    totalComplaints: number;
    activeComplaints: number;
    resolvedComplaints: number;
    overdueComplaints: number;
    escalatedComplaints: number;
    avgResolutionTimeHours: string;
  };
  breakdown: {
    status: Record<string, number>;
    priority: Record<string, number>;
  };
  performance: {
    resolutionRate: string;
    escalationRate: string;
  };
}

export interface TrendData {
  period: string;
  granularity: "hour" | "day" | "week" | "month";
  data: {
    period: string;
    submitted: number;
    resolved: number;
    escalated: number;
  }[];
  summary: {
    totalPeriods: number;
    totalSubmitted: number;
    totalResolved: number;
    totalEscalated: number;
  };
}

export interface CategoryAnalytics {
  categories: {
    _id: string;
    categoryName: string;
    department: string;
    totalComplaints: number;
    resolved: number;
    escalated: number;
    avgResolutionTime: string;
    resolutionRate: string;
    escalationRate: string;
    priorityBreakdown: Record<string, number>;
  }[];
  summary: {
    totalCategories: number;
    mostActiveCategory: string;
    avgResolutionRate: string;
  };
}

export interface StaffAnalytics {
  staff: {
    _id: string;
    staffName: string;
    staffEmail: string;
    department: string;
    role: string;
    totalAssigned: number;
    resolved: number;
    escalated: number;
    avgResolutionTime: string;
    resolutionRate: string;
    escalationRate: string;
  }[];
  summary: {
    totalActiveStaff: number;
    avgResolutionRate: string;
    topPerformer: any;
  };
}

// Staff Management Types
export interface StaffWorkload {
  _id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  workload: {
    total: number;
    byPriority: Record<string, number>;
    availabilityScore: number;
  };
  recommended: boolean;
}

export interface AssignmentData {
  complaintId: string;
  staffId: string;
  priority?: string;
  notes?: string;
}

// Escalation Types
export interface EscalationPreview {
  count: number;
  complaints: {
    id: string;
    title: string;
    user: string;
    category: string;
    deadline: string;
    overdueHours: number;
    assignedTo: string;
  }[];
}

export interface AtRiskComplaint extends Complaint {
  hoursUntilDeadline: number;
  minutesUntilDeadline: number;
  riskLevel: "low" | "medium" | "high" | "critical";
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any[];
  pagination?: {
    current: number;
    pages: number;
    total: number;
  };
}

// Authentication Response (direct user and token in response)
export interface AuthResponse {
  success: boolean;
  message?: string;
  user: User;
  token: string;
  errors?: any[];
}

// Form Types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
  department?: string;
}

export interface ComplaintForm {
  title: string;
  description: string;
  category: string;
  priority: "low" | "medium" | "high" | "urgent";
  contactMethod: "email" | "phone" | "in-person";
}

export interface UpdateStatusForm {
  status: string;
  remarks?: string;
}

// Context Types
export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterForm) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

export interface NotificationContextType {
  notifications: Notification[];
  addNotification: (
    notification: Omit<Notification, "id" | "timestamp">
  ) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  timestamp: Date;
  autoClose?: boolean;
}

// Table Column Types
export interface TableColumn {
  field: string;
  headerName: string;
  width?: number;
  flex?: number;
  sortable?: boolean;
  filterable?: boolean;
  renderCell?: (params: any) => React.ReactNode;
}

// Filter Types
export interface ComplaintFilters {
  status?: string;
  priority?: string;
  category?: string;
  assignedTo?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  search?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// Job Status Types
export interface JobStatus {
  escalationJob: {
    isActive: boolean;
    isRunning: boolean;
    intervalMinutes: number;
    nextRun: string | null;
  };
  timestamp: Date;
}
