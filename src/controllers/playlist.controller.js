import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiError.js";
import {Playlist} from "../models/playlist.models.js";
import {ApiResponse} from "../utils/apiResponse.js";
import {isValidObjectId, validateAssetOwnership} from "../utils/validate.js"
import {Video} from "../models/video.models.js";
import mongoose from "mongoose";

const createPlaylist = asyncHandler(async (req, res) => {
    const {playlistName, description} = req.body;
    if (!playlistName.trim()) {
        throw new ApiError(400, 'Playlist name and  is required');
    }

    console.log(description);

    const playlist = await Playlist.create({
        title: playlistName.trim(),
        description: description || undefined,
        owner: req.user._id,
    });
    if (!playlist) {
        throw new ApiError(500, "Playlist not created, please try again");
    }

    return res.status(200).json(new ApiResponse(200, playlist, "Playlist created successfully."));
});

const addVideoInPlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params;
    const {videoId} = req.query;

    console.log("playlistId", playlistId, videoId);

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Playlist ID or Video ID and  is Invalid.");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found.");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found.");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId, {$push: {videos: new mongoose.Types.ObjectId(videoId)}}, {new: true});

    return res.status(200).json(new ApiResponse(200, updatedPlaylist, "Video added successfully."));
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params;
    const {videoId} = req.query;

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Playlist ID or Video ID and  is Invalid.");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found.");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId, {$pull: {videos: new mongoose.Types.ObjectId(videoId)}}, {new: true});

    return res.status(200).json(new ApiResponse(200, updatedPlaylist, "Video removed successfully."));
});

const updatePlaylistDetails = asyncHandler(async (req, res) => {
    const {playlistId} = req.params;
    const {playlistName, description} = req.body;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Playlist ID is Invalid.");
    }
    if (!playlistName.trim() && !description.trim()) {
        throw new ApiError(400, "Playlist name or/and description is required.");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!validateAssetOwnership(playlist.owner?._id, req.user._id)) {
        throw new ApiError(1, "Unauthorized request.");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId, {
        title: playlistName || playlist.title,
        description: description || playlist.description || undefined,
    }, {new: true});
    if (!updatedPlaylist) {
        throw new ApiError(500, "Error occurs while updating playlist details.");
    }

    return res.status(200).json(new ApiResponse(200, updatedPlaylist, "playlist details updated successfully"));
});

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params;
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Playlist ID is Invalid.");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!validateAssetOwnership(playlist.owner?._id, req.user._id)) {
        throw new ApiError(401, "Unauthorized request.");
    }

    await Playlist.findByIdAndDelete(playlistId);

    return res.status(200).json(new ApiResponse(200, null, "Playlist deleted successfully."));
});

const getPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, page, limit} = req.params;
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Playlist ID is Invalid.");
    }

    const pageNumber = parseInt(page, 10) || 1;
    const pageSize = Math.min(parseInt(limit, 10), 50) || 50;

    const playlist = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
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
        {
            $skip: (pageNumber - 1) * pageSize
        },
        {
            $limit: pageSize
        }
    ]);

    if (!playlist) {
        throw new ApiError(404, "Playlist not found.");
    }

    return res.status(200).json(new ApiResponse(200, playlist, "Playlist fetched successfully."));
});

const getAllUserPlaylists = asyncHandler(async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user._id);
        const playlists = await Playlist.find({ owner: userId });

        if (!playlists) {
            return res.status(404).json(new ApiResponse(404, null, "No playlists found."));
        }

        return res.status(200).json(new ApiResponse(200, playlists, "Playlists fetched successfully."));
    } catch (error) {
        throw new ApiError(500, `Error while getting user playlist ${error}`);
    }
});

export {
    createPlaylist,
    addVideoInPlaylist,
    deletePlaylist,
    getPlaylist,
    getAllUserPlaylists,
    removeVideoFromPlaylist,
    updatePlaylistDetails
}