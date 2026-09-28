module.exports = {
  apps: [
    {
      name: 'hrisekesa-sovereign-os',
      script: 'node',
      args: '--import tsx src/index.ts',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
        HRISEKESA_PORT: 4200,
        HRISEKESA_HOST: '127.0.0.1'
      },
      error_file: 'data/logs/pm2-error.log',
      out_file: 'data/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
