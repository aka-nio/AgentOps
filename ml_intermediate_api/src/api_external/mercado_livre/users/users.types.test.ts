// SPDX-License-Identifier: MIT
// Copyright (c) 2026 AgentOPsBase contributors
//
// Part of AgentOPsBase. You may use, modify, redistribute, and sell this work
// or derivatives (including commercially) without owing the copyright holders
// anything beyond what the MIT license requires. This file is licensed under
// the terms in the LICENSE file at the repository root. The software is
// provided "AS IS", without warranty; the copyright holders are not liable for
// this code or for what anyone does with it.
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
