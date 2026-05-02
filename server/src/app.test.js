import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "./app.js";

vi.mock("./models/index.js", () => {
  const rows = [];
  let nextId = 1;
  return {
    Case: {
      create: vi.fn(async (payload) => {
        const row = {
          id: `case-${nextId++}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...payload
        };
        rows.push(row);
        return row;
      }),
      findAll: vi.fn(async () => rows),
      findByPk: vi.fn(async (id) => {
        const row = rows.find((item) => item.id === id);
        if (!row) return null;
        return {
          ...row,
          update: async (payload) => Object.assign(row, payload),
          destroy: async () => {
            const index = rows.findIndex((item) => item.id === id);
            if (index >= 0) rows.splice(index, 1);
          }
        };
      })
    }
  };
});

describe("API", () => {
  it("generates output using the rules fallback without an API key", async () => {
    const app = createApp();
    const response = await request(app)
      .post("/api/generate")
      .send({
        erNote: "Chief Complaint: Diabetes/Hyperglycemia. 34 yof with AMS, GLU 793, CO2 7, acetone large, insulin drip, ICU.",
        hpNote: "Patient admitted for DKA."
      })
      .expect(200);

    expect(response.body.structuredResult.dispositionRecommendation).toBe("Admit");
    expect(response.body.revisedHpi).toMatch(/admission|inpatient|ICU/i);
  });

  it("saves and lists a case", async () => {
    const app = createApp();
    const payload = {
      erNote: "ER note",
      hpNote: "H&P note",
      generatedStructuredResult: {
        chiefComplaint: "Diabetes/Hyperglycemia",
        suspectedConditions: ["Diabetic ketoacidosis"],
        dispositionRecommendation: "Admit"
      },
      editedStructuredResult: {
        chiefComplaint: "Diabetes/Hyperglycemia",
        suspectedConditions: ["Diabetic ketoacidosis"],
        dispositionRecommendation: "Admit"
      },
      generatedRevisedHpi: "Generated HPI",
      editedRevisedHpi: "Edited HPI"
    };

    await request(app).post("/api/cases").send(payload).expect(201);
    const list = await request(app).get("/api/cases").expect(200);

    expect(list.body.length).toBeGreaterThan(0);
    expect(list.body[0].hasUserEdits).toBe(true);
  });

  it("deletes a case", async () => {
    const app = createApp();
    const payload = {
      erNote: "ER note",
      hpNote: "H&P note",
      generatedStructuredResult: {
        chiefComplaint: "Diabetes/Hyperglycemia",
        suspectedConditions: ["Diabetic ketoacidosis"],
        dispositionRecommendation: "Admit"
      },
      generatedRevisedHpi: "Generated HPI"
    };

    const created = await request(app).post("/api/cases").send(payload).expect(201);
    await request(app).delete(`/api/cases/${created.body.id}`).expect(204);
    await request(app).get(`/api/cases/${created.body.id}`).expect(404);
  });
});
