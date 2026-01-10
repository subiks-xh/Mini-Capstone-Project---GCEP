import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Avatar,
} from "@mui/material";
import { Person as PersonIcon } from "@mui/icons-material";
import { useAuth } from "../../context/AuthContext";
import { useNotificationHelpers } from "../../context/NotificationContext";
import { complaintsApi } from "../../services/api";
import type { Complaint, User } from "../../types";

interface StaffAssignmentDialogProps {
  open: boolean;
  onClose: () => void;
  complaint: Complaint;
  onUpdate: (updatedComplaint: Complaint) => void;
}

const StaffAssignmentDialog: React.FC<StaffAssignmentDialogProps> = ({
  open,
  onClose,
  complaint,
  onUpdate,
}) => {
  const { user } = useAuth();
  const { showApiError, showSuccess } = useNotificationHelpers();

  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [availableStaff, setAvailableStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingStaff, setFetchingStaff] = useState(false);

  const canAssignStaff = user?.role === "admin";

  useEffect(() => {
    if (open && canAssignStaff) {
      fetchAvailableStaff();
    }
  }, [open, canAssignStaff]);

  const fetchAvailableStaff = async () => {
    setFetchingStaff(true);
    try {
      // Get staff members who can handle this category
      const categoryId =
        typeof complaint.category === "string"
          ? complaint.category
          : complaint.category._id;

      const response = await complaintsApi.getAvailableStaff(categoryId);
      if (response.success && response.data) {
        setAvailableStaff(response.data);
        // Set current assigned staff if any
        if (complaint.assignedTo) {
          const assignedId =
            typeof complaint.assignedTo === "string"
              ? complaint.assignedTo
              : complaint.assignedTo._id;
          setSelectedStaff(assignedId);
        }
      }
    } catch (error) {
      showApiError(error, "Failed to fetch available staff");
    } finally {
      setFetchingStaff(false);
    }
  };

  const handleAssignment = async () => {
    if (!canAssignStaff || !selectedStaff) return;

    setLoading(true);
    try {
      const response = await complaintsApi.assignStaff(
        complaint._id,
        selectedStaff
      );
      if (response.success && response.data) {
        const assignedStaff = availableStaff.find(
          (staff) => staff._id === selectedStaff
        );
        showSuccess(
          "Staff Assigned",
          `Complaint has been assigned to ${
            assignedStaff?.name || "staff member"
          }.`
        );
        onUpdate(response.data);
        handleClose();
      }
    } catch (error) {
      showApiError(error, "Failed to assign staff");
    } finally {
      setLoading(false);
    }
  };

  const handleUnassign = async () => {
    if (!canAssignStaff) return;

    setLoading(true);
    try {
      const response = await complaintsApi.unassignStaff(complaint._id);
      if (response.success && response.data) {
        showSuccess(
          "Staff Unassigned",
          "Complaint has been unassigned and returned to the queue."
        );
        onUpdate(response.data);
        handleClose();
      }
    } catch (error) {
      showApiError(error, "Failed to unassign staff");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSelectedStaff("");
      onClose();
    }
  };

  const getCurrentAssignedStaff = () => {
    if (!complaint.assignedTo) return null;
    if (typeof complaint.assignedTo === "string") {
      const assignedId = complaint.assignedTo;
      return availableStaff.find((staff) => staff._id === assignedId);
    }
    return complaint.assignedTo;
  };

  if (!canAssignStaff) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Staff</DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            You don't have permission to assign staff to complaints. Only
            administrators can assign complaints to staff members.
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
      <DialogTitle>Assign Staff to Complaint</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Complaint: #
            {complaint.ticketId || complaint._id.slice(-6).toUpperCase()}
          </Typography>
          <Typography variant="h6" gutterBottom>
            {complaint.title}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <Typography variant="body2">Category:</Typography>
            <Chip
              label={
                typeof complaint.category === "string"
                  ? complaint.category
                  : complaint.category.name
              }
              color="primary"
              size="small"
            />
          </Box>
        </Box>

        {/* Current Assignment */}
        {getCurrentAssignedStaff() && (
          <Box
            sx={{ mb: 3, p: 2, bgcolor: "background.paper", borderRadius: 1 }}
          >
            <Typography variant="subtitle2" gutterBottom>
              Currently Assigned To:
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Avatar sx={{ width: 32, height: 32 }}>
                <PersonIcon />
              </Avatar>
              <Box>
                <Typography variant="body1">
                  {getCurrentAssignedStaff()?.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {getCurrentAssignedStaff()?.department}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        {fetchingStaff ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <FormControl fullWidth margin="normal" disabled={loading}>
            <InputLabel>Assign to Staff Member</InputLabel>
            <Select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              label="Assign to Staff Member"
            >
              <MenuItem value="">
                <em>Select a staff member</em>
              </MenuItem>
              {availableStaff.map((staff) => (
                <MenuItem key={staff._id} value={staff._id}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Avatar sx={{ width: 24, height: 24 }}>
                      <PersonIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="body2">{staff.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {staff.department}
                      </Typography>
                    </Box>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {availableStaff.length === 0 && !fetchingStaff && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              No staff members are available for this category. You may need to
              add staff members to the appropriate department or check their
              availability status.
            </Typography>
          </Alert>
        )}

        {selectedStaff && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Assigning this complaint will change its status to{" "}
              <strong>"Assigned"</strong> and notify the selected staff member.
            </Typography>
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>

        {getCurrentAssignedStaff() && (
          <Button onClick={handleUnassign} color="warning" disabled={loading}>
            {loading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Unassigning...
              </>
            ) : (
              "Unassign"
            )}
          </Button>
        )}

        <Button
          onClick={handleAssignment}
          variant="contained"
          disabled={loading || !selectedStaff}
        >
          {loading ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Assigning...
            </>
          ) : (
            "Assign Staff"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StaffAssignmentDialog;
