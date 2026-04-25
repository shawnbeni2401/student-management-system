const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_for_jwt_which_should_be_in_env_file';

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
        return res.status(403).json({ message: "No token provided!" });
    }

    const token = authHeader.split(' ')[1]; // Format: Bearer <token>

    if (!token) {
        return res.status(403).json({ message: "No token provided!" });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: "Unauthorized!" });
        }
        req.userId = decoded.id;
        req.userRole = decoded.role;
        req.userDepartment = decoded.department;
        next();
    });
};

const isRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.userRole)) {
            return res.status(403).json({ message: "Require proper role!" });
        }
        next();
    };
};

module.exports = {
    verifyToken,
    isRole,
    JWT_SECRET
};
