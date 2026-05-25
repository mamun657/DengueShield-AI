const User = require("../models/User");
const Report = require("../models/Report");

const resolvePhotoUrl = (req, photoUrl) => {
  if (!photoUrl) return "";
  if (/^https?:\/\//i.test(photoUrl)) return photoUrl;
  if (photoUrl.startsWith("/")) {
    return `${req.protocol}://${req.get("host")}${photoUrl}`;
  }
  return photoUrl;
};

// @desc    Get user profile
// @route   GET /api/user/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const payload = user.toObject();
    payload.photoUrl = resolvePhotoUrl(req, payload.photoUrl);
    res.json(payload);
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
      photoUrl: resolvePhotoUrl(req, updatedUser.photoUrl),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Upload profile photo
// @route   POST /api/user/profile/photo
// @access  Private
const uploadProfilePhoto = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file provided" });
    }

    // Save the file path as the user's photo URL (served from /uploads)
    user.photoUrl = `/uploads/${req.file.filename}`;
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
      photoUrl: resolvePhotoUrl(req, updatedUser.photoUrl),
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
  uploadProfilePhoto,
  getUserReports,
};
