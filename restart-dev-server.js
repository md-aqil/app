// Script to restart the Next.js development server
const { exec } = require('child_process');

console.log('Restarting Next.js development server...');

// Kill any existing Next.js processes
exec('taskkill /f /im node.exe 2>nul', (error, stdout, stderr) => {
  if (error) {
    console.log('No existing Node.js processes found or unable to kill them.');
  } else {
    console.log('Killed existing Node.js processes.');
  }
  
  // Wait a moment for processes to fully terminate
  setTimeout(() => {
    console.log('Starting Next.js development server...');
    
    // Start the Next.js development server
    const server = exec('npm run dev', { cwd: __dirname });
    
    server.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });
    
    server.stderr.on('data', (data) => {
      console.log(`stderr: ${data}`);
    });
    
    server.on('close', (code) => {
      console.log(`Child process exited with code ${code}`);
    });
    
    console.log('Next.js development server restart initiated.');
    console.log('Wait a few seconds for the server to start, then run the CORS test again.');
  }, 2000);
});