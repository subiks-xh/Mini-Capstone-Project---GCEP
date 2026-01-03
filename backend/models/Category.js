const mongoose = require("mongoose");
const { DEPARTMENTS } = require("../config/constants");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      unique: true,
      minlength: [2, "Category name must be at least 2 characters long"],
      maxlength: [100, "Category name cannot exceed 100 characters"],
      index: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },

    department: {
      type: String,
      required: [true, "Department is required"],
      enum: {
        values: DEPARTMENTS,
        message: "{VALUE} is not a valid department",
      },
      index: true,
    },

    resolutionTimeHours: {
      type: Number,
      required: [true, "Resolution time in hours is required"],
      min: [1, "Resolution time must be at least 1 hour"],
      max: [720, "Resolution time cannot exceed 720 hours (30 days)"], // Max 30 days
      default: 24,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    color: {
      type: String,
      trim: true,
      match: [
        /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
        "Color must be a valid hex color",
      ],
      default: "#3B82F6", // Default blue color
    },

    icon: {
      type: String,
      trim: true,
      maxlength: [50, "Icon name cannot exceed 50 characters"],
      default: "folder",
    },

    priority: {
      type: Number,
      default: 100,
      min: [1, "Priority must be at least 1"],
      max: [1000, "Priority cannot exceed 1000"],
    },

    autoAssignment: {
      enabled: {
        type: Boolean,
        default: false,
      },
      rules: [
        {
          condition: {
            type: String,
            enum: ["priority", "keyword", "user_role", "time_of_day"],
            required: function () {
              return this.parent().enabled;
            },
          },
          value: {
            type: mongoose.Schema.Types.Mixed, // Can be string, number, array, etc.
            required: function () {
              return this.parent().enabled;
            },
          },
          assignTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: function () {
              return this.parent().enabled;
            },
          },
        },
      ],
    },

    slaSettings: {
      acknowledgeWithinHours: {
        type: Number,
        default: 2,
        min: [0.5, "Acknowledgment time must be at least 30 minutes"],
        max: [48, "Acknowledgment time cannot exceed 48 hours"],
      },
      firstResponseWithinHours: {
        type: Number,
        default: 4,
        min: [1, "First response time must be at least 1 hour"],
        max: [72, "First response time cannot exceed 72 hours"],
      },
      escalationEnabled: {
        type: Boolean,
        default: true,
      },
      escalationHours: {
        type: Number,
        default: 24,
        min: [1, "Escalation time must be at least 1 hour"],
        max: [168, "Escalation time cannot exceed 168 hours (1 week)"],
      },
    },

    keywords: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes for performance
categorySchema.index({ name: 1, isActive: 1 });
categorySchema.index({ department: 1, isActive: 1 });
categorySchema.index({ keywords: 1 });
categorySchema.index({ priority: 1, isActive: 1 });

// Pre-save middleware
categorySchema.pre("save", function (next) {
  // Convert keywords to lowercase for consistent searching
  if (this.keywords && Array.isArray(this.keywords)) {
    this.keywords = this.keywords.map((keyword) =>
      keyword.toLowerCase().trim()
    );
  }
  next();
});

// Pre-update middleware
categorySchema.pre("findOneAndUpdate", function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

// Static method to find active categories
categorySchema.statics.findActive = function () {
  return this.find({ isActive: true }).sort({ priority: 1, name: 1 });
};

// Static method to find categories by department
categorySchema.statics.findByDepartment = function (department) {
  return this.find({
    department: department,
    isActive: true,
  }).sort({ priority: 1, name: 1 });
};

// Static method to suggest category based on keywords
categorySchema.statics.suggestCategory = function (title, description) {
  const searchText = (title + " " + description).toLowerCase();

  return this.find({
    isActive: true,
    keywords: { $in: [new RegExp(searchText, "i")] },
  })
    .sort({ priority: 1 })
    .limit(5);
};

// Instance method to get complaint count
categorySchema.methods.getComplaintCount = async function (status) {
  const Complaint = mongoose.model("Complaint");
  const query = { category: this._id };

  if (status) {
    query.status = status;
  }

  return await Complaint.countDocuments(query);
};

// Instance method to get average resolution time
categorySchema.methods.getAverageResolutionTime = async function () {
  const Complaint = mongoose.model("Complaint");

  const result = await Complaint.aggregate([
    {
      $match: {
        category: this._id,
        resolvedAt: { $ne: null },
      },
    },
    {
      $group: {
        _id: null,
        averageTime: {
          $avg: { $subtract: ["$resolvedAt", "$createdAt"] },
        },
        count: { $sum: 1 },
      },
    },
  ]);

  if (result.length === 0) return null;

  return {
    averageTimeMs: result[0].averageTime,
    averageTimeHours: result[0].averageTime / (1000 * 60 * 60),
    resolvedCount: result[0].count,
  };
};

// Instance method to check if category can be deleted
categorySchema.methods.canBeDeleted = async function () {
  const Complaint = mongoose.model("Complaint");
  const complaintCount = await Complaint.countDocuments({ category: this._id });
  return complaintCount === 0;
};

// Virtual for formatted resolution time
categorySchema.virtual("formattedResolutionTime").get(function () {
  const hours = this.resolutionTimeHours;

  if (hours < 24) {
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  } else if (hours % 24 === 0) {
    const days = hours / 24;
    return `${days} day${days !== 1 ? "s" : ""}`;
  } else {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days} day${days !== 1 ? "s" : ""} ${remainingHours} hour${
      remainingHours !== 1 ? "s" : ""
    }`;
  }
});

// Virtual for complaint statistics
categorySchema.virtual("stats", {
  ref: "Complaint",
  localField: "_id",
  foreignField: "category",
  justOne: false,
});

// Transform JSON output
categorySchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.__v;
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

// Transform Object output
categorySchema.set("toObject", {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.__v;
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model("Category", categorySchema);
