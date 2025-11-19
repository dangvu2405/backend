const Joi = require('joi');

/**
 * Validation schema for creating order
 */
const createOrderSchema = Joi.object({
    items: Joi.array()
        .items(
            Joi.object({
                product: Joi.string().required().messages({
                    'any.required': 'ID sản phẩm là bắt buộc',
                }),
                quantity: Joi.number().integer().min(1).required().messages({
                    'number.base': 'Số lượng phải là số',
                    'number.integer': 'Số lượng phải là số nguyên',
                    'number.min': 'Số lượng tối thiểu là 1',
                    'any.required': 'Số lượng là bắt buộc',
                }),
                price: Joi.number().min(0).required().messages({
                    'number.base': 'Giá phải là số',
                    'number.min': 'Giá không được âm',
                    'any.required': 'Giá là bắt buộc',
                }),
            })
        )
        .min(1)
        .required()
        .messages({
            'array.min': 'Đơn hàng phải có ít nhất 1 sản phẩm',
            'any.required': 'Danh sách sản phẩm là bắt buộc',
        }),
    shippingAddress: Joi.object({
        fullName: Joi.string().required().messages({
            'any.required': 'Họ tên người nhận là bắt buộc',
        }),
        phone: Joi.string()
            .pattern(/^[0-9]{10}$/)
            .required()
            .messages({
                'string.pattern.base': 'Số điện thoại phải có 10 chữ số',
                'any.required': 'Số điện thoại là bắt buộc',
            }),
        address: Joi.string().required().messages({
            'any.required': 'Địa chỉ là bắt buộc',
        }),
        city: Joi.string().required().messages({
            'any.required': 'Thành phố là bắt buộc',
        }),
        district: Joi.string().optional(),
        ward: Joi.string().optional(),
    }).required(),
    paymentMethod: Joi.string().valid('cod', 'bank_transfer', 'vnpay', 'momo').required().messages({
        'any.only': 'Phương thức thanh toán không hợp lệ',
        'any.required': 'Phương thức thanh toán là bắt buộc',
    }),
    note: Joi.string().max(500).optional().allow('').messages({
        'string.max': 'Ghi chú không được quá 500 ký tự',
    }),
});

/**
 * Validation schema for updating order status
 */
const updateOrderStatusSchema = Joi.object({
    status: Joi.string()
        .valid('pending', 'confirmed', 'processing', 'shipping', 'delivered', 'cancelled')
        .required()
        .messages({
            'any.only': 'Trạng thái không hợp lệ',
            'any.required': 'Trạng thái là bắt buộc',
        }),
    note: Joi.string().max(500).optional().allow(''),
});

/**
 * Validation schema for order query params
 */
const orderQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    status: Joi.string()
        .valid('pending', 'confirmed', 'processing', 'shipping', 'delivered', 'cancelled')
        .optional(),
    paymentMethod: Joi.string().valid('cod', 'bank_transfer', 'vnpay', 'momo').optional(),
    paymentStatus: Joi.string().valid('pending', 'paid', 'failed', 'refunded').optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    search: Joi.string().optional(),
});

module.exports = {
    createOrderSchema,
    updateOrderStatusSchema,
    orderQuerySchema,
};

