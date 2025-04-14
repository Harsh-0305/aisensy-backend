const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
    info: (...args) => {
        if (isDevelopment) {
            console.log(...args);
        }
    },
    
    error: (...args) => {
        console.error(...args);
    },
    
    warn: (...args) => {
        console.warn(...args);
    },
    
    debug: (...args) => {
        if (isDevelopment) {
            console.debug(...args);
        }
    }
}; 