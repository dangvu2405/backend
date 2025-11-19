const Joi = require('joi');

/**
 * Validation schema for user registration
 */
const registerSchema = Joi.object({
    username: Joi.string().min(3).max(30).required().messages({
        'string.empty': 'Tên đăng nhập không được để trống',
        'string.min': 'Tên đăng nhập phải có ít nhất 3 ký tự',
        'string.max': 'Tên đăng nhập không được quá 30 ký tự',
        'any.required': 'Tên đăng nhập là bắt buộc',
    }),
    email: Joi.string().email().required().messages({
        'string.empty': 'Email không được để trống',
        'string.email': 'Email không hợp lệ',
        'any.required': 'Email là bắt buộc',
    }),
    password: Joi.string().min(8).required().messages({
        'string.empty': 'Mật khẩu không được để trống',
        'string.min': 'Mật khẩu phải có ít nhất 8 ký tự',
        'any.required': 'Mật khẩu là bắt buộc',
    }),
    fullName: Joi.string().min(2).max(100).optional().messages({
        'string.min': 'Họ tên phải có ít nhất 2 ký tự',
        'string.max': 'Họ tên không được quá 100 ký tự',
    }),
    phone: Joi.string()
        .pattern(/^[0-9]{10}$/)
        .optional()
        .messages({
            'string.pattern.base': 'Số điện thoại phải có 10 chữ số',
        }),
});

/**
 * Validation schema for user login
 */
const loginSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.empty': 'Email không được để trống',
        'string.email': 'Email không hợp lệ',
        'any.required': 'Email là bắt buộc',
    }),
    password: Joi.string().required().messages({
        'string.empty': 'Mật khẩu không được để trống',
        'any.required': 'Mật khẩu là bắt buộc',
    }),
});

/**
 * Validation schema for password reset request
 */
const forgotPasswordSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.empty': 'Email không được để trống',
        'string.email': 'Email không hợp lệ',
        'any.required': 'Email là bắt buộc',
    }),
});

/**
 * Validation schema for password reset
 */
const resetPasswordSchema = Joi.object({
    token: Joi.string().required().messages({
        'string.empty': 'Token không được để trống',
        'any.required': 'Token là bắt buộc',
    }),
    password: Joi.string().min(8).required().messages({
        'string.empty': 'Mật khẩu mới không được để trống',
        'string.min': 'Mật khẩu phải có ít nhất 8 ký tự',
        'any.required': 'Mật khẩu mới là bắt buộc',
    }),
});

/**
 * Validation schema for change password
 */
const changePasswordSchema = Joi.object({
    oldPassword: Joi.string().required().messages({
        'string.empty': 'Mật khẩu cũ không được để trống',
        'any.required': 'Mật khẩu cũ là bắt buộc',
    }),
    newPassword: Joi.string().min(8).required().messages({
        'string.empty': 'Mật khẩu mới không được để trống',
        'string.min': 'Mật khẩu mới phải có ít nhất 8 ký tự',
        'any.required': 'Mật khẩu mới là bắt buộc',
    }),
});

module.exports = {
    registerSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    changePasswordSchema,
};

