const mongoose = require('mongoose');

const ChatSchema = mongoose.Schema(
  {
    userToken: { type: String },
    message: {
      type: String,
    },
    chatMessage: {
      type: String,
    },
    role: {
      type: String,
    },
    isFirst: { type: Boolean, default: false },
    isLast: { type: Boolean, default: false },
    direction: {
      type: String,
    },
    position: {
      type: String,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Chat = mongoose.model('Chat', ChatSchema);

module.exports = Chat;
