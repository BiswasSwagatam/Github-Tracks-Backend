import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { router } from "./routes/github.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello from Express!");
});

app.use("/api", router);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
