import { describe, it, expect, vi, beforeEach } from "vitest";
import supertest from "supertest";
import app from "../app";
import * as productService from "../modules/product/product.service";
import * as marketService from "../modules/market/market.service";
import * as entryService from "../modules/entry/entry.service";

// Mock the services
vi.mock("../modules/product/product.service", () => ({
  searchProducts: vi.fn(),
  createProduct: vi.fn(),
}));

vi.mock("../modules/market/market.service", () => ({
  getAllMarkets: vi.fn(),
  getMarketsByRadius: vi.fn(),
  getMarket: vi.fn(),
  createMarket: vi.fn(),
}));

vi.mock("../modules/entry/entry.service", () => ({
  createEntry: vi.fn(),
}));

// Mock authentication middleware to bypass JWT validation
vi.mock("../modules/auth/auth.controller", () => ({
  authenticateSession: (req: any, res: any, next: any) => {
    req.user = { id: 1, name: "Test User", email: "test@example.com", roleId: 1 };
    next();
  },
}));

describe("New Features API Endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/markets", () => {
    it("should return all markets when no coords provided", async () => {
      const mockMarkets = [
        { id: 1, name: "Mercado Global Padrão", location: { lat: -23.55052, lng: -46.633308 } }
      ];
      vi.mocked(marketService.getAllMarkets).mockResolvedValueOnce(mockMarkets);

      const res = await supertest(app).get("/api/v1/markets");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockMarkets);
      expect(marketService.getAllMarkets).toHaveBeenCalled();
    });

    it("should return markets by radius when coords provided", async () => {
      const mockMarkets = [
        { id: 1, name: "Mercado Global Padrão", location: { lat: -23.55052, lng: -46.633308 } }
      ];
      vi.mocked(marketService.getMarketsByRadius).mockResolvedValueOnce(mockMarkets);

      const res = await supertest(app)
        .get("/api/v1/markets")
        .query({ lat: -23.55, lng: -46.63, radius: 5000 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockMarkets);
      expect(marketService.getMarketsByRadius).toHaveBeenCalledWith({ lat: -23.55, lng: -46.63 }, 5000);
    });
  });

  describe("POST /api/v1/entries", () => {
    it("should create a price occurrence successfully", async () => {
      const mockEntry = {
        id: 10,
        userId: 1,
        marketId: 1,
        productId: 5,
        value: "9.99",
        createdAt: "2026-06-11T12:00:00Z",
      };
      vi.mocked(entryService.createEntry).mockResolvedValueOnce(mockEntry);

      const res = await supertest(app)
        .post("/api/v1/entries")
        .send({ marketId: 1, productId: 5, value: 9.99 });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockEntry);
      expect(entryService.createEntry).toHaveBeenCalledWith({
        userId: 1,
        marketId: 1,
        productId: 5,
        value: 9.99,
      });
    });

    it("should throw bad request if required fields are missing", async () => {
      const res = await supertest(app)
        .post("/api/v1/entries")
        .send({ productId: 5 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.textCode).toBe("MISSING_FIELDS");
    });
  });

  describe("POST /api/v1/products with tags", () => {
    it("should create a product with tags successfully", async () => {
      const mockProduct = {
        id: 2,
        name: "Coca-Cola Zero",
        ean: "7891000100100",
        tags: "refrigerante, coca, bebida, zero",
      };
      vi.mocked(productService.createProduct).mockResolvedValueOnce(mockProduct);

      const res = await supertest(app)
        .post("/api/v1/products")
        .send({
          name: "Coca-Cola Zero",
          ean: "7891000100100",
          tags: "refrigerante, coca, bebida, zero",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockProduct);
      expect(productService.createProduct).toHaveBeenCalledWith({
        name: "Coca-Cola Zero",
        ean: "7891000100100",
        tags: "refrigerante, coca, bebida, zero",
      });
    });
  });
});
