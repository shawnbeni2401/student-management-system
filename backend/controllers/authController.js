const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middlewares/auth');

exports.register = async (req, res) => {
    const { name, register_number, email, password, role, department } = req.body;

    if (!name || !email || !password || !role) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Default status is 'pending' for new registrations
        db.run(
            `INSERT INTO Users (name, register_number, email, password_hash, role, department, status) 
             VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
            [name, register_number || null, email, hashedPassword, role, department || null],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) {
                        return res.status(409).json({ message: "Email or Register Number already exists" });
                    }
                    return res.status(500).json({ message: "Database Error", error: err.message });
                }
                res.status(201).json({ message: "User registered successfully", userId: this.lastID });
            }
        );
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

exports.login = (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    db.get(`SELECT * FROM Users WHERE email = ?`, [email], async (err, user) => {
        if (err) return res.status(500).json({ message: "Database error", error: err.message });
        if (!user) return res.status(404).json({ message: "User not found" });

        // Check if user is verified
        if (user.status === 'pending') {
            return res.status(403).json({ message: "Your account is pending admin verification." });
        }
        if (user.status === 'rejected') {
            return res.status(403).json({ message: "Your registration has been rejected. Contact admin." });
        }

        const passwordIsValid = await bcrypt.compare(password, user.password_hash);
        if (!passwordIsValid) {
            return res.status(401).json({ message: "Invalid Password" });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role, department: user.department },
            JWT_SECRET,
            { expiresIn: 86400 } // 24 hours
        );

        res.status(200).json({
            id: user.id,
            name: user.name,
            register_number: user.register_number,
            email: user.email,
            role: user.role,
            department: user.department,
            accessToken: token
        });
    });
};

exports.getUsers = (req, res) => {
    const role = req.query.role; 
    const status = req.query.status;
    let query = `SELECT id, name, register_number, email, role, department, status FROM Users WHERE 1=1`;
    let params = [];

    if (role) {
        query += ` AND role = ?`;
        params.push(role);
    }
    if (status) {
        query += ` AND status = ?`;
        params.push(status);
    }

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ message: "Database error", error: err.message });
        res.status(200).json(rows);
    });
};

exports.updateUserStatus = (req, res) => {
    const { userId, status } = req.body; // status: 'verified', 'rejected'

    if (!userId || !status) {
        return res.status(400).json({ message: "User ID and status are required" });
    }

    db.run(`UPDATE Users SET status = ? WHERE id = ?`, [status, userId], function(err) {
        if (err) return res.status(500).json({ message: "Database Error", error: err.message });
        res.status(200).json({ message: `User status updated to ${status}` });
    });
};

exports.deleteUser = (req, res) => {
    const userId = req.params.id;
    db.run(`DELETE FROM Users WHERE id = ?`, [userId], function(err) {
        if (err) return res.status(500).json({ message: "Database Error", error: err.message });
        res.status(200).json({ message: "User deleted successfully" });
    });
};
