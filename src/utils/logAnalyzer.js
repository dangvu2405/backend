/**
 * Log Analyzer Utility
 * Analyzes server logs to extract response time statistics
 */

const fs = require('fs');
const path = require('path');

/**
 * Parse morgan log line to extract response time
 * Format: GET /api/products 200 45ms 1234
 */
function parseLogLine(line) {
    const logPattern = /(\w+)\s+([^\s]+)\s+(\d+)\s+(\d+)ms\s+(\d+)/;
    const match = line.match(logPattern);
    
    if (!match) return null;
    
    return {
        method: match[1],
        url: match[2],
        status: parseInt(match[3]),
        responseTime: parseInt(match[4]),
        size: parseInt(match[5]),
        timestamp: new Date()
    };
}

/**
 * Analyze log file and return statistics
 */
function analyzeLogFile(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            return { error: 'Log file not found', path: filePath };
        }
        
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());
        
        const requests = [];
        let totalResponseTime = 0;
        let requestCount = 0;
        const statusCodes = {};
        const endpoints = {};
        const slowRequests = [];
        
        lines.forEach(line => {
            const parsed = parseLogLine(line);
            if (parsed) {
                requests.push(parsed);
                totalResponseTime += parsed.responseTime;
                requestCount++;
                
                // Count status codes
                statusCodes[parsed.status] = (statusCodes[parsed.status] || 0) + 1;
                
                // Count endpoints
                const endpoint = `${parsed.method} ${parsed.url}`;
                if (!endpoints[endpoint]) {
                    endpoints[endpoint] = {
                        count: 0,
                        totalTime: 0,
                        avgTime: 0,
                        maxTime: 0,
                        minTime: Infinity
                    };
                }
                endpoints[endpoint].count++;
                endpoints[endpoint].totalTime += parsed.responseTime;
                endpoints[endpoint].maxTime = Math.max(endpoints[endpoint].maxTime, parsed.responseTime);
                endpoints[endpoint].minTime = Math.min(endpoints[endpoint].minTime, parsed.responseTime);
                
                // Track slow requests (> 1 second)
                if (parsed.responseTime > 1000) {
                    slowRequests.push(parsed);
                }
            }
        });
        
        // Calculate average response times for endpoints
        Object.keys(endpoints).forEach(endpoint => {
            const stats = endpoints[endpoint];
            stats.avgTime = Math.round(stats.totalTime / stats.count);
        });
        
        const avgResponseTime = requestCount > 0 ? Math.round(totalResponseTime / requestCount) : 0;
        const maxResponseTime = requests.length > 0 ? Math.max(...requests.map(r => r.responseTime)) : 0;
        const minResponseTime = requests.length > 0 ? Math.min(...requests.map(r => r.responseTime)) : 0;
        
        // Sort endpoints by average response time (slowest first)
        const sortedEndpoints = Object.entries(endpoints)
            .map(([endpoint, stats]) => ({ endpoint, ...stats }))
            .sort((a, b) => b.avgTime - a.avgTime);
        
        // Sort slow requests by response time
        slowRequests.sort((a, b) => b.responseTime - a.responseTime);
        
        return {
            summary: {
                totalRequests: requestCount,
                avgResponseTime,
                maxResponseTime,
                minResponseTime,
                slowRequestCount: slowRequests.length
            },
            statusCodes,
            topSlowEndpoints: sortedEndpoints.slice(0, 10),
            slowestRequests: slowRequests.slice(0, 20)
        };
    } catch (error) {
        return { error: error.message };
    }
}

/**
 * Get latest log file
 */
function getLatestLogFile() {
    const logDir = path.join(__dirname, '../../');
    const files = fs.readdirSync(logDir)
        .filter(file => file.startsWith('server-') && file.endsWith('.log'))
        .map(file => ({
            name: file,
            path: path.join(logDir, file),
            time: fs.statSync(path.join(logDir, file)).mtime
        }))
        .sort((a, b) => b.time - a.time);
    
    return files.length > 0 ? files[0].path : path.join(logDir, 'server.log');
}

/**
 * Print statistics in a readable format
 */
function printStatistics(stats) {
    if (stats.error) {
        console.error('❌ Error:', stats.error);
        return;
    }
    
    console.log('\n📊 API Response Time Statistics\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📈 Summary:');
    console.log(`   Total Requests: ${stats.summary.totalRequests}`);
    console.log(`   Average Response Time: ${stats.summary.avgResponseTime}ms`);
    console.log(`   Fastest Request: ${stats.summary.minResponseTime}ms`);
    console.log(`   Slowest Request: ${stats.summary.maxResponseTime}ms`);
    console.log(`   Slow Requests (>1s): ${stats.summary.slowRequestCount}`);
    console.log('═══════════════════════════════════════════════════════');
    
    if (Object.keys(stats.statusCodes).length > 0) {
        console.log('\n📋 Status Codes:');
        Object.entries(stats.statusCodes)
            .sort((a, b) => b[1] - a[1])
            .forEach(([code, count]) => {
                const emoji = code.startsWith('2') ? '✅' : code.startsWith('4') ? '⚠️' : '❌';
                console.log(`   ${emoji} ${code}: ${count}`);
            });
    }
    
    if (stats.topSlowEndpoints.length > 0) {
        console.log('\n🐌 Top 10 Slowest Endpoints:');
        stats.topSlowEndpoints.forEach((endpoint, index) => {
            const color = endpoint.avgTime > 1000 ? '🔴' : endpoint.avgTime > 500 ? '🟡' : '🟢';
            console.log(`   ${index + 1}. ${color} ${endpoint.endpoint}`);
            console.log(`      Avg: ${endpoint.avgTime}ms | Max: ${endpoint.maxTime}ms | Min: ${endpoint.minTime}ms | Count: ${endpoint.count}`);
        });
    }
    
    if (stats.slowestRequests.length > 0) {
        console.log('\n⏱️  Slowest Individual Requests (>1s):');
        stats.slowestRequests.slice(0, 10).forEach((req, index) => {
            console.log(`   ${index + 1}. ${req.method} ${req.url} - ${req.responseTime}ms (Status: ${req.status})`);
        });
    }
    
    console.log('\n═══════════════════════════════════════════════════════\n');
}

module.exports = {
    analyzeLogFile,
    getLatestLogFile,
    printStatistics,
    parseLogLine
};

