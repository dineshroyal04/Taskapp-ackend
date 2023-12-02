// server.js
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = 3001;

const secretKey = "yourSecretKey"; // Change this in a real app

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/taskmanager", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;

db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => console.log("Connected to MongoDB"));

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB Schemas
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});
const UserModel = mongoose.model("User", userSchema);

const taskSchema = new mongoose.Schema({
  task: String,
  taskId: String,
  stage: String,
  userId: { type: mongoose.Schema.Types.ObjectId, required: true,ref: "User" },
});

const TaskModel = mongoose.model("Task", taskSchema);
userSchema.virtual("tasks", {
  ref: "Task",
  localField: "_id",
  foreignField: "userId",
});

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) return res.sendStatus(401);

  jwt.verify(token, secretKey, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Routes
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await UserModel.findOne({ username });

  if (user && bcrypt.compareSync(password, user.password)) {
    const token = jwt.sign({ username }, secretKey);
    res.json({ token });
  } else {
    res.sendStatus(401);
  }
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  const hashedPassword = bcrypt.hashSync(password, 10);
  const newUser = new UserModel({ username, password: hashedPassword });

  try {
    await newUser.save();
    res.sendStatus(201);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

// CRUD Operations for Tasks
app.get("/tasks", authenticateToken, async (req, res) => {
  try {
    const tasks = await TaskModel.find({});
    res.json(tasks);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.post("/tasks", authenticateToken, async (req, res) => {
  const { task, taskId, stage } = req.body;
  const userId = req.user._id; // Assuming the user ID is stored in _id field

  const newTask = new TaskModel({ task, taskId, stage, userId });

  try {
    await newTask.save();
    res.sendStatus(201);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.put("/tasks/:id", authenticateToken, async (req, res) => {
  const taskId = req.params.id;
  const { text, stage } = req.body;

  try {
    const updatedTask = await TaskModel.findByIdAndUpdate(
      taskId,
      { text, stage },
      { new: true }
    );
    res.json(updatedTask);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.delete("/tasks/:id", authenticateToken, async (req, res) => {
  const taskId = req.params.id;

  try {
    await TaskModel.findByIdAndDelete(taskId);
    res.sendStatus(204);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.listen(PORT, () =>
  console.log(`Server is running on http://localhost:${PORT}`)
);
