import userModel from '../models/user.model.js';
import bcrypt from 'bcrypt';
import jwt, { decode } from 'jsonwebtoken';
import config from '../config/config.js';
import sessionModel from '../models/session.model.js';
import { sendEmail } from '../services/email.service.js';
import { generateOtp, getOtpHtml } from '../utils/utils.js';
import otpModel from '../models/otp.model.js';
import postModel from '../models/post.model.js';
import uploadFile from '../services/storage.js';

export async function register(req, res) {

  const { username, email, password, name, day, month, year } = req.body;

  const isAlreadyRegistered = await userModel.findOne({
    username
  })

  if (isAlreadyRegistered) {
    return res.status(409).json({
      message: 'User already exists'
    })
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const normalizedUsername = username.toLowerCase();

  const user = await userModel.create({
    username: normalizedUsername,
    email,
    password: hashedPassword,

    birthDate: {
      day, month, year
    }
  })

  const otp = generateOtp();
  const html = getOtpHtml(otp);


  const otpHash = await bcrypt.hash(otp, 10);

  await otpModel.create({
    email,
    user: user._id,
    otpHash,
    purpose: "email-verification",
  })

  await sendEmail(email, 'OTP Verification', `Your OTP code is ${otp}`, html)

  res.status(201).json({
    message: 'user registered successfully',
    user: {
      username: user.username,
      email: user.email,
      verified: user.verified
    }
  })



}

export async function login(req, res) {

  const { login, password } = req.body;

  if (!login || !password) {
    return res.status(400).json({
      message: "Login and password are required",
    });
  }

  const user = await userModel.findOne({
    $or: [
      { username: login },

    ]
  });

  if (!user) {
    return res.status(401).json({
      message: 'Invalid email, username or password'
    })
  }

  if (!user.verified) {
    return res.status(401).json({
      message: 'Email not verified'
    })
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return res.status(401).json({
      message: "Invalid email, username or password",
    });
  }

  const session = await sessionModel.create({
    user: user._id,
    ip: req.ip,
    userAgent: req.headers['user-agent']

  })

  const refreshToken = jwt.sign({
    id: user._id,
    sessionId: session._id
  }, config.JWT_SECRET, {
    expiresIn: '7d'
  })

  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

  session.refreshTokenHash = refreshTokenHash;

  await session.save();

  const accessToken = jwt.sign({
    id: user._id,
    sessionId: session._id
  }, config.JWT_SECRET, {
    expiresIn: '15m'
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 //7 days
  })

  res.status(200).json({
    message: 'Logged in successfully',
    user: {
      username: user.username,
      email: user.email,
    },
    accessToken
  })
}


export async function getMe(req, res) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: 'token not found'
    })
  }

  const decoded = jwt.verify(token, config.JWT_SECRET);

  const user = await userModel.findById(decoded.id)

  res.status(200).json({
    message: 'user fetched successfully',
    user: {
      username: user.username,
      email: user.email,
    }
  })
}

export async function refreshToken(req, res) {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({
      message: 'Refresh token not found'
    })
  }

  const decoded = jwt.verify(refreshToken, config.JWT_SECRET);

  const session = await sessionModel.findOne({
    _id: decoded.sessionId,
    revoked: false,
  });

  if (!session) {
    return res.status(401).json({
      message: "Invalid session",
    });
  }

  const isValid = await bcrypt.compare(
    refreshToken,
    session.refreshTokenHash
  );

  if (!isValid) {
    return res.status(401).json({
      message: "Invalid refresh token",
    });
  }

  const accessToken = jwt.sign({
    id: decoded.id,
    sessionId: session._id
  }, config.JWT_SECRET, {
    expiresIn: '15m'
  })


  const newRefreshToken = jwt.sign({
    id: decoded.id,
    sessionId: decoded.sessionId
  }, config.JWT_SECRET, {
    expiresIn: '7d'
  })

  const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10)


  session.refreshTokenHash = newRefreshTokenHash;

  await session.save();

  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7days
  })

  res.status(200).json({
    message: 'Access token refreshed successfully ',
    accessToken
  })
}

export async function logout(req, res) {

  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(400).json({
      message: 'Refresh token not found'
    })
  }

  const decoded = jwt.verify(refreshToken, config.JWT_SECRET);

  const session = await sessionModel.findOne({
    _id: decoded.sessionId,
    revoked: false,
  });

  if (!session) {
    return res.status(400).json({
      message: 'Invalid session'
    })
  }

  session.revoked = true;
  await session.save();

  res.clearCookie('refreshToken')

  res.status(200).json({
    message: 'Logged out successfully'
  })

}

export async function logoutAll(req, res) {

  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(400).json({
      message: 'Refresh token not found'
    })
  }

  const decoded = jwt.verify(refreshToken, config.JWT_SECRET);

  await sessionModel.updateMany({
    user: decode.id,
    revoked: false
  }, {
    revoked: true
  })

  res.clearCookie('refreshToken')

  res.status(200).json({
    message: 'Logged out from all devices successfully'
  })

}

export async function verifyEmail(req, res) {
  const { otp, email } = req.body;

  const otpDoc = await otpModel.findOne({
    email,
    purpose: 'email-verification'
  })

  if (!otpDoc) {
    return res.status(404).json({
      message: 'OTP not found'
    })
  }

  const isValid = await bcrypt.compare(otp,
    otpDoc.otpHash
  )

  if (!isValid) {
    return res.status(400).json({
      message: 'Invalid OTP'
    })
  }

  const user = await userModel.findById(otpDoc.user);

  user.verified = true;

  await user.save();

  await otpModel.deleteMany({
    email: otpDoc.email,
    purpose: 'email-verification'
  })

  return res.status(200).json({
    message: "Email verified successfully",
    user: {
      username: user.username,
      email: user.email,
      verified: user.verified
    }
  })
}


