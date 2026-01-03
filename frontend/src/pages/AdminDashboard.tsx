import React from "react";
import { Routes, Route } from "react-router-dom";
import { Container, Typography, Card, CardContent, Box } from "@mui/material";
import {
  Assignment,
  AccessTime,
  CheckCircle,
  Warning,
  TrendingUp,
  Group,
} from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();

  const statsCards = [
    {
      title: "Total Complaints",
      value: "156",
      icon: <Assignment sx={{ fontSize: 40 }} />,
      color: "primary.main",
    },
    {
      title: "Active",
      value: "42",
      icon: <AccessTime sx={{ fontSize: 40 }} />,
      color: "warning.main",
    },
    {
      title: "Resolved",
      value: "98",
      icon: <CheckCircle sx={{ fontSize: 40 }} />,
      color: "success.main",
    },
    {
      title: "Escalated",
      value: "16",
      icon: <Warning sx={{ fontSize: 40 }} />,
      color: "error.main",
    },
    {
      title: "Staff Members",
      value: "12",
      icon: <Group sx={{ fontSize: 40 }} />,
      color: "info.main",
    },
    {
      title: "Resolution Rate",
      value: "87%",
      icon: <TrendingUp sx={{ fontSize: 40 }} />,
      color: "success.main",
    },
  ];

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Admin Dashboard
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Welcome {user?.name}! Monitor system performance and manage
              complaints.
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {/* Stats Cards */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 2,
                }}
              >
                {statsCards.map((card, index) => (
                  <Card key={index}>
                    <CardContent>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 2 }}
                      >
                        <Box sx={{ color: card.color }}>{card.icon}</Box>
                        <Box>
                          <Typography variant="h5" component="div">
                            {card.value}
                          </Typography>
                          <Typography color="text.secondary" variant="body2">
                            {card.title}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>

              <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                {/* System Overview */}
                <Box sx={{ flex: "2 1 500px" }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        System Overview
                      </Typography>
                      <Typography color="text.secondary">
                        Comprehensive system analytics will be displayed here.
                      </Typography>
                      {/* TODO: Add system overview charts */}
                    </CardContent>
                  </Card>
                </Box>

                {/* Recent Activity */}
                <Box sx={{ flex: "1 1 300px" }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Recent Escalations
                      </Typography>
                      <Typography color="text.secondary">
                        Recent escalated complaints will appear here.
                      </Typography>
                      {/* TODO: Add recent escalations list */}
                    </CardContent>
                  </Card>
                </Box>
              </Box>

              {/* Staff Performance */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Staff Performance Summary
                  </Typography>
                  <Typography color="text.secondary">
                    Staff performance metrics and workload distribution.
                  </Typography>
                  {/* TODO: Add staff performance table */}
                </CardContent>
              </Card>
            </Box>
          </Container>
        }
      />
      {/* Add more admin routes here */}
    </Routes>
  );
};

export default AdminDashboard;
