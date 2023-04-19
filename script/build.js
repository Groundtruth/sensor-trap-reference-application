// import esbuild from 'esbuild';
const esbuild = require('esbuild');

const externalCjsToEsmPlugin = external => ({
  name: 'external',
  setup(build) {
    let escape = text => `^${text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`
    let filter = new RegExp(external.map(escape).join('|'))
    build.onResolve({ filter: /.*/, namespace: 'external' }, args => ({
      path: args.path, external: true
    }))
    build.onResolve({ filter }, args => ({
      path: args.path, namespace: 'external'
    }))
    build.onLoad({ filter: /.*/, namespace: 'external' }, args => ({
      contents: `export * from ${JSON.stringify(args.path)}`
    }))
  },
});

esbuild.build({
  bundle: true,
  outfile: 'build/index.js',
  platform: 'node',
  // format: 'esm',
  target: 'node18',
  entryPoints: ['./src/index.ts'],
  // plugins: [externalCjsToEsmPlugin(['path', 'buffer', 'stream', 'string_decoder', 'os', 'vm', 'events', 'fs', 'util'])],
});
