import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campusconnect';
const PORT = process.env.PORT || 4000;

// Mongoose models
const userSchema = new mongoose.Schema({
  fullName: String,
  email: { type: String, unique: true },
  passwordHash: String,
  phone: String,
  degree: String,
  college: String,
  graduationYear: String,
  gpa: String,
  languages: [String],
  skills: String,
  experience: String,
  internships: [{ company: String, role: String, duration: String, description: String }],
  projects: String,
  createdAt: { type: Date, default: Date.now }
});

const applicationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  company: String,
  position: String,
  fullName: String,
  age: Number,
  email: String,
  phone: String,
  degree: String,
  college: String,
  graduationYear: String,
  gpa: String,
  languages: [String],
  skills: String,
  experience: String,
  projects: String,
  status: { type: String, default: 'Applied' },
  appliedDate: { type: Date, default: Date.now },
  interviewDate: Date
});

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: String,
  title: String,
  message: String,
  date: { type: Date, default: Date.now },
  read: { type: Boolean, default: false }
});

const User = mongoose.model('User', userSchema);
const Application = mongoose.model('Application', applicationSchema);
const Notification = mongoose.model('Notification', notificationSchema);

// Auth
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Missing token' });
  const token = authHeader.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { fullName, email, password, phone, degree, college, graduationYear, gpa } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already registered' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ fullName, email, passwordHash, phone, degree, college, graduationYear, gpa, languages: [], skills: '', experience: '', projects: '' });
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (e) {
    res.status(500).json({ message: 'Signup failed', error: String(e) });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (e) {
    res.status(500).json({ message: 'Login failed', error: String(e) });
  }
});

// Users
app.get('/api/users', async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json(users);
});

app.get('/api/users/me', auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json(user);
});

app.put('/api/users/me', auth, async (req, res) => {
  const update = req.body;
  const user = await User.findByIdAndUpdate(req.user.id, update, { new: true });
  res.json(user);
});

// Applications
app.post('/api/applications', auth, async (req, res) => {
  try {
    // Alternate decision by counting existing apps for this user
    const existingCount = await Application.countDocuments({ userId: req.user.id });
    let status = 'Rejected';
    let interviewDate = undefined;
    if (existingCount % 2 === 1) { // second, fourth ... accepted
      status = 'Interview Scheduled';
      const date = new Date();
      date.setDate(date.getDate() + 7);
      interviewDate = date;
    }
    const appDoc = await Application.create({ ...req.body, userId: req.user.id, status, interviewDate });
    await Notification.create({ userId: req.user.id, type: 'application_submitted', title: 'Application Submitted', message: `Your application for ${appDoc.position} at ${appDoc.company} has been submitted.` });
    if (status === 'Interview Scheduled') {
      await Notification.create({ userId: req.user.id, type: 'interview_scheduled', title: 'Interview Scheduled', message: `Interview for ${appDoc.position} at ${appDoc.company} on ${appDoc.interviewDate.toLocaleString()}.` });
    }
    res.json(appDoc);
  } catch (e) {
    res.status(500).json({ message: 'Application failed', error: String(e) });
  }
});

app.get('/api/applications/me', auth, async (req, res) => {
  const apps = await Application.find({ userId: req.user.id }).sort({ appliedDate: -1 });
  res.json(apps);
});

// Notifications
app.get('/api/notifications/me', auth, async (req, res) => {
  const notifs = await Notification.find({ userId: req.user.id }).sort({ date: -1 });
  res.json(notifs);
});

// Health
app.get('/api/health', (req, res) => res.json({ ok: true }));

mongoose.connect(MONGO_URI).then(() => {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}).catch(err => {
  console.error('Mongo connection error', err);
  process.exit(1);
});


