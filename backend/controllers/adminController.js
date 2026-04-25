const db = require('../config/db');

exports.getDashboardStats = (req, res) => {
    const stats = {};

    db.get(`SELECT COUNT(*) as count FROM Users WHERE status = 'pending'`, (err, row) => {
        if (err) return res.status(500).json({ message: "DB Error", error: err.message });
        stats.pendingUsers = row.count;

        db.get(`SELECT COUNT(*) as count FROM Users WHERE role = 'student'`, (err, row) => {
            if (err) return res.status(500).json({ message: "DB Error", error: err.message });
            stats.totalStudents = row.count;

            db.get(`SELECT COUNT(*) as count FROM Events`, (err, row) => {
                if (err) return res.status(500).json({ message: "DB Error", error: err.message });
                stats.totalEvents = row.count;

                res.status(200).json(stats);
            });
        });
    });
};
