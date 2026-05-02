import { Router } from "express";
import { generate } from "../controllers/generateController.js";

export const generateRoutes = Router();

generateRoutes.post("/", generate);
