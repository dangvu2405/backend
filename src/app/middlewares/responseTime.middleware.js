/**
 * Response Time Middleware
 * Tracks and logs API response times
 * Adds X-Response-Time header to responses
 */

const responseTimeMiddleware = (req, res, next) => {
    const startTime = Date.now();
    
    // Store start time in request object for later use
    req.startTime = startTime;
    
    // Override res.end to calculate response time
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
        const responseTime = Date.now() - startTime;
        
        // Add response time header
        res.setHeader('X-Response-Time', `${responseTime}ms`);
        
        // Log slow requests (> 1 second)
        if (responseTime > 1000) {
            console.warn(`⚠️  SLOW REQUEST: ${req.method} ${req.path} - ${responseTime}ms`);
        }
        
        // Log very slow requests (> 3 seconds)
        if (responseTime > 3000) {
            console.error(`🐌 VERY SLOW REQUEST: ${req.method} ${req.path} - ${responseTime}ms`);
        }
        
        // Store response time in response object for morgan
        res.responseTime = responseTime;
        
        // Call original end method
        originalEnd.call(this, chunk, encoding);
    };
    
    next();
};

module.exports = responseTimeMiddleware;

