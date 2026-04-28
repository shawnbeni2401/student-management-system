const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Vercel's filesystem is read-only except /tmp.
// On Vercel: use /tmp/database.sqlite (writable, ephemeral per warm instance).
// Locally: use the project-root database.sqlite (persistent).
let dbPath;

if (process.env.VERCEL) {
    const tmpDb = '/tmp/database.sqlite';
    const srcDb = path.resolve(__dirname, '../../database.sqlite');

    // Copy the committed seed database to /tmp on cold start so
    // tables and seed users are available immediately.
    if (!fs.existsSync(tmpDb) && fs.existsSync(srcDb)) {
        fs.copyFileSync(srcDb, tmpDb);
        console.log('Copied seed database to /tmp/database.sqlite');
    }

    dbPath = tmpDb;
} else {
    dbPath = path.resolve(__dirname, '../../database.sqlite');
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`PRAGMA foreign_keys = ON;`);
    }
});

module.exports = db;