export async function checkUsername(req, res) {
  try {
    const { username } = req.query;

    const usernameRegex = /^[a-zA-Z0-9._]+$/;

    // Required
    if (!username) {
      return res.status(400).json({
        message: "Username is required",
      });
    }

    // Maximum length
    if (username.length > 30) {
      return res.status(400).json({
        message: "Username cannot be more than 30 characters",
      });
    }

    // Allowed characters
    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        message:
          "Usernames can only use letters, numbers, periods (.) and underscores (_).",
      });
    }

    const normalizedUsername = username.toLowerCase();

    // Check availability
    const user = await userModel.findOne({
      username: normalizedUsername,
    });

    if (user) {
      return res.status(200).json({
        available: false,
        message: "Username is already taken",
      });
    }

    return res.status(200).json({
      available: true,
      message: "Username is available",
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}


export async function passwordReset(req, res) {

  try {

    const { email } = req.body;

    const user = await userModel.findOne({
      email
    })

    if (!user) {
      return res.status(404).json({
        message: "If an account exists, an OTP has been sent."
      })
    }

    const otp = generateOtp();
    const html = getOtpHtml(otp);

    const otpHash = await bcrypt.hash(otp, 10);

    await otpModel.deleteMany({
      email,
      purpose: "forgot-password"
    });

    await otpModel.create({
      email,
      user: user._id,
      otpHash,
      purpose: 'forgot-password'
    })

    await sendEmail(email, 'OTP Verification for password reset', `Your OTP code is ${otp}`, html)

    res.status(200).json({
      message: 'otp send successfully'
    })

  } catch (err) {
    console.log(err);

    return res.status(500).json({
      message: "Something went wrong"
    })
  }

}


export async function verifyResetOtp(req, res) {
  try {
    const { email, otp } = req.body;

    const otpDoc = await otpModel.findOne({
      email,
      purpose: "forgot-password",
    });

    if (!otpDoc) {
      return res.status(404).json({
        message: "OTP not found",
      });
    }



    const isOtpValid = await bcrypt.compare(
      otp,
      otpDoc.otpHash
    );

    if (!isOtpValid) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    await otpModel.deleteOne({
      _id: otpDoc._id,
    });

    const resetToken = jwt.sign(
      {
        userId: otpDoc.user,
        purpose: "reset-password"
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "10m"
      }
    );

    res.cookie("resetToken", resetToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 10 * 60 * 1000 // 10 minutes
    });

    res.status(200).json({
      message: "OTP verified successfully"
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function updateProfilePicture(req, res) {
  try {
    // Upload image to ImageKit
    const imageUrl = await uploadFile(req.file.buffer);

    const user = await userModel.findByIdAndUpdate(
      req.user.id,
      {
        profilePicture: imageUrl.url,
      },
      { returnDocument: "after", }
    );

    res.json({
      message: "Profile picture updated",
      profilePicture: user.profilePicture,
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Something went wrong",
    });
  }
}


export async function changePassword(req, res) {
  try {

    const { password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match"
      });
    }

    const { resetToken } = req.cookies;



    if (!resetToken) {
      return res.status(401).json({
        message: "Reset token not found"
      });
    }

    const decoded = jwt.verify(
      resetToken,
      process.env.JWT_SECRET
    );

    if (decoded.purpose !== "reset-password") {
      return res.status(401).json({
        message: "Invalid reset token"
      });
    }

    const user = await userModel.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    user.password = passwordHash;

    await user.save();

    res.clearCookie("resetToken");

    return res.status(200).json({
      message: "Password changed successfully"
    });

  } catch (error) {

    console.log(error);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Reset token has expired"
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        message: "Invalid reset token"
      });
    }

    return res.status(500).json({
      message: "Internal Server Error"
    });

  }
}

export async function getUserProfile(req, res) {
  try {
    const username = req.params.username;

    const currentUserId = req.user.id;

    const user = await userModel
      .findOne({ username })
      .select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const posts = await postModel.find({
      user: user._id,
    })

    const isFollowing = user.followers.some(
      follower => follower.toString() === currentUserId
    );
    const followersCount = user.followers.length;
    const followingCount = user.following.length;
    const postsCount = posts.length;

    res.status(200).json({
      user,
      posts,
      followersCount,
      followingCount,
      postsCount,
      isFollowing,
      isOwnProfile: user._id.toString() === currentUserId,
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function followUser(req, res) {

  try {

    const currentUserId = req.user.id;

    const targetUsername = req.params.username;

    const targetUser = await userModel.findOne({
      username: targetUsername,
    });


    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (targetUser._id.equals(currentUserId)) {
      return res.status(400).json({
        message: "You cannot follow yourself",
      });
    }

    const isFollowing = await userModel.exists({
      _id: targetUser._id,
      followers: currentUserId,
    })

    if (isFollowing) {
      await userModel.findByIdAndUpdate(currentUserId, {
        $pull: {
          following: targetUser._id,
        },
      });

      await userModel.findByIdAndUpdate(targetUser._id, {
        $pull: {
          followers: currentUserId,
        },
      });

      return res.json({
        message: "Unfollowed successfully",
        isFollowing: false,
      });

    } else {


      // Add target user to current user's following
      await userModel.findByIdAndUpdate(
        currentUserId,
        {
          $addToSet: {
            following: targetUser._id,
          },
        }
      );

      // Add current user to target user's followers
      await userModel.findByIdAndUpdate(
        targetUser._id,
        {
          $addToSet: {
            followers: currentUserId,
          },
        }
      );
    }
    res.json({
      message: "Followed successfully",
      isFollowing: true,
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: "Internal server error"
    })
  }


}