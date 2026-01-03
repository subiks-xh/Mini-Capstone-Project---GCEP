const mongoose = require("mongoose");
const { FEEDBACK_RATING } = require("../config/constants");

const feedbackSchema = new mongoose.Schema(
  {
    complaint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
      required: [true, "Complaint reference is required"],
      unique: true, // One feedback per complaint
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      index: true,
    },

    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [
        FEEDBACK_RATING.MIN,
        `Rating must be at least ${FEEDBACK_RATING.MIN}`,
      ],
      max: [FEEDBACK_RATING.MAX, `Rating cannot exceed ${FEEDBACK_RATING.MAX}`],
      index: true,
    },

    comments: {
      type: String,
      trim: true,
      maxlength: [1000, "Comments cannot exceed 1000 characters"],
    },

    aspects: {
      resolution: {
        rating: {
          type: Number,
          min: [
            FEEDBACK_RATING.MIN,
            `Resolution rating must be at least ${FEEDBACK_RATING.MIN}`,
          ],
          max: [
            FEEDBACK_RATING.MAX,
            `Resolution rating cannot exceed ${FEEDBACK_RATING.MAX}`,
          ],
        },
        comment: {
          type: String,
          trim: true,
          maxlength: [500, "Resolution comment cannot exceed 500 characters"],
        },
      },

      timeliness: {
        rating: {
          type: Number,
          min: [
            FEEDBACK_RATING.MIN,
            `Timeliness rating must be at least ${FEEDBACK_RATING.MIN}`,
          ],
          max: [
            FEEDBACK_RATING.MAX,
            `Timeliness rating cannot exceed ${FEEDBACK_RATING.MAX}`,
          ],
        },
        comment: {
          type: String,
          trim: true,
          maxlength: [500, "Timeliness comment cannot exceed 500 characters"],
        },
      },

      communication: {
        rating: {
          type: Number,
          min: [
            FEEDBACK_RATING.MIN,
            `Communication rating must be at least ${FEEDBACK_RATING.MIN}`,
          ],
          max: [
            FEEDBACK_RATING.MAX,
            `Communication rating cannot exceed ${FEEDBACK_RATING.MAX}`,
          ],
        },
        comment: {
          type: String,
          trim: true,
          maxlength: [
            500,
            "Communication comment cannot exceed 500 characters",
          ],
        },
      },

      professionalism: {
        rating: {
          type: Number,
          min: [
            FEEDBACK_RATING.MIN,
            `Professionalism rating must be at least ${FEEDBACK_RATING.MIN}`,
          ],
          max: [
            FEEDBACK_RATING.MAX,
            `Professionalism rating cannot exceed ${FEEDBACK_RATING.MAX}`,
          ],
        },
        comment: {
          type: String,
          trim: true,
          maxlength: [
            500,
            "Professionalism comment cannot exceed 500 characters",
          ],
        },
      },
    },

    improvementSuggestions: {
      type: String,
      trim: true,
      maxlength: [
        1000,
        "Improvement suggestions cannot exceed 1000 characters",
      ],
    },

    wouldRecommend: {
      type: Boolean,
      default: null,
    },

    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: [50, "Tag cannot exceed 50 characters"],
      },
    ],

    isAnonymous: {
      type: Boolean,
      default: false,
    },

    isPublic: {
      type: Boolean,
      default: false,
    },

    adminResponse: {
      message: {
        type: String,
        trim: true,
        maxlength: [1000, "Admin response cannot exceed 1000 characters"],
      },
      respondedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      respondedAt: {
        type: Date,
      },
    },

    helpful: {
      count: {
        type: Number,
        default: 0,
        min: [0, "Helpful count cannot be negative"],
      },
      users: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
    },

    metadata: {
      ipAddress: String,
      userAgent: String,
      platform: {
        type: String,
        enum: ["web", "mobile", "api"],
        default: "web",
      },
      version: {
        type: String,
        default: "1.0",
      },
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
feedbackSchema.index({ complaint: 1 });
feedbackSchema.index({ user: 1 });
feedbackSchema.index({ rating: -1 });
feedbackSchema.index({ createdAt: -1 });
feedbackSchema.index({ isPublic: 1, rating: -1 });
feedbackSchema.index({ tags: 1 });

// Pre-save middleware
feedbackSchema.pre("save", function (next) {
  if (this.isNew) {
    // Calculate overall rating if aspects are provided but no main rating
    if (!this.rating && this.aspects) {
      const aspectRatings = [];

      if (this.aspects.resolution?.rating)
        aspectRatings.push(this.aspects.resolution.rating);
      if (this.aspects.timeliness?.rating)
        aspectRatings.push(this.aspects.timeliness.rating);
      if (this.aspects.communication?.rating)
        aspectRatings.push(this.aspects.communication.rating);
      if (this.aspects.professionalism?.rating)
        aspectRatings.push(this.aspects.professionalism.rating);

      if (aspectRatings.length > 0) {
        this.rating = Math.round(
          aspectRatings.reduce((a, b) => a + b, 0) / aspectRatings.length
        );
      }
    }

    // Clean up tags
    if (this.tags && Array.isArray(this.tags)) {
      this.tags = this.tags
        .map((tag) => tag.toLowerCase().trim())
        .filter((tag) => tag.length > 0)
        .slice(0, 10); // Max 10 tags
    }
  }
  next();
});

// Pre-update middleware
feedbackSchema.pre("findOneAndUpdate", function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

// Static method to get average rating for complaints
feedbackSchema.statics.getAverageRating = function (filter = {}) {
  return this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        averageRating: { $avg: "$rating" },
        totalFeedbacks: { $sum: 1 },
        ratingDistribution: {
          $push: "$rating",
        },
      },
    },
    {
      $addFields: {
        ratingDistribution: {
          $reduce: {
            input: { $range: [1, 6] }, // 1 to 5
            initialValue: {},
            in: {
              $mergeObjects: [
                "$$value",
                {
                  $arrayToObject: [
                    [
                      {
                        k: { $toString: "$$this" },
                        v: {
                          $size: {
                            $filter: {
                              input: "$ratingDistribution",
                              cond: { $eq: ["$$item", "$$this"] },
                            },
                          },
                        },
                      },
                    ],
                  ],
                },
              ],
            },
          },
        },
      },
    },
  ]);
};

