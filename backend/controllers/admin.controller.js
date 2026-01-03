const Category = require('../models/Category');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Feedback = require('../models/Feedback');
const {
  HTTP_STATUS,
  RESPONSE_MESSAGES,
  USER_ROLES
} = require('../config/constants');
const { asyncHandler, AppError } = require('../middleware/error.middleware');
const logger = require('../utils/logger');

/**
 * @desc    Create new category
 * @route   POST /api/admin/categories
 * @access  Private (Admin only)
 */
const createCategory = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    department,
    resolutionTimeHours,
    color,
    icon,
    keywords
  } = req.body;

  try {
    const category = await Category.create({
      name: name.trim(),
      description: description?.trim(),
      department,
      resolutionTimeHours,
      color,
      icon,
      keywords: keywords ? keywords.map(k => k.trim().toLowerCase()) : [],
      createdBy: req.user.id
    });

    logger.info(`New category created: ${category.name} by admin: ${req.user.email}`);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Category created successfully',
      category
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError('Category name already exists', HTTP_STATUS.CONFLICT);
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      throw new AppError(messages.join(', '), HTTP_STATUS.BAD_REQUEST);
    }
    throw error;
  }
});

/**
 * @desc    Get all categories
 * @route   GET /api/admin/categories
 * @access  Private (Staff/Admin)
 */
const getCategories = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    department,
    isActive,
    search
  } = req.query;

  let filter = {};

  // Apply filters
  if (department) filter.department = department;
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  // Role-based filtering
  if (req.user.role === USER_ROLES.STAFF) {
    filter.department = req.user.department;
  }

  const skip = (page - 1) * limit;

  try {
    const [categories, total] = await Promise.all([
      Category.find(filter)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .sort({ priority: 1, name: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      
      Category.countDocuments(filter)
    ]);

    // Get complaint counts for each category
    const categoriesWithStats = await Promise.all(
      categories.map(async (category) => {
        const complaintCount = await category.getComplaintCount();
        const resolvedCount = await category.getComplaintCount('resolved');
        const avgResolutionTime = await category.getAverageResolutionTime();
        
        return {
          ...category.toObject(),
          complaintCount,
          resolvedCount,
          averageResolutionTime: avgResolutionTime
        };
      })
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      categories: categoriesWithStats,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalCategories: total,
        limit: parseInt(limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    throw error;
  }
});

/**
 * @desc    Get single category by ID
 * @route   GET /api/admin/categories/:id
 * @access  Private (Staff/Admin)
 */
const getCategoryById = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id)
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');

  if (!category) {
    throw new AppError('Category not found', HTTP_STATUS.NOT_FOUND);
  }

  // Role-based access control
  if (req.user.role === USER_ROLES.STAFF && category.department !== req.user.department) {
    throw new AppError(
      RESPONSE_MESSAGES.ERROR.FORBIDDEN,
      HTTP_STATUS.FORBIDDEN
    );
  }

  // Get additional stats
  const complaintCount = await category.getComplaintCount();
  const resolvedCount = await category.getComplaintCount('resolved');
  const avgResolutionTime = await category.getAverageResolutionTime();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    category: {
      ...category.toObject(),
      complaintCount,
      resolvedCount,
      averageResolutionTime
    }
  });
});

/**
 * @desc    Update category
 * @route   PUT /api/admin/categories/:id
 * @access  Private (Admin only)
 */
const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  
  if (!category) {
    throw new AppError('Category not found', HTTP_STATUS.NOT_FOUND);
  }

  const updateData = { ...req.body, updatedBy: req.user.id };

  // Process keywords
  if (updateData.keywords) {
    updateData.keywords = updateData.keywords.map(k => k.trim().toLowerCase());
  }

  try {
    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy updatedBy', 'name email');

    logger.info(`Category updated: ${updatedCategory.name} by admin: ${req.user.email}`);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Category updated successfully',
      category: updatedCategory
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError('Category name already exists', HTTP_STATUS.CONFLICT);
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      throw new AppError(messages.join(', '), HTTP_STATUS.BAD_REQUEST);
    }
    throw error;
  }
});

