import mongoose from "mongoose";

const validateAssetOwnership = (userId, assetOwnerId) => {
    return userId.equals(assetOwnerId);
}

const isValidObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

export {validateAssetOwnership, isValidObjectId};