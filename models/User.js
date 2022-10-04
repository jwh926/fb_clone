const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

let userSchema = new mongoose.Schema({
	username: String,
	firstName: String,
	lastName: String,
	password: String,
	profile: String,
	posts: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Post",
		},
	],
	liked_posts: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Post",
		},
	],
	liked_comments: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Post",
		},
	],
	friends: [
		{ 
			type: mongoose.Schema.Types.ObjectId,
			ref: "User" 
		},
	],
	friendRequests: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "User"
		},
	],
});

userSchema.plugin(passportLocalMongoose);
let User = mongoose.model("User", userSchema);
module.exports = User;