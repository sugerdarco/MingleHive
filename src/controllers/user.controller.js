import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiError.js";
import {User} from "../models/user.models.js";
import {deleteFromCloudinary, uploadOnCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const options = {
    httpOnly: true,
    secure: true,
}

const generateAccessOrRefreshToken = async (userId) => {
    try {
        const user = await User.findOne(userId);
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});

        return {accessToken, refreshToken};
    } catch (err) {
        throw new ApiError(500, "Something went wrong while generating access and refresh token");
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const {username, email, fullName, password} = req.body;

    //validate required fields are not missing
    if (!username || !email || !fullName || !password) {
        throw new ApiError(400, "All fields are required");
    }

    //check username or email id already
    const existedUser = await User.findOne({$or: [{ username }, {email}]});
    if (existedUser) {
        throw new ApiError(409, "User already exists");
    }

    //file handling
    const avatarLocalPath = req.files?.avatar[0].path;
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required.");
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    const user = await User.create({
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        fullName: fullName,
        password: password,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
    });

    const createdUser = await User.findById(user._id).select(
        "-password, -refreshToken"
    );
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User successfully registered"),
    );

});

const loginUser = asyncHandler(async (req, res) => {
    const {username, email, password} = req.body;

    if ((!username && !email) || !password) {
        throw new ApiError(400, "Username or Email and Password field is required");
    }

    const user = await User.findOne({$or: [{ username }, {email}]});
    if (!user) {
        throw new ApiError(401, "User doesn't exists");
    }

    const validUser = await user.comparePassword(password);
    if (!validUser) {
        throw new ApiError(401, "Wrong username or password");
    }

    const {accessToken, refreshToken} = await generateAccessOrRefreshToken(user._id);
    const loggedInUser = await User.findById(user._id).select("-password, -refreshToken");

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, {user: loggedInUser, accessToken, refreshToken}, "User successfully logged in"));

});

const logoutUser = asyncHandler(async (req, res) => {

    await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } }, {new: true});

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User successfully logged out."));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request.");
    }

    try {
        const decodedToken = await jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id);
        if (!user) {
            throw new ApiError(401, "Invalid refresh token.");
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used.");
        }

        const {accessToken, refreshToken} = await generateAccessOrRefreshToken(user._id);

        return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(new ApiResponse(200, {accessToken, refreshToken}, "Access token refresh successfully."));

    } catch (err) {
        throw new ApiError(401, `${err?.message} problem here` || "Invalid refresh token.");
    }
})

const changePassword = asyncHandler(async (req, res) => {
    const {password, newPassword, reNewPassword} = req.body;
    if (newPassword !== reNewPassword) {
        throw new ApiError(401, "New Password mismatch.");
    }

    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
        throw new ApiError(401, "Invalid Old password");
    }

    user.password = newPassword;
    await user.save({validateBeforeSave: false});

    return res.status(200).json(new ApiResponse(200, {},"Password changed successfully."));
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(new ApiResponse(200, req.user, "User fetched successfully."));
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const {fullName, email} = req.body;

    if (!fullName && !email) {
        throw new ApiError(401, "All fields are required.");
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        { $set: { fullName, email } },
        {new: true})
        .select("-password");

    return res.status(200).json(new ApiResponse(200, user, "Account details updated successfully."));
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar image is missing.");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading avatar.");
    }

    const oldAvatar = req.user?.avatar;

    const user = await User.findByIdAndUpdate(req.user?._id,
        { $set: { avatar : avatar.url } },
        {new: true})
        .select("-password");

    await deleteFromCloudinary(oldAvatar);

    return res.status(200).json(new ApiResponse(200, user, "Avatar updated successfully."));
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;
    if (!coverImageLocalPath) {
        throw new ApiError(500, "Cover image file is missing.");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!coverImage.url) {
        throw new ApiError(500, "Error while uploading cover image.");
    }

    const oldCoverImage = req.user?.coverImage;

    const user = await User.findByIdAndUpdate(req.user?._id,
        {$set: { coverImage : coverImage.url } },
        {new: true})
        .select("-password");

    await deleteFromCloudinary(oldCoverImage);

    return res.status(200).json(new ApiResponse(200, user, "Cover Image updated successfully."));
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const {username} = req.params;
    if (!username?.trim()) {
        throw new ApiError(400, "User username is missing.");
    }

    //mongo atlas aggregation
    const channel = await User.aggregate([
        {$match: {username : username?.toLowerCase()},},
        {$lookup: {from: "subscribers", localField: "_id", foreignField: "channel", as: "subscribers"},}, //other subscribe to user
        {$lookup: {from: "subscribers", localField: "_id", foreignField: "subscriber", as: "subscribed"},}, //user subscribe to other
        {$addFields: {
                subscribersCount: {size: "$subscribers"},
                subscribedCount: {size: "$subscribed"},
                isSubscribed: {$cond: {if: {$in: [req.user?._id, "$subscribed.channel"]}, then: 1, else: 0}},
            }
        },
        {$project: {
                username: 1,
                email: 1,
                fullName: 1,
                avatar: 1,
                coverImage: 1,
                subscribersCount : 1,
                subscribedCount: 1,
                isSubscribed: 1,
            },
        }
    ]);

    if (!channel?.length) {
        throw new ApiError(404, "No channel found.");
    }

    return res.status(200).json(new ApiResponse(200, channel[0], "User channel fetched successfully."));
})

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {_id: new mongoose.Types.ObjectId(req.user?._id)}
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        },
    ]);

    return res.status(200).json(new ApiResponse(200, user[0].watchHistory, "Watch History successfully."));
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changePassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
};