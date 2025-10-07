module.exports = {
  apps: [{
    name: 'goip-server',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/goip',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOST: '0.0.0.0'
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: '/var/log/pm2/goip-error.log',
    out_file: '/var/log/pm2/goip-out.log',
    log_file: '/var/log/pm2/goip-combined.log',
    time: true,
    kill_timeout: 5000,
    restart_delay: 5000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};