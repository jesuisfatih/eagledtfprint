module.exports = {
  apps: [
    {
      name: 'eagle-api',
      cwd: '/var/www/eagle/backend',
      script: 'dist/src/main.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      error_file: '/var/log/pm2/eagle-api-error.log',
      out_file: '/var/log/pm2/eagle-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '500M',
      min_uptime: '10s',
      max_restarts: 10,
      autorestart: true,
    },
    {
      name: 'eagle-admin',
      cwd: '/var/www/eagle/admin',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/pm2/eagle-admin-error.log',
      out_file: '/var/log/pm2/eagle-admin-out.log',
      max_memory_restart: '300M',
      autorestart: true,
    },
    {
      name: 'eagle-accounts',
      cwd: '/var/www/eagle/accounts',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3001',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: '/var/log/pm2/eagle-accounts-error.log',
      out_file: '/var/log/pm2/eagle-accounts-out.log',
      max_memory_restart: '300M',
      autorestart: true,
    },
  ],
};




