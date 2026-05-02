import { Router } from "express";
import { createCase, getCase, listCases, updateCase, deleteCase } from "../controllers/caseController.js";

export const caseRoutes = Router();

caseRoutes.post("/", createCase);
caseRoutes.get("/", listCases);
caseRoutes.get("/:id", getCase);
caseRoutes.patch("/:id", updateCase);
caseRoutes.delete("/:id", deleteCase);

