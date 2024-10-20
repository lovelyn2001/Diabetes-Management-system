const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

// Initialize dotenv for environment variables
dotenv.config();

// Initialize express app
const app = express();

// Set view engine to EJS
app.set('view engine', 'ejs');

// Middleware to parse request bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));  // Serve static files like CSS, JS

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Define the User model directly here
const userSchema = new mongoose.Schema({
  name: String,
  phone: { type: String, unique: true }
});

const User = mongoose.model('User', userSchema);

// Define the HealthData model directly here
const healthDataSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  diabetesType: String,
  bloodSugar: Number,
  age: Number,
  medications: [String]
});

const HealthData = mongoose.model('HealthData', healthDataSchema);

// GET route for registration page
app.get('/auth/register', (req, res) => {
  res.render('register');
});

// POST route for registration
app.post('/auth/register', async (req, res) => {
  const { name, phone } = req.body;
  try {
    // Check if the user already exists
    let user = await User.findOne({ phone });
    if (user) {
      return res.send('User already exists. Please login.');
    }

    // Create new user and save to the database
    const newUser = new User({ name, phone });
    await newUser.save();
    
    res.redirect('/auth/login');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// GET route for login page
app.get('/auth/login', (req, res) => {
  res.render('login');
});

// POST route for login
app.post('/auth/login', async (req, res) => {
  const { phone } = req.body;
  try {
    const user = await User.findOne({ phone });
    if (!user) {
      return res.redirect('/auth/register');
    }

    // Store user in session (if sessions were implemented)
    res.redirect(`/dashboard?userId=${user._id}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// GET route for dashboard page
app.get('/dashboard', (req, res) => {
  res.render('dashboard');
});

// POST route for submitting health data from dashboard
app.post('/dashboard', async (req, res) => {
  const { diabetesType, bloodSugar, age, medications } = req.body;
  const userId = req.query.userId;  // Assume we pass userId as a query param after login
  
  try {
    // Create and save health data
    const healthData = new HealthData({
      userId,
      diabetesType,
      bloodSugar,
      age,
      medications: medications.split(',')  // Convert comma-separated list to array
    });
    
    await healthData.save();
    
    // Redirect to report page with health data ID
    res.redirect(`/report/${healthData._id}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error submitting data');
  }
});

// GET route for generating and displaying the health report
app.get('/report/:id', async (req, res) => {
  try {
    const healthData = await HealthData.findById(req.params.id);
    
    // Generate recommendation based on health data
    let medications = [];
    let recommendation = '';

    if (healthData.diabetesType === 'Type 1') {
      medications = ['Insulin therapy', 'Glucose monitoring devices'];
    } else if (healthData.diabetesType === 'Type 2') {
      if (healthData.bloodSugar > 130) {
        medications = ['Metformin', 'SGLT2 inhibitors', 'GLP-1 receptor agonists'];
        recommendation = 'Your blood sugar is high, consider reducing carbs and increasing physical activity.';
      } else if (healthData.bloodSugar < 70) {
        medications = ['Glucose tablets', 'Juice or fast-acting carbs'];
        recommendation = 'Your blood sugar is low, make sure to consume fast-acting carbohydrates.';
      } else {
        medications = ['Continue with your prescribed medications'];
        recommendation = 'Your blood sugar is within normal range. Keep up the good work!';
      }
    } else if (healthData.diabetesType === 'Gestational') {
      medications = ['Insulin therapy (if needed)', 'Blood glucose monitoring'];
      recommendation = 'Maintain a balanced diet, monitor blood sugar closely, and consult your doctor regularly.';
    }

    // Render the report page
    res.render('report', {
      report: {
        diabetesType: healthData.diabetesType,
        bloodSugar: healthData.bloodSugar,
        medications,
        recommendation
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error generating report');
  }
});

// Default homepage route (optional)
app.get('/', (req, res) => {
  res.redirect('/auth/login');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
