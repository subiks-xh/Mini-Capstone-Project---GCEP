import React, { useState, useEffect } from "react";
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Button,
} from "@mui/material";
import {
  TrendingUp,
  TrendingDown,
  AccessTime,
  Assignment,
  CheckCircle,
  Error,
  Warning,
  Info,
  People,
  Category,
  Timeline as TimelineIcon,
  Download,
  Refresh,
  Dashboard as DashboardIcon,
} from "@mui/icons-material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { useAuth } from "../context/AuthContext";
import { useNotificationHelpers } from "../context/NotificationContext";
import { analyticsApi } from "../services/api";
import { formatDate, getStatusColor, getPriorityColor } from "../utils/helpers";

interface AnalyticsDashboardProps {}

interface StaffMetrics {
  _id: string;
  name: string;
  email: string;
  assigned: number;
  resolved: number;
  resolutionRate: number;
  avgResolutionTime: number;
}

interface DashboardStats {
  overview: {
    totalComplaints: number;
    pendingComplaints: number;
    inProgressComplaints: number;
    resolvedComplaints: number;
    escalatedComplaints: number;
    avgResolutionTime: {
      avgHours: number;
      count: number;
    };
  };
  categoryStats: Array<{
    _id: string;
    name: string;
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
    escalated: number;
  }>;
  priorityStats: Array<{
    _id: string;
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
    escalated: number;
  }>;
  statusTrends: Array<{
    _id: string;
    statusCounts: Array<{
      status: string;
      count: number;
    }>;
    total: number;
  }>;
}

interface StaffMetrics {
  _id: string;
  staffName: string;
  staffEmail: string;
  totalAssigned: number;
  resolved: number;
  inProgress: number;
  escalated: number;
  avgResolutionTime: number;
  resolutionRate: number;
  escalationRate: number;
}

const COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7300",
  "#0088fe",
  "#00c49f",
  "#ffbb28",
  "#ff8042",
];

