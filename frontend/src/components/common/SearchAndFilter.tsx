import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Grid,
  Autocomplete,
  Switch,
  FormControlLabel,
  Slider,
  Divider,
  Badge,
  Tooltip,
} from "@mui/material";
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  BookmarkBorder as BookmarkIcon,
  Bookmark as BookmarkedIcon,
  Download as ExportIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { debounce } from "../../utils/helpers";

interface FilterCriteria {
  search: string;
  status: string[];
  priority: string[];
  category: string[];
  assignedTo: string[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  escalated: boolean | null;
  hasAttachments: boolean | null;
  resolutionTime: [number, number];
  tags: string[];
  department: string[];
}

interface SearchAndFilterProps {
  onFiltersChange: (filters: FilterCriteria) => void;
  onSearch: (searchTerm: string) => void;
  onExport?: () => void;
  categories?: Array<{ _id: string; name: string }>;
  departments?: Array<{ _id: string; name: string }>;
  staffMembers?: Array<{ _id: string; name: string; email: string }>;
  initialFilters?: Partial<FilterCriteria>;
  showSavedFilters?: boolean;
  className?: string;
}

interface SavedFilter {
  id: string;
  name: string;
  filters: FilterCriteria;
  isDefault: boolean;
  createdAt: Date;
}

const COMPLAINT_STATUSES = [
  { value: "submitted", label: "Submitted" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const COMPLAINT_PRIORITIES = [
  { value: "low", label: "Low", color: "#4caf50" },
  { value: "medium", label: "Medium", color: "#ff9800" },
  { value: "high", label: "High", color: "#f44336" },
  { value: "urgent", label: "Urgent", color: "#d32f2f" },
];

const DEFAULT_FILTERS: FilterCriteria = {
  search: "",
  status: [],
  priority: [],
  category: [],
  assignedTo: [],
  dateRange: {
    start: null,
    end: null,
  },
  escalated: null,
  hasAttachments: null,
  resolutionTime: [0, 168], // 0 to 168 hours (1 week)
  tags: [],
  department: [],
};

const SearchAndFilter: React.FC<SearchAndFilterProps> = ({
  onFiltersChange,
  onSearch,
  onExport,
  categories = [],
  departments = [],
  staffMembers = [],
  initialFilters = {},
  showSavedFilters = true,
  className,
}) => {
  const [filters, setFilters] = useState<FilterCriteria>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  const [searchTerm, setSearchTerm] = useState(initialFilters.search || "");
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [saveFilterDialog, setSaveFilterDialog] = useState(false);
  const [filterName, setFilterName] = useState("");

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      onSearch(term);
    }, 500),
    [onSearch]
  );