/**
 * @desc    Delete category
 * @route   DELETE /api/admin/categories/:id
 * @access  Private (Admin only)
 */
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  
  if (!category) {
    throw new AppError('Category not found', HTTP_STATUS.NOT_FOUND);
  }

  // Check if category can be deleted
  const canDelete = await category.canBeDeleted();
  if (!canDelete) {
    throw new AppError(
      'Cannot delete category with existing complaints',
      HTTP_STATUS.BAD_REQUEST
    );
  }

  await Category.findByIdAndDelete(req.params.id);

  logger.info(`Category deleted: ${category.name} by admin: ${req.user.email}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Category deleted successfully'
  });
});

/**
 * @desc    Get all users
 * @route   GET /api/admin/users
 * @access  Private (Admin only)
 */
const getUsers = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    role,
    department,
    isActive,
    search
  } = req.query;

  let filter = {};

  // Apply filters
  if (role) filter.role = role;
  if (department) filter.department = department;
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;

  try {
    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      
      User.countDocuments(filter)
    ]);

    // Get complaint counts for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const totalComplaints = await Complaint.countDocuments({ user: user._id });
        const resolvedComplaints = await Complaint.countDocuments({ 
          user: user._id, 
          status: 'resolved' 
        });
        
        let assignedComplaints = 0;
        if (user.role === USER_ROLES.STAFF) {
          assignedComplaints = await Complaint.countDocuments({ assignedTo: user._id });
        }
        
        return {
          ...user.toObject(),
          stats: {
            totalComplaints,
            resolvedComplaints,
            assignedComplaints
          }
        };
      })
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      users: usersWithStats,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        limit: parseInt(limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    throw error;
  }
});

/**
 * @desc    Update user role/status
 * @route   PATCH /api/admin/users/:id
 * @access  Private (Admin only)
 */
const updateUser = asyncHandler(async (req, res) => {
  const { role, department, isActive } = req.body;
  const userId = req.params.id;

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
  }

  // Prevent admin from deactivating themselves
  if (user._id.toString() === req.user.id && isActive === false) {
    throw new AppError('Cannot deactivate your own account', HTTP_STATUS.BAD_REQUEST);
  }

  const updateData = {};
  if (role) updateData.role = role;
  if (department) updateData.department = department;
  if (isActive !== undefined) updateData.isActive = isActive;

  try {
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    logger.info(`User updated: ${updatedUser.email} by admin: ${req.user.email}`);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      throw new AppError(messages.join(', '), HTTP_STATUS.BAD_REQUEST);
    }
    throw error;
  }
});

/**
 * @desc    Get system dashboard statistics
 * @route   GET /api/admin/dashboard
 * @access  Private (Admin only)
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  try {
    const [
      totalUsers,
      totalComplaints,
      pendingComplaints,
      resolvedComplaints,
      escalatedComplaints,
      totalCategories,
      totalFeedbacks,
      recentComplaints,
      recentUsers
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Complaint.countDocuments(),
      Complaint.countDocuments({ 
        status: { $nin: ['resolved', 'closed'] } 
      }),
      Complaint.countDocuments({ status: 'resolved' }),
      Complaint.countDocuments({ 'escalation.isEscalated': true }),
      Category.countDocuments({ isActive: true }),
      Feedback.countDocuments(),
      Complaint.find()
        .populate('user', 'name email')
        .populate('category', 'name')
        .sort({ createdAt: -1 })
        .limit(5),
      User.find({ isActive: true })
        .select('-password')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    // Get average rating from feedbacks
    const avgRatingResult = await Feedback.getAverageRating();
    const averageRating = avgRatingResult[0]?.averageRating || 0;

    // Get department-wise stats
    const departmentStats = await Complaint.aggregate([
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryData'
        }
      },
      { $unwind: '$categoryData' },
      {
        $group: {
          _id: '$categoryData.department',
          totalComplaints: { $sum: 1 },
          pendingComplaints: {
            $sum: {
              $cond: [
                { $nin: ['$status', ['resolved', 'closed']] },
                1,
                0
              ]
            }
          },
          resolvedComplaints: {
            $sum: {
              $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0]
            }
          }
        }
      }
    ]);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      dashboard: {
        totals: {
          users: totalUsers,
          complaints: totalComplaints,
          categories: totalCategories,
          feedbacks: totalFeedbacks
        },
        complaints: {
          total: totalComplaints,
          pending: pendingComplaints,
          resolved: resolvedComplaints,
          escalated: escalatedComplaints,
          resolutionRate: totalComplaints > 0 ? (resolvedComplaints / totalComplaints * 100).toFixed(1) : 0
        },
        feedback: {
          averageRating: Number(averageRating.toFixed(1)),
          totalFeedbacks
        },
        recent: {
          complaints: recentComplaints,
          users: recentUsers
        },
        departmentStats
      }
    });
  } catch (error) {
    throw error;
  }
});

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getUsers,
  updateUser,
  getDashboardStats
};