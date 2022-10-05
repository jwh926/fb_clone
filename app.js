const express = require("express");
const morgan = require('morgan');
const mongoose = require("mongoose");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const Localstrategy = require("passport-local");
const socket = require("socket.io");
const dotenv = require("dotenv");
const flash = require("connect-flash");
const Post = require("./models/Post");
const User = require("./models/User");
const port = process.env.PORT || 3000;
const onlineChatUsers = {};

dotenv.config();

const postRoutes = require("./routes/posts");
const userRoutes = require("./routes/user");
const app = express();

app.set("view engine", "ejs");

app.use(cookieParser(process.env.SECRET));
app.use(
	session({
		secret: process.env.SECRET,
		resave: false,
		saveUninitialized: false,
	})
);
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new Localstrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/static', express.static("public"));
app.use(morgan('dev'));

mongoose
	.connect("mongodb://127.0.0.1:27017/fb_clone", {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
	.then(() => {
		console.log("connected to mongodb");
	})
	.catch((err) => {
		console.log(err);
	});

app.use((req, res, next) => {
	res.locals.user = req.user;
	res.locals.login = req.isAuthenticated();
	res.locals.error = req.flash("error");
	res.locals.success = req.flash("success");
	next();
});

app.use("/", userRoutes);
app.use("/", postRoutes);

const server = app.listen(port, () => {
	console.log(`http://localhost:${port}`);
});

const io = socket(server);

const room = io.of("/chat");
room.on("connection", (socket) => {
	room.emit("newUser", { socketID: socket.id });
	socket.on("newUser", (data) => {
		console.log(data);
		if (!(data.name in onlineChatUsers)) {
			onlineChatUsers[data.name] = data.socketID;
			socket.name = data.name;
			room.emit("updateUserList", Object.keys(onlineChatUsers));
			console.log("Online Users: " + Object.keys(onlineChatUsers));
		}
	});
	socket.on("chat", (data) => {
		console.log(data);
		if (data.to === "Global Chat") {
			room.emit("chat", data);
		} else if (data.to) {
			room.to(onlineChatUsers[data.name]).emit("chat", data);
			room.to(onlineChatUsers[data.to]).emit("chat", data);
		}
	});
});