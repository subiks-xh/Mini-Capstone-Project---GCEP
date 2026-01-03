import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
} from "react";
import { User, AuthContextType, LoginForm, RegisterForm } from "../types";
import { authApi, apiUtils } from "../services/api";

// Auth Actions
type AuthAction =
  | { type: "LOGIN_START" }
  | { type: "LOGIN_SUCCESS"; payload: { user: User; token: string } }
  | { type: "LOGIN_FAILURE"; payload: string }
  | { type: "REGISTER_START" }
  | { type: "REGISTER_SUCCESS"; payload: { user: User; token: string } }
  | { type: "REGISTER_FAILURE"; payload: string }
  | { type: "LOGOUT" }
  | { type: "UPDATE_USER"; payload: Partial<User> }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "CLEAR_ERROR" };

// Auth State
interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem("token"),
  isLoading: false,
  isAuthenticated: false,
  error: null,
};

// Auth Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case "LOGIN_START":
    case "REGISTER_START":
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case "LOGIN_SUCCESS":
    case "REGISTER_SUCCESS":
      localStorage.setItem("token", action.payload.token);
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      };

    case "LOGIN_FAILURE":
    case "REGISTER_FAILURE":
      localStorage.removeItem("token");
      return {
        ...state,
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
        error: action.payload,
      };

    case "LOGOUT":
      localStorage.removeItem("token");
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        error: null,
      };

    case "UPDATE_USER":
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };

    case "SET_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      };

    case "CLEAR_ERROR":
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
};

// Create Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth Provider Component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check if user is authenticated on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          dispatch({ type: "SET_LOADING", payload: true });
          const response = await authApi.getMe();

          if (response.success && response.data) {
            dispatch({
              type: "LOGIN_SUCCESS",
              payload: { user: response.data, token },
            });
          } else {
            localStorage.removeItem("token");
            dispatch({ type: "LOGOUT" });
          }
        } catch (error) {
          console.error("Auth initialization error:", error);
          localStorage.removeItem("token");
          dispatch({ type: "LOGOUT" });
        } finally {
          dispatch({ type: "SET_LOADING", payload: false });
        }
      }
    };

    initializeAuth();
  }, []);

  // Login function
  const login = async (email: string, password: string): Promise<void> => {
    try {
      dispatch({ type: "LOGIN_START" });

      const response = await authApi.login({ email, password });

      if (response.success && response.user && response.token) {
        dispatch({
          type: "LOGIN_SUCCESS",
          payload: {
            user: response.user,
            token: response.token,
          },
        });
      } else {
        throw new Error(response.message || "Login failed");
      }
    } catch (error) {
      const errorMessage = apiUtils.handleApiError(error);
      dispatch({ type: "LOGIN_FAILURE", payload: errorMessage });
      throw error;
    }
  };

  // Register function
  const register = async (userData: RegisterForm): Promise<void> => {
    try {
      dispatch({ type: "REGISTER_START" });

      const response = await authApi.register(userData);

      if (response.success && response.user && response.token) {
        dispatch({
          type: "REGISTER_SUCCESS",
          payload: {
            user: response.user,
            token: response.token,
          },
        });
      } else {
        throw new Error(response.message || "Registration failed");
      }
    } catch (error) {
      const errorMessage = apiUtils.handleApiError(error);
      dispatch({ type: "REGISTER_FAILURE", payload: errorMessage });
      throw error;
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error("Logout error:", error);
      // Continue with logout even if API call fails
    } finally {
      dispatch({ type: "LOGOUT" });
    }
  };

  // Update user function
  const updateUser = (userData: Partial<User>): void => {
    dispatch({ type: "UPDATE_USER", payload: userData });
  };

  // Clear error function
  const clearError = (): void => {
    dispatch({ type: "CLEAR_ERROR" });
  };

  // Context value
  const contextValue: AuthContextType = {
    user: state.user,
    token: state.token,
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
    login,
    register,
    logout,
    updateUser,
  };

  // Add error and clearError to context if needed
  const extendedContextValue = {
    ...contextValue,
    error: state.error,
    clearError,
  };

  return (
    <AuthContext.Provider value={extendedContextValue as AuthContextType}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// HOC for protecting routes
export const withAuth = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  allowedRoles?: string[]
) => {
  return (props: P) => {
    const { isAuthenticated, user, isLoading } = useAuth();

    if (isLoading) {
      return <div>Loading...</div>; // You can replace this with a proper loading component
    }

    if (!isAuthenticated || !user) {
      window.location.href = "/login";
      return null;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return <div>Access Denied</div>; // You can replace this with a proper error component
    }

    return <WrappedComponent {...props} />;
  };
};

// Route protection utilities
export const ProtectedRoute: React.FC<{
  children: ReactNode;
  allowedRoles?: string[];
  fallback?: ReactNode;
}> = ({ children, allowedRoles, fallback }) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>; // Loading spinner
  }

  if (!isAuthenticated || !user) {
    return <div>{fallback || "Please log in to access this page."}</div>;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <div>{fallback || "Access Denied. Insufficient permissions."}</div>;
  }

  return <>{children}</>;
};

export default AuthContext;
