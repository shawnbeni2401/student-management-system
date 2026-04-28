const express = require('express');
require('dotenv').config();
const cors = require('cors');
const path = require('path');
const initializeDatabase = require('./config/dbSetup');
const seedData = require('./utils/seedData');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const participationRoutes = require('./routes/participationRoutes');
const permissionRoutes = require('./routes/permissionRoutes');
const adminRoutes = require('./routes/adminRoutes');

const upload = require('./middlewares/upload');

// Serve static files
app.use('/uploads', express.static(upload.UPLOAD_DIR));
app.use(express.static(path.join(__dirname, '../frontend')));

// Initialize DB
initializeDatabase();
seedData();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/participations', participationRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/admin', adminRoutes);

// Temporary route to test
app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is running!' });
});

// Start Server
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;
