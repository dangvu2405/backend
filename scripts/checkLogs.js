/**
 * Script to check backend logs and display response time statistics
 * Usage: node scripts/checkLogs.js [log-file-path]
 */

const path = require('path');
const { analyzeLogFile, getLatestLogFile, printStatistics } = require('../src/utils/logAnalyzer');

const logFile = process.argv[2] || getLatestLogFile();

console.log(`📄 Analyzing log file: ${logFile}\n`);

const stats = analyzeLogFile(logFile);
printStatistics(stats);

