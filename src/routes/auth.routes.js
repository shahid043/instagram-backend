import { Router } from "express";
import * as authController from '../controllers/auth.controller.js';
import { auth } from "../middlewares/auth.middleware.js"; 
import multer from 'multer';


const authRouter = Router();
const upload = multer({storage: multer.memoryStorage()})


authRouter.post('/register', authController.register);


authRouter.post('/login', authController.login);


authRouter.get('/get-me', authController.getMe);


authRouter.get('/refresh-token', authController.refreshToken);

authRouter.get('/logout', authController.logout);

authRouter.get('/logout-all', authController.logoutAll);

authRouter.post('/verify-email', authController.verifyEmail);

authRouter.get("/check-username", authController.checkUsername);

authRouter.post('/password/reset', authController.passwordReset);

authRouter.post('/password/verifyresetotp', authController.verifyResetOtp);

authRouter.post('/password/changepassword', authController.changePassword);

authRouter.get('/users/:username', auth , authController.getUserProfile);

authRouter.post('/users/:username/follow', auth, authController.followUser);

authRouter.patch(
  "/users/profile-picture",
  auth,
  upload.single("profilePicture"),
  authController.updateProfilePicture
);




export default authRouter;