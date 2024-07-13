import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiError.js";
import {User} from "../models/user.models.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/apiResponse.js";

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

export {registerUser};