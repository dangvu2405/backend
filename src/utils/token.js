const jwt = require('jsonwebtoken');
const { JWT } = require('../constants');

/**
 * Generate JWT token
 * @param {Object} payload - Data to encode in token
 * @param {String} expiresIn - Token expiration time
 * @returns {String} JWT token
 */
const generateToken = (payload, expiresIn = JWT.ACCESS_TOKEN_EXPIRES) => {
    const secret = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Verify JWT token
 * @param {String} token - JWT token to verify
 * @returns {Object} Decoded payload or null
 */
const verifyToken = (token) => {
    try {
        const secret = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET || 'your-secret-key-change-in-production';
        return jwt.verify(token, secret);
    } catch (error) {
        return null;
    }
};

/**
 * Decode JWT token without verification
 * @param {String} token - JWT token
 * @returns {Object} Decoded payload
 */
const decodeToken = (token) => {
    return jwt.decode(token);
};

/**
 * Generate access and refresh tokens
 * @param {Object} user - User object
 * @returns {Object} tokens object with access and refresh tokens
 */
const generateTokenPair = (user) => {
    const payload = {
        id: user._id || user.id,
        TenDangNhap: user.TenDangNhap || user.username,
        HoTen: user.HoTen || user.fullName,
        Email: user.Email || user.email,
        MaVaiTro: user.MaVaiTro || user.role,
        Avatar: user.Avatar || user.avatar,
        TrangThai: user.TrangThai || user.status,
    };

    return {
        accessToken: generateToken(payload, JWT.ACCESS_TOKEN_EXPIRES),
        refreshToken: generateToken(payload, JWT.REFRESH_TOKEN_EXPIRES),
    };
};

module.exports = {
    generateToken,
    verifyToken,
    decodeToken,
    generateTokenPair,
};

