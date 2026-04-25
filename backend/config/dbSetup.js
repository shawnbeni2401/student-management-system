const db = require('./db');

const initializeDatabase = () => {
    db.serialize(() => {
        db.run(`
            CREATE TABLE IF NOT EXISTS Users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(255) NOT NULL,
                register_number VARCHAR(50) UNIQUE,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL, 
                department VARCHAR(100),
                status VARCHAR(20) DEFAULT 'pending' -- pending, verified, rejected
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS Events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                college_name VARCHAR(255),
                google_maps_url VARCHAR(255),
                poster_path VARCHAR(255),
                event_date DATE,
                created_by INTEGER,
                department VARCHAR(100),
                is_external BOOLEAN DEFAULT 0,
                venue VARCHAR(255),
                FOREIGN KEY(created_by) REFERENCES Users(id) ON DELETE CASCADE
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS Participations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER,
                event_id INTEGER,
                status VARCHAR(50) DEFAULT 'pending', 
                od_letter_path VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(student_id) REFERENCES Users(id) ON DELETE CASCADE,
                FOREIGN KEY(event_id) REFERENCES Events(id) ON DELETE CASCADE
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS Permissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER,
                reason VARCHAR(255) NOT NULL,
                description TEXT,
                date DATE NOT NULL,
                to_date DATE,
                out_time VARCHAR(20),
                in_time VARCHAR(20),
                permission_type VARCHAR(50) DEFAULT 'outgoing',
                status VARCHAR(50) DEFAULT 'pending',
                permission_letter_path VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(student_id) REFERENCES Users(id) ON DELETE CASCADE
            )
        `);
        console.log("Database tables initialized.");
    });
};

module.exports = initializeDatabase;
