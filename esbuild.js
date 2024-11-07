const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'out/extension.js',
  loader: { ".node": "file" },
  platform: 'node',
  external: [
    'vscode',
    'cpu-features/build/Release/cpufeatures.node',
    'ssh2/lib/protocol/crypto/build/Release/sshcrypto.node'
  ],
  sourcemap: true,
  minify: false,
}).catch(() => process.exit(1));
