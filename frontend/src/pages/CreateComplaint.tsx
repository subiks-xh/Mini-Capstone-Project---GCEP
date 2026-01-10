import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Box,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  RadioGroup,
  Radio,
  FormControlLabel,
  FormLabel,
  Chip,
  Alert,
  CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotificationHelpers } from "../context/NotificationContext";
import { complaintsApi, categoriesApi } from "../services/api";
import type { Category, ComplaintForm } from "../types";

const CreateComplaint: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showApiError, showSuccess } = useNotificationHelpers();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  
  const [formData, setFormData] = useState<ComplaintForm>({
    title: "",
    description: "",
    category: "",
    priority: "medium",
    contactMethod: "email",
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoriesApi.getCategories();
        if (response.success && response.data) {
          setCategories(response.data);
        }
      } catch (error) {
        showApiError(error, "Failed to load categories");
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, [showApiError]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    } else if (formData.title.trim().length < 5) {
      newErrors.title = "Title must be at least 5 characters long";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    } else if (formData.description.trim().length < 20) {
      newErrors.description = "Description must be at least 20 characters long";
    }

    if (!formData.category) {
      newErrors.category = "Category is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSelectChange = (name: string) => (e: any) => {
    setFormData((prev) => ({ ...prev, [name]: e.target.value }));
    
    // Clear error when user makes selection
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await complaintsApi.createComplaint(formData);
      
      if (response.success) {
        showSuccess(
          "Complaint Submitted Successfully", 
          "Your complaint has been registered and will be reviewed shortly."
        );
        navigate("/complaints");
      }
    } catch (error) {
      showApiError(error, "Failed to submit complaint");
    } finally {
      setLoading(false);
    }
  };

  const selectedCategory = categories.find(cat => cat._id === formData.category);

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Create New Complaint
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Please provide detailed information about your complaint. This will help our support team address your issue more effectively.
      </Typography>

      <Card>
        <CardContent sx={{ p: 4 }}>
          <Box component="form" onSubmit={handleSubmit}>
            {/* Title Field */}
            <TextField
              fullWidth
              label="Complaint Title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              error={Boolean(errors.title)}
              helperText={errors.title || "Provide a clear, concise title for your complaint"}
              margin="normal"
              required
              disabled={loading}
            />

            {/* Category Selection */}
            <FormControl 
              fullWidth 
              margin="normal" 
              error={Boolean(errors.category)}
              disabled={loading || loadingCategories}
            >
              <InputLabel>Category</InputLabel>
              <Select
                name="category"
                value={formData.category}
                onChange={handleSelectChange("category")}
                label="Category"
                required
              >
                {loadingCategories ? (
                  <MenuItem disabled>
                    <CircularProgress size={20} sx={{ mr: 2 }} />
                    Loading categories...
                  </MenuItem>
                ) : (
                  categories.map((category) => (
                    <MenuItem key={category._id} value={category._id}>
                      <Box>
                        <Typography variant="body1">{category.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {category.description} • {category.department}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))
                )}
              </Select>
              {errors.category && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                  {errors.category}
                </Typography>
              )}
            </FormControl>

            {/* Category Info */}
            {selectedCategory && (
              <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                <Typography variant="body2">
                  <strong>Expected Resolution Time:</strong> {selectedCategory.resolutionTimeHours} hours
                  <br />
                  <strong>Handling Department:</strong> {selectedCategory.department}
                </Typography>
              </Alert>
            )}

            {/* Priority Selection */}
            <FormControl component="fieldset" margin="normal" disabled={loading}>
              <FormLabel component="legend">Priority Level</FormLabel>
              <RadioGroup
                row
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                sx={{ mt: 1 }}
              >
                <FormControlLabel 
                  value="low" 
                  control={<Radio />} 
                  label={
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Chip label="Low" color="success" size="small" sx={{ mr: 1 }} />
                      Minor issue
                    </Box>
                  } 
                />
                <FormControlLabel 
                  value="medium" 
                  control={<Radio />} 
                  label={
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Chip label="Medium" color="warning" size="small" sx={{ mr: 1 }} />
                      Moderate impact
                    </Box>
                  } 
                />
                <FormControlLabel 
                  value="high" 
                  control={<Radio />} 
                  label={
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Chip label="High" color="error" size="small" sx={{ mr: 1 }} />
                      Significant issue
                    </Box>
                  } 
                />
                <FormControlLabel 
                  value="urgent" 
                  control={<Radio />} 
                  label={
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Chip label="Urgent" color="error" variant="filled" size="small" sx={{ mr: 1 }} />
                      Critical/blocking
                    </Box>
                  } 
                />
              </RadioGroup>
            </FormControl>

            {/* Contact Method Selection */}
            <FormControl 
              fullWidth 
              margin="normal"
              disabled={loading}
            >
              <InputLabel>Preferred Contact Method</InputLabel>
              <Select
                name="contactMethod"
                value={formData.contactMethod}
                onChange={handleSelectChange("contactMethod")}
                label="Preferred Contact Method"
              >
                <MenuItem value="email">Email</MenuItem>
                <MenuItem value="phone">Phone Call</MenuItem>
                <MenuItem value="in-person">In-Person Meeting</MenuItem>
              </Select>
            </FormControl>

            {/* Description Field */}
            <TextField
              fullWidth
              label="Detailed Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              error={Boolean(errors.description)}
              helperText={
                errors.description || 
                "Please provide a detailed description of the issue. Include steps to reproduce if applicable."
              }
              margin="normal"
              multiline
              rows={6}
              required
              disabled={loading}
            />

            {/* User Information Display */}
            <Alert severity="info" sx={{ mt: 3, mb: 2 }}>
              <Typography variant="body2">
                <strong>Submitting as:</strong> {user?.name} ({user?.email})
                <br />
                <strong>Role:</strong> {user?.role}
                {user?.department && (
                  <>
                    <br />
                    <strong>Department:</strong> {user.department}
                  </>
                )}
              </Typography>
            </Alert>

            {/* Submit Button */}
            <Box sx={{ display: "flex", gap: 2, mt: 4 }}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading || loadingCategories}
                sx={{ minWidth: 160 }}
              >
                {loading ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Submitting...
                  </>
                ) : (
                  "Submit Complaint"
                )}
              </Button>
              
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate("/complaints")}
                disabled={loading}
              >
                Cancel
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default CreateComplaint;
