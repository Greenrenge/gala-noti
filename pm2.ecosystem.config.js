module.exports = {
  apps: [
    {
      name: "gala-noti",
      script: "./index.js",
      watch: false,
      env: {
        NODE_ENV: "production",
        LINE_NOTIFY_TOKEN: "xxx",
      },
    },
  ],
}
