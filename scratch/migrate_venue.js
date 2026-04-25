const db = require('../backend/config/db');

db.serialize(() => {
    db.run("ALTER TABLE Events ADD COLUMN venue VARCHAR(255)", (err) => {
        if (err) {
            console.log("Column might already exist or error:", err.message);
        } else {
            console.log("Column 'venue' added to Events table.");
        }
    });
});
