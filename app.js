const express = require('express');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql');
const app = express();
const port = 3000; // Define the port number

// Middleware to parse JSON request bodies
app.use(bodyParser.json());
app.use(cors()); // Enable CORS
app.use(express.static('public')); // Serve files from the 'public' directory

const secretKey = 'your_secret_key'; // Replace with your actual secret key

// Create a MySQL connection pool


const connection = mysql.createConnection({
    host: 'database-1.cnk6ca2028fj.ap-southeast-1.rds.amazonaws.com',
    user: 'admin',
    password: 'MyPassword123.',
    database: 'database-1'
});

connection.connect((err) => {
    if (err) throw err;
    console.log('Connected to the database!');
});

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];

  if (!token) {
    return res.status(403).send({
      success: false,
      message: 'No token provided.'
    });
  }

  const tokenParts = token.split(' ');
  if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
    return res.status(403).send({
      success: false,
      message: 'Invalid token format.'
    });
  }

  jwt.verify(tokenParts[1], secretKey, (err, decoded) => {
    if (err) {
      return res.status(500).send({
        success: false,
        message: 'Failed to authenticate token.'
      });
    }

    // If everything is good, save the decoded info to request for use in other routes
    req.userId = decoded.id;
    next();
  });
};

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const connection = await pool.getConnection();
    const [userRows] = await connection.execute(
      'SELECT * FROM login WHERE username = ? AND password = ?',
      [username, password]
    );
    connection.release();

    console.log('User rows:', userRows);

    if (userRows.length > 0) {
      const user = userRows[0];
      console.log('User found:', user);

      // Generate a token
      const token = jwt.sign({ id: user.User_id }, secretKey, {
        expiresIn: '1h' // Token expires in 1 hour
      });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        userId: user.User_id,
        username: user.Username,
        token: token // Send the token to the client
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// Add task endpoint
app.post('/api/addTask', verifyToken, async (req, res) => {
  const { project, task, hours, status } = req.body;
  const userId = req.userId; // Use the userId from the token

  try {
    const connection = await pool.getConnection();
    const [results] = await connection.execute(
      'INSERT INTO tasks (project, task, hours, status, user_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [project, task, hours, status, userId]
    );
    connection.release();
    console.log(`Task added successfully: ${results.insertId}`);
    res.status(200).send('Task added successfully');
  } catch (error) {
    console.error('Error adding task:', error);
    res.status(500).send('Error adding task');
  }
});

// Get tasks by userId and today's date
app.get('/api/getTasks', verifyToken, async (req, res) => {
  const userId = req.userId; // Use the userId from the token

  try {
    const connection = await pool.getConnection();
    const [results] = await connection.execute(
      'SELECT project, task, hours, status FROM tasks WHERE user_id = ? AND DATE(created_at) = CURDATE()',
      [userId]
    );
    connection.release();
    res.status(200).json(results);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).send('Error fetching tasks');
  }
});

// Get all tasks by userId
app.get('/api/getAllTasks', verifyToken, async (req, res) => {
  const userId = req.userId; // Use the userId from the token

  try {
    const connection = await pool.getConnection();
    const [results] = await connection.execute(
      'SELECT project, task, hours, status, created_at FROM tasks WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    connection.release();
    res.status(200).json(results);
  } catch (error) {
    console.error('Error fetching all tasks:', error);
    res.status(500).send('Error fetching all tasks');
  }
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${port}`);
});
