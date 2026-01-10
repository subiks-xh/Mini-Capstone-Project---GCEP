import React, { useState, useRef } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  LinearProgress,
  Alert,
  Chip,
  Divider,
} from "@mui/material";
import {
  CloudUpload,
  AttachFile,
  Delete,
  Download,
  InsertDriveFile,
  Image,
  PictureAsPdf,
} from "@mui/icons-material";
import { formatBytes, formatDate } from "../../utils/helpers";

interface FileUploadProps {
  complaintId: string;
  attachments?: Array<{
    _id: string;
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    uploadedAt: string;
    uploadedBy: {
      name: string;
      email: string;
    };
  }>;
  onUploadSuccess?: () => void;
  onDeleteSuccess?: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({
  complaintId,
  attachments = [],
  onUploadSuccess,
  onDeleteSuccess,
}) => {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File type icons
  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith("image/")) return <Image color="primary" />;
    if (mimetype === "application/pdf") return <PictureAsPdf color="error" />;
    return <InsertDriveFile color="action" />;
  };

  // File type color
  const getFileTypeColor = (
    mimetype: string
  ):
    | "default"
    | "primary"
    | "secondary"
    | "error"
    | "info"
    | "success"
    | "warning" => {
    if (mimetype.startsWith("image/")) return "primary";
    if (mimetype === "application/pdf") return "error";
    if (mimetype.includes("word") || mimetype.includes("document"))
      return "info";
    if (mimetype.includes("excel") || mimetype.includes("spreadsheet"))
      return "success";
    return "default";
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
    setError(null);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError("Please select files to upload");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch(
        `/api/uploads/complaint/${complaintId}/upload`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Upload failed");
      }

      const data = await response.json();
      setSelectedFiles([]);
      setOpen(false);

      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDownload = async (filename: string, originalName: string) => {
    try {
      const response = await fetch(
        `/api/uploads/complaint/${complaintId}/download/${filename}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Download failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error("Download failed:", err);
      setError("Download failed");
    }
  };

  const handleDelete = async (filename: string) => {
    if (!window.confirm("Are you sure you want to delete this file?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/uploads/complaint/${complaintId}/attachment/${filename}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Delete failed");
      }

      if (onDeleteSuccess) {
        onDeleteSuccess();
      }
    } catch (err: any) {
      setError(err.message || "Delete failed");
    }
  };

  return (
    <Box>
      {/* Attachments Display */}
      {attachments.length > 0 && (
        <Box mb={2}>
          <Typography variant="h6" gutterBottom>
            Attachments ({attachments.length})
          </Typography>
          <List>
            {attachments.map((attachment, index) => (
              <ListItem key={attachment._id || index}>
                <Box display="flex" alignItems="center" mr={2}>
                  {getFileIcon(attachment.mimetype)}
                </Box>
                <ListItemText
                  primary={attachment.originalName}
                  secondary={
                    <Box display="flex" flexDirection="column" gap={0.5}>
                      <Typography variant="caption" color="textSecondary">
                        {formatBytes(attachment.size)} •{" "}
                        {formatDate(attachment.uploadedAt)}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Uploaded by {attachment.uploadedBy?.name}
                      </Typography>
                    </Box>
                  }
                />
                <Box display="flex" alignItems="center" gap={1}>
                  <Chip
                    label={attachment.mimetype.split("/")[1].toUpperCase()}
                    size="small"
                    color={getFileTypeColor(attachment.mimetype)}
                  />
                  <IconButton
                    size="small"
                    onClick={() =>
                      handleDownload(
                        attachment.filename,
                        attachment.originalName
                      )
                    }
                    title="Download"
                  >
                    <Download />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(attachment.filename)}
                    title="Delete"
                    color="error"
                  >
                    <Delete />
                  </IconButton>
                </Box>
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {/* Upload Button */}
      <Button
        variant="outlined"
        startIcon={<AttachFile />}
        onClick={() => setOpen(true)}
        sx={{ mb: 2 }}
      >
        Add Attachments
      </Button>

      {/* Upload Dialog */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Upload Files</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />

          <Button
            variant="contained"
            startIcon={<CloudUpload />}
            onClick={() => fileInputRef.current?.click()}
            sx={{ mb: 2 }}
            fullWidth
          >
            Select Files
          </Button>

          {/* Selected Files Preview */}
          {selectedFiles.length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Selected Files ({selectedFiles.length})
              </Typography>
              <List>
                {selectedFiles.map((file, index) => (
                  <ListItem key={index} divider>
                    <Box display="flex" alignItems="center" mr={2}>
                      {getFileIcon(file.type)}
                    </Box>
                    <ListItemText
                      primary={file.name}
                      secondary={`${formatBytes(file.size)} • ${file.type}`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => {
                          const newFiles = selectedFiles.filter(
                            (_, i) => i !== index
                          );
                          setSelectedFiles(newFiles);
                        }}
                      >
                        <Delete />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* Upload Progress */}
          {uploading && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>
                Uploading files...
              </Typography>
              <LinearProgress />
            </Box>
          )}

          {/* Upload Guidelines */}
          <Box sx={{ mt: 2, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
            <Typography variant="body2" color="textSecondary">
              <strong>Upload Guidelines:</strong>
            </Typography>
            <Typography variant="caption" display="block" color="textSecondary">
              • Maximum file size: 5MB per file
            </Typography>
            <Typography variant="caption" display="block" color="textSecondary">
              • Maximum files: 5 files at once
            </Typography>
            <Typography variant="caption" display="block" color="textSecondary">
              • Supported formats: Images, PDF, Word, Excel, Text files
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={uploading || selectedFiles.length === 0}
          >
            {uploading
              ? "Uploading..."
              : `Upload ${selectedFiles.length} File(s)`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FileUpload;
