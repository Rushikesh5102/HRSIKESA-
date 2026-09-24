import os from 'node:os';
import { execSync } from 'node:child_process';

function getMemoryDiagnostics() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  console.log('====================================================');
  console.log('HṚṢĪKEŚA SYSTEM MEMORY DIAGNOSTICS');
  console.log('====================================================');
  console.log(`Total System RAM: ${(totalMem / (1024 ** 3)).toFixed(2)} GB`);
  console.log(`Used System RAM:  ${(usedMem / (1024 ** 3)).toFixed(2)} GB (${((usedMem / totalMem) * 100).toFixed(1)}%)`);
  console.log(`Free System RAM:  ${(freeMem / (1024 ** 3)).toFixed(2)} GB (${((freeMem / totalMem) * 100).toFixed(1)}%)`);
  console.log(`Node Process RSS: ${(process.memoryUsage().rss / (1024 ** 2)).toFixed(2)} MB`);
  console.log('----------------------------------------------------');
  console.log('Top Memory-Consuming Processes on Windows Host:');
  console.log('----------------------------------------------------');

  try {
    const psCommand = `powershell -NoProfile -Command "Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 20 ProcessName, Id, @{Name='WorkingSetMB';Expression={[math]::Round($_.WorkingSet64 / 1MB, 2)}}, @{Name='Company';Expression={$_.Company}} | Format-Table -AutoSize"`;
    const output = execSync(psCommand, { encoding: 'utf-8' });
    console.log(output);
  } catch (err) {
    console.error('Failed to query process working sets:', err);
  }

  console.log('----------------------------------------------------');
  console.log('Ollama Loaded Models Status:');
  console.log('----------------------------------------------------');
  try {
    const ollamaPs = execSync('curl.exe -s http://127.0.0.1:11434/api/ps', { encoding: 'utf-8' });
    console.log('Ollama /api/ps:', ollamaPs);
  } catch (err) {
    console.log('Could not connect to Ollama /api/ps');
  }
}

getMemoryDiagnostics();
