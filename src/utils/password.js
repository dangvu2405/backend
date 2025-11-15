const bcrypt = require('bcrypt');

// mã hóa mật khẩu
const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

// so sánh mật khẩu với mật khẩu đã hash
const comparePassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};

//mật khẩu ngẫu nhiên
const generateRandomPassword = (length = 12) => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
};

// mật khẩu bảo mật cao
const validatePasswordStrength = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const isValid =
        password.length >= minLength &&
        hasUpperCase &&
        hasLowerCase &&
        hasNumbers &&
        hasSpecialChar;

    return {
        isValid,
        errors: {
            length: password.length < minLength ? `Tối thiểu ${minLength} ký tự` : null,
            upperCase: !hasUpperCase ? 'Phải có chữ hoa' : null,
            lowerCase: !hasLowerCase ? 'Phải có chữ thường' : null,
            numbers: !hasNumbers ? 'Phải có số' : null,
            specialChar: !hasSpecialChar ? 'Phải có ký tự đặc biệt' : null,
        },
    };
};

module.exports = {
    hashPassword,
    comparePassword,
    generateRandomPassword,
    validatePasswordStrength,
};

