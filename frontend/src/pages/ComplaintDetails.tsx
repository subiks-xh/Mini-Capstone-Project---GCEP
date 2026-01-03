import React from "react";
import { Container, Typography, Card, CardContent } from "@mui/material";

const ComplaintDetails: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Complaint Details
      </Typography>

      <Card>
        <CardContent>
          <Typography color="text.secondary">
            Complaint details will be implemented here.
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
};

export default ComplaintDetails;
