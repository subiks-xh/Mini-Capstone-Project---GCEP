import React from "react";
import { Container, Typography, Card, CardContent } from "@mui/material";

const ComplaintForm: React.FC = () => {
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Submit New Complaint
      </Typography>

      <Card>
        <CardContent>
          <Typography color="text.secondary">
            Complaint submission form will be implemented here.
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
};

export default ComplaintForm;
