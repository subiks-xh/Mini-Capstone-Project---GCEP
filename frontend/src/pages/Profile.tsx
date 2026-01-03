import React from "react";
import { Container, Typography, Card, CardContent } from "@mui/material";

const Profile: React.FC = () => {
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Profile Settings
      </Typography>

      <Card>
        <CardContent>
          <Typography color="text.secondary">
            User profile management will be implemented here.
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
};

export default Profile;
