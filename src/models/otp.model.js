import mongoose from "mongoose";

const optSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "Email is required"]
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: [true, "User is required"]
  },
  otpHash: {
    type: String,
    required: [true, "OTP hash is required"]
  },
  purpose: {
    type: String,
    enum: ["email-verification", "forgot-password"],
    required: true
  }
}, {
  timestamps: true
})

const otpModel = mongoose.model('otps', optSchema)

export default otpModel;