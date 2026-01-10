import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Menu as MenuIcon,
  AccountCircle,
  Dashboard,
  Assignment,
  Add,
  AdminPanelSettings,
  Group,
  Analytics,
  ExitToApp,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import NotificationPanel from "./NotificationPanel";

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
    handleClose();
  };

  const navigationItems = [
    {
      text: "Dashboard",
      icon: <Dashboard />,
      path:
        user?.role === "admin"
          ? "/admin"
          : user?.role === "staff"
          ? "/staff"
          : "/dashboard",
      roles: ["user", "staff", "admin"],
    },
    {
      text: "My Complaints",
      icon: <Assignment />,
      path: "/complaints",
      roles: ["user", "staff", "admin"],
    },
    {
      text: "Create Complaint",
      icon: <Add />,
      path: "/complaints/create",
      roles: ["user"],
    },
    {
      text: "Analytics",
      icon: <Analytics />,
      path: "/analytics",
      roles: ["staff", "admin"],
    },
    {
      text: "Staff Management",
      icon: <Group />,
      path: "/admin/staff",
      roles: ["admin"],
    },
    {
      text: "System Management",
      icon: <AdminPanelSettings />,
      path: "/admin/management",
      roles: ["admin"],
    },
  ];

  const filteredNavigationItems = navigationItems.filter(
    (item) => user && item.roles.includes(user.role)
  );

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: "center" }}>
      <Typography variant="h6" sx={{ my: 2 }}>
        GCEP System
      </Typography>
      <List>
        {filteredNavigationItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton onClick={() => navigate(item.path)}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Generic Complaint Escalation Portal
          </Typography>

          {!isMobile && (
            <Box sx={{ display: "flex", gap: 1 }}>
              {filteredNavigationItems.map((item) => (
                <Button
                  key={item.text}
                  color="inherit"
                  startIcon={item.icon}
                  onClick={() => navigate(item.path)}
                >
                  {item.text}
                </Button>
              ))}
            </Box>
          )}

          <Box sx={{ ml: 2, display: "flex", alignItems: "center", gap: 1 }}>
            {/* Real-time Notifications */}
            <NotificationPanel />

            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
            >
              <Avatar sx={{ width: 32, height: 32 }}>
                {user?.name ? (
                  user.name.charAt(0).toUpperCase()
                ) : (
                  <AccountCircle />
                )}
              </Avatar>
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              keepMounted
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem
                onClick={() => {
                  navigate("/profile");
                  handleClose();
                }}
              >
                <ListItemIcon>
                  <AccountCircle fontSize="small" />
                </ListItemIcon>
                Profile
              </MenuItem>
              {user?.role === "admin" && (
                <MenuItem
                  onClick={() => {
                    navigate("/admin");
                    handleClose();
                  }}
                >
                  <ListItemIcon>
                    <AdminPanelSettings fontSize="small" />
                  </ListItemIcon>
                  Admin Panel
                </MenuItem>
              )}
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <ExitToApp fontSize="small" />
                </ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": { boxSizing: "border-box", width: 240 },
        }}
      >
        {drawer}
      </Drawer>
    </>
  );
};

export default Navigation;
