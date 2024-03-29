module.exports = {
  apps: [
    {
      name: 'barrys-webcal',
      script: 'index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3069,
        TZ: 'America/Los_Angeles'
      }
    }
  ]
}
