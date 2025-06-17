import express, { RequestHandler } from "express";
import bodyParser from "body-parser";
import {
  getNotaResult,
  queueNota,
  runNota,
} from "./controllers/notaController";
import "./jobs/notaJob";

const app = express();
app.use(bodyParser.json());

app.post("/queue", queueNota as RequestHandler);
app.post("/run", runNota as RequestHandler);
app.get("/result/:id", getNotaResult as RequestHandler);

export default app;
