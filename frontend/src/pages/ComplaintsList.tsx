import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  IconButton,
  Tooltip,
  TablePagination,
  Alert,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Sort as SortIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotificationHelpers } from "../context/NotificationContext";
import { complaintsApi, categoriesApi, usersApi } from "../services/api";
import SearchAndFilter from "../components/common/SearchAndFilter";
import type { Complaint, Category } from "../types";

const ComplaintsList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showApiError } = useNotificationHelpers();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Sorting state
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [sortMenuAnchor, setSortMenuAnchor] = useState<null | HTMLElement>(
    null
  );

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<any>({});

  const [showFilters, setShowFilters] = useState(false);

  // Load initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [categoriesResponse, staffResponse] = await Promise.all([
          categoriesApi.getCategories(),
          user?.role === "admin" || user?.role === "staff"
            ? usersApi.getStaffMembers()
            : Promise.resolve({ success: true, data: [] }),
        ]);

        if (categoriesResponse.success && categoriesResponse.data) {
          setCategories(categoriesResponse.data);
        }

        if (staffResponse.success && staffResponse.data) {
          setStaffMembers(staffResponse.data);
        }

        // Load departments if user has access
        if (user?.role === "admin") {
          try {
            const departmentsResponse = await usersApi.getDepartments();
            if (departmentsResponse.success && departmentsResponse.data) {
              setDepartments(departmentsResponse.data);
            }
          } catch (error) {
            console.error("Failed to load departments:", error);
          }
        }
      } catch (error) {
        console.error("Failed to load initial data:", error);
      }
    };

    fetchInitialData();
  }, [user]);

  // Load complaints
  useEffect(() => {
    fetchComplaints();
  }, [page, rowsPerPage, searchTerm, filters, sortBy, sortOrder]);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      // Build query parameters
      const queryParams: any = {
        page: page + 1,
        limit: rowsPerPage,
        sortBy,
        sortOrder,
      };

      // Add search term if provided
      if (searchTerm.trim()) {
        queryParams.search = searchTerm.trim();
      }

      // Add filters
      if (filters.status && filters.status.length > 0) {
        queryParams.status = filters.status.join(",");
      }
      if (filters.priority && filters.priority.length > 0) {
        queryParams.priority = filters.priority.join(",");
      }
      if (filters.category && filters.category.length > 0) {
        queryParams.category = filters.category.join(",");
      }
      if (filters.assignedTo && filters.assignedTo.length > 0) {
        queryParams.assignedTo = filters.assignedTo.join(",");
      }
      if (filters.department && filters.department.length > 0) {
        queryParams.department = filters.department.join(",");
      }
      if (filters.dateRange?.start) {
        queryParams.startDate = filters.dateRange.start.toISOString();
      }
      if (filters.dateRange?.end) {
        queryParams.endDate = filters.dateRange.end.toISOString();
      }
      if (filters.escalated !== null) {
        queryParams.escalated = filters.escalated;
      }
      if (filters.hasAttachments !== null) {
        queryParams.hasAttachments = filters.hasAttachments;
      }
      if (
        filters.resolutionTime &&
        (filters.resolutionTime[0] !== 0 || filters.resolutionTime[1] !== 168)
      ) {
        queryParams.minResolutionTime = filters.resolutionTime[0];
        queryParams.maxResolutionTime = filters.resolutionTime[1];
      }
      if (filters.tags && filters.tags.length > 0) {
        queryParams.tags = filters.tags.join(",");
      }

      const response = await complaintsApi.getComplaints(queryParams);

      if (response.success && response.data) {
        setComplaints(response.data);
        setTotalCount(response.pagination?.total || 0);
      }
    } catch (error) {
      showApiError(error, "Failed to load complaints");
    } finally {
      setLoading(false);
    }
  };

  // Handle search and filter changes
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setPage(0); // Reset to first page when searching
  };

  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters);
    setPage(0); // Reset to first page when filtering
  };

  // Handle sorting
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setSortMenuAnchor(null);
  };

  // Handle export
  const handleExport = async () => {
    try {
      // Build the same query parameters used for fetching
      const queryParams: any = {
        search: searchTerm.trim() || undefined,
        sortBy,
        sortOrder,
        export: true,
        format: "csv",
      };

      // Add filters
      Object.keys(filters).forEach((key) => {
        const value = filters[key];
        if (value !== null && value !== undefined) {
          if (Array.isArray(value) && value.length > 0) {
            queryParams[key] = value.join(",");
          } else if (key === "dateRange") {
            if (value.start) queryParams.startDate = value.start.toISOString();
            if (value.end) queryParams.endDate = value.end.toISOString();
          } else if (
            key === "resolutionTime" &&
            (value[0] !== 0 || value[1] !== 168)
          ) {
            queryParams.minResolutionTime = value[0];
            queryParams.maxResolutionTime = value[1];
          } else {
            queryParams[key] = value;
          }
        }
      });

      const response = await complaintsApi.exportComplaints(queryParams);

      // Create and trigger download
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `complaints-export-${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      showApiError(error, "Failed to export complaints");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
        return "info";
      case "assigned":
        return "primary";
      case "in-progress":
        return "warning";
      case "resolved":
        return "success";
      case "closed":
        return "default";
      case "escalated":
        return "error";
      default:
        return "default";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low":
        return "success";
      case "medium":
        return "warning";
      case "high":
        return "error";
      case "urgent":
        return "error";
      default:
        return "default";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find((cat) => cat._id === categoryId);
    return category?.name || "Unknown";
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" component="h1">
          {user?.role === "user" ? "My Complaints" : "All Complaints"}
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<SortIcon />}
            onClick={(e) => setSortMenuAnchor(e.currentTarget)}
          >
            Sort:{" "}
            {sortBy === "createdAt"
              ? "Created"
              : sortBy === "updatedAt"
              ? "Updated"
              : "Priority"}
            {sortOrder === "asc" ? (
              <ArrowUpIcon sx={{ ml: 1 }} />
            ) : (
              <ArrowDownIcon sx={{ ml: 1 }} />
            )}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate("/complaints/create")}
          >
            Create Complaint
          </Button>
        </Box>
      </Box>

      {/* Sort Menu */}
      <Menu
        anchorEl={sortMenuAnchor}
        open={Boolean(sortMenuAnchor)}
        onClose={() => setSortMenuAnchor(null)}
      >
        <MenuItem onClick={() => handleSort("createdAt")}>
          <ListItemIcon>
            {sortBy === "createdAt" && sortOrder === "asc" ? (
              <ArrowUpIcon />
            ) : sortBy === "createdAt" && sortOrder === "desc" ? (
              <ArrowDownIcon />
            ) : null}
          </ListItemIcon>
          <ListItemText>Created Date</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleSort("updatedAt")}>
          <ListItemIcon>
            {sortBy === "updatedAt" && sortOrder === "asc" ? (
              <ArrowUpIcon />
            ) : sortBy === "updatedAt" && sortOrder === "desc" ? (
              <ArrowDownIcon />
            ) : null}
          </ListItemIcon>
          <ListItemText>Updated Date</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleSort("priority")}>
          <ListItemIcon>
            {sortBy === "priority" && sortOrder === "asc" ? (
              <ArrowUpIcon />
            ) : sortBy === "priority" && sortOrder === "desc" ? (
              <ArrowDownIcon />
            ) : null}
          </ListItemIcon>
          <ListItemText>Priority</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleSort("status")}>
          <ListItemIcon>
            {sortBy === "status" && sortOrder === "asc" ? (
              <ArrowUpIcon />
            ) : sortBy === "status" && sortOrder === "desc" ? (
              <ArrowDownIcon />
            ) : null}
          </ListItemIcon>
          <ListItemText>Status</ListItemText>
        </MenuItem>
      </Menu>

      {/* Advanced Search and Filters */}
      <SearchAndFilter
        onSearch={handleSearch}
        onFiltersChange={handleFiltersChange}
        onExport={handleExport}
        categories={categories}
        departments={departments}
        staffMembers={staffMembers}
        initialFilters={filters}
        showSavedFilters={true}
      />
      {/* Complaints Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress />
            </Box>
          ) : complaints.length === 0 ? (
            <Alert severity="info" sx={{ m: 2 }}>
              {searchTerm ||
              Object.keys(filters).some((key) => {
                const value = filters[key];
                if (Array.isArray(value)) return value.length > 0;
                if (key === "dateRange") return value?.start || value?.end;
                return value !== null && value !== undefined;
              })
                ? "No complaints match your current search and filter criteria. Try adjusting your search terms or filters."
                : user?.role === "user"
                ? "You haven't submitted any complaints yet. Create your first complaint to get started!"
                : "No complaints found in the system."}
            </Alert>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Ticket ID</TableCell>
                      <TableCell>Title</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Priority</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell>Updated</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {complaints.map((complaint) => (
                      <TableRow key={complaint._id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            #
                            {complaint.ticketId ||
                              complaint._id.slice(-6).toUpperCase()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ maxWidth: 200 }}>
                            {complaint.title}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {getCategoryName(
                              typeof complaint.category === "string"
                                ? complaint.category
                                : complaint.category._id
                            )}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={complaint.status
                              .replace("-", " ")
                              .toUpperCase()}
                            color={getStatusColor(complaint.status) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={complaint.priority.toUpperCase()}
                            color={getPriorityColor(complaint.priority) as any}
                            size="small"
                            variant={
                              complaint.priority === "urgent"
                                ? "filled"
                                : "outlined"
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(complaint.createdAt)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(complaint.updatedAt)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="View Details">
                            <IconButton
                              onClick={() =>
                                navigate(`/complaints/${complaint._id}`)
                              }
                              color="primary"
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={totalCount}
                page={page}
                onPageChange={(event, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(event) => {
                  setRowsPerPage(parseInt(event.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[5, 10, 25, 50]}
              />
            </>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default ComplaintsList;
