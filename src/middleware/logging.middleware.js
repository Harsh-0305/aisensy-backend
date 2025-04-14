export const requestLogger = (req, res, next) => {
    const start = Date.now();
    
    // Log request details
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    
    // Log request body if present
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('Request Body:', JSON.stringify(req.body, null, 2));
    }

    // Capture response
    const oldSend = res.send;
    res.send = function(data) {
        // Log response
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] Response sent in ${duration}ms`);
        console.log('Status:', res.statusCode);
        
        // Call original send
        oldSend.apply(res, arguments);
    };

    next();
}; 