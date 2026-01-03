import React from "react";
import {
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Box,
} from "@mui/material";
import {
  Assignment,
  AccessTime,
  CheckCircle,
  Warning,
} from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";

const StaffDashboard: React.FC = () => {
  const { user } = useAuth();

  const statsCards = [
    {
      title: "Assigned to Me",
      value: "8",
      icon: <Assignment sx={{ fontSize: 40 }} />,
      color: "primary.main",
    },
    {
      title: "In Progress",
      value: "5",
      icon: <AccessTime sx={{ fontSize: 40 }} />,
      color: "warning.main",
    },
    {
      title: "Resolved Today",
      value: "3",
      icon: <CheckCircle sx={{ fontSize: 40 }} />,
      color: "success.main",
    },
    {
      title: "Overdue",
      value: "1",
      icon: <Warning sx={{ fontSize: 40 }} />,
      color: "error.main",
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Staff Dashboard
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Welcome {user?.name}! Manage assigned complaints and track your
        performance.
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Stats Cards */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 3,
          }}
        >
          {statsCards.map((card, index) => (
            <Card key={index}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Box sx={{ color: card.color }}>{card.icon}</Box>
                  <Box>
                    <Typography variant="h4" component="div">
                      {card.value}
                    </Typography>
                    <Typography color="text.secondary">{card.title}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>

        <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          {/* Assigned Complaints */}
          <Box sx={{ flex: "2 1 400px" }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  My Assigned Complaints
                </Typography>
                <Typography color="text.secondary">
                  Your assigned complaints will appear here.
                </Typography>
                {/* TODO: Add assigned complaints list */}
              </CardContent>
            </Card>
          </Box>

          {/* Performance Metrics */}
          <Box sx={{ flex: "1 1 300px" }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Performance Metrics
                </Typography>
                <Typography color="text.secondary">
                  Your performance metrics will be displayed here.
                </Typography>
                {/* TODO: Add performance charts */}
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default StaffDashboard;
