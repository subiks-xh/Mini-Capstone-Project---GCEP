import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip,
} from "@mui/material";
import { useAuth } from "../../context/AuthContext";
import { useNotificationHelpers } from "../../context/NotificationContext";
import { complaintsApi } from "../../services/api";
import type { Complaint } from "../../types";

interface StatusUpdateDialogProps {
  open: boolean;
  onClose: () => void;
  complaint: Complaint;
  onUpdate: (updatedComplaint: Complaint) => void;
}

const StatusUpdateDialog: React.FC<StatusUpdateDialogProps> = ({
  open,
  onClose,
  complaint,
  onUpdate,
}) => {
  const { user } = useAuth();
  const { showApiError, showSuccess } = useNotificationHelpers();

  const [status, setStatus] = useState(complaint.status);
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  const statusOptions = [
    {
      value: "submitted",
      label: "Submitted",
      description: "Complaint is newly submitted and awaiting review",
    },
    {
      value: "assigned",
      label: "Assigned", 
      description: "Complaint has been assigned to a staff member",
    },
    {
      value: "in-progress",
      label: "In Progress",
      description: "Staff is actively working on the complaint",
    },
    {
      value: "resolved",
      label: "Resolved",
      description: "Issue has been addressed and resolved",
    },
    {
      value: "closed",
      label: "Closed",
      description: "Complaint is completed and closed",
    },
  ];

  const canUpdateStatus =
    user?.role === "admin" ||
    (user?.role === "staff" &&
      (typeof complaint.assignedTo === "string" ? 
        complaint.assignedTo === user._id :
        complaint.assignedTo?._id === user._id));

  const handleSubmit = async () => {
    if (!canUpdateStatus) return;

    setLoading(true);
    try {
      const response = await complaintsApi.updateStatus(
        complaint._id,
        status,
        remarks.trim() || undefined
      );

      if (response.success && response.data) {
        showSuccess(
          "Status Updated",
          `Complaint status has been updated to ${status.replace("-", " ")}.`
        );
        onUpdate(response.data);
        handleClose();
      }
    } catch (error) {
      showApiError(error, "Failed to update complaint status");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setStatus(complaint.status);
      setRemarks("");
      onClose();
    }
  };

  const getStatusColor = (statusValue: string) => {
    switch (statusValue) {
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

  if (!canUpdateStatus) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Update Status</DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            You don't have permission to update this complaint's status. Only
            assigned staff members or administrators can update complaint
            status.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Update Complaint Status</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Complaint: #{complaint.ticketId || complaint._id.slice(-6).toUpperCase()}
          </Typography>
          <Typography variant="h6" gutterBottom>
            {complaint.title}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <Typography variant="body2">Current Status:</Typography>
            <Chip
              label={complaint.status.replace("-", " ").toUpperCase()}
              color={getStatusColor(complaint.status) as any}
              size="small"
            />
          </Box>
        </Box>

        <FormControl fullWidth margin="normal" disabled={loading}>
          <InputLabel>New Status</InputLabel>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            label="New Status"
          >
            {statusOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                <Box>
                  <Typography variant="body1">{option.label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.description}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label="Remarks (Optional)"
          multiline
          rows={3}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          margin="normal"
          disabled={loading}
          helperText="Add any notes about this status change"
        />

        {status === "resolved" && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Marking as <strong>Resolved</strong> will notify the user that
              their complaint has been addressed. They will be able to provide
              feedback on the resolution.
            </Typography>
          </Alert>
        )}

        {status === "closed" && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Marking as <strong>Closed</strong> will finalize this complaint.
              No further updates will be possible unless reopened by an
              administrator.
            </Typography>
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || status === complaint.status}
        >
          {loading ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Updating...
            </>
          ) : (
            "Update Status"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StatusUpdateDialog;
