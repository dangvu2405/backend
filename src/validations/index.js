// Export all validations

const authValidation = require('./auth.validation');
const productValidation = require('./product.validation');
const orderValidation = require('./order.validation');
const validate = require('./validate.middleware');

module.exports = {
    authValidation,
    productValidation,
    orderValidation,
    validate,
};

