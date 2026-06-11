import { describe, it, expect, vi, beforeEach } from "vitest";
import supertest from "supertest";
import app from "../app";
import * as service from "../modules/product/product.service";
import * as repository from "../modules/product/product.repository";

// Mock the service layer directly to test routing, controller and integration logic
vi.mock("../modules/product/product.service", () => ({
  searchProducts: vi.fn(),
  getProductByBarcode: vi.fn(),
  getProductDetails: vi.fn(),
  createProduct: vi.fn(),
}));

// Mock authentication middleware to bypass JWT validation for test simplicity
vi.mock("../modules/auth/auth.controller", () => ({
  authenticateSession: (req: any, res: any, next: any) => {
    req.user = { id: 1, name: "Test User", email: "test@example.com", roleId: 1 };
    next();
  },
}));

describe("Product API Endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/products/search", () => {
    it("should return a list of products on successful fuzzy search", async () => {
      const mockProducts = [
        {
          id: 1,
          name: "Arroz Integral",
          ean: "7891000055120",
          icon: "http://example.com/arroz.png",
          description: "Arroz Integral 1kg",
          best_price: "10.50",
          market_name: "Mercado Central",
          distance_m: 1200,
        },
      ];

      vi.mocked(service.searchProducts).mockResolvedValueOnce(mockProducts);

      const res = await supertest(app)
        .get("/api/v1/products/search")
        .query({ q: "arroz", lat: -23.55, lng: -46.63, radius: 5000 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockProducts);
      expect(service.searchProducts).toHaveBeenCalledWith("arroz", -23.55, -46.63, 5000);
    });

    it("should throw bad request if search query is missing", async () => {
      const res = await supertest(app)
        .get("/api/v1/products/search")
        .query({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.textCode).toBe("MISSING_QUERY");
    });
  });

  describe("GET /api/v1/products/barcode/:ean", () => {
    it("should retrieve a product by EAN barcode", async () => {
      const mockProduct = {
        id: 1,
        name: "Arroz Integral",
        ean: "7891000055120",
        description: "Arroz Integral 1kg",
        icon: "http://example.com/arroz.png",
      };

      vi.mocked(service.getProductByBarcode).mockResolvedValueOnce(mockProduct);

      const res = await supertest(app)
        .get("/api/v1/products/barcode/7891000055120");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockProduct);
      expect(service.getProductByBarcode).toHaveBeenCalledWith("7891000055120");
    });

    it("should return 404 if product barcode is not found anywhere", async () => {
      vi.mocked(service.getProductByBarcode).mockRejectedValueOnce(
        new Error("Product with barcode 123 not found in local catalog or Open Food Facts.")
      );

      // Set name on error or handle it as api error
      const errorMock = new Error("Product with barcode 123 not found in local catalog or Open Food Facts.");
      (errorMock as any).httpCode = 404;
      (errorMock as any).textCode = "NOT_FOUND";
      vi.mocked(service.getProductByBarcode).mockRejectedValueOnce(errorMock);

      const res = await supertest(app)
        .get("/api/v1/products/barcode/123");

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe("GET /api/v1/products/:id", () => {
    it("should retrieve product details and list of compared local offers", async () => {
      const mockDetails = {
        id: 1,
        name: "Arroz Integral",
        ean: "7891000055120",
        description: "Arroz Integral 1kg",
        icon: "http://example.com/arroz.png",
        offers: [
          {
            ocurrency_id: 10,
            price: "10.50",
            market_id: 5,
            market_name: "Mercado Central",
            distance_m: 1200,
            created_at: "2026-06-11T12:00:00Z",
          },
          {
            ocurrency_id: 11,
            price: "11.20",
            market_id: 6,
            market_name: "Union Market",
            distance_m: 2400,
            created_at: "2026-06-11T11:30:00Z",
          },
        ],
      };

      vi.mocked(service.getProductDetails).mockResolvedValueOnce(mockDetails);

      const res = await supertest(app)
        .get("/api/v1/products/1")
        .query({ lat: -23.55, lng: -46.63 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockDetails);
      expect(service.getProductDetails).toHaveBeenCalledWith(1, -23.55, -46.63);
    });
  });

  describe("POST /api/v1/products", () => {
    it("should manually create a product", async () => {
      const mockProduct = {
        id: 2,
        name: "Salmão Fresco",
        ean: "7892000033110",
      };

      vi.mocked(service.createProduct).mockResolvedValueOnce(mockProduct);

      const res = await supertest(app)
        .post("/api/v1/products")
        .send({
          name: "Salmão Fresco",
          ean: "7892000033110",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockProduct);
    });
  });
});
