import test from "node:test";
import assert from "node:assert/strict";
import { marketController } from "../src/modules/market/market.controller.ts";
import { marketService } from "../src/modules/market/market.service.ts";
import { MarketRepository } from "../src/shared/database/repositories/market.repository.ts";
import { ValidationError } from "../src/shared/errors/errors.ts";

function createMockReqRes(body: any) {
  const req: any = { body, params: {}, query: {} };
  const res: any = {
    statusCode: 200,
    data: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.data = payload;
      return this;
    },
  };
  return { req, res };
}

test("MarketController.createMarket - throws ValidationError when latitude or longitude is missing", async () => {
  const { req, res } = createMockReqRes({ name: "Mercado Sem Coords" });
  let thrownError: any = null;

  await marketController.createMarket(req, res, (err) => {
    thrownError = err;
  });

  assert.ok(thrownError instanceof ValidationError);
  const fields = thrownError.errors.map((e: any) => e.field);
  assert.ok(fields.includes("latitude"), "Must require latitude");
  assert.ok(fields.includes("longitude"), "Must require longitude");
});

test("MarketController.createMarket - throws ValidationError when latitude or longitude is not a number", async () => {
  const { req, res } = createMockReqRes({
    name: "Mercado Inválido",
    latitude: "not_a_number",
    longitude: "xyz",
  });
  let thrownError: any = null;

  await marketController.createMarket(req, res, (err) => {
    thrownError = err;
  });

  assert.ok(thrownError instanceof ValidationError);
  const fields = thrownError.errors.map((e: any) => e.field);
  assert.ok(fields.includes("latitude"));
  assert.ok(fields.includes("longitude"));
});

test("MarketController.createMarket - validates Brazilian territorial envelope (latitude -34.0 to +5.5, longitude -74.0 to -34.5)", async () => {
  // Test outside Brazil (Paris, France: lat ~48.85, lng ~2.35)
  const { req, res } = createMockReqRes({
    name: "Mercado em Paris",
    latitude: 48.8566,
    longitude: 2.3522,
  });
  let thrownError: any = null;

  await marketController.createMarket(req, res, (err) => {
    thrownError = err;
  });

  assert.ok(thrownError instanceof ValidationError);
  const latErr = thrownError.errors.find((e: any) => e.field === "latitude");
  const lngErr = thrownError.errors.find((e: any) => e.field === "longitude");
  assert.ok(latErr, "Must reject latitude outside Brazil");
  assert.ok(lngErr, "Must reject longitude outside Brazil");
});

test("MarketController.createMarket - blocks market creation at exact Praça da Sé marco zero coordinates", async () => {
  const { req, res } = createMockReqRes({
    name: "Mercado no Marco Zero",
    latitude: -23.55052,
    longitude: -46.633308,
  });
  let thrownError: any = null;

  await marketController.createMarket(req, res, (err) => {
    thrownError = err;
  });

  assert.ok(thrownError instanceof ValidationError);
  assert.equal(thrownError.errors.length, 1);
  assert.equal(thrownError.errors[0]?.field, "location");
  assert.equal(
    thrownError.errors[0]?.message,
    "Coordenadas inválidas ou localizadas no marco zero da Praça da Sé."
  );
});

test("MarketController.createMarket - blocks market creation within 50m radius of Praça da Sé", async () => {
  // ~22 meters away from Praça da Sé marco zero:
  // -23.55052 + 0.0002 is ~22.2m
  const { req, res } = createMockReqRes({
    name: "Mercado Próximo ao Marco Zero",
    latitude: -23.55052 + 0.0002,
    longitude: -46.633308,
  });
  let thrownError: any = null;

  await marketController.createMarket(req, res, (err) => {
    thrownError = err;
  });

  assert.ok(thrownError instanceof ValidationError);
  assert.equal(thrownError.errors[0]?.field, "location");
  assert.equal(
    thrownError.errors[0]?.message,
    "Coordenadas inválidas ou localizadas no marco zero da Praça da Sé."
  );
});

test("MarketController.createMarket - succeeds when coordinates are valid in Brazil and outside 50m of Praça da Sé", async () => {
  const origCreate = MarketRepository.createMarket;
  let persistedData: any = null;

  try {
    (MarketRepository as any).createMarket = async (dto: any) => {
      persistedData = dto;
      return [
        {
          id: 123,
          name: dto.name,
          location: JSON.stringify({ type: "Point", coordinates: [dto.location.lng, dto.location.lat] }),
        },
      ];
    };

    // Paulista Ave (~2.6km from Praça da Sé)
    const { req, res } = createMockReqRes({
      name: "Pão de Açúcar Paulista",
      latitude: -23.5615,
      longitude: -46.656,
    });
    let thrownError: any = null;

    await marketController.createMarket(req, res, (err) => {
      thrownError = err;
    });

    assert.equal(thrownError, null);
    assert.equal(res.statusCode, 201);
    assert.equal(res.data.success, true);
    assert.equal(res.data.data.name, "Pão de Açúcar Paulista");
    assert.equal(persistedData.location.lat, -23.5615);
    assert.equal(persistedData.location.lng, -46.656);
  } finally {
    (MarketRepository as any).createMarket = origCreate;
  }
});

test("MarketService.createMarket - eliminates silent Praça da Sé fallback and strictly requires client coordinates", async () => {
  // Service must reject missing/null coordinates instead of falling back to Praça da Sé
  await assert.rejects(
    async () => {
      await (marketService as any).createMarket({
        name: "Mercado Sem Coords",
      });
    },
    (err: any) => {
      assert.ok(err instanceof ValidationError);
      assert.equal(err.errors[0]?.field, "location");
      return true;
    }
  );

  // Service must reject Praça da Sé marco zero coordinates
  await assert.rejects(
    async () => {
      await marketService.createMarket({
        name: "Mercado no Marco Zero",
        latitude: -23.55052,
        longitude: -46.633308,
      });
    },
    (err: any) => {
      assert.ok(err instanceof ValidationError);
      assert.equal(err.errors[0]?.field, "location");
      assert.equal(
        err.errors[0]?.message,
        "Coordenadas inválidas ou localizadas no marco zero da Praça da Sé."
      );
      return true;
    }
  );
});
