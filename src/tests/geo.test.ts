import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { resolveGeoLocation } from "../lib/geo";

describe("GeoLocation Resolution Tests", () => {
  test("Cloudflare headers: extrai cidade e UF diretamente dos headers", async () => {
    const req = {
      headers: {
        "cf-ipcity": "Porto%20Alegre",
        "cf-region-code": "RS",
        "cf-connecting-ip": "177.18.20.30",
      },
    };

    const loc = await resolveGeoLocation(req);
    assert.equal(loc.cidade, "Porto Alegre");
    assert.equal(loc.uf, "RS");
  });

  test("Cloudflare headers: corrige UTF-8 lido como latin1 (ChapecÃ³ -> Chapecó)", async () => {
    const req = {
      headers: {
        "cf-ipcity": "ChapecÃ³",
        "cf-region-code": "SC",
      },
    };

    const loc = await resolveGeoLocation(req);
    assert.equal(loc.cidade, "Chapecó");
    assert.equal(loc.uf, "SC");
  });

  test("Cloudflare headers: suporta cf-region alternativo", async () => {
    const req = {
      headers: {
        "cf-ipcity": "Curitiba",
        "cf-region": "PR",
      },
    };

    const loc = await resolveGeoLocation(req);
    assert.equal(loc.cidade, "Curitiba");
    assert.equal(loc.uf, "PR");
  });

  test("Body override: prioriza valores fornecidos explicitamente", async () => {
    const req = {
      headers: {
        "cf-ipcity": "Curitiba",
        "cf-region": "PR",
      },
    };

    const loc = await resolveGeoLocation(req, {
      cidade: "Pelotas",
      uf: "RS",
    });

    assert.equal(loc.cidade, "Pelotas");
    assert.equal(loc.uf, "RS");
  });

  test("IP Geolocation: resolve IP público real", async () => {
    const req = {
      headers: {
        "x-forwarded-for": "177.18.20.30, 10.0.0.1",
      },
      ip: "10.0.0.1",
    };

    const loc = await resolveGeoLocation(req);
    assert.ok(loc.cidade);
    assert.ok(loc.uf);
  });

  test("Fallback: não lança erro com headers vazios ou IP de loopback", async () => {
    const req = {
      headers: {},
      ip: "127.0.0.1",
    };

    const loc = await resolveGeoLocation(req);
    assert.ok(typeof loc.cidade === "string");
    assert.ok(typeof loc.uf === "string");
  });
});
