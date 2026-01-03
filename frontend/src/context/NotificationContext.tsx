import React, { createContext, useContext, useReducer, ReactNode } from "react";
import { Notification, NotificationContextType } from "../types";

// Notification Actions
type NotificationAction =
  | {
      type: "ADD_NOTIFICATION";
      payload: Omit<Notification, "id" | "timestamp">;
    }
  | { type: "REMOVE_NOTIFICATION"; payload: string }
  | { type: "CLEAR_NOTIFICATIONS" };

// Notification State
interface NotificationState {
  notifications: Notification[];
}

const initialState: NotificationState = {
  notifications: [],
};

// Generate unique ID for notifications
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Notification Reducer
const notificationReducer = (
  state: NotificationState,
  action: NotificationAction
): NotificationState => {
  switch (action.type) {
    case "ADD_NOTIFICATION":
      const newNotification: Notification = {
        ...action.payload,
        id: generateId(),
        timestamp: new Date(),
        autoClose: action.payload.autoClose !== false, // Default to true
      };

      return {
        ...state,
        notifications: [...state.notifications, newNotification],
      };

    case "REMOVE_NOTIFICATION":
      return {
        ...state,
        notifications: state.notifications.filter(
          (notification) => notification.id !== action.payload
        ),
      };

    case "CLEAR_NOTIFICATIONS":
      return {
        ...state,
        notifications: [],
      };

    default:
      return state;
  }
};

// Create Context
const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

// Notification Provider Component
interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState);

  // Add notification function
  const addNotification = (
    notification: Omit<Notification, "id" | "timestamp">
  ): void => {
    dispatch({ type: "ADD_NOTIFICATION", payload: notification });

    // Auto-remove notification after 5 seconds if autoClose is true
    if (notification.autoClose !== false) {
      setTimeout(() => {
        removeNotification(generateId());
      }, 5000);
    }
  };

  // Remove notification function
  const removeNotification = (id: string): void => {
    dispatch({ type: "REMOVE_NOTIFICATION", payload: id });
  };

  // Clear all notifications function
  const clearNotifications = (): void => {
    dispatch({ type: "CLEAR_NOTIFICATIONS" });
  };

  // Context value
  const contextValue: NotificationContextType = {
    notifications: state.notifications,
    addNotification,
    removeNotification,
    clearNotifications,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

// Custom hook to use notification context
export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
};

// Utility hooks for common notification types
export const useNotificationHelpers = () => {
  const { addNotification } = useNotification();

  return {
    showSuccess: (title: string, message: string) => {
      addNotification({
        type: "success",
        title,
        message,
        autoClose: true,
      });
    },

    showError: (title: string, message: string, autoClose: boolean = false) => {
      addNotification({
        type: "error",
        title,
        message,
        autoClose,
      });
    },

    showWarning: (title: string, message: string) => {
      addNotification({
        type: "warning",
        title,
        message,
        autoClose: true,
      });
    },

    showInfo: (title: string, message: string) => {
      addNotification({
        type: "info",
        title,
        message,
        autoClose: true,
      });
    },

    // API error helper
    showApiError: (error: any, title: string = "Error") => {
      let message = "An unexpected error occurred";

      if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.response?.data?.errors) {
        message = error.response.data.errors
          .map((err: any) => err.message || err.msg)
          .join(", ");
      } else if (error.message) {
        message = error.message;
      }

      addNotification({
        type: "error",
        title,
        message,
        autoClose: false, // Keep error messages visible
      });
    },

    // API success helper
    showApiSuccess: (message: string, title: string = "Success") => {
      addNotification({
        type: "success",
        title,
        message,
        autoClose: true,
      });
    },
  };
};

export default NotificationContext;