  // Load saved filters from localStorage
  useEffect(() => {
    if (showSavedFilters) {
      const saved = localStorage.getItem("complaint_saved_filters");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSavedFilters(parsed);
        } catch (error) {
          console.error("Failed to parse saved filters:", error);
        }
      }
    }
  }, [showSavedFilters]);

  // Handle search input changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    debouncedSearch(value);
    updateFilters({ search: value });
  };

  // Update filters and notify parent
  const updateFilters = (newFilters: Partial<FilterCriteria>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    onFiltersChange(updated);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchTerm("");
    onFiltersChange(DEFAULT_FILTERS);
    onSearch("");
  };

  // Save current filters
  const saveCurrentFilters = () => {
    if (!filterName.trim()) return;

    const newFilter: SavedFilter = {
      id: `filter_${Date.now()}`,
      name: filterName.trim(),
      filters: { ...filters },
      isDefault: false,
      createdAt: new Date(),
    };

    const updatedFilters = [...savedFilters, newFilter];
    setSavedFilters(updatedFilters);
    localStorage.setItem(
      "complaint_saved_filters",
      JSON.stringify(updatedFilters)
    );

    setFilterName("");
    setSaveFilterDialog(false);
  };

  // Load saved filter
  const loadSavedFilter = (savedFilter: SavedFilter) => {
    setFilters(savedFilter.filters);
    setSearchTerm(savedFilter.filters.search);
    onFiltersChange(savedFilter.filters);
    onSearch(savedFilter.filters.search);
  };

  // Delete saved filter
  const deleteSavedFilter = (filterId: string) => {
    const updatedFilters = savedFilters.filter((f) => f.id !== filterId);
    setSavedFilters(updatedFilters);
    localStorage.setItem(
      "complaint_saved_filters",
      JSON.stringify(updatedFilters)
    );
  };

  // Check if filters are active
  const hasActiveFilters = () => {
    return Object.keys(filters).some((key) => {
      const value = filters[key as keyof FilterCriteria];
      if (key === "search") return Boolean(value);
      if (key === "dateRange") {
        const dateRange = value as { start: Date | null; end: Date | null };
        return Boolean(dateRange.start || dateRange.end);
      }
      if (key === "resolutionTime") {
        const timeRange = value as [number, number];
        return timeRange[0] !== 0 || timeRange[1] !== 168;
      }
      if (Array.isArray(value)) return value.length > 0;
      return value !== null && value !== undefined;
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.status.length > 0) count++;
    if (filters.priority.length > 0) count++;
    if (filters.category.length > 0) count++;
    if (filters.assignedTo.length > 0) count++;
    if (filters.dateRange.start || filters.dateRange.end) count++;
    if (filters.escalated !== null) count++;
    if (filters.hasAttachments !== null) count++;
    if (filters.resolutionTime[0] !== 0 || filters.resolutionTime[1] !== 168)
      count++;
    if (filters.tags.length > 0) count++;
    if (filters.department.length > 0) count++;
    return count;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Paper className={className} sx={{ p: 2, mb: 2 }}>
        {/* Search Bar and Quick Actions */}
        <Box display="flex" gap={2} mb={2} alignItems="center">
          <TextField
            fullWidth
            placeholder="Search complaints by title, description, or ID..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
              endAdornment: searchTerm && (
                <IconButton size="small" onClick={() => handleSearchChange("")}>
                  <ClearIcon />
                </IconButton>
              ),
            }}
          />

          <Badge badgeContent={getActiveFilterCount()} color="primary">
            <Button
              variant={isAdvancedOpen ? "contained" : "outlined"}
              startIcon={<FilterIcon />}
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            >
              Filters
            </Button>
          </Badge>

          {hasActiveFilters() && (
            <Button
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={clearFilters}
              color="error"
            >
              Clear
            </Button>
          )}

          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => window.location.reload()}
          >
            Refresh
          </Button>

          {onExport && (
            <Button
              variant="outlined"
              startIcon={<ExportIcon />}
              onClick={onExport}
            >
              Export
            </Button>
          )}
        </Box>

        {/* Active Filter Chips */}
        {hasActiveFilters() && (
          <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
            {filters.search && (
              <Chip
                label={`Search: "${filters.search}"`}
                onDelete={() => handleSearchChange("")}
                size="small"
              />
            )}

            {filters.status.map((status) => (
              <Chip
                key={status}
                label={`Status: ${
                  COMPLAINT_STATUSES.find((s) => s.value === status)?.label
                }`}
                onDelete={() =>
                  updateFilters({
                    status: filters.status.filter((s) => s !== status),
                  })
                }
                size="small"
                color="primary"
              />
            ))}

            {filters.priority.map((priority) => (
              <Chip
                key={priority}
                label={`Priority: ${
                  COMPLAINT_PRIORITIES.find((p) => p.value === priority)?.label
                }`}
                onDelete={() =>
                  updateFilters({
                    priority: filters.priority.filter((p) => p !== priority),
                  })
                }
                size="small"
                color="secondary"
              />
            ))}

            {filters.category.map((categoryId) => (
              <Chip
                key={categoryId}
                label={`Category: ${
                  categories.find((c) => c._id === categoryId)?.name
                }`}
                onDelete={() =>
                  updateFilters({
                    category: filters.category.filter((c) => c !== categoryId),
                  })
                }
                size="small"
              />
            ))}

            {filters.escalated !== null && (
              <Chip
                label={`Escalated: ${filters.escalated ? "Yes" : "No"}`}
                onDelete={() => updateFilters({ escalated: null })}
                size="small"
                color="error"
              />
            )}

            {filters.hasAttachments !== null && (
              <Chip
                label={`Has Attachments: ${
                  filters.hasAttachments ? "Yes" : "No"
                }`}
                onDelete={() => updateFilters({ hasAttachments: null })}
                size="small"
              />
            )}
          </Box>
        )}

        {/* Advanced Filters */}
        {isAdvancedOpen && (
          <Accordion
            expanded
            sx={{ boxShadow: "none", border: "1px solid #e0e0e0" }}
          >
            <AccordionSummary sx={{ display: "none" }}>
              <Typography>Advanced Filters</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                {/* Status Filter */}
                <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select
                      multiple
                      value={filters.status}
                      label="Status"
                      onChange={(e) =>
                        updateFilters({ status: e.target.value as string[] })
                      }
                      renderValue={(selected) => (
                        <Box
                          sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
                        >
                          {(selected as string[]).map((value) => (
                            <Chip
                              key={value}
                              label={
                                COMPLAINT_STATUSES.find(
                                  (s) => s.value === value
                                )?.label
                              }
                              size="small"
                            />
                          ))}
                        </Box>
                      )}
                    >
                      {COMPLAINT_STATUSES.map((status) => (
                        <MenuItem key={status.value} value={status.value}>
                          {status.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Priority Filter */}
                <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Priority</InputLabel>
                    <Select
                      multiple
                      value={filters.priority}
                      label="Priority"
                      onChange={(e) =>
                        updateFilters({ priority: e.target.value as string[] })
                      }
                      renderValue={(selected) => (
                        <Box
                          sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
                        >
                          {(selected as string[]).map((value) => (
                            <Chip
                              key={value}
                              label={
                                COMPLAINT_PRIORITIES.find(
                                  (p) => p.value === value
                                )?.label
                              }
                              size="small"
                            />
                          ))}
                        </Box>
                      )}
                    >
                      {COMPLAINT_PRIORITIES.map((priority) => (
                        <MenuItem key={priority.value} value={priority.value}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: "50%",
                                backgroundColor: priority.color,
                              }}
                            />
                            {priority.label}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Category Filter */}
                <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                  <Autocomplete
                    multiple
                    size="small"
                    options={categories}
                    getOptionLabel={(option) => option.name}
                    value={categories.filter((c) =>
                      filters.category.includes(c._id)
                    )}
                    onChange={(_, newValue) =>
                      updateFilters({
                        category: newValue.map((v) => v._id),
                      })
                    }
                    renderInput={(params) => (
                      <TextField {...params} label="Categories" />
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          label={option.name}
                          size="small"
                          {...getTagProps({ index })}
                        />
                      ))
                    }
                  />
                </Grid>

                {/* Assigned Staff Filter */}
                <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                  <Autocomplete
                    multiple
                    size="small"
                    options={staffMembers}
                    getOptionLabel={(option) => option.name}
                    value={staffMembers.filter((s) =>
                      filters.assignedTo.includes(s._id)
                    )}
                    onChange={(_, newValue) =>
                      updateFilters({
                        assignedTo: newValue.map((v) => v._id),
                      })
                    }
                    renderInput={(params) => (
                      <TextField {...params} label="Assigned To" />
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          label={option.name}
                          size="small"
                          {...getTagProps({ index })}
                        />
                      ))
                    }
                  />
                </Grid>

                {/* Date Range */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box display="flex" gap={2}>
                    <DatePicker
                      label="From Date"
                      value={filters.dateRange.start}
                      onChange={(date: any) =>
                        updateFilters({
                          dateRange: { ...filters.dateRange, start: date },
                        })
                      }
                      slotProps={{
                        textField: { size: "small", fullWidth: true },
                      }}
                    />
                    <DatePicker
                      label="To Date"
                      value={filters.dateRange.end}
                      onChange={(date) =>
                        updateFilters({
                          dateRange: { ...filters.dateRange, end: date },
                        })
                      }
                      slotProps={{
                        textField: { size: "small", fullWidth: true },
                      }}
                    />
                  </Box>
                </Grid>

                {/* Resolution Time Range */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="body2" gutterBottom>
                    Resolution Time (Hours): {filters.resolutionTime[0]} -{" "}
                    {filters.resolutionTime[1]}
                  </Typography>
                  <Slider
                    value={filters.resolutionTime}
                    onChange={(_, newValue) =>
                      updateFilters({
                        resolutionTime: newValue as [number, number],
                      })
                    }
                    valueLabelDisplay="auto"
                    min={0}
                    max={168}
                    step={1}
                  />
                </Grid>

                {/* Boolean Filters */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box display="flex" flexDirection="column" gap={1}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={filters.escalated === true}
                          onChange={(e) =>
                            updateFilters({
                              escalated:
                                filters.escalated === true
                                  ? null
                                  : e.target.checked,
                            })
                          }
                        />
                      }
                      label="Show only escalated complaints"
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={filters.hasAttachments === true}
                          onChange={(e) =>
                            updateFilters({
                              hasAttachments:
                                filters.hasAttachments === true
                                  ? null
                                  : e.target.checked,
                            })
                          }
                        />
                      }
                      label="Show only complaints with attachments"
                    />
                  </Box>
                </Grid>

                {/* Department Filter (if user has access) */}
                {departments.length > 0 && (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Autocomplete
                      multiple
                      size="small"
                      options={departments}
                      getOptionLabel={(option) => option.name}
                      value={departments.filter((d) =>
                        filters.department.includes(d._id)
                      )}
                      onChange={(_, newValue) =>
                        updateFilters({
                          department: newValue.map((v) => v._id),
                        })
                      }
                      renderInput={(params) => (
                        <TextField {...params} label="Departments" />
                      )}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                          <Chip
                            label={option.name}
                            size="small"
                            {...getTagProps({ index })}
                          />
                        ))
                      }
                    />
                  </Grid>
                )}
              </Grid>

              <Divider sx={{ my: 2 }} />

              {/* Filter Actions */}
              <Box display="flex" gap={2} alignItems="center">
                <Button
                  variant="outlined"
                  startIcon={<SaveIcon />}
                  onClick={() => setSaveFilterDialog(true)}
                  disabled={!hasActiveFilters()}
                >
                  Save Filter
                </Button>

                {/* Saved Filters */}
                {showSavedFilters && savedFilters.length > 0 && (
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {savedFilters.map((savedFilter) => (
                      <Tooltip
                        key={savedFilter.id}
                        title={`Created: ${savedFilter.createdAt.toLocaleDateString()}`}
                      >
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={
                            savedFilter.isDefault ? (
                              <BookmarkedIcon />
                            ) : (
                              <BookmarkIcon />
                            )
                          }
                          onClick={() => loadSavedFilter(savedFilter)}
                          onDoubleClick={() =>
                            deleteSavedFilter(savedFilter.id)
                          }
                        >
                          {savedFilter.name}
                        </Button>
                      </Tooltip>
                    ))}
                  </Box>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Save Filter Dialog */}
        {saveFilterDialog && (
          <Box
            position="fixed"
            top={0}
            left={0}
            right={0}
            bottom={0}
            bgcolor="rgba(0,0,0,0.5)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            zIndex={1300}
            onClick={() => setSaveFilterDialog(false)}
          >
            <Paper
              sx={{ p: 3, minWidth: 300, maxWidth: 400 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Typography variant="h6" gutterBottom>
                Save Current Filter
              </Typography>

              <TextField
                fullWidth
                label="Filter Name"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && saveCurrentFilters()}
                autoFocus
                sx={{ mb: 2 }}
              />

              <Box display="flex" gap={2} justifyContent="flex-end">
                <Button onClick={() => setSaveFilterDialog(false)}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={saveCurrentFilters}
                  disabled={!filterName.trim()}
                >
                  Save
                </Button>
              </Box>
            </Paper>
          </Box>
        )}
      </Paper>
    </LocalizationProvider>
  );
};

export default SearchAndFilter;
