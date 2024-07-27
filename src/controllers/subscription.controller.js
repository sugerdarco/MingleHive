import {asyncHandler} from "../utils/asyncHandler.js";
import {isValidObjectId} from "../utils/validate.js";
import {ApiError} from "../utils/apiError.js";
import {Subscription} from "../models/subscription.models.js";
import mongoose from "mongoose";
import {User} from "../models/user.models.js";
import {ApiResponse} from "../utils/apiResponse.js";

const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!isValidObjectId(channelId) || !await User.findById(channelId)) {
        throw new ApiError(`Invalid channelId "${channelId}"`);
    }

    const subscriberId = new mongoose.Types.ObjectId(req.user._id);
    const subscription = await Subscription.findOne({ subscriber: subscriberId, channel: channelId });

    let responseMessage;
    let result;

    if (subscription) {
        result = await Subscription.findByIdAndDelete(subscription._id);
        responseMessage = `unsubscribed ${channelId} successfully.`;
    } else {
        result = await Subscription.create({ subscriber: subscriberId, channel: channelId });
        responseMessage = `subscribed ${channelId} successfully.`;
    }

    return res.status(200).json(new ApiResponse(200, result, responseMessage));
});


const getSubscribers = asyncHandler(async (req, res) => {
   const subscribers = await Subscription.find({channel: new mongoose.Types.ObjectId(req.user?._id)});
   if (subscribers.length === 0) {
       return res.status(200).json(new ApiResponse(200, null, "Subscribers not found."));
   }

   return res.status(200).json(new ApiResponse(200, subscribers, "Subscribers fetched successfully."));
});

const getSubscribedChannels = asyncHandler(async (req, res) => {
    const subscribedChannels = await Subscription.find({subscriber: new mongoose.Types.ObjectId(req.user?._id)});
    if (subscribedChannels.length === 0) {
        return res.status(200).json(new ApiResponse(200, null, "Subscribed channels not found."));
    }

    return res.status(200).json(new ApiResponse(200, subscribedChannels, "Subscribed channels fetched successfully."));
});

export {getSubscribers, getSubscribedChannels, toggleSubscription}