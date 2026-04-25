const db = require('../config/db');
const { generatePermissionLetter } = require('../utils/pdfGenerator');
const { sendEmailWithAttachment } = require('../utils/emailService');
const path = require('path');

exports.applyForPermission = (req, res) => {
    const { reason, description, date, to_date, out_time, in_time, permission_type } = req.body;
    const student_id = req.userId;
    const pType = permission_type || 'outgoing';

    if (!reason || !date) {
        return res.status(400).json({ message: "Reason and date are required" });
    }

    // Only ensure to_date is processed if provided, else null.
    db.run(
        `INSERT INTO Permissions (student_id, reason, description, date, to_date, out_time, in_time, permission_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [student_id, reason, description, date, to_date || null, out_time, in_time, pType],
        function(err) {
            if (err) return res.status(500).json({ message: "Database Error", error: err.message });
            res.status(201).json({ message: "Permission requested successfully", permissionId: this.lastID });
        }
    );
};

exports.getMyPermissions = (req, res) => {
    db.all(
        `SELECT * FROM Permissions WHERE student_id = ? ORDER BY created_at DESC`,
        [req.userId],
        (err, rows) => {
            if (err) return res.status(500).json({ message: 'Database Error', error: err.message });
            res.status(200).json(rows);
        }
    );
};

exports.getPermissions = (req, res) => {
    let query = `
        SELECT p.*, u.name as student_name, u.register_number, u.department
        FROM Permissions p
        JOIN Users u ON p.student_id = u.id
    `;
    let params = [];

    if (req.userRole === 'hod') {
        // HOD sees permissions of students in THEIR department
        query += ` WHERE u.department = ?`;
        params.push(req.userDepartment);
    }

    query += ` ORDER BY p.created_at DESC`;

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ message: "Database Error", error: err.message });
        res.status(200).json(rows);
    });
};

exports.updatePermissionStatus = (req, res) => {
    const permissionId = req.params.id;
    const { status } = req.body;
    const hodId = req.userId;

    const updateQuery = `UPDATE Permissions SET status = ? WHERE id = ?`;

    db.run(updateQuery, [status, permissionId], function(err) {
        if (err) return res.status(500).json({ message: "Database Error", error: err.message });

        res.status(200).json({ message: "Status updated successfully" });

        // If approved, generate Permission letter asynchronously
        if (status === 'approved') {
            const getDetailsQuery = `
                SELECT p.*, u.name, u.register_number, u.department, u.email
                FROM Permissions p
                JOIN Users u ON p.student_id = u.id
                WHERE p.id = ?
            `;
            db.get(getDetailsQuery, [permissionId], (err, details) => {
                if (err || !details) return console.error('Permission details fetch error:', err?.message);

                db.get(`SELECT name, department FROM Users WHERE id = ?`, [hodId], (err, hod) => {
                    if (err || !hod) {
                        hod = { name: req.userDepartment + ' HOD', department: req.userDepartment };
                    }

                    generatePermissionLetter(
                        { name: details.name, register_number: details.register_number, department: details.department },
                        details,
                        { name: hod.name, department: hod.department },
                        (pdfErr, fileName) => {
                            if (pdfErr) return console.error('PDF Gen Error:', pdfErr);
                            db.run(`UPDATE Permissions SET permission_letter_path = ? WHERE id = ?`, [fileName, permissionId]);
                            
                            // Send email
                            if (details.email) {
                                const filePath = path.join(__dirname, '../uploads', fileName);
                                const subject = details.permission_type === 'leave' ? 'Leave Application Approved' : 'Out-Pass Permission Approved';
                                const text = `Dear ${details.name},\n\nYour ${details.permission_type || 'permission'} request for ${details.date} has been approved. Please find your official letter attached.\n\nRegards,\n${hod.name} (${hod.department})`;
                                sendEmailWithAttachment(details.email, subject, text, filePath);
                            } else {
                                console.warn('[Email Alert] Skipping email dispatch because user email is missing.');
                            }
                        }
                    );
                });
            });
        }
    });
};
