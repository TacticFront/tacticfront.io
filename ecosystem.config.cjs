// ecosystem.config.cjs

module.exports = {
  apps: [
    {
      name: "openfront-static",
      script: "npx",
      args: "serve -s static -l 5000",
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "openfront-server",
      script: "src/server/Server.ts",
      interpreter: "node",
      interpreter_args:
        "--loader ts-node/esm --experimental-specifier-resolution=node",
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
        GAME_ENV: "prod",
      },
    },
  ],
};
