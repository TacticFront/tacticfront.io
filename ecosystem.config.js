// ecosystem.config.js

module.exports = {
  apps: [
    {
      name: "openfront-server",
      script: "src/server/Server.ts",
      interpreter: "node",
      interpreter_args:
        "--loader ts-node/esm --experimental-specifier-resolution=node",
      env: {
        NODE_ENV: "production",
        GAME_ENV: "prod",
      },
    },
  ],
};
