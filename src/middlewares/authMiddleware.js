const jwt = require('jsonwebtoken');

const JWT_SECRET = '12345';

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Invalid authorization format. Use: Bearer <token>' });
    }

    const token = authHeader.substring(7).trim();
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        if (decoded.exp && decoded.exp < Date.now() / 1000) {
            return res.status(401).json({ error: 'Token expired' });
        }

        req.user = decoded;
        next();
    } catch (error) {
        console.error('JWT Verification Error:', error.message);
        
        const message = error.name === 'TokenExpiredError' 
            ? 'Token expired' 
            : 'Invalid token';
            
        res.status(401).json({ error: message });
    }
};

module.exports = authMiddleware;