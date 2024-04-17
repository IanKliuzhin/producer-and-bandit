import express from "express";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";
 
const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);

app.use(express.static(path.join(path.dirname(fileURLToPath(import.meta.url)), "public")))

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
