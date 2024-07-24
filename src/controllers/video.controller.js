import {ApiError} from "../utils/apiError.js";
import {ApiResponse} from "../utils/apiResponse.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import {deleteFromCloudinary, uploadOnCloudinary} from "../utils/cloudinary.js";
import {deleteNestedVideoComment} from "../utils/deleteNestedItems.js";
import {isValidObjectId, validateAssetOwnership} from "../utils/validate.js";
import {Playlist} from "../models/playlist.models.js";
import {User} from "../models/user.models.js";
import {Video} from "../models/video.models.js";


const publishVideo = asyncHandler(async (req, res) => {
    const {title, description, isPublish} = req.body;
    if (!title || !description) {
        throw new ApiError(400, "Missing title or description");
    }

    if (!req.files || !Array.isArray(req.files.videoFile) || req.files.videoFile.length === 0) {
        throw new ApiError(400, "Missing videoFile.");
    }
    const videoFileLocalPath = req.files.videoFile[0].path;
    const videoFile = await uploadOnCloudinary(videoFileLocalPath);

    let thumbnail;
    if (!req.files && !Array.isArray(req.files.thumbnail) && req.files.thumbnail.length === 0) {
        //
        thumbnail = {url: videoFile.url.replace(/\.\w+$/, '.jpg')};
    } else {
        const thumbnailLocalFile = req.files.thumbnail[0].path;
        thumbnail = await uploadOnCloudinary(thumbnailLocalFile);
    }


    const video = await Video.create({
        videoFile: videoFile.url,
        playbackUrl: videoFile.playback_url,
        thumbnail: thumbnail.url,
        title: title.trim(),
        description: description.trim(),
        duration: videoFile.duration,
        isPublish: isPublish || false,
        owner: req.user?._id,
    });

    const uploadedVideo = await Video.findById(video._id);
    if (!uploadedVideo) {
        throw new ApiError(500, "Error while saving video");
    }

    return res.status(200).json(new ApiResponse(200, video._id, "Video Upload successfully."));
});

const getVideoById = asyncHandler(async (req, res) => {
    const {videoId} = req.params;
    if (!isValidObjectId(videoId)) {
        throw new ApiError(404, "Invalid video Id");
    }

    //find a video and update views if available
    const video = await Video.findByIdAndUpdate(videoId,
        {
            $inc: {views: 1}
        },
        { new: true, upsert: false}
    ).select("-videoFile");
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // add video in user watchHistory
    await User.findByIdAndUpdate(req.user?._id,
        {
            $addToSet: {watchHistory: videoId}
        },
        {new: true}
    );

    return res.status(200).json(new ApiResponse(200, video, "Video fetched successfully."));
});

const updateVideoDetails = asyncHandler(async (req, res) => {
    const {videoId} = req.params;
    const {title, description} = req.body;
    let thumbnail;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "VideoId is invalid or empty.")
    }

    if (req.file) {
        let thumbnailLocalFile = req.file.path;
        thumbnail = await uploadOnCloudinary(thumbnailLocalFile);
    }

    const updateFields = Object.fromEntries(
        Object.entries({title, description, thumbnail: thumbnail?.url})
            .filter(([key, value]) => value !== null && value !== undefined),
    );
    if (Object.keys(updateFields).length === 0) {
        throw new ApiError(400, "At least one field (title, description, thumbnail) must be provided for update.");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }
    if (!validateAssetOwnership(video.owner._id, req.user?._id)) {
        throw new ApiError(401, "Unauthorized request for video details update");
    }

    const updatedVideo = await Video.findByIdAndUpdate(videoId, updateFields, {new: true, upsert: false});

    return res.status(200).json(new ApiResponse(200, updatedVideo, "Video updated successfully."));
});

const deleteVideo = asyncHandler(async (req, res) => {
    const {videoId} = req.params;
    if (!isValidObjectId(videoId)) {
        throw new ApiError(401, "videoId is invalid or empty.");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video doesn't exist");
    }
    if (!validateAssetOwnership(video.owner?._id, req.user?._id)) {
        throw new ApiError(401, "Unauthorized request for video deletion.");
    }

    await Video.findByIdAndDelete(videoId);

    await deleteFromCloudinary(video.videoFile);
    await deleteFromCloudinary(video.thumbnail);

    // deleting likes, comment, and remove video from playlist
    await deleteNestedVideoComment(videoId);
    const playlists = await Playlist.find({videos: videoId});
    for (const playlist of playlists) {
        await Playlist.findByIdAndUpdate(playlist._id, {$pull: {videos: videoId}}, {new: true});
    }

    return res.status(200).json(new ApiResponse(200, {title: video.title}, "Video deleted successfully."));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const {videoId} = req.params;
    if (!isValidObjectId(videoId)) {
        throw new ApiError(401, "Video id is invalid or empty.");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found.")
    }
    if (!validateAssetOwnership(video.owner?._id, req.user?._id)) {
        throw new ApiError(401, "Unauthorized request.");
    }

    await Video.findByIdAndUpdate(videoId, {isPublish: !video.isPublish}, {new: true, upsert: false});

    return res.status(200).json(new ApiResponse(200, video._id, `Video ${!video.isPublish ? "publish" : "unpublish"} successfully.`));
});

const getAllVideos = asyncHandler(async (req, res) => {
    const {query, page, limit} = req.query;
    let {sortType, sortBy} = req.query;

    const pageNumber = parseInt(page, 10) || 1;
    const pageSize = Math.min(parseInt(limit, 10)|| 10, 50);

    // sanitize sortType and sortBy
    const validSortTypes = ["views", "duration", "createdAt"];
    sortType = validSortTypes.includes(sortType.trim()) ? sortType.trim() : "views";
    sortBy = sortBy.trim() === "descending" ? 1 : -1;

    try {
        const videos = await Video.aggregate([
            {
                $match: {
                    isPublish: true,
                    $or: [
                        {title: {$regex: query, $options: "i"}},
                        {description: {$regex: query, $options: "i"}}

                    ]
                }
            },
            {
                $sort: {[sortType]: sortBy}
            },
            {
                $skip: (pageNumber - 1) * pageSize
            },
            {
                $limit: pageSize
            }
        ]);
        return res.status(200).json(new ApiResponse(200, videos, "Video fetched successfully."));
    } catch (err) {
        throw new ApiError(500, "Error while fetching videos.");
    }
});

export {
    publishVideo,
    getVideoById,
    updateVideoDetails,
    deleteVideo,
    togglePublishStatus,
    getAllVideos
};