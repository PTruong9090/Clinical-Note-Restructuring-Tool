import { generateClinicalOutput } from "../services/generationService.js";

export async function generate(req, res, next) {
  try {
    const { erNote = "", hpNote = "" } = req.body || {};
    const result = await generateClinicalOutput({ erNote, hpNote });
    res.json(result);
  } catch (error) {
    next(error);
  }
}
