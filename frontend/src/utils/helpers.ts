// Format file size in bytes to human readable format
export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

/**
 * Debounce function to limit the rate at which a function can fire
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay
 * @param immediate - Whether to trigger on the leading edge instead of trailing
 * @returns Debounced function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };

    const callNow = immediate && !timeout;

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(later, wait);

    if (callNow) func(...args);
  };
};

// Format date to human readable format
export const formatDate = (dateString: string | Date): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = diffInMs / (1000 * 60 * 60);

  // If less than 24 hours, show relative time
  if (diffInHours < 24) {
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      return diffInMinutes <= 1 ? "Just now" : `${diffInMinutes} minutes ago`;
    }
    const hours = Math.floor(diffInHours);
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }

  // Otherwise show formatted date
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Format complaint status for display
export const formatComplaintStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    submitted: "Submitted",
    pending: "Pending",
    in_progress: "In Progress",
    resolved: "Resolved",
    closed: "Closed",
    escalated: "Escalated",
  };

  return (
    statusMap[status] ||
    status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())
  );
};

// Format priority for display
export const formatPriority = (priority: string): string => {
  const priorityMap: Record<string, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
    urgent: "Urgent",
    critical: "Critical",
  };

  return (
    priorityMap[priority] ||
    priority.charAt(0).toUpperCase() + priority.slice(1)
  );
};

// Get color for complaint status
export const getStatusColor = (
  status: string
):
  | "default"
  | "primary"
  | "secondary"
  | "error"
  | "info"
  | "success"
  | "warning" => {
  const colorMap: Record<
    string,
    | "default"
    | "primary"
    | "secondary"
    | "error"
    | "info"
    | "success"
    | "warning"
  > = {
    submitted: "info",
    pending: "warning",
    in_progress: "primary",
    resolved: "success",
    closed: "default",
    escalated: "error",
  };

  return colorMap[status] || "default";
};

// Get color for priority
export const getPriorityColor = (
  priority: string
):
  | "default"
  | "primary"
  | "secondary"
  | "error"
  | "info"
  | "success"
  | "warning" => {
  const colorMap: Record<
    string,
    | "default"
    | "primary"
    | "secondary"
    | "error"
    | "info"
    | "success"
    | "warning"
  > = {
    low: "success",
    medium: "info",
    high: "warning",
    urgent: "error",
    critical: "error",
  };

  return colorMap[priority] || "default";
};

// Truncate text with ellipsis
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

// Validate email format
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Generate initials from name
export const getInitials = (name: string): string => {
  return name
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase()
    .substring(0, 2);
};

// Check if user can perform action based on role
export const canPerformAction = (
  userRole: string,
  requiredRoles: string[]
): boolean => {
  return requiredRoles.includes(userRole);
};

// Format phone number
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, "");
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phone;
};

// Calculate time remaining until deadline
export const getTimeRemaining = (deadline: string | Date): string => {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffInMs = deadlineDate.getTime() - now.getTime();

  if (diffInMs <= 0) {
    return "Overdue";
  }

  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  const diffInHours = Math.floor(
    (diffInMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );

  if (diffInDays > 0) {
    return `${diffInDays} day${diffInDays !== 1 ? "s" : ""} remaining`;
  } else if (diffInHours > 0) {
    return `${diffInHours} hour${diffInHours !== 1 ? "s" : ""} remaining`;
  } else {
    const diffInMinutes = Math.floor(
      (diffInMs % (1000 * 60 * 60)) / (1000 * 60)
    );
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""} remaining`;
  }
};

// Convert file to base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};
