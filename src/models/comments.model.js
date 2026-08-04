import mongoose from "mongoose";


const commentSchema = new mongoose.Schema({
  text:{
    type: String,
    maxlength: 1000,
    required: true
  },
  user: {
    type:mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'posts',
    required: true
  }
},{
  timestamps: true
})

const commentModel = mongoose.model('comments', commentSchema);

export default commentModel;