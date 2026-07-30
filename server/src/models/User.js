const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ["admin", "user"], default: "user" },
    isActive: { type: Boolean, default: true },
    disabledAt: { type: Date, default: null },
    pregnancyStatus: { type: Boolean, default: false },
    age: { type: Number },
    weight: { type: Number },
    chronicDiseases: { type: String },
    emergencyContact: { type: String },
    photoUrl: { type: String, default: "" },
    familyShareToken: { type: String, default: null },
  },
  { timestamps: true }
);

UserSchema.index({ createdAt: -1 });
UserSchema.index({ role: 1, isActive: 1, createdAt: -1 });

UserSchema.pre("save", async function save() {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

UserSchema.methods.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("User", UserSchema);
