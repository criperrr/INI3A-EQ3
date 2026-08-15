import "dotenv/config";
import app from "@/app";
import { connectRedis } from "@/shared/redis/server";

const PORT = process.env.SERVER_PORT || 3333;

async function bootstrap() {
  await connectRedis();

  app.listen(PORT, () => {
    console.log(`SERVER: Running on port ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});