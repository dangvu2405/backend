const Joi = require('joi');

/**
 * Validation schema for creating product
 */
const createProductSchema = Joi.object({
    name: Joi.string().min(3).max(200).required().messages({
        'string.empty': 'Tên sản phẩm không được để trống',
        'string.min': 'Tên sản phẩm phải có ít nhất 3 ký tự',
        'string.max': 'Tên sản phẩm không được quá 200 ký tự',
        'any.required': 'Tên sản phẩm là bắt buộc',
    }),
    description: Joi.string().max(2000).optional().allow('').messages({
        'string.max': 'Mô tả không được quá 2000 ký tự',
    }),
    price: Joi.number().min(0).required().messages({
        'number.base': 'Giá phải là số',
        'number.min': 'Giá không được âm',
        'any.required': 'Giá là bắt buộc',
    }),
    salePrice: Joi.number().min(0).optional().messages({
        'number.base': 'Giá khuyến mãi phải là số',
        'number.min': 'Giá khuyến mãi không được âm',
    }),
    category: Joi.string().required().messages({
        'string.empty': 'Danh mục không được để trống',
        'any.required': 'Danh mục là bắt buộc',
    }),
    brand: Joi.string().optional().allow(''),
    stock: Joi.number().integer().min(0).default(0).messages({
        'number.base': 'Số lượng phải là số',
        'number.integer': 'Số lượng phải là số nguyên',
        'number.min': 'Số lượng không được âm',
    }),
    images: Joi.array().items(Joi.string().uri()).optional(),
    specifications: Joi.object().optional(),
    status: Joi.string().valid('active', 'inactive', 'out_of_stock').default('active'),
});

/**
 * Validation schema for updating product
 */
const updateProductSchema = Joi.object({
    name: Joi.string().min(3).max(200).optional(),
    description: Joi.string().max(2000).optional().allow(''),
    price: Joi.number().min(0).optional(),
    salePrice: Joi.number().min(0).optional(),
    category: Joi.string().optional(),
    brand: Joi.string().optional().allow(''),
    stock: Joi.number().integer().min(0).optional(),
    images: Joi.array().items(Joi.string().uri()).optional(),
    specifications: Joi.object().optional(),
    status: Joi.string().valid('active', 'inactive', 'out_of_stock').optional(),
});

/**
 * Validation schema for product query params
 */
const productQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().valid('price', '-price', 'name', '-name', 'createdAt', '-createdAt').optional(),
    category: Joi.string().optional(),
    brand: Joi.string().optional(),
    minPrice: Joi.number().min(0).optional(),
    maxPrice: Joi.number().min(0).optional(),
    search: Joi.string().optional(),
    status: Joi.string().valid('active', 'inactive', 'out_of_stock').optional(),
});

module.exports = {
    createProductSchema,
    updateProductSchema,
    productQuerySchema,
};

