const express = require('express');
const authRouter = require('./Auth.js');
const apiRouter = require('./api.js');
const userRouter = require('./user.js');
const cartRouter = require('./cart.js');
const adminRouter = require('./admin.js');
const reviewsRouter = require('./reviews.js');
const supplyChainRouter = require('./supplyChain.js');
const paymentRouter = require('./payment.js');
const chatRouter = require('./chat.js');

function router(app) {
    app.use('/auth', authRouter);   
    app.use('/api', apiRouter);
    app.use('/api/supply-chain', supplyChainRouter);
    app.use('/user', userRouter);
    app.use('/cart', cartRouter);
    app.use('/admin', adminRouter);
    app.use('/api/reviews', reviewsRouter);
    app.use('/payment', paymentRouter);
    app.use('/chat', chatRouter);
}

module.exports = router;