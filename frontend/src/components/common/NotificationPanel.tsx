import React, { useState } from "react";
import {
  Badge,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Button,
  Chip,
  Tooltip,
  Paper,
  Avatar,
} from "@mui/material";
import {
  Notifications as NotificationsIcon,
  NotificationsNone as NotificationsNoneIcon,
  Circle as CircleIcon,
  Assignment as AssignmentIcon,
  Update as UpdateIcon,
  PersonAdd as PersonAddIcon,
  TrendingUp as EscalationIcon,
  Schedule as DeadlineIcon,
  Error as ErrorIcon,
  CloudUpload as UploadIcon,
  Announcement as AnnouncementIcon,
  Clear as ClearIcon,
  DoneAll as DoneAllIcon,
  SignalWifiConnectedNoInternet4 as DisconnectedIcon,
  Wifi as ConnectedIcon,
} from "@mui/icons-material";
import { formatDistance } from "date-fns";
import { useRealtimeNotifications } from "../../context/RealtimeNotificationContext";
import { useNavigate } from "react-router-dom";

interface NotificationPanelProps {
  maxHeight?: number;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  maxHeight = 400,
}) => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
  } = useRealtimeNotifications();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const getNotificationIcon = (type: string) => {
    const iconProps = { fontSize: "small" as const };

    switch (type) {
      case "complaint_created":
        return <AssignmentIcon {...iconProps} color="primary" />;
      case "status_update":
        return <UpdateIcon {...iconProps} color="success" />;
      case "staff_assignment":
        return <PersonAddIcon {...iconProps} color="info" />;
      case "escalation":
        return <EscalationIcon {...iconProps} color="error" />;
      case "deadline_reminder":
        return <DeadlineIcon {...iconProps} color="warning" />;
      case "complaint_overdue":
        return <ErrorIcon {...iconProps} color="error" />;
      case "file_upload":
        return <UploadIcon {...iconProps} color="primary" />;
      case "system_announcement":
        return <AnnouncementIcon {...iconProps} color="info" />;
      default:
        return <NotificationsIcon {...iconProps} />;
    }
  };

  const getNotificationColor = (severity?: string) => {
    switch (severity) {
      case "error":
        return "error";
      case "warning":
        return "warning";
      case "success":
        return "success";
      case "info":
      default:
        return "primary";
    }
  };

  const handleNotificationClick = (notification: any) => {
    // Mark as read
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navigate if complaint-related
    if (notification.data?.complaintId) {
      navigate(`/complaints/${notification.data.complaintId}`);
      handleClose();
    }
  };

  const handleMarkAllRead = () => {
    markAllAsRead();
  };

  const handleClearAll = () => {
    clearAllNotifications();
  };

  return (
    <>
      <Tooltip
        title={
          isConnected
            ? "Connected to notifications"
            : "Disconnected from notifications"
        }
      >
        <IconButton
          color="inherit"
          onClick={handleClick}
          aria-label="notifications"
          sx={{ position: "relative" }}
        >
          <Badge
            badgeContent={unreadCount}
            color="error"
            overlap="rectangular"
            anchorOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
          >
            {unreadCount > 0 ? (
              <NotificationsIcon />
            ) : (
              <NotificationsNoneIcon />
            )}
          </Badge>

          {/* Connection indicator */}
          <Box
            sx={{
              position: "absolute",
              bottom: -2,
              right: -2,
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: isConnected ? "success.main" : "error.main",
              border: "1px solid white",
            }}
          />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: maxHeight + 100,
            overflow: "visible",
          },
        }}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        {/* Header */}
        <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: "divider" }}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h6" component="div">
              Notifications
            </Typography>

            <Box display="flex" alignItems="center" gap={1}>
              <Chip
                icon={isConnected ? <ConnectedIcon /> : <DisconnectedIcon />}
                label={isConnected ? "Live" : "Offline"}
                size="small"
                color={isConnected ? "success" : "error"}
                variant="outlined"
              />
            </Box>
          </Box>

          {notifications.length > 0 && (
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mt={1}
            >
              <Typography variant="body2" color="textSecondary">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
              </Typography>

              <Box display="flex" gap={1}>
                {unreadCount > 0 && (
                  <Button
                    size="small"
                    startIcon={<DoneAllIcon />}
                    onClick={handleMarkAllRead}
                  >
                    Mark all read
                  </Button>
                )}

                <Button
                  size="small"
                  startIcon={<ClearIcon />}
                  onClick={handleClearAll}
                  color="error"
                >
                  Clear all
                </Button>
              </Box>
            </Box>
          )}
        </Box>

        {/* Notifications List */}
        <Box sx={{ maxHeight, overflow: "auto" }}>
          {notifications.length === 0 ? (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <NotificationsNoneIcon
                sx={{ fontSize: 48, color: "text.secondary", mb: 1 }}
              />
              <Typography variant="body1" color="textSecondary">
                No notifications yet
              </Typography>
              <Typography variant="body2" color="textSecondary">
                You'll see real-time updates here
              </Typography>
            </Box>
          ) : (
            <List sx={{ py: 0 }}>
              {notifications.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <ListItem
                    component="div"
                    onClick={() => handleNotificationClick(notification)}
                    sx={{
                      backgroundColor: notification.read
                        ? "transparent"
                        : "action.hover",
                      "&:hover": {
                        backgroundColor: "action.selected",
                      },
                      cursor: "pointer",
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Box sx={{ position: "relative" }}>
                        {getNotificationIcon(notification.type)}
                        {!notification.read && (
                          <CircleIcon
                            sx={{
                              position: "absolute",
                              top: -4,
                              right: -4,
                              fontSize: 12,
                              color: getNotificationColor(
                                notification.severity
                              ),
                            }}
                          />
                        )}
                      </Box>
                    </ListItemIcon>

                    <ListItemText
                      primary={
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: notification.read ? "normal" : "bold",
                            color: notification.read
                              ? "text.secondary"
                              : "text.primary",
                          }}
                        >
                          {notification.title}
                        </Typography>
                      }
                      secondary={
                        <Box>
                          <Typography
                            variant="body2"
                            color="textSecondary"
                            sx={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {notification.message}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="textSecondary"
                            sx={{ mt: 0.5, display: "block" }}
                          >
                            {formatDistance(
                              new Date(notification.timestamp),
                              new Date(),
                              { addSuffix: true }
                            )}
                          </Typography>
                        </Box>
                      }
                    />

                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearNotification(notification.id);
                      }}
                      sx={{ ml: 1 }}
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </ListItem>

                  {index < notifications.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>

        {/* Footer */}
        {notifications.length > 5 && (
          <Box
            sx={{
              p: 1,
              borderTop: 1,
              borderColor: "divider",
              textAlign: "center",
            }}
          >
            <Button
              size="small"
              onClick={() => {
                navigate("/notifications"); // Could implement a full notifications page
                handleClose();
              }}
            >
              View all notifications
            </Button>
          </Box>
        )}
      </Menu>
    </>
  );
};

export default NotificationPanel;
