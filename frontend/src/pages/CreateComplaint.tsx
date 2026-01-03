import React from "react";
import { Container, Typography, Card, CardContent } from "@mui/material";

const CreateComplaint: React.FC = () => {
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Create New Complaint
      </Typography>

      <Card>
        <CardContent>
          <Typography color="text.secondary">
            Create complaint form will be implemented here.
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
};

export default CreateComplaint;
