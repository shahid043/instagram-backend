import postModel from "../models/post.model.js";
import uploadFile from "../services/storage.js";
import commentModel from "../models/comments.model.js";
import userModel from "../models/user.model.js";



export async function createPost(req, res) {

  console.time("Upload");

  const result = await uploadFile(req.file.buffer);

  console.timeEnd("Upload");

  console.time("Mongo");

  const post = await postModel.create({
    image: result.url,
    caption: req.body.caption,
    user: req.user.id,
  })

  console.timeEnd("Mongo");

  return res.status(201).json({
    message: 'post created successfully',
    post
  })
}

export async function getPosts(req, res) {
  try {

    const currentUser = await userModel.findById(req.user.id);

    const posts = await postModel
      .find()
      .populate("user", "username profilePicture")
      .sort({ createdAt: -1 });

    const formattedPosts = posts.map((post) => ({
      _id: post._id,
      image: post.image,
      caption: post.caption,
      user: post.user,
      createdAt: post.createdAt,

      likesCount: post.likes.length,
      commentsCount: post.commentsCount,
      isLiked: post.likes.some(
        (id) => id.toString() === req.user.id
      ),
      isOwnPost:
        post.user._id.toString() === req.user.id,
      isFollowing: currentUser.following.some(
        (followingId) => followingId.toString() === post.user._id.toString()
      ),
    }));

    return res.status(200).json({
      message: "Posts fetched successfully",
      posts: formattedPosts,
    });
  } catch (err) {
    console.log(err)
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
}

export async function likePost(req, res) {
  try {
    const { postId } = req.params;

    const userId = req.user.id;

    const post = await postModel.findById(postId);

    if (!post) {
      return res.status(404).json({
        message: "Post not found"
      })
    }

    const alreadyLiked = post.likes.some(
      (id) => id.toString() === userId
    );

    if (alreadyLiked) {
      post.likes.pull(userId);
    } else {
      post.likes.push(userId)
    }

    await post.save();

    return res.status(200).json({
      liked: !alreadyLiked,
      likesCount: post.likes.length,
    });

  } catch (err) {
    console.log(err);

    return res.status(500).json({
      message: "Internal Server Error"
    })
  }
}

export async function postComments(req, res) {
  try {

    const { text } = req.body;

    const { postId } = req.params;

    const userId = req.user.id;

    const post = await postModel.findById(postId)

    if (!text || !text.trim()) {
      return res.status(400).json({
        message: "Comment cannot be empty",
      });
    }

    if (!post) {
      return res.status(404).json({
        message: 'Post not found'
      })
    }

    const comment = await commentModel.create({
      text: text,
      post: postId,
      user: userId,

    })

    post.commentsCount += 1;

    await post.save();

    await comment.populate("user", "username");

    return res.status(201).json({
      message: 'Comment posted successfully',
      comment
    })


  } catch (err) {
    console.log(err)

    return res.status(500).json({
      message: 'Internal server error'
    })
  }
}

export async function getComments(req, res) {

  try {
    const { postId } = req.params;

    const comments = await commentModel.find({
      post: postId
    }).populate('user', 'username').sort({ createdAt: 1 })

    return res.status(200).json({
      comments,
    });
  } catch (err) {
    console.log(err)

    return res.status(500).json({
      message: "Internal server error",
    });
  }

}