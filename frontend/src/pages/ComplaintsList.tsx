import React from "react";
import { Container, Typography, Card, CardContent } from "@mui/material";

const ComplaintsList: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Complaints List
      </Typography>

      <Card>
        <CardContent>
          <Typography color="text.secondary">
            Complaints list will be implemented here.
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
};

export default ComplaintsList;
