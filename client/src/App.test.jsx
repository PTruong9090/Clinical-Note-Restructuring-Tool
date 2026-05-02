import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "./App.jsx";

describe("App", () => {
  it("generates and shows editable output", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url) => {
        if (url.toString().endsWith("/api/generate")) {
          return {
            ok: true,
            json: async () => ({
              combinedNote: "combined",
              generationMode: "rules",
              revisedHpi: "Patient admitted for DKA with insulin drip.",
              structuredResult: {
                chiefComplaint: "Diabetes/Hyperglycemia",
                hpiSummary: "34F with DKA.",
                keyFindings: ["Glucose 793"],
                suspectedConditions: ["Diabetic ketoacidosis"],
                dispositionRecommendation: "Admit",
                uncertainties: ["History limited by mentation."],
                revisedHpi: "Patient admitted for DKA with insulin drip.",
                evidence: []
              }
            })
          };
        }
        return { ok: true, json: async () => [] };
      })
    );

    render(<App />);

    fireEvent.change(screen.getByLabelText("ER Note"), {
      target: { value: "34F with AMS, DKA, glucose 793, insulin drip." }
    });
    const generateButtons = screen.getAllByRole("button", { name: /generate/i });
    fireEvent.click(generateButtons[generateButtons.length - 1]);

    await waitFor(() => expect(screen.getByDisplayValue("Diabetes/Hyperglycemia")).toBeInTheDocument());
    expect(screen.getByDisplayValue(/Patient admitted for DKA/)).toBeInTheDocument();
  });
});
