const mongoose = require('mongoose');
const { 
  COMPLAINT_STATUS, 
  COMPLAINT_PRIORITY,
  DEFAULT_RESOLUTION_TIMES
} = require('../config/constants');

const complaintSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Complaint title is required'],
    trim: true,
    minlength: [5, 'Title must be at least 5 characters long'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  
  description: {
    type: String,
    required: [true, 'Complaint description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters long'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required'],
    index: true
  },
  
  priority: {
    type: String,
    enum: {
      values: Object.values(COMPLAINT_PRIORITY),
      message: '{VALUE} is not a valid priority'
    },
    default: COMPLAINT_PRIORITY.MEDIUM
  },
  
  status: {
    type: String,
    enum: {
      values: Object.values(COMPLAINT_STATUS),
      message: '{VALUE} is not a valid status'
    },
    default: COMPLAINT_STATUS.SUBMITTED,
    index: true
  },
  
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    index: true
  },
  
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  
  statusHistory: [{
    status: {
      type: String,
      enum: Object.values(COMPLAINT_STATUS),
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: [500, 'Remarks cannot exceed 500 characters']
    }
  }],
  
  escalation: {
    isEscalated: {
      type: Boolean,
      default: false,
      index: true
    },
    escalatedAt: {
      type: Date,
      default: null
    },
    escalatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [500, 'Escalation reason cannot exceed 500 characters']
    }
  },
  
  resolvedAt: {
    type: Date,
    default: null
  },
  
  deadline: {
    type: Date,
    required: true,
    index: true
  },
  
  feedback: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Feedback',
    default: null
  },
  
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  internalNotes: [{
    note: {
      type: String,
      required: true,
      trim: true,
      maxlength: [1000, 'Note cannot exceed 1000 characters']
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  versionKey: false
});

// Indexes for performance
complaintSchema.index({ user: 1, status: 1 });
complaintSchema.index({ assignedTo: 1, status: 1 });
complaintSchema.index({ category: 1, priority: 1 });
complaintSchema.index({ createdAt: -1 });
complaintSchema.index({ deadline: 1, status: 1 }); // For escalation queries
complaintSchema.index({ 'escalation.isEscalated': 1 });

// Pre-save middleware to set deadline based on category and priority
complaintSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      // Populate category to get resolution time
      await this.populate('category');
      
      let resolutionHours;
      if (this.category && this.category.resolutionTimeHours) {
        resolutionHours = this.category.resolutionTimeHours;
      } else {
        // Fallback to default resolution times
        resolutionHours = DEFAULT_RESOLUTION_TIMES[this.priority] || DEFAULT_RESOLUTION_TIMES.medium;
      }
      
      // Apply priority multiplier
      const priorityMultipliers = {
        [COMPLAINT_PRIORITY.URGENT]: 0.5,  // Half time for urgent
        [COMPLAINT_PRIORITY.HIGH]: 0.75,   // 75% time for high
        [COMPLAINT_PRIORITY.MEDIUM]: 1,    // Standard time
        [COMPLAINT_PRIORITY.LOW]: 1.5      // 50% more time for low
      };
      
      const adjustedHours = resolutionHours * (priorityMultipliers[this.priority] || 1);
      
      // Set deadline
      this.deadline = new Date(Date.now() + adjustedHours * 60 * 60 * 1000);
      
      // Add initial status to history
      this.statusHistory.push({
        status: this.status,
        timestamp: new Date(),
        updatedBy: this.user,
        remarks: 'Complaint submitted'
      });
      
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Pre-update middleware to track status changes
complaintSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

// Instance method to update status with history
complaintSchema.methods.updateStatus = async function(newStatus, updatedBy, remarks) {
  const oldStatus = this.status;
  
  if (oldStatus === newStatus) {
    throw new Error('Status is already ' + newStatus);
  }
  
  this.status = newStatus;
  
  // Add to status history
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    updatedBy: updatedBy,
    remarks: remarks || `Status changed from ${oldStatus} to ${newStatus}`
  });
  
  // Set resolved date if status is resolved
  if (newStatus === COMPLAINT_STATUS.RESOLVED) {
    this.resolvedAt = new Date();
  }
  
  // Clear resolved date if status is changed from resolved
  if (oldStatus === COMPLAINT_STATUS.RESOLVED && newStatus !== COMPLAINT_STATUS.RESOLVED) {
    this.resolvedAt = null;
  }
  
  return this.save();
};

