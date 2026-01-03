import axios, { AxiosResponse } from "axios";
import {
  ApiResponse,
  AuthResponse,
  User,
  Complaint,
  Category,
  LoginForm,
  RegisterForm,
  ComplaintForm,
  DashboardStats,
  TrendData,
  CategoryAnalytics,
  StaffAnalytics,
  StaffWorkload,
  AssignmentData,
  EscalationPreview,
  AtRiskComplaint,
  JobStatus,
  PaginationParams,
  ComplaintFilters,
} from "../types";

// Configure axios defaults
const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // This is important for cookies
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Authentication API
export const authApi = {
  register: (userData: RegisterForm): Promise<AuthResponse> =>
    api.post("/auth/register", userData).then((res) => res.data),

  login: (credentials: LoginForm): Promise<AuthResponse> =>
    api.post("/auth/login", credentials).then((res) => res.data),

  logout: (): Promise<ApiResponse> =>
    api.post("/auth/logout").then((res) => res.data),

  getMe: (): Promise<ApiResponse<User>> =>
    api.get("/auth/me").then((res) => res.data),

  refreshToken: (): Promise<ApiResponse<{ token: string }>> =>
    api.post("/auth/refresh").then((res) => res.data),
};

// Complaints API
export const complaintsApi = {
  getComplaints: (
    params: PaginationParams & ComplaintFilters
  ): Promise<ApiResponse<Complaint[]>> =>
    api.get("/complaints", { params }).then((res) => res.data),

  getComplaintById: (id: string): Promise<ApiResponse<Complaint>> =>
    api.get(`/complaints/${id}`).then((res) => res.data),

  createComplaint: (
    complaintData: ComplaintForm
  ): Promise<ApiResponse<Complaint>> =>
    api.post("/complaints", complaintData).then((res) => res.data),

  updateComplaint: (
    id: string,
    updates: Partial<Complaint>
  ): Promise<ApiResponse<Complaint>> =>
    api.put(`/complaints/${id}`, updates).then((res) => res.data),

  updateStatus: (
    id: string,
    status: string,
    remarks?: string
  ): Promise<ApiResponse<Complaint>> =>
    api
      .patch(`/complaints/${id}/status`, { status, remarks })
      .then((res) => res.data),

  assignComplaint: (
    id: string,
    assignedTo: string
  ): Promise<ApiResponse<Complaint>> =>
    api
      .patch(`/complaints/${id}/assign`, { assignedTo })
      .then((res) => res.data),

  deleteComplaint: (id: string): Promise<ApiResponse> =>
    api.delete(`/complaints/${id}`).then((res) => res.data),

  uploadAttachment: (id: string, file: File): Promise<ApiResponse> => {
    const formData = new FormData();
    formData.append("attachment", file);
    return api
      .post(`/complaints/${id}/attachments`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((res) => res.data);
  },

  addInternalNote: (
    id: string,
    note: string
  ): Promise<ApiResponse<Complaint>> =>
    api.post(`/complaints/${id}/notes`, { note }).then((res) => res.data),
};

// Categories API
export const categoriesApi = {
  getCategories: (): Promise<ApiResponse<Category[]>> =>
    api.get("/admin/categories").then((res) => res.data),

  getCategoryById: (id: string): Promise<ApiResponse<Category>> =>
    api.get(`/admin/categories/${id}`).then((res) => res.data),

  createCategory: (
    categoryData: Partial<Category>
  ): Promise<ApiResponse<Category>> =>
    api.post("/admin/categories", categoryData).then((res) => res.data),

  updateCategory: (
    id: string,
    updates: Partial<Category>
  ): Promise<ApiResponse<Category>> =>
    api.put(`/admin/categories/${id}`, updates).then((res) => res.data),

  deleteCategory: (id: string): Promise<ApiResponse> =>
    api.delete(`/admin/categories/${id}`).then((res) => res.data),
};

// Admin API
export const adminApi = {
  getDashboard: (): Promise<ApiResponse<DashboardStats>> =>
    api.get("/admin/dashboard").then((res) => res.data),

  getUsers: (params?: PaginationParams): Promise<ApiResponse<User[]>> =>
    api.get("/admin/users", { params }).then((res) => res.data),

  updateUser: (
    id: string,
    updates: Partial<User>
  ): Promise<ApiResponse<User>> =>
    api.patch(`/admin/users/${id}`, updates).then((res) => res.data),

  // Analytics endpoints
  getOverviewAnalytics: (dateRange?: {
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<DashboardStats>> =>
    api
      .get("/admin/analytics/overview", { params: dateRange })
      .then((res) => res.data),

  getAnalyticsReport: (options?: {
    startDate?: string;
    endDate?: string;
    trendDays?: number;
  }): Promise<ApiResponse<any>> =>
    api
      .get("/admin/analytics/report", { params: options })
      .then((res) => res.data),

  // Escalation management
  getEscalationPreview: (): Promise<ApiResponse<EscalationPreview>> =>
    api.get("/admin/escalations/preview").then((res) => res.data),

  getAtRiskComplaints: (
    hours?: number
  ): Promise<ApiResponse<AtRiskComplaint[]>> =>
    api
      .get("/admin/escalations/at-risk", { params: { hours } })
      .then((res) => res.data),

  getEscalationStats: (dateRange?: {
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<any>> =>
    api
      .get("/admin/escalations/stats", { params: dateRange })
      .then((res) => res.data),

  manualEscalation: (
    complaintId: string,
    reason?: string
  ): Promise<ApiResponse<Complaint>> =>
    api
      .post("/admin/escalations/manual", { complaintId, reason })
      .then((res) => res.data),

  // Background jobs management
  getJobStatus: (): Promise<ApiResponse<JobStatus>> =>
    api.get("/admin/jobs/status").then((res) => res.data),

  runEscalationManually: (): Promise<ApiResponse<any>> =>
    api.post("/admin/jobs/escalation/run").then((res) => res.data),
};

// Staff API
export const staffApi = {
  getDashboard: (): Promise<ApiResponse<any>> =>
    api.get("/staff/dashboard").then((res) => res.data),

  getAllStaff: (
    params?: PaginationParams & { department?: string; isActive?: boolean }
  ): Promise<ApiResponse<StaffWorkload[]>> =>
    api.get("/staff", { params }).then((res) => res.data),

  assignComplaint: (
    assignmentData: AssignmentData
  ): Promise<ApiResponse<Complaint>> =>
    api.post("/staff/assign", assignmentData).then((res) => res.data),

  autoAssignComplaint: (complaintId: string): Promise<ApiResponse<any>> =>
    api.post("/staff/auto-assign", { complaintId }).then((res) => res.data),

  getAvailableStaff: (
    categoryId: string,
    priorityLevel?: string
  ): Promise<ApiResponse<any>> =>
    api
      .get(`/staff/available/${categoryId}`, { params: { priorityLevel } })
      .then((res) => res.data),

  getStaffPerformance: (
    staffId: string,
    days?: number
  ): Promise<ApiResponse<any>> =>
    api
      .get(`/staff/performance/${staffId}`, { params: { days } })
      .then((res) => res.data),
};

// Export default API instance for custom requests
export default api;

// Utility functions for common operations
export const apiUtils = {
  // Handle API errors consistently
  handleApiError: (error: any) => {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.response?.data?.errors) {
      return error.response.data.errors
        .map((err: any) => err.message || err.msg)
        .join(", ");
    }
    if (error.message) {
      return error.message;
    }
    return "An unexpected error occurred";
  },

  // Format date for API requests
  formatDateForApi: (date: Date): string => {
    return date.toISOString();
  },

  // Parse API date responses
  parseApiDate: (dateString: string): Date => {
    return new Date(dateString);
  },

  // Build query parameters from filters
  buildQueryParams: (
    filters: ComplaintFilters & PaginationParams
  ): Record<string, any> => {
    const params: Record<string, any> = {};

    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;
    if (filters.sortBy) params.sortBy = filters.sortBy;
    if (filters.sortOrder) params.sortOrder = filters.sortOrder;
    if (filters.status) params.status = filters.status.join(",");
    if (filters.priority) params.priority = filters.priority.join(",");
    if (filters.category) params.category = filters.category;
    if (filters.assignedTo) params.assignedTo = filters.assignedTo;
    if (filters.search) params.search = filters.search;
    if (filters.dateRange) {
      params.startDate = apiUtils.formatDateForApi(filters.dateRange.start);
      params.endDate = apiUtils.formatDateForApi(filters.dateRange.end);
    }

    return params;
  },
};