// Static method to get feedback analytics by category
feedbackSchema.statics.getAnalyticsByCategory = function () {
  return this.aggregate([
    {
      $lookup: {
        from: "complaints",
        localField: "complaint",
        foreignField: "_id",
        as: "complaintData",
      },
    },
    { $unwind: "$complaintData" },
    {
      $lookup: {
        from: "categories",
        localField: "complaintData.category",
        foreignField: "_id",
        as: "categoryData",
      },
    },
    { $unwind: "$categoryData" },
    {
      $group: {
        _id: "$categoryData._id",
        categoryName: { $first: "$categoryData.name" },
        averageRating: { $avg: "$rating" },
        totalFeedbacks: { $sum: 1 },
        ratings: { $push: "$rating" },
      },
    },
    { $sort: { averageRating: -1 } },
  ]);
};

// Static method to get recent feedback
feedbackSchema.statics.getRecent = function (limit = 10) {
  return this.find()
    .populate("complaint", "title status")
    .populate("user", "name email")
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Instance method to mark as helpful
feedbackSchema.methods.markHelpful = async function (userId) {
  if (!this.helpful.users.includes(userId)) {
    this.helpful.users.push(userId);
    this.helpful.count += 1;
    return this.save();
  }
  return this;
};

// Instance method to unmark as helpful
feedbackSchema.methods.unmarkHelpful = async function (userId) {
  const userIndex = this.helpful.users.indexOf(userId);
  if (userIndex > -1) {
    this.helpful.users.splice(userIndex, 1);
    this.helpful.count = Math.max(0, this.helpful.count - 1);
    return this.save();
  }
  return this;
};

// Instance method to add admin response
feedbackSchema.methods.addAdminResponse = async function (message, adminId) {
  this.adminResponse = {
    message: message,
    respondedBy: adminId,
    respondedAt: new Date(),
  };
  return this.save();
};

// Virtual for sentiment analysis (simple)
feedbackSchema.virtual("sentiment").get(function () {
  if (this.rating >= 4) return "positive";
  if (this.rating >= 3) return "neutral";
  return "negative";
});

// Virtual for overall satisfaction
feedbackSchema.virtual("overallSatisfaction").get(function () {
  const rating = this.rating;
  if (rating >= 5) return "excellent";
  if (rating >= 4) return "good";
  if (rating >= 3) return "average";
  if (rating >= 2) return "poor";
  return "very poor";
});

// Virtual for aspect ratings average
feedbackSchema.virtual("aspectsAverage").get(function () {
  if (!this.aspects) return null;

  const ratings = [];
  if (this.aspects.resolution?.rating)
    ratings.push(this.aspects.resolution.rating);
  if (this.aspects.timeliness?.rating)
    ratings.push(this.aspects.timeliness.rating);
  if (this.aspects.communication?.rating)
    ratings.push(this.aspects.communication.rating);
  if (this.aspects.professionalism?.rating)
    ratings.push(this.aspects.professionalism.rating);

  return ratings.length > 0
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length
    : null;
});

// Transform JSON output
feedbackSchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.__v;
    ret.id = ret._id;
    delete ret._id;

    // Hide sensitive information for anonymous feedback
    if (ret.isAnonymous) {
      delete ret.user;
      delete ret.metadata;
    }

    return ret;
  },
});

// Transform Object output
feedbackSchema.set("toObject", {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.__v;
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model("Feedback", feedbackSchema);
