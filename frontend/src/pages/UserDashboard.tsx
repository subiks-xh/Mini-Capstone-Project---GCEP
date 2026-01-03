import React from "react";
import {
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Box,
} from "@mui/material";
import { Add, Assignment, AccessTime, CheckCircle } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const UserDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const statsCards = [
    {
      title: "My Complaints",
      value: "12",
      icon: <Assignment sx={{ fontSize: 40 }} />,
      color: "primary.main",
    },
    {
      title: "Pending",
      value: "3",
      icon: <AccessTime sx={{ fontSize: 40 }} />,
      color: "warning.main",
    },
    {
      title: "Resolved",
      value: "9",
      icon: <CheckCircle sx={{ fontSize: 40 }} />,
      color: "success.main",
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Welcome back, {user?.name}!
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Manage your complaints and track their progress from your personal
        dashboard.
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Quick Actions */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate("/complaints/create")}
              >
                Submit New Complaint
              </Button>
              <Button
                variant="outlined"
                startIcon={<Assignment />}
                onClick={() => navigate("/complaints")}
              >
                View My Complaints
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
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

        {/* Recent Activity */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <Typography color="text.secondary">
              Your recent complaint activity will appear here.
            </Typography>
            {/* TODO: Add recent complaints list */}
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default UserDashboard;
