import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  timestamp: string;
  read?: boolean;
  severity?: "info" | "warning" | "error" | "success";
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  socket: Socket | null;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;
  joinComplaintRoom: (complaintId: string) => void;
  leaveComplaintRoom: (complaintId: string) => void;
  startTyping: (complaintId: string) => void;
  stopTyping: (complaintId: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const useRealtimeNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useRealtimeNotifications must be used within a NotificationProvider"
    );
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const RealtimeNotificationProvider: React.FC<
  NotificationProviderProps
> = ({ children }) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Initialize socket connection
  useEffect(() => {
    if (!user || !token) {
      return;
    }

    const newSocket = io(
      process.env.REACT_APP_API_URL?.replace("/api", "") ||
        "http://localhost:5000",
      {
        auth: {
          token: token,
        },
        transports: ["websocket", "polling"],
      }
    );

    setSocket(newSocket);

    // Connection event handlers
    newSocket.on("connect", () => {
      console.log("Connected to notification service");
      setIsConnected(true);
    });

    newSocket.on("connected", (data) => {
      console.log("Connection confirmed:", data);
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from notification service");
      setIsConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      setIsConnected(false);
    });

    // Notification handlers
    newSocket.on("notification", (notification) => {
      const newNotification: Notification = {
        ...notification,
        id: generateNotificationId(),
        read: false,
        severity: getNotificationSeverity(notification.type),
      };

      setNotifications((prev) => [newNotification, ...prev]);

      // Show browser notification if permission granted
      if (Notification.permission === "granted") {
        showBrowserNotification(newNotification);
      }
    });

    newSocket.on("urgent_notification", (notification) => {
      const urgentNotification: Notification = {
        ...notification,
        id: generateNotificationId(),
        read: false,
        severity: "error",
      };

      setNotifications((prev) => [urgentNotification, ...prev]);

      // Always show urgent notifications
      if (Notification.permission === "granted") {
        showBrowserNotification(urgentNotification, true);
      }
    });

    newSocket.on("system_notification", (notification) => {
      const systemNotification: Notification = {
        ...notification,
        id: generateNotificationId(),
        read: false,
        severity: "info",
      };

      setNotifications((prev) => [systemNotification, ...prev]);
    });

    // Complaint-specific events
    newSocket.on("complaint_updated", (data) => {
      console.log("Complaint updated:", data);
      // This could trigger UI updates in complaint views
    });

    newSocket.on("user_typing", (data) => {
      console.log("User typing:", data);
      // Handle typing indicators
    });

    newSocket.on("user_stopped_typing", (data) => {
      console.log("User stopped typing:", data);
      // Handle typing indicators
    });

    newSocket.on("analytics_update", (data) => {
      console.log("Analytics updated:", data);
      // Could trigger analytics dashboard refresh
    });

    return () => {
      newSocket.close();
    };
  }, [user, token]);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        console.log("Notification permission:", permission);
      });
    }
  }, []);

  const generateNotificationId = () => {
    return `notification_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  };

  const getNotificationSeverity = (
    type: string
  ): "info" | "warning" | "error" | "success" => {
    switch (type) {
      case "complaint_created":
      case "file_upload":
        return "info";
      case "status_update":
      case "staff_assignment":
        return "success";
      case "deadline_reminder":
        return "warning";
      case "escalation":
      case "complaint_overdue":
        return "error";
      default:
        return "info";
    }
  };

  const showBrowserNotification = (
    notification: Notification,
    isUrgent = false
  ) => {
    if (document.hidden || isUrgent) {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: "/logo192.png",
        tag: notification.type,
        requireInteraction: isUrgent,
      });

      browserNotification.onclick = () => {
        window.focus();
        browserNotification.close();

        // Navigate to relevant page if applicable
        if (notification.data?.complaintId) {
          window.location.href = `/complaints/${notification.data.complaintId}`;
        }
      };

      // Auto-close after 5 seconds for non-urgent notifications
      if (!isUrgent) {
        setTimeout(() => {
          browserNotification.close();
        }, 5000);
      }
    }
  };

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, read: true }))
    );
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id)
    );
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const joinComplaintRoom = useCallback(
    (complaintId: string) => {
      if (socket) {
        socket.emit("join_complaint", complaintId);
      }
    },
    [socket]
  );

  const leaveComplaintRoom = useCallback(
    (complaintId: string) => {
      if (socket) {
        socket.emit("leave_complaint", complaintId);
      }
    },
    [socket]
  );

  const startTyping = useCallback(
    (complaintId: string) => {
      if (socket) {
        socket.emit("typing_start", { complaintId });
      }
    },
    [socket]
  );

  const stopTyping = useCallback(
    (complaintId: string) => {
      if (socket) {
        socket.emit("typing_end", { complaintId });
      }
    },
    [socket]
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isConnected,
    socket,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
    joinComplaintRoom,
    leaveComplaintRoom,
    startTyping,
    stopTyping,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default RealtimeNotificationProvider;
