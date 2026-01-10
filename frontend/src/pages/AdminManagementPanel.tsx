import React, { useState, useEffect } from "react";
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Tooltip,
  Avatar,
  Badge,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Block as BlockIcon,
  CheckCircle as ActivateIcon,
  SupervisorAccount as AdminIcon,
  Support as StaffIcon,
  Person as UserIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
} from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import { useNotificationHelpers } from "../context/NotificationContext";
import { useRealtimeNotifications } from "../context/RealtimeNotificationContext";
import { adminApi } from "../services/api";
import { formatDate } from "../utils/helpers";

interface User {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "staff" | "user";
  isActive: boolean;
  department?: string;
  lastLoginAt?: string;
  createdAt: string;
  complaintCount?: number;
  assignedComplaintCount?: number;
}

interface Department {
  _id: string;
  name: string;
  description: string;
  staffCount: number;
  complaintCount: number;
  isActive: boolean;
}

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalComplaints: number;
  totalDepartments: number;
  recentActivity: Array<{
    type: string;
    message: string;
    timestamp: string;
    user?: string;
  }>;
}

const AdminManagementPanel: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess, showApiError } = useNotificationHelpers();
  const realtimeContext = useRealtimeNotifications();
  const connectedUsersCount = 0; // TODO: Implement connected users tracking

  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<
    "users" | "departments" | "system"
  >("users");

  // User management state
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    role: "user" as "admin" | "staff" | "user",
    department: "",
    isActive: true,
  });

  // Department management state
  const [departmentDialogOpen, setDepartmentDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(
    null
  );
  const [departmentForm, setDepartmentForm] = useState({
    name: "",
    description: "",
    isActive: true,
  });

  // System settings state
  const [systemSettings, setSystemSettings] = useState({
    allowUserRegistration: true,
    requireEmailVerification: false,
    maxComplaintsPerUser: 10,
    defaultResolutionTime: 72,
    enableRealTimeNotifications: true,
  });

  useEffect(() => {
    if (user?.role === "admin") {
      fetchAdminData();
    }
  }, [user]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [usersResponse, departmentsResponse, statsResponse] =
        await Promise.all([
          adminApi.getAllUsers(),
          adminApi.getAllDepartments(),
          adminApi.getSystemStats(),
        ]);

      if (usersResponse?.success) setUsers(usersResponse.data || []);
      if (departmentsResponse?.success)
        setDepartments(departmentsResponse.data || []);
      if (statsResponse?.success) setSystemStats(statsResponse.data);
    } catch (error) {
      showApiError(error, "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  // User Management Functions
  const handleCreateUser = () => {
    setEditingUser(null);
    setUserForm({
      name: "",
      email: "",
      role: "user",
      department: "",
      isActive: true,
    });
    setUserDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserForm({
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department || "",
      isActive: user.isActive,
    });
    setUserDialogOpen(true);
  };

  const handleSaveUser = async () => {
    try {
      if (editingUser) {
        const response = await adminApi.updateUser(editingUser._id, userForm);
        if (response.success) {
          showSuccess("Success", "User updated successfully");
          setUsers((prev) =>
            prev.map((u) =>
              u._id === editingUser._id ? (response.data as User) : u
            )
          );
        }
      } else {
        const response = await adminApi.createUser(userForm);
        if (response.success) {
          showSuccess("Success", "User created successfully");
          setUsers((prev) => [...prev, response.data as User]);
        }
      }
      setUserDialogOpen(false);
    } catch (error) {
      showApiError(error, "Failed to save user");
    }
  };

  const handleToggleUserStatus = async (
    userId: string,
    currentStatus: boolean
  ) => {
    try {
      const response = await adminApi.toggleUserStatus(userId);
      if (response.success) {
        showSuccess(
          "Success",
          `User ${!currentStatus ? "activated" : "deactivated"} successfully`
        );
        setUsers((prev) =>
          prev.map((u) =>
            u._id === userId ? { ...u, isActive: !currentStatus } : u
          )
        );
      }
    } catch (error) {
      showApiError(error, "Failed to update user status");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this user? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await adminApi.deleteUser(userId);
      if (response.success) {
        showSuccess("Success", "User deleted successfully");
        setUsers((prev) => prev.filter((u) => u._id !== userId));
      }
    } catch (error) {
      showApiError(error, "Failed to delete user");
    }
  };

  // Department Management Functions
  const handleCreateDepartment = () => {
    setEditingDepartment(null);
    setDepartmentForm({
      name: "",
      description: "",
      isActive: true,
    });
    setDepartmentDialogOpen(true);
  };

  const handleEditDepartment = (department: Department) => {
    setEditingDepartment(department);
    setDepartmentForm({
      name: department.name,
      description: department.description,
      isActive: department.isActive,
    });
    setDepartmentDialogOpen(true);
  };

  const handleSaveDepartment = async () => {
    try {
      if (editingDepartment) {
        const response = await adminApi.updateDepartment(
          editingDepartment._id,
          departmentForm
        );
        if (response.success) {
          showSuccess("Success", "Department updated successfully");
          setDepartments((prev) =>
            prev.map((d) =>
              d._id === editingDepartment._id ? response.data : d
            )
          );
        }
      } else {
        const response = await adminApi.createDepartment(departmentForm);
        if (response.success) {
          showSuccess("Success", "Department created successfully");
          setDepartments((prev) => [...prev, response.data]);
        }
      }
      setDepartmentDialogOpen(false);
    } catch (error) {
      showApiError(error, "Failed to save department");
    }
  };

  // Utility Functions
  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <AdminIcon color="error" />;
      case "staff":
        return <StaffIcon color="primary" />;
      default:
        return <UserIcon color="action" />;
    }
  };

  const getRoleColor = (
    role: string
  ):
    | "default"
    | "primary"
    | "secondary"
    | "error"
    | "info"
    | "success"
    | "warning" => {
    switch (role) {
      case "admin":
        return "error";
      case "staff":
        return "primary";
      default:
        return "default";
    }
  };

  const exportUserData = async () => {
    try {
      const response = await adminApi.exportUsers();
      // Handle file download
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `users-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      showApiError(error, "Failed to export user data");
    }
  };

  if (user?.role !== "admin") {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">
          Access denied. Admin privileges required.
        </Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="400px"
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={4}
      >
        <Typography variant="h4" component="h1">
          <SettingsIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          Admin Management Panel
        </Typography>

        <Box display="flex" gap={2} alignItems="center">
          <Badge
            color={realtimeContext.isConnected ? "success" : "error"}
            variant="dot"
          >
            <Chip
              icon={<NotificationsIcon />}
              label={`${connectedUsersCount} Connected`}
              color={realtimeContext.isConnected ? "success" : "error"}
              variant="outlined"
            />
          </Badge>

          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchAdminData}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* System Overview Cards */}
      {systemStats && (
        <Grid container spacing={3} mb={4}>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Users
                </Typography>
                <Typography variant="h4">{systemStats.totalUsers}</Typography>
                <Typography variant="body2" color="success.main">
                  {systemStats.activeUsers} active
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Complaints
                </Typography>
                <Typography variant="h4">
                  {systemStats.totalComplaints}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Departments
                </Typography>
                <Typography variant="h4">
                  {systemStats.totalDepartments}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  System Status
                </Typography>
                <Typography variant="h6" color="success.main">
                  Operational
                </Typography>
                <Typography variant="body2">All services running</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab Navigation */}
      <Paper sx={{ mb: 3 }}>
        <Box display="flex" borderBottom={1} borderColor="divider">
          {["users", "departments", "system"].map((tab) => (
            <Button
              key={tab}
              onClick={() => setSelectedTab(tab as any)}
              sx={{
                px: 3,
                py: 2,
                borderRadius: 0,
                backgroundColor:
                  selectedTab === tab ? "primary.main" : "transparent",
                color:
                  selectedTab === tab ? "primary.contrastText" : "text.primary",
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Button>
          ))}
        </Box>
      </Paper>

      {/* User Management Tab */}
      {selectedTab === "users" && (
        <Paper sx={{ p: 3 }}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={3}
          >
            <Typography variant="h6">User Management</Typography>
            <Box display="flex" gap={2}>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={exportUserData}
              >
                Export Users
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateUser}
              >
                Add User
              </Button>
            </Box>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Login</TableCell>
                  <TableCell>Complaints</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ width: 32, height: 32 }}>
                          {user.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {user.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {user.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getRoleIcon(user.role)}
                        label={user.role.toUpperCase()}
                        color={getRoleColor(user.role)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{user.department || "-"}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.isActive ? "Active" : "Inactive"}
                        color={user.isActive ? "success" : "error"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {user.lastLoginAt
                        ? formatDate(user.lastLoginAt)
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      {user.role === "user"
                        ? user.complaintCount || 0
                        : user.assignedComplaintCount || 0}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit user">
                        <IconButton
                          size="small"
                          onClick={() => handleEditUser(user)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip
                        title={
                          user.isActive ? "Deactivate user" : "Activate user"
                        }
                      >
                        <IconButton
                          size="small"
                          onClick={() =>
                            handleToggleUserStatus(user._id, user.isActive)
                          }
                        >
                          {user.isActive ? (
                            <BlockIcon color="error" />
                          ) : (
                            <ActivateIcon color="success" />
                          )}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete user">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteUser(user._id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Department Management Tab */}
      {selectedTab === "departments" && (
        <Paper sx={{ p: 3 }}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={3}
          >
            <Typography variant="h6">Department Management</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateDepartment}
            >
              Add Department
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Department Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Staff Count</TableCell>
                  <TableCell>Complaint Count</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {departments.map((department) => (
                  <TableRow key={department._id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {department.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="textSecondary">
                        {department.description}
                      </Typography>
                    </TableCell>
                    <TableCell>{department.staffCount}</TableCell>
                    <TableCell>{department.complaintCount}</TableCell>
                    <TableCell>
                      <Chip
                        label={department.isActive ? "Active" : "Inactive"}
                        color={department.isActive ? "success" : "error"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit department">
                        <IconButton
                          size="small"
                          onClick={() => handleEditDepartment(department)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* System Settings Tab */}
      {selectedTab === "system" && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            System Settings
          </Typography>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    General Settings
                  </Typography>

                  <Box display="flex" flexDirection="column" gap={2}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={systemSettings.allowUserRegistration}
                          onChange={(e) =>
                            setSystemSettings((prev) => ({
                              ...prev,
                              allowUserRegistration: e.target.checked,
                            }))
                          }
                        />
                      }
                      label="Allow User Registration"
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={systemSettings.requireEmailVerification}
                          onChange={(e) =>
                            setSystemSettings((prev) => ({
                              ...prev,
                              requireEmailVerification: e.target.checked,
                            }))
                          }
                        />
                      }
                      label="Require Email Verification"
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={systemSettings.enableRealTimeNotifications}
                          onChange={(e) =>
                            setSystemSettings((prev) => ({
                              ...prev,
                              enableRealTimeNotifications: e.target.checked,
                            }))
                          }
                        />
                      }
                      label="Enable Real-time Notifications"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Complaint Settings
                  </Typography>

                  <Box display="flex" flexDirection="column" gap={2}>
                    <TextField
                      label="Max Complaints Per User"
                      type="number"
                      value={systemSettings.maxComplaintsPerUser}
                      onChange={(e) =>
                        setSystemSettings((prev) => ({
                          ...prev,
                          maxComplaintsPerUser: parseInt(e.target.value),
                        }))
                      }
                      fullWidth
                    />

                    <TextField
                      label="Default Resolution Time (hours)"
                      type="number"
                      value={systemSettings.defaultResolutionTime}
                      onChange={(e) =>
                        setSystemSettings((prev) => ({
                          ...prev,
                          defaultResolutionTime: parseInt(e.target.value),
                        }))
                      }
                      fullWidth
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Box mt={3}>
            <Button variant="contained" color="primary">
              Save System Settings
            </Button>
          </Box>
        </Paper>
      )}

      {/* User Dialog */}
      <Dialog
        open={userDialogOpen}
        onClose={() => setUserDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingUser ? "Edit User" : "Create New User"}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Name"
              value={userForm.name}
              onChange={(e) =>
                setUserForm((prev) => ({ ...prev, name: e.target.value }))
              }
              fullWidth
              required
            />

            <TextField
              label="Email"
              type="email"
              value={userForm.email}
              onChange={(e) =>
                setUserForm((prev) => ({ ...prev, email: e.target.value }))
              }
              fullWidth
              required
            />

            <FormControl fullWidth required>
              <InputLabel>Role</InputLabel>
              <Select
                value={userForm.role}
                label="Role"
                onChange={(e) =>
                  setUserForm((prev) => ({
                    ...prev,
                    role: e.target.value as any,
                  }))
                }
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="staff">Staff</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>

            {userForm.role === "staff" && (
              <FormControl fullWidth>
                <InputLabel>Department</InputLabel>
                <Select
                  value={userForm.department}
                  label="Department"
                  onChange={(e) =>
                    setUserForm((prev) => ({
                      ...prev,
                      department: e.target.value,
                    }))
                  }
                >
                  {departments
                    .filter((d) => d.isActive)
                    .map((department) => (
                      <MenuItem key={department._id} value={department.name}>
                        {department.name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            )}

            <FormControlLabel
              control={
                <Switch
                  checked={userForm.isActive}
                  onChange={(e) =>
                    setUserForm((prev) => ({
                      ...prev,
                      isActive: e.target.checked,
                    }))
                  }
                />
              }
              label="Active"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveUser} variant="contained">
            {editingUser ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Department Dialog */}
      <Dialog
        open={departmentDialogOpen}
        onClose={() => setDepartmentDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingDepartment ? "Edit Department" : "Create New Department"}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Department Name"
              value={departmentForm.name}
              onChange={(e) =>
                setDepartmentForm((prev) => ({ ...prev, name: e.target.value }))
              }
              fullWidth
              required
            />

            <TextField
              label="Description"
              value={departmentForm.description}
              onChange={(e) =>
                setDepartmentForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              multiline
              rows={3}
              fullWidth
            />

            <FormControlLabel
              control={
                <Switch
                  checked={departmentForm.isActive}
                  onChange={(e) =>
                    setDepartmentForm((prev) => ({
                      ...prev,
                      isActive: e.target.checked,
                    }))
                  }
                />
              }
              label="Active"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDepartmentDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveDepartment} variant="contained">
            {editingDepartment ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminManagementPanel;
