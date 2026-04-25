const db = require('../config/db');
const bcrypt = require('bcrypt');

const seed = async () => {
    const saltRounds = 10;
    const users = [
        { name: 'Admin User', email: 'admin@college.edu', role: 'admin', password: 'password123', dept: 'IT' },
        { name: 'HOD CSE', email: 'hod_cse@college.edu', role: 'hod', password: 'password123', dept: 'CSE' },
        { name: 'Staff John', email: 'staff@college.edu', role: 'staff', password: 'password123', dept: 'CSE' },
        { name: 'Student Alice', email: 'student@college.edu', role: 'student', password: 'password123', dept: 'CSE', reg: 'STU001' }
    ];

    for (const u of users) {
        const hash = await bcrypt.hash(u.password, saltRounds);
        db.run(
            `INSERT OR IGNORE INTO Users (name, email, password_hash, role, department, register_number, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [u.name, u.email, hash, u.role, u.dept, u.reg || null, 'verified']
        );
    }
    console.log("Seeding initial users... (admin, hod_cse, staff, student)");
};

module.exports = seed;
