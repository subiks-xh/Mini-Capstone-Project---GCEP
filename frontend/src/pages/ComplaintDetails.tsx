import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Paper,
  Stack,
} from "@mui/material";
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
} from "@mui/lab";
import {
  ArrowBack as BackIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Category as CategoryIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  MeetingRoom as MeetingIcon,
  TrendingUp as EscalateIcon,
  CheckCircle as ResolvedIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Edit as EditIcon,
  Assignment as AssignmentIcon,
} from "@mui/icons-material";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotificationHelpers } from "../context/NotificationContext";
import { complaintsApi, categoriesApi } from "../services/api";
import StatusUpdateDialog from "../components/complaint/StatusUpdateDialog";
import StaffAssignmentDialog from "../components/complaint/StaffAssignmentDialog";
import FileUpload from "../components/common/FileUpload";
import type { Complaint, Category } from "../types";

const ComplaintDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showApiError } = useNotificationHelpers();

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusUpdateDialogOpen, setStatusUpdateDialogOpen] = useState(false);
  const [staffAssignmentDialogOpen, setStaffAssignmentDialogOpen] =
    useState(false);

  useEffect(() => {
    if (id) {
      fetchComplaintDetails();
    }
  }, [id]);

  const fetchComplaintDetails = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const response = await complaintsApi.getComplaintById(id);

      if (response.success && response.data) {
        setComplaint(response.data);

        // Fetch category details
        if (response.data.category) {
          try {
            const categoryResponse = await categoriesApi.getCategoryById(
              typeof response.data.category === "string"
                ? response.data.category
                : response.data.category._id
            );
            if (categoryResponse.success && categoryResponse.data) {
              setCategory(categoryResponse.data);
            }
          } catch (error) {
            console.error("Failed to load category details:", error);
          }
        }
      }
    } catch (error) {
      showApiError(error, "Failed to load complaint details");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchComplaintDetails();
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

  const getContactMethodIcon = (method: string) => {
    switch (method) {
      case "email":
        return <EmailIcon />;
      case "phone":
        return <PhoneIcon />;
      case "in-person":
        return <MeetingIcon />;
      default:
        return <InfoIcon />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "resolved":
        return <ResolvedIcon color="success" />;
      case "escalated":
        return <EscalateIcon color="error" />;
      case "in-progress":
        return <ScheduleIcon color="warning" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  const handleComplaintUpdate = (updatedComplaint: Complaint) => {
    setComplaint(updatedComplaint);
  };

  const canUpdateStatus =
    user?.role === "admin" ||
    (user?.role === "staff" &&
      complaint &&
      (typeof complaint.assignedTo === "string"
        ? complaint.assignedTo === user._id
        : complaint.assignedTo?._id === user._id));

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateTimeElapsed = (fromDate: string, toDate?: string) => {
    const from = new Date(fromDate);
    const to = toDate ? new Date(toDate) : new Date();
    const diffMs = to.getTime() - from.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? "s" : ""}, ${
        diffHours % 24
      } hour${diffHours % 24 !== 1 ? "s" : ""}`;
    }
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""}`;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 400,
          }}
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!complaint) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          Complaint not found or you don't have permission to view it.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate("/complaints")}
          variant="outlined"
        >
          Back to Complaints
        </Button>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          Complaint #
          {complaint.ticketId || complaint._id.slice(-6).toUpperCase()}
        </Typography>
        {canUpdateStatus && (
          <Button
            startIcon={<EditIcon />}
            onClick={() => setStatusUpdateDialogOpen(true)}
            variant="contained"
            color="primary"
          >
            Update Status
          </Button>
        )}
        {user?.role === "admin" && (
          <Button
            startIcon={<AssignmentIcon />}
            onClick={() => setStaffAssignmentDialogOpen(true)}
            variant="outlined"
            color="secondary"
          >
            Assign Staff
          </Button>
        )}
      </Box>

      <Box
        sx={{
          display: "flex",
          gap: 3,
          flexDirection: { xs: "column", md: "row" },
        }}
      >
        {/* Main Details */}
        <Box sx={{ flex: "1 1 66%" }}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h5" gutterBottom>
                  {complaint.title}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <Chip
                    label={complaint.status.replace("-", " ").toUpperCase()}
                    color={getStatusColor(complaint.status) as any}
                  />
                  <Chip
                    label={complaint.priority.toUpperCase()}
                    color={getPriorityColor(complaint.priority) as any}
                    variant={
                      complaint.priority === "urgent" ? "filled" : "outlined"
                    }
                  />
                  {complaint.escalation.isEscalated && (
                    <Chip
                      label="ESCALATED"
                      color="error"
                      variant="filled"
                      icon={<EscalateIcon />}
                    />
                  )}
                </Stack>
              </Box>

              <Divider sx={{ mb: 3 }} />

              <Typography variant="h6" gutterBottom>
                Description
              </Typography>
              <Typography
                variant="body1"
                sx={{ mb: 3, whiteSpace: "pre-wrap" }}
              >
                {complaint.description}
              </Typography>

              {complaint.assignedTo && (
                <>
                  <Typography variant="h6" gutterBottom>
                    Assigned Staff
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 3,
                    }}
                  >
                    <PersonIcon color="action" />
                    <Typography>
                      {typeof complaint.assignedTo === "object"
                        ? complaint.assignedTo.name
                        : "Staff Member"}
                    </Typography>
                  </Box>
                </>
              )}

              {complaint.internalNotes &&
                complaint.internalNotes.length > 0 && (
                  <>
                    <Typography variant="h6" gutterBottom>
                      Staff Notes
                    </Typography>
                    {complaint.internalNotes.map((note, index) => (
                      <Paper
                        key={index}
                        variant="outlined"
                        sx={{ p: 2, mb: 2 }}
                      >
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>{note.addedBy?.name || "Staff"}</strong> -{" "}
                          {formatDate(note.addedAt)}
                        </Typography>
                        <Typography variant="body1">{note.note}</Typography>
                      </Paper>
                    ))}
                  </>
                )}
            </CardContent>
          </Card>

          {/* Status Timeline */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Status History
              </Typography>
              <Timeline>
                {complaint.statusHistory.map((history, index) => (
                  <TimelineItem key={index}>
                    <TimelineSeparator>
                      <TimelineDot
                        color={getStatusColor(history.status) as any}
                      >
                        {getStatusIcon(history.status)}
                      </TimelineDot>
                      {index < complaint.statusHistory.length - 1 && (
                        <TimelineConnector />
                      )}
                    </TimelineSeparator>
                    <TimelineContent>
                      <Typography variant="h6" component="span">
                        {history.status.replace("-", " ").toUpperCase()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(history.timestamp)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Updated by: {history.updatedBy}
                      </Typography>
                      {history.remarks && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {history.remarks}
                        </Typography>
                      )}
                    </TimelineContent>
                  </TimelineItem>
                ))}
              </Timeline>
            </CardContent>
          </Card>
        </Box>

        {/* Sidebar */}
        <Box sx={{ flex: "1 1 34%" }}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Complaint Information
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Created
                </Typography>
                <Typography variant="body1">
                  {formatDate(complaint.createdAt)}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Last Updated
                </Typography>
                <Typography variant="body1">
                  {formatDate(complaint.updatedAt)}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Time Elapsed
                </Typography>
                <Typography variant="body1">
                  {calculateTimeElapsed(
                    complaint.createdAt,
                    complaint.resolvedAt
                  )}
                </Typography>
              </Box>

              {category && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Category
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CategoryIcon color="action" />
                    <Box>
                      <Typography variant="body1">{category.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {category.department}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Contact Method
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {getContactMethodIcon(complaint.contactMethod)}
                  <Typography variant="body1">
                    {complaint.contactMethod.replace("-", " ").toUpperCase()}
                  </Typography>
                </Box>
              </Box>

              {complaint.deadline && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Deadline
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(complaint.deadline)}
                  </Typography>
                </Box>
              )}

              {complaint.escalation.isEscalated && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Escalated:</strong>{" "}
                    {formatDate(complaint.escalation.escalatedAt!)}
                  </Typography>
                  {complaint.escalation.reason && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>Reason:</strong> {complaint.escalation.reason}
                    </Typography>
                  )}
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* File Uploads */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                File Attachments
              </Typography>
              <FileUpload
                complaintId={complaint._id}
                attachments={complaint.attachments}
                onUploadSuccess={handleRefresh}
                onDeleteSuccess={handleRefresh}
              />
            </CardContent>
          </Card>

          {/* Legacy Attachments Display */}
          {complaint.attachments && complaint.attachments.length > 0 && (
            <Card sx={{ display: "none" }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Attachments (Legacy)
                </Typography>
                {complaint.attachments.map((attachment, index) => (
                  <Paper key={index} variant="outlined" sx={{ p: 2, mb: 1 }}>
                    <Typography variant="body2">
                      {attachment.originalName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(attachment.size / 1024).toFixed(1)} KB -{" "}
                      {formatDate(attachment.uploadedAt)}
                    </Typography>
                  </Paper>
                ))}
              </CardContent>
            </Card>
          )}
        </Box>
      </Box>

      {/* Status Update Dialog */}
      {complaint && (
        <StatusUpdateDialog
          open={statusUpdateDialogOpen}
          onClose={() => setStatusUpdateDialogOpen(false)}
          complaint={complaint}
          onUpdate={handleComplaintUpdate}
        />
      )}

      {/* Staff Assignment Dialog */}
      {complaint && (
        <StaffAssignmentDialog
          open={staffAssignmentDialogOpen}
          onClose={() => setStaffAssignmentDialogOpen(false)}
          complaint={complaint}
          onUpdate={handleComplaintUpdate}
        />
      )}
    </Container>
  );
};

export default ComplaintDetails;
