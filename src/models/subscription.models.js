import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
    subscriber: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    channel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', //here User(username) is act as channel
    }
}, {timestamps: true});

export const Comment = mongoose.model('Comment', subscriptionSchema);