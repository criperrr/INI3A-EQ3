import "dotenv/config";
import app from "./app";
import { connectRedis } from "./shared/redis/server";

const PORT = process.env.SERVER_PORT || 3333;

async function bootstrap() {
  await connectRedis();
  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("Fatal error on startup:", err);
  process.exit(1);
});
