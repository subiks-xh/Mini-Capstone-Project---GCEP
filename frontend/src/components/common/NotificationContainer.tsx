import React from "react";
import { Snackbar, Alert, AlertTitle, Box, IconButton } from "@mui/material";
import { Close } from "@mui/icons-material";
import { useNotification } from "../../context/NotificationContext";

const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotification();

  return (
    <Box
      sx={{
        position: "fixed",
        top: 80,
        right: 16,
        zIndex: 10000,
        display: "flex",
        flexDirection: "column",
        gap: 1,
        maxWidth: 400,
      }}
    >
      {notifications.map((notification) => (
        <Snackbar
          key={notification.id}
          open={true}
          autoHideDuration={notification.autoClose ? 5000 : null}
          onClose={() => removeNotification(notification.id)}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <Alert
            severity={notification.type}
            action={
              <IconButton
                size="small"
                aria-label="close"
                color="inherit"
                onClick={() => removeNotification(notification.id)}
              >
                <Close fontSize="small" />
              </IconButton>
            }
            sx={{
              width: "100%",
              mb: 1,
            }}
          >
            <AlertTitle>{notification.title}</AlertTitle>
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </Box>
  );
};

export default NotificationContainer;
