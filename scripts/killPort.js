/**
 * Script to kill process using a specific port
 * Usage: node scripts/killPort.js [port]
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const port = process.argv[2] || '3001';

async function killPort(port) {
    try {
        console.log(`🔍 Checking port ${port}...`);
        
        // Find process using the port (Windows)
        const { stdout } = await execPromise(`netstat -ano | findstr :${port}`);
        
        if (!stdout.trim()) {
            console.log(`✅ Port ${port} is free`);
            return;
        }
        
        // Extract PID from netstat output
        const lines = stdout.trim().split('\n');
        const pids = new Set();
        
        lines.forEach(line => {
            const match = line.match(/\s+(\d+)$/);
            if (match) {
                pids.add(match[1]);
            }
        });
        
        if (pids.size === 0) {
            console.log(`✅ Port ${port} is free`);
            return;
        }
        
        console.log(`⚠️  Found ${pids.size} process(es) using port ${port}:`);
        
        for (const pid of pids) {
            try {
                // Get process info
                const { stdout: processInfo } = await execPromise(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`);
                console.log(`   PID ${pid}: ${processInfo.trim()}`);
                
                // Kill the process
                await execPromise(`taskkill /PID ${pid} /F`);
                console.log(`   ✅ Killed process ${pid}`);
            } catch (error) {
                console.log(`   ⚠️  Could not kill process ${pid}: ${error.message}`);
            }
        }
        
        console.log(`\n✅ Port ${port} should now be free`);
    } catch (error) {
        if (error.message.includes('findstr')) {
            console.log(`✅ Port ${port} is free (no process found)`);
        } else {
            console.error(`❌ Error: ${error.message}`);
        }
    }
}

killPort(port);

