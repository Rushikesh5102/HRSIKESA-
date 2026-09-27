import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const url = 'https://github.com/ggml-org/llama.cpp/releases/download/b11177/llama-b11177-bin-win-vulkan-x64.zip';
const zipPath = path.resolve('tools/llama-vulkan.zip');
const destDir = path.resolve('tools/llama-vulkan');

if (!fs.existsSync('tools')) {
  fs.mkdirSync('tools', { recursive: true });
}

console.log('Downloading llama.cpp Vulkan build from:', url);
execSync(`curl.exe -sL -o "${zipPath}" "${url}"`, { stdio: 'inherit' });

if (fs.existsSync(zipPath)) {
  console.log('Extracting to:', destDir);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  execSync(`tar -xf "${zipPath}" -C "${destDir}"`, { stdio: 'inherit' });
  fs.unlinkSync(zipPath);
  console.log('Successfully extracted. Contents:');
  const files = fs.readdirSync(destDir);
  console.log(files.join(', '));
} else {
  console.error('Failed to download zip.');
}
