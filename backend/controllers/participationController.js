const db = require('../config/db');
const { generateODLetter } = require('../utils/pdfGenerator');
const { sendEmailWithAttachment } = require('../utils/emailService');
const path = require('path');

exports.applyForEvent = (req, res) => {
    const { event_id, student_id } = req.body;
    
    // If student applies themselves, they pass their own ID or we take it from token.
    // If staff applies, they pass the student_id.
    const targetStudentId = student_id || req.userId;

    // Check if already applied
    db.get('SELECT * FROM Participations WHERE student_id = ? AND event_id = ?', [targetStudentId, event_id], (err, row) => {
        if (err) return res.status(500).json({ message: "Database error", error: err.message });
        if (row) return res.status(400).json({ message: "Already applied for this event" });

        db.run(
            `INSERT INTO Participations (student_id, event_id) VALUES (?, ?)`,
            [targetStudentId, event_id],
            function(err) {
                if (err) return res.status(500).json({ message: "Database Error", error: err.message });
                res.status(201).json({ message: "Applied to event successfully", participationId: this.lastID });
            }
        );
    });
};

exports.getMyAppliedEventIds = (req, res) => {
    db.all(
        `SELECT event_id, status FROM Participations WHERE student_id = ?`,
        [req.userId],
        (err, rows) => {
            if (err) return res.status(500).json({ message: 'Database Error', error: err.message });
            res.status(200).json(rows); // [{ event_id, status }, ...]
        }
    );
};

exports.getParticipations = (req, res) => {
    // Role-based fetching
    let query = `
        SELECT p.id, p.student_id, p.event_id, p.status, p.od_letter_path,
               e.title as event_title, e.event_date, e.is_external, e.college_name, e.venue,
               u.name as student_name, u.register_number, u.department
        FROM Participations p
        JOIN Events e ON p.event_id = e.id
        JOIN Users u ON p.student_id = u.id
    `;
    let params = [];
    let conditions = [];

    if (req.userRole === 'student') {
        conditions.push(`p.student_id = ?`);
        params.push(req.userId);
    } else if (req.userRole === 'hod') {
        // HOD sees participations of students in THEIR department
        conditions.push(`u.department = ?`);
        params.push(req.userDepartment);
    }

    if (req.query.event_id) {
        conditions.push(`p.event_id = ?`);
        params.push(req.query.event_id);
    }

    if (conditions.length > 0) {
        query += ` WHERE ` + conditions.join(' AND ');
    }

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ message: "Database Error", error: err.message });
        res.status(200).json(rows);
    });
};

exports.updateParticipationStatus = (req, res) => {
    const participationId = req.params.id;
    const { status } = req.body;
    const hodId = req.userId; // The HOD who is approving

    const updateQuery = `UPDATE Participations SET status = ? WHERE id = ?`;

    db.run(updateQuery, [status, participationId], function(err) {
        if (err) return res.status(500).json({ message: "Database Error", error: err.message });

        // Send response immediately so the UI isn't waiting on PDF generation
        res.status(200).json({ message: "Status updated successfully" });

        // If approved, generate OD letter asynchronously
        if (status === 'approved') {
            const getDetailsQuery = `
                SELECT p.*, e.title, e.event_date, e.is_external, e.college_name, e.venue,
                       u.name, u.register_number, u.department, u.email
                FROM Participations p
                JOIN Events e ON p.event_id = e.id
                JOIN Users u ON p.student_id = u.id
                WHERE p.id = ?
            `;
            db.get(getDetailsQuery, [participationId], (err, details) => {
                if (err || !details) return console.error('OD details fetch error:', err?.message);

                // Fetch HOD details
                db.get(`SELECT name, department FROM Users WHERE id = ?`, [hodId], (err, hod) => {
                    if (err || !hod) {
                        hod = { name: req.userDepartment + ' HOD', department: req.userDepartment };
                    }

                    generateODLetter(
                        { name: details.name, register_number: details.register_number, department: details.department },
                        { id: details.event_id, title: details.title, event_date: details.event_date, is_external: details.is_external, college_name: details.college_name, venue: details.venue },
                        { name: hod.name, department: hod.department },
                        (pdfErr, fileName) => {
                            if (pdfErr) return console.error('PDF Gen Error:', pdfErr);
                            db.run(`UPDATE Participations SET od_letter_path = ? WHERE id = ?`, [fileName, participationId]);
                            
                            // Send email
                            if (details.email) {
                                const filePath = path.join(__dirname, '../uploads', fileName);
                                const subject = `OD Application Approved - ${details.title}`;
                                const text = `Dear ${details.name},\n\nYour OD request for the event "${details.title}" on ${details.event_date} has been approved. Please find your official OD letter attached.\n\nRegards,\n${hod.name} (${hod.department})`;
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