const getPerformanceColor = (rate: number) => {
  if (rate >= 0.8) return "success.main";
  if (rate >= 0.6) return "warning.main";
  return "error.main";
};

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = () => {
  const { user } = useAuth();
  const { showApiError } = useNotificationHelpers();

  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(
    null
  );
  const [staffMetrics, setStaffMetrics] = useState<StaffMetrics[]>([]);
  const [volumeTrends, setVolumeTrends] = useState<any[]>([]);
  const [realtimeMetrics, setRealtimeMetrics] = useState<any>(null);
  const [timeframe, setTimeframe] = useState("30d");
  const [selectedView, setSelectedView] = useState<
    "overview" | "staff" | "trends"
  >("overview");

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeframe]);

  useEffect(() => {
    // Set up real-time updates
    const interval = setInterval(() => {
      fetchRealtimeMetrics();
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const [dashboardResponse, staffResponse, volumeResponse] =
        await Promise.all([
          analyticsApi.getDashboardStats(timeframe),
          user?.role === "admin"
            ? analyticsApi.getStaffPerformance(timeframe)
            : Promise.resolve({ data: [] }),
          analyticsApi.getVolumeTrends(timeframe),
        ]);

      if (dashboardResponse?.success) {
        setDashboardStats(dashboardResponse.data);
      }

      if (staffResponse && "data" in staffResponse) {
        setStaffMetrics(staffResponse.data);
      }

      if (volumeResponse?.success) {
        setVolumeTrends(volumeResponse.data);
      }

      await fetchRealtimeMetrics();
    } catch (error) {
      showApiError(error, "Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  const fetchRealtimeMetrics = async () => {
    try {
      const response = await analyticsApi.getRealtimeMetrics();
      if (response.success) {
        setRealtimeMetrics(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch realtime metrics:", error);
    }
  };

  const handleExportData = async () => {
    try {
      const response = await analyticsApi.exportData({
        format: "csv",
        timeframe,
        includeCategories: true,
        includeStaff: user?.role === "admin",
        includeResolutionTimes: true,
      });

      // Handle file download
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      showApiError(error, "Failed to export data");
    }
  };

  const getPerformanceColor = (rate: number) => {
    if (rate >= 80) return "success";
    if (rate >= 60) return "warning";
    return "error";
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      pending: <Warning color="warning" />,
      "in-progress": <AccessTime color="primary" />,
      resolved: <CheckCircle color="success" />,
      escalated: <Error color="error" />,
    };
    return icons[status as keyof typeof icons] || <Info />;
  };

  const renderOverviewCards = () => {
    if (!dashboardStats) return null;

    const { overview } = dashboardStats;

    return (
      <Grid container spacing={3} mb={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Assignment color="primary" sx={{ mr: 1 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total
                  </Typography>
                  <Typography variant="h5">
                    {overview.totalComplaints}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Warning color="warning" sx={{ mr: 1 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Pending
                  </Typography>
                  <Typography variant="h5">
                    {overview.pendingComplaints}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <AccessTime color="primary" sx={{ mr: 1 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    In Progress
                  </Typography>
                  <Typography variant="h5">
                    {overview.inProgressComplaints}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <CheckCircle color="success" sx={{ mr: 1 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Resolved
                  </Typography>
                  <Typography variant="h5">
                    {overview.resolvedComplaints}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Error color="error" sx={{ mr: 1 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Escalated
                  </Typography>
                  <Typography variant="h5">
                    {overview.escalatedComplaints}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <TrendingUp color="info" sx={{ mr: 1 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Avg Resolution
                  </Typography>
                  <Typography variant="h6">
                    {overview.avgResolutionTime.avgHours.toFixed(1)}h
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderCategoryChart = () => {
    if (!dashboardStats?.categoryStats) return null;

    const chartData = dashboardStats.categoryStats.map((stat) => ({
      name: stat.name,
      total: stat.total,
      resolved: stat.resolved,
      pending: stat.pending,
      escalated: stat.escalated,
    }));

    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Complaints by Category
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <RechartsTooltip />
            <Legend />
            <Bar dataKey="total" fill="#8884d8" name="Total" />
            <Bar dataKey="resolved" fill="#82ca9d" name="Resolved" />
            <Bar dataKey="pending" fill="#ffc658" name="Pending" />
            <Bar dataKey="escalated" fill="#ff7300" name="Escalated" />
          </BarChart>
        </ResponsiveContainer>
      </Paper>
    );
  };

  const renderPriorityChart = () => {
    if (!dashboardStats?.priorityStats) return null;

    const chartData = dashboardStats.priorityStats.map((stat) => ({
      name: stat._id.charAt(0).toUpperCase() + stat._id.slice(1),
      value: stat.total,
    }));

    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Priority Distribution
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(payload: any) => {
                const { name, value, percent } = payload;
                return `${name}: ${value} (${((percent || 0) * 100).toFixed(
                  0
                )}%)`;
              }}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <RechartsTooltip />
          </PieChart>
        </ResponsiveContainer>
      </Paper>
    );
  };

  const renderStaffPerformance = () => {
    if (!staffMetrics.length) return null;

    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Staff Performance Metrics
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Staff Member</TableCell>
                <TableCell align="right">Assigned</TableCell>
                <TableCell align="right">Resolved</TableCell>
                <TableCell align="right">Resolution Rate</TableCell>
                <TableCell align="right">Avg Time (hrs)</TableCell>
                <TableCell align="right">Escalation Rate</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {staffMetrics.map((staff) => (
                <TableRow key={staff._id}>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {staff.staffName}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {staff.staffEmail}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">{staff.totalAssigned}</TableCell>
                  <TableCell align="right">{staff.resolved}</TableCell>
                  <TableCell align="right">
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="flex-end"
                    >
                      <Chip
                        label={`${staff.resolutionRate.toFixed(1)}%`}
                        color={getPerformanceColor(staff.resolutionRate)}
                        size="small"
                      />
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    {staff.avgResolutionTime
                      ? staff.avgResolutionTime.toFixed(1)
                      : "-"}
                  </TableCell>
                  <TableCell align="right">
                    <Chip
                      label={`${staff.escalationRate.toFixed(1)}%`}
                      color={
                        staff.escalationRate > 10
                          ? "error"
                          : staff.escalationRate > 5
                          ? "warning"
                          : "success"
                      }
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    );
  };

  const renderVolumeTrends = () => {
    if (!volumeTrends.length) return null;

    const chartData = volumeTrends.map((trend) => ({
      date: trend._id,
      total: trend.total,
      highPriority: trend.highPriority,
      escalated: trend.escalated,
    }));

    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Volume Trends
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <RechartsTooltip />
            <Legend />
            <Area
              type="monotone"
              dataKey="total"
              stackId="1"
              stroke="#8884d8"
              fill="#8884d8"
            />
            <Area
              type="monotone"
              dataKey="highPriority"
              stackId="2"
              stroke="#82ca9d"
              fill="#82ca9d"
            />
            <Area
              type="monotone"
              dataKey="escalated"
              stackId="3"
              stroke="#ffc658"
              fill="#ffc658"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Paper>
    );
  };

  if (loading && !dashboardStats) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
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
        <Typography variant="h4" component="h1" gutterBottom>
          <DashboardIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          Analytics Dashboard
        </Typography>

        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Timeframe</InputLabel>
            <Select
              value={timeframe}
              label="Timeframe"
              onChange={(e) => setTimeframe(e.target.value)}
            >
              <MenuItem value="7d">Last 7 days</MenuItem>
              <MenuItem value="30d">Last 30 days</MenuItem>
              <MenuItem value="90d">Last 90 days</MenuItem>
              <MenuItem value="1y">Last year</MenuItem>
            </Select>
          </FormControl>

          <Tooltip title="Refresh data">
            <IconButton onClick={fetchAnalyticsData} disabled={loading}>
              <Refresh />
            </IconButton>
          </Tooltip>

          {user?.role === "admin" && (
            <Tooltip title="Export data">
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={handleExportData}
                size="small"
              >
                Export
              </Button>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Real-time Metrics */}
      {realtimeMetrics && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Real-time:</strong> {realtimeMetrics.todayComplaints} new
            complaints today, {realtimeMetrics.pendingComplaints} pending,{" "}
            {realtimeMetrics.overdueComplaints} overdue. Last updated:{" "}
            {formatDate(realtimeMetrics.lastUpdated)}
          </Typography>
        </Alert>
      )}

      {/* Overview Cards */}
      {renderOverviewCards()}

      {/* Navigation Tabs */}
      <Box display="flex" gap={2} mb={3}>
        <Button
          variant={selectedView === "overview" ? "contained" : "outlined"}
          onClick={() => setSelectedView("overview")}
        >
          Overview
        </Button>
        {user?.role === "admin" && (
          <Button
            variant={selectedView === "staff" ? "contained" : "outlined"}
            onClick={() => setSelectedView("staff")}
          >
            Staff Performance
          </Button>
        )}
        <Button
          variant={selectedView === "trends" ? "contained" : "outlined"}
          onClick={() => setSelectedView("trends")}
        >
          Trends
        </Button>
      </Box>

      {/* Content based on selected view */}
      {selectedView === "overview" && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>{renderCategoryChart()}</Grid>
          <Grid size={{ xs: 12, md: 4 }}>{renderPriorityChart()}</Grid>
        </Grid>
      )}

      {selectedView === "staff" && user?.role === "admin" && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>{renderStaffPerformance()}</Grid>
        </Grid>
      )}

      {selectedView === "trends" && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>{renderVolumeTrends()}</Grid>
        </Grid>
      )}
    </Container>
  );
};

export default AnalyticsDashboard;
