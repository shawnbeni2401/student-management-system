const db = require('../config/db');

exports.createEvent = (req, res) => {
    const { title, description, college_name, google_maps_url, event_date, department, is_external, venue } = req.body;
    const created_by = req.userId;
    const poster_path = req.file ? req.file.filename : null;

    if (!title || !event_date || !department) {
        return res.status(400).json({ message: "Title, event_date, and department are required" });
    }

    const query = `
        INSERT INTO Events (title, description, college_name, google_maps_url, poster_path, event_date, created_by, department, is_external, venue)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(query, [title, description, college_name, google_maps_url, poster_path, event_date, created_by, department, is_external ? 1 : 0, venue], function(err) {
        if (err) return res.status(500).json({ message: "Database Error", error: err.message });
        res.status(201).json({ message: "Event created successfully", eventId: this.lastID });
    });
};

exports.getEvents = (req, res) => {
    const query = `
        SELECT e.*, u.name as creator_name 
        FROM Events e 
        LEFT JOIN Users u ON e.created_by = u.id 
        ORDER BY event_date DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ message: "Database Error", error: err.message });
        res.status(200).json(rows);
    });
};

exports.getEventById = (req, res) => {
    const eventId = req.params.id;
    const query = `SELECT * FROM Events WHERE id = ?`;
    
    db.get(query, [eventId], (err, row) => {
        if (err) return res.status(500).json({ message: "Database Error", error: err.message });
        if (!row) return res.status(404).json({ message: "Event not found" });
        res.status(200).json(row);
    });
};

exports.deleteEvent = (req, res) => {
    const eventId = req.params.id;
    
    db.get(`SELECT created_by, department FROM Events WHERE id = ?`, [eventId], (err, row) => {
        if (err) return res.status(500).json({ message: "Database Error", error: err.message });
        if (!row) return res.status(404).json({ message: "Event not found" });

        // Normalizing IDs to numbers for reliable comparison
        const currentUserId = Number(req.userId);
        const ownerId = Number(row.created_by);
        
        const isOwner = ownerId === currentUserId;
        const isAdmin = req.userRole === 'admin';
        const isHODOfDept = req.userRole === 'hod' && row.department === req.userDepartment;

        if (!isAdmin && !isOwner && !isHODOfDept) {
            return res.status(403).json({ message: "Permission Denied. You can only delete your own events or departmental events (if HOD)." });
        }

        db.run(`DELETE FROM Events WHERE id = ?`, [eventId], function(err) {
            if (err) return res.status(500).json({ message: "Database Error", error: err.message });
            if (this.changes === 0) return res.status(404).json({ message: "No event was deleted" });
            res.status(200).json({ message: "Event deleted successfully" });
        });
    });
};

exports.updateEvent = (req, res) => {
    const eventId = req.params.id;
    const { title, description, college_name, google_maps_url, event_date, is_external, venue } = req.body;
    const poster_path = req.file ? req.file.filename : null;

    db.get(`SELECT created_by, department, poster_path FROM Events WHERE id = ?`, [eventId], (err, row) => {
        if (err) return res.status(500).json({ message: "Database Error", error: err.message });
        if (!row) return res.status(404).json({ message: "Event not found" });

        const currentUserId = Number(req.userId);
        const ownerId = Number(row.created_by);

        const isOwner = ownerId === currentUserId;
        const isAdmin = req.userRole === 'admin';
        const isHODOfDept = req.userRole === 'hod' && row.department === req.userDepartment;

        if (!isAdmin && !isOwner && !isHODOfDept) {
            return res.status(403).json({ message: "Permission Denied. You do not have authority to edit this event." });
        }

        const externalFlag = (is_external === '1' || is_external === 1 || is_external === true) ? 1 : 0;

        let query = `
            UPDATE Events 
            SET title = ?, description = ?, college_name = ?, google_maps_url = ?, event_date = ?, is_external = ?, venue = ?
        `;
        let params = [title, description, college_name, google_maps_url, event_date, externalFlag, venue];

        if (poster_path) {
            query += `, poster_path = ?`;
            params.push(poster_path);
        }

        query += ` WHERE id = ?`;
        params.push(eventId);

        db.run(query, params, function(err) {
            if (err) return res.status(500).json({ message: "Database Error", error: err.message });
            if (this.changes === 0) return res.status(404).json({ message: "Event not found or no changes made" });
            res.status(200).json({ message: "Event updated successfully" });
        });
    });
};
