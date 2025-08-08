const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session); // MySQL session store
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const path = require('path');
const mysql = require('mysql');

const app = express();
const port = 3000;

// MySQL connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Amogh@2003',
    database: 'netflix_clone'
});

db.connect((err) => {
    if (err) {
        console.error('MySQL connection error:', err);
        return;
    }
    console.log('MySQL Connected...');
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files

// Session setup
app.use(session({
    secret:'ffb228bc61c90b4b8a0f3afcd8d7f8ef4bef0dcea24e14c2b1fb811b6c6fec7426625193efe43670bc6e169e500ed348a1d1380462fff1ef302cd4467651b6e5', // Use environment variable for production
    resave: false,
    saveUninitialized: true,
    store: new MySQLStore({}, db), // Store sessions in MySQL
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/signin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signin.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

// Handle "Get Started" form submission
app.post('/getstarted', (req, res) => {
    const { email } = req.body;

    const sql = `SELECT * FROM users WHERE email = ?`;
    db.query(sql, [email], (err, results) => {
        if (err) {
            console.error('Error querying database:', err);
            return res.status(500).send('Server error');
        }

        if (results.length > 0) {
            // Email found, redirect to sign-in page
            res.redirect('/signin.html');
        } else {
            // Email not found, redirect to sign-up page
            res.redirect('/signup.html');
        }
    });
});

// Sign Up
app.post('/signup', (req, res) => {
    const { username, email, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.status(400).send('Passwords do not match');
    }

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            console.error('Error hashing password:', err);
            return res.status(500).send('Error registering user');
        }

        const sql = `INSERT INTO users (username, email, password) VALUES (?, ?, ?)`;
        db.query(sql, [username, email, hash], (err, result) => {
            if (err) {
                console.error('Error inserting user into database:', err);
                return res.status(500).send('Error registering user');
            }
            res.redirect('/signin');
        });
    });
});

// Sign In
app.post('/signin', (req, res) => {
    const { email, password } = req.body;

    const sql = `SELECT id, username, password FROM users WHERE email = ?`;
    db.query(sql, [email], (err, results) => {
        if (err) {
            console.error('Error querying database:', err);
            return res.status(500).send('Error signing in');
        }

        if (results.length === 0) {
            return res.status(404).send('No user found with this email');
        }

        const user = results[0];
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                console.error('Error comparing passwords:', err);
                return res.status(500).send('Error signing in');
            }
            if (isMatch) {
                // Set session user
                req.session.user = { id: user.id, username: user.username };
                res.redirect('/index2.html');
            } else {
                res.status(401).send('Incorrect password');
            }
        });
    });
});

// Fetch the logged-in username
app.get('/get-username', (req, res) => {
    if (req.session && req.session.user) {
        const userId = req.session.user.id;
        const query = 'SELECT username FROM users WHERE id = ?';
        
        db.query(query, [userId], (err, results) => {
            if (err) {
                console.error('Database query failed:', err);
                return res.status(500).json({ error: 'Database query failed' });
            }
            if (results.length > 0) {
                res.json({ username: results[0].username });
            } else {
                res.status(404).json({ error: 'User not found' });
            }
        });
    } else {
        res.status(401).json({ error: 'User not logged in' });
    }
});


app.post('/update-views/:videoId', (req, res) => {
    const videoId = req.params.videoId;

    const sql = `UPDATE videos SET views = views + 1 WHERE video_id = ?`;
    db.query(sql, [videoId], (err, result) => {
        if (err) {
            console.error('Error updating views:', err);
            return res.status(500).send('Error updating views');
        }

        res.status(200).send('Views updated successfully');
    });
});

// Watch video page (optional route for video playback)
app.get('/watch/:videoId', (req, res) => {
    const videoId = req.params.videoId;

    const sql = `SELECT * FROM videos WHERE video_id = ?`;
    db.query(sql, [videoId], (err, results) => {
        if (err) {
            console.error('Error fetching video:', err);
            return res.status(500).send('Error fetching video');
        }

        if (results.length === 0) {
            return res.status(404).send('Video not found');
        }

        const video = results[0];
        // Render a page with video details, or send video info as JSON
        res.json(video);
    });
});


// Handle logout
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Error logging out');
        }
        res.redirect('/signin');
    });
});

app.post('/update-views/:videoId', (req, res) => {
    const videoId = req.params.videoId;

    const updateViewsQuery = 'UPDATE videos SET views = views + 1 WHERE video_id = ?';

    db.query(updateViewsQuery, [videoId], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to update views' });
        }
        res.json({ message: 'Views updated successfully' });
    });
});


// Start server
app.listen(port, () => {
    console.log(`Server started on http://localhost:${port}`);
});
