const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
    fileFilter: (req, file, cb) => {
        const fileTypes = /jpeg|jpg|png|pdf/;
        const mimeType = fileTypes.test(file.mimetype);
        const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());

        if (mimeType && extname) {
            return cb(null, true);
        }
        cb(new Error("Only images (jpeg, jpg, png) and PDFs are allowed!"));
    }
});

// Multer 2.x returns a promise instead of calling next() like traditional
// Express middleware. This wrapper makes it compatible with Express 5
// middleware arrays by awaiting the promise and calling next() properly.
upload.wrappedSingle = (fieldName) => {
    return (req, res, next) => {
        const middleware = upload.single(fieldName);
        middleware(req, res, (err) => {
            if (err) {
                return res.status(400).json({ message: err.message });
            }
            next();
        });
    };
};

module.exports = upload;
