import { Case } from "../models/index.js";
import { combineNotes } from "../services/rulesExtractor.js";

function titleFromPayload(payload) {
  const structured = payload.editedStructuredResult || payload.generatedStructuredResult || {};
  const complaint = structured.chiefComplaint && structured.chiefComplaint !== "Unknown" ? structured.chiefComplaint : "";
  const condition = Array.isArray(structured.suspectedConditions) ? structured.suspectedConditions[0] : "";
  return payload.title || complaint || condition || "Untitled Clinical Case";
}

function didUserEdit(generatedStructuredResult, editedStructuredResult, generatedRevisedHpi, editedRevisedHpi) {
  return (
    JSON.stringify(generatedStructuredResult || {}) !== JSON.stringify(editedStructuredResult || {}) ||
    (generatedRevisedHpi || "") !== (editedRevisedHpi || "")
  );
}

export async function createCase(req, res, next) {
  try {
    const {
      erNote = "",
      hpNote = "",
      combinedNote,
      generatedStructuredResult,
      editedStructuredResult,
      generatedRevisedHpi,
      editedRevisedHpi,
      title
    } = req.body || {};

    if (!generatedStructuredResult || !generatedRevisedHpi) {
      return res.status(400).json({ message: "Generated structured result and Revised HPI are required." });
    }

    const finalEditedStructured = editedStructuredResult || generatedStructuredResult;
    const finalEditedHpi = editedRevisedHpi || generatedRevisedHpi;

    const saved = await Case.create({
      title: titleFromPayload({ title, editedStructuredResult: finalEditedStructured, generatedStructuredResult }),
      erNote,
      hpNote,
      combinedNote: combinedNote || combineNotes({ erNote, hpNote }),
      generatedStructuredResult,
      editedStructuredResult: finalEditedStructured,
      generatedRevisedHpi,
      editedRevisedHpi: finalEditedHpi,
      hasUserEdits: didUserEdit(generatedStructuredResult, finalEditedStructured, generatedRevisedHpi, finalEditedHpi)
    });

    res.status(201).json(saved);
  } catch (error) {
    next(error);
  }
}

export async function listCases(_req, res, next) {
  try {
    const cases = await Case.findAll({
      order: [["updatedAt", "DESC"]],
      attributes: [
        "id",
        "title",
        "generatedStructuredResult",
        "editedStructuredResult",
        "hasUserEdits",
        "createdAt",
        "updatedAt"
      ]
    });

    res.json(cases);
  } catch (error) {
    next(error);
  }
}

export async function getCase(req, res, next) {
  try {
    const saved = await Case.findByPk(req.params.id);
    if (!saved) return res.status(404).json({ message: "Case not found." });
    res.json(saved);
  } catch (error) {
    next(error);
  }
}

export async function updateCase(req, res, next) {
  try {
    const saved = await Case.findByPk(req.params.id);
    if (!saved) return res.status(404).json({ message: "Case not found." });

    const editedStructuredResult = req.body.editedStructuredResult || saved.editedStructuredResult;
    const editedRevisedHpi = req.body.editedRevisedHpi ?? saved.editedRevisedHpi;
    const title = req.body.title || saved.title;

    await saved.update({
      title,
      editedStructuredResult,
      editedRevisedHpi,
      hasUserEdits: didUserEdit(
        saved.generatedStructuredResult,
        editedStructuredResult,
        saved.generatedRevisedHpi,
        editedRevisedHpi
      )
    });

    res.json(saved);
  } catch (error) {
    next(error);
  }
}

export async function deleteCase(req, res, next) {
  try {
    const saved = await Case.findByPk(req.params.id);

    if (!saved) return res.status(404).json({ message: "Case not found." });

    await saved.destroy();

    res.status(204).end();
  } catch (error) {
    next(error);
  }
}
