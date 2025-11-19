const express = require('express');
const router = express.Router();
const AuthController = require('../app/controllers/AuthController');
const TaiKhoanController = require('../app/controllers/TaiKhoanController');
const { passport } = require('../config/passport');


router.post('/login', AuthController.login);
router.post('/register', AuthController.register);
router.post('/logout', AuthController.logout);
router.post('/refresh-token', AuthController.refreshToken);
router.post('/forgot-password', AuthController.sendPasswordResetEmail);
router.post('/reset-password', TaiKhoanController.changePassword);

// OAuth Routes - Facebook
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));
router.get('/facebook/callback', 
    passport.authenticate('facebook', { session: false, failureRedirect: '/auth/facebook/error' }),
    AuthController.oauthCallback
);

// OAuth Routes - Google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/auth/google/error' }),
    AuthController.oauthCallback
);

// OAuth error routes
router.get('/facebook/error', AuthController.oauthError);
router.get('/google/error', AuthController.oauthError);

module.exports = router;