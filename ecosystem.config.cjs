module.exports = {
  apps: [
    {
      name: 'uhchost',
      script: 'src/index.js',
      cwd: __dirname,
      interpreter: 'node',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
