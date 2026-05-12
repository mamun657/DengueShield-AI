const User = require("../models/User");
const Report = require("../models/Report");

// @desc    Get user profile
// @route   GET /api/user/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/user/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.name = req.body.name || user.name;
    user.age = req.body.age !== undefined ? req.body.age : user.age;
    user.weight = req.body.weight !== undefined ? req.body.weight : user.weight;
    user.pregnancyStatus = req.body.pregnancyStatus !== undefined ? req.body.pregnancyStatus : user.pregnancyStatus;
    user.chronicDiseases = req.body.chronicDiseases || user.chronicDiseases;
    user.emergencyContact = req.body.emergencyContact || user.emergencyContact;

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      age: updatedUser.age,
      weight: updatedUser.weight,
      pregnancyStatus: updatedUser.pregnancyStatus,
      chronicDiseases: updatedUser.chronicDiseases,
      emergencyContact: updatedUser.emergencyContact,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get user reports history
// @route   GET /api/user/reports
// @access  Private
const getUserReports = async (req, res) => {
  try {
    const reports = await Report.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  getUserReports,
};