// Instance method to escalate complaint
complaintSchema.methods.escalate = async function(escalatedBy, reason) {
  if (this.escalation.isEscalated) {
    throw new Error('Complaint is already escalated');
  }
  
  if (this.status === COMPLAINT_STATUS.RESOLVED || this.status === COMPLAINT_STATUS.CLOSED) {
    throw new Error('Cannot escalate resolved or closed complaint');
  }
  
  this.escalation = {
    isEscalated: true,
    escalatedAt: new Date(),
    escalatedBy: escalatedBy,
    reason: reason || 'Deadline exceeded'
  };
  
  this.status = COMPLAINT_STATUS.ESCALATED;
  
  // Add to status history
  this.statusHistory.push({
    status: COMPLAINT_STATUS.ESCALATED,
    timestamp: new Date(),
    updatedBy: escalatedBy,
    remarks: `Complaint escalated: ${reason || 'Deadline exceeded'}`
  });
  
  return this.save();
};

// Instance method to assign complaint to staff
complaintSchema.methods.assignTo = async function(staffId, assignedBy) {
  if (this.status === COMPLAINT_STATUS.RESOLVED || this.status === COMPLAINT_STATUS.CLOSED) {
    throw new Error('Cannot assign resolved or closed complaint');
  }
  
  const oldAssignedTo = this.assignedTo;
  this.assignedTo = staffId;
  this.status = COMPLAINT_STATUS.ASSIGNED;
  
  // Add to status history
  this.statusHistory.push({
    status: COMPLAINT_STATUS.ASSIGNED,
    timestamp: new Date(),
    updatedBy: assignedBy,
    remarks: `Complaint assigned to staff member`
  });
  
  return this.save();
};

// Static method to get complaints due for escalation
complaintSchema.statics.getDueForEscalation = function() {
  const now = new Date();
  return this.find({
    deadline: { $lt: now },
    status: { 
      $nin: [
        COMPLAINT_STATUS.RESOLVED, 
        COMPLAINT_STATUS.CLOSED, 
        COMPLAINT_STATUS.ESCALATED
      ] 
    },
    'escalation.isEscalated': false
  }).populate('user category assignedTo');
};

// Static method to get analytics data
complaintSchema.statics.getAnalytics = async function(dateRange = {}) {
  const { startDate, endDate } = dateRange;
  const matchStage = {};
  
  if (startDate && endDate) {
    matchStage.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalComplaints: { $sum: 1 },
        pendingComplaints: {
          $sum: {
            $cond: [
              { $nin: ['$status', [COMPLAINT_STATUS.RESOLVED, COMPLAINT_STATUS.CLOSED]] },
              1,
              0
            ]
          }
        },
        resolvedComplaints: {
          $sum: {
            $cond: [{ $eq: ['$status', COMPLAINT_STATUS.RESOLVED] }, 1, 0]
          }
        },
        escalatedComplaints: {
          $sum: {
            $cond: [{ $eq: ['$escalation.isEscalated', true] }, 1, 0]
          }
        },
        averageResolutionTime: {
          $avg: {
            $cond: [
              { $ne: ['$resolvedAt', null] },
              { $subtract: ['$resolvedAt', '$createdAt'] },
              null
            ]
          }
        }
      }
    }
  ]);
};

// Virtual for days since creation
complaintSchema.virtual('daysSinceCreated').get(function() {
  return Math.floor((new Date() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Virtual for time until deadline
complaintSchema.virtual('hoursUntilDeadline').get(function() {
  return Math.floor((this.deadline - new Date()) / (1000 * 60 * 60));
});

// Virtual for checking if overdue
complaintSchema.virtual('isOverdue').get(function() {
  return new Date() > this.deadline && 
         ![COMPLAINT_STATUS.RESOLVED, COMPLAINT_STATUS.CLOSED].includes(this.status);
});

// Transform JSON output
complaintSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    ret.id = ret._id;
    delete ret._id;
    return ret;
  }
});

// Transform Object output
complaintSchema.set('toObject', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    ret.id = ret._id;
    delete ret._id;
    return ret;
  }
});

module.exports = mongoose.model('Complaint', complaintSchema);