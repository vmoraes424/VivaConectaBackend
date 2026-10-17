import { buildApp } from "./app";
import { env } from "./config/env";

const app = buildApp();

async function start() {
  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    console.log(`🚀 Viva Conecta Backend rodando em http://${env.HOST}:${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
