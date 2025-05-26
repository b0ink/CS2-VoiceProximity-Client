// Use `npm run dev:multi` to simulate 10 applications with 10 unique socket connections
// Note: each window still requires a valid JWT. Use window.saveAuth()

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { spawn } = require('child_process');

const instances = parseInt(process.argv[2], 10) || 10;
const basePort = 3000;
const baseInspectPort = 9229;

for (let i = 0; i < instances; i++) {
  const port = basePort + i;
  const inspectPort = baseInspectPort + i;
  const userDir = `/tmp/e${i + 1}`;

  const proc = spawn(
    'cross-env',
    [
      `PORT=${port}`,
      'electron',
      `--inspect=${inspectPort}`,
      './out/main/index.js',
      `--user-data-dir=${userDir}`,
    ],
    { stdio: 'inherit', shell: true },
  );

  proc.on('exit', (code) => {
    console.log(`Instance ${i + 1} exited with code ${code}`);
  });
}
