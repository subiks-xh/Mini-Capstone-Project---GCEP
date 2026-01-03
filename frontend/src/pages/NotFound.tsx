import React from "react";
import { Container, Typography, Button, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md" sx={{ mt: 8, textAlign: "center" }}>
      <Typography
        variant="h1"
        component="h1"
        sx={{ fontSize: "6rem", fontWeight: "bold", color: "primary.main" }}
      >
        404
      </Typography>

      <Typography variant="h4" component="h2" gutterBottom>
        Page Not Found
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        The page you are looking for doesn't exist or has been moved.
      </Typography>

      <Box>
        <Button variant="contained" size="large" onClick={() => navigate("/")}>
          Go Home
        </Button>
      </Box>
    </Container>
  );
};

export default NotFound;
