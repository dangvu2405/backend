const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const TaiKhoan = require('../app/models/Taikhoan');
const jwt = require('jsonwebtoken');

// Facebook OAuth Strategy
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID || 'your-facebook-app-id',
    clientSecret: process.env.FACEBOOK_APP_SECRET || 'your-facebook-app-secret',
    callbackURL: process.env.FACEBOOK_CALLBACK_URL || `${process.env.BACKEND_URL || 'http://localhost:3001'}/auth/facebook/callback`,
    profileFields: ['id', 'emails', 'name', 'picture']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        console.log('Facebook profile:', profile);
        
        // Tìm user theo Facebook ID hoặc email
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        let user = await TaiKhoan.findOne({ 
            $or: [
                { 'facebook.id': profile.id },
                ...(email ? [{ 'Email': email }] : [])
            ]
        });

        if (user) {
            // Nếu user đã tồn tại, cập nhật thông tin Facebook
            if (!user.facebook) {
                user.facebook = {
                    id: profile.id,
                    accessToken: accessToken
                };
                await user.save();
            }
            return done(null, user);
        } else {
            // Lấy role Customer mặc định
            const Role = require('../app/models/Role');
            const customerRole = await Role.getCustomerRole();
            
            // Tạo user mới
            const newUser = new TaiKhoan({
                TenDangNhap: `fb_${profile.id}`,
                Email: profile.emails && profile.emails[0] ? profile.emails[0].value : `fb_${profile.id}@facebook.com`,
                HoTen: `${profile.name.givenName || ''} ${profile.name.familyName || ''}`.trim() || profile.displayName || 'Facebook User',
                TrangThai: 'active',
                MaVaiTro: customerRole ? customerRole._id : null,
                facebook: {
                    id: profile.id,
                    accessToken: accessToken
                }
            });

            const createdUser = await newUser.save();
            return done(null, createdUser);
        }
    } catch (error) {
        console.error('Facebook OAuth error:', error);
        return done(error, null);
    }
}));

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'your-google-client-id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret',
    callbackURL: process.env.GOOGLE_CALLBACK_URL || `${process.env.BACKEND_URL || 'http://localhost:3001'}/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
    try {
        console.log('Google profile:', profile);
        
        // Tìm user theo Google ID hoặc email
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        let user = await TaiKhoan.findOne({ 
            $or: [
                { 'google.id': profile.id },
                ...(email ? [{ 'Email': email }] : [])
            ]
        });

        if (user) {
            // Nếu user đã tồn tại, cập nhật thông tin Google
            if (!user.google) {
                user.google = {
                    id: profile.id,
                    accessToken: accessToken
                };
                await user.save();
            }
            return done(null, user);
        } else {
            // Lấy role Customer mặc định
            const Role = require('../app/models/Role');
            const customerRole = await Role.getCustomerRole();
            
            // Tạo user mới
            const newUser = new TaiKhoan({
                TenDangNhap: `gg_${profile.id}`,
                Email: profile.emails && profile.emails[0] ? profile.emails[0].value : `gg_${profile.id}@google.com`,
                HoTen: profile.displayName || 'Google User',
                TrangThai: 'active',
                MaVaiTro: customerRole ? customerRole._id : null,
                google: {
                    id: profile.id,
                    accessToken: accessToken
                }
            });

            const createdUser = await newUser.save();
            return done(null, createdUser);
        }
    } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error, null);
    }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
    done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await TaiKhoan.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// Helper function to generate JWT token
const generateToken = (user) => {
    const payload = {
        id: user._id,
        username: user.TenDangNhap,
        email: user.Email,
        fullName: user.HoTen,
        role: user.VaiTro || 'customer',
        permissions: user.Quyen || []
    };

    return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key-change-in-production', {
        expiresIn: '7d'
    });
};

module.exports = {
    passport,
    generateToken
};
