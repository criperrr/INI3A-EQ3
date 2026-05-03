import router from "./auth.routes";
import app from "../app";

app.use("/api/v1", router);
