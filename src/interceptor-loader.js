// CommonJS loader for interceptor
try {
	// Try to load the compiled JS version first
	const path = require("path");
	const fs = require("fs");

	// Determine the correct paths based on current location
	const isRunningFromDist = __dirname.includes('dist');
	const isRunningFromSrc = __dirname.includes('src');
	
	let jsPath, tsPath;
	
	if (isRunningFromDist) {
		// Running from dist directory - interceptor.js is in the same directory
		jsPath = path.join(__dirname, "interceptor.js");
		tsPath = path.join(__dirname, "..", "src", "interceptor.ts");
	} else if (isRunningFromSrc) {
		// Running from src directory - interceptor.js is in dist directory
		jsPath = path.join(__dirname, "..", "dist", "interceptor.js");
		tsPath = path.join(__dirname, "interceptor.ts");
	} else {
		// Fallback - try common locations
		jsPath = path.join(__dirname, "interceptor.js");
		tsPath = path.join(__dirname, "interceptor.ts");
	}

	if (fs.existsSync(jsPath)) {
		// Use compiled JavaScript
		const interceptorModule = require(jsPath);
		
		// Export the function for wrapper script
		module.exports = {
			initializeInterceptor: interceptorModule.initializeInterceptor
		};
		
		// Initialize the interceptor
		interceptorModule.initializeInterceptor();
	} else if (fs.existsSync(tsPath)) {
		// Use TypeScript via tsx
		require("tsx/cjs/api").register();
		const interceptorModule = require(tsPath);
		
		// Export the function for wrapper script
		module.exports = {
			initializeInterceptor: interceptorModule.initializeInterceptor
		};
		
		// Initialize the interceptor
		interceptorModule.initializeInterceptor();
	} else {
		console.error("Could not find interceptor file");
		console.error("Tried JS path:", jsPath);
		console.error("Tried TS path:", tsPath);
		process.exit(1);
	}
} catch (error) {
	console.error("Error loading interceptor:", error.message);
	process.exit(1);
}
