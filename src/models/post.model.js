import mongoose from "mongoose";


const postSchema = new mongoose.Schema(
  {
    image: {
      type: String,
      required: [true, "Image is required"],
    },

    caption: {
      type: String,
      maxlength: [2200, "Caption cannot exceed 2200 characters"],
      default: "",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    likes: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "users",
        },
      ],
      default: [],
    },

    commentsCount: {
      type: Number,
      default: 0,
    }

  },
  {
    timestamps: true,
  }
);


const postModel = mongoose.model('posts', postSchema);

export default postModel;
