import { Router } from "express";
import * as postController from '../controllers/post.controller.js';
import multer from 'multer';
import { auth } from "../middlewares/auth.middleware.js";

const postRouter = Router();

const upload = multer({storage: multer.memoryStorage()})

postRouter.post('/create-post',auth,upload.single('image'), postController.createPost);

postRouter.get('/', auth, postController.getPosts);

postRouter.post("/:postId/like", auth, postController.likePost);

postRouter.post('/:postId/comments',auth, postController.postComments);

postRouter.get('/:postId/getcomments', auth, postController.getComments);





export default postRouter;