const express = require("express");
const morgan = require("morgan");
const mongoose = require("mongoose");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const hpp = require("hpp");
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
const winston = require("./config/winston");
const app = express();

app.set("view engine", "ejs");

const sessOptions = {
	secret: process.env.SECRET,
	resave: false,
	saveUninitialized: false,
	cookie: {
		httpOnly: true,
		secure: false,
	},
};

if (process.env.NODE_ENV === "production") {
	sessOptions.proxy = true;
	sessOptions.cookie.secure = true;
}

if (process.env.NODE_ENV === "production") {
	app.use(morgan("combined"));
	app.use(helmet({contentSecurityPolicy: false}));
	app.use(hpp());
} else {
	app.use(morgan("dev"));
}

app.use(session(sessOptions));
app.use(cookieParser(process.env.SECRET));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new Localstrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/static", express.static("public"));

mongoose
	.connect("mongodb://127.0.0.1:27017/fb_clone", {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
	.then(() => {
		console.log("connected to mongodb");
	})
	.catch((err) => {
		winston.error(err);
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
	winston.info(`server is now listening on port ${app.get("port")}`);
});

const io = socket(server);

const room = io.of("/chat");
room.on("connection", (socket) => {
	winston.info(`new user: ${socket}`);
	room.emit("newUser", { socketID: socket.id });
	socket.on("newUser", (data) => {
		if (!(data.name in onlineChatUsers)) {
			onlineChatUsers[data.name] = data.socketID;
			socket.name = data.name;
			room.emit("updateUserList", Object.keys(onlineChatUsers));
			winston.info("Online Users: " + Object.keys(onlineChatUsers));
		}
	});

	socket.on("disconnect", () => {
		delete onlineChatUsers[socket.name];
		room.emit("updateUserList", Object.keys(onlineChatUsers));
		winston.info(`user ${socket.name} has disconnected`);
	});

	socket.on("chat", (data) => {
		winston.info(data);
		if (data.to === "Global Chat") {
			room.emit("chat", data);
		} else if (data.to) {
			room.to(onlineChatUsers[data.name]).emit("chat", data);
			room.to(onlineChatUsers[data.to]).emit("chat", data);
		}
	});
});
