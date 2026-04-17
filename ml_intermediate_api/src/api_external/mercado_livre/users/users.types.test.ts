import { describe, expect, it } from "vitest";
import { mercadoLivreUserSchema } from "./types.js";

describe("mercadoLivreUserSchema", () => {
  it("accepts a typical users/:id payload shape and preserves extra fields", () => {
    const payload = {
      id: 202593498,
      nickname: "TETE2870021",
      registration_date: "2016-01-06T11:31:42.000-04:00",
      country_id: "AR",
      site_id: "MLA",
      permalink: "http://perfil.mercadolibre.com.ar/TETE2870021",
      user_type: "normal",
      tags: ["normal"],
    };

    const parsed = mercadoLivreUserSchema.parse(payload);
    expect(parsed.id).toBe(202593498);
    expect(parsed.tags).toEqual(["normal"]);
  });
});
