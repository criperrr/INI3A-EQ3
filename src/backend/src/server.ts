import "dotenv/config";
import app from "./app";
import { connectRedis } from "./shared/redis/server";

const PORT = process.env.SERVER_PORT || 3000;

app.listen(PORT, async () => {
  console.log("listening to " + PORT);
  console.log("Connecting to redis");
  await connectRedis();
});
