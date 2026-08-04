import mongoose from "mongoose";



const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: [true, "Username must be unique"]
  },
  email: {
    type: String,
    required: [true, "Email is required"],
  },
  password: {
    type: String,
    required: [true, "Password is required"]
  },
  verified: {
    type: Boolean,
    default: false
  },
  birthDate: {
    day: {
      type: Number,
      required: true,
      min: 1,
      max: 31,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
      min: 1900,
      max: new Date().getFullYear(),
    },
  },
  profilePicture: {
    type: String,
    default: "",
  },
  followers: {
    type: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users'
      }
    ],
    default: []
  },
  following: {
    type: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users'
      }
    ],
    default: []
  },
})


const userModel = mongoose.model("users", userSchema)

export default userModel;