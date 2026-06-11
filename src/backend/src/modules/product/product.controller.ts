import type { Request, Response, NextFunction } from "express";
import { BadRequest } from "@/shared/errors/errors";
import { dispatchSuccess, SuccessCodes } from "@/shared/util/response.helper";
import * as service from "./product.service";

/**
 * GET /api/v1/products/search
 * Search products by name (fuzzy) or EAN barcode.
 */
export async function search(req: Request, res: Response, next: NextFunction) {
  try {
    const q = req.query.q as string;
    if (!q || !q.trim()) {
      throw new BadRequest("Search query 'q' is required and cannot be empty.", "MISSING_QUERY");
    }

    const lat = req.query.lat ? Number(req.query.lat) : undefined;
    const lng = req.query.lng ? Number(req.query.lng) : undefined;
    const radius = req.query.radius ? Number(req.query.radius) : undefined;

    if (req.query.lat && isNaN(lat!)) {
      throw new BadRequest("Latitude must be a valid number.", "INVALID_LATITUDE");
    }
    if (req.query.lng && isNaN(lng!)) {
      throw new BadRequest("Longitude must be a valid number.", "INVALID_LONGITUDE");
    }
    if (req.query.radius && isNaN(radius!)) {
      throw new BadRequest("Radius must be a valid number.", "INVALID_RADIUS");
    }

    const results = await service.searchProducts(q.trim(), lat, lng, radius);
    return dispatchSuccess(SuccessCodes.ok, res, results);
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/v1/products/barcode/:ean
 * Retrieve product information by barcode. Checks local DB, then Open Food Facts.
 */
export async function getByBarcode(req: Request, res: Response, next: NextFunction) {
  try {
    const ean = req.params.ean;
    if (!ean || !ean.trim()) {
      throw new BadRequest("Barcode EAN is required.", "MISSING_BARCODE");
    }

    const product = await service.getProductByBarcode(ean.trim());
    return dispatchSuccess(SuccessCodes.ok, res, product);
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/v1/products/:id
 * Get product details along with compared local offers.
 */
export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      throw new BadRequest("Product ID must be a valid number.", "INVALID_ID");
    }

    const lat = req.query.lat ? Number(req.query.lat) : undefined;
    const lng = req.query.lng ? Number(req.query.lng) : undefined;

    if (req.query.lat && isNaN(lat!)) {
      throw new BadRequest("Latitude must be a valid number.", "INVALID_LATITUDE");
    }
    if (req.query.lng && isNaN(lng!)) {
      throw new BadRequest("Longitude must be a valid number.", "INVALID_LONGITUDE");
    }

    const productDetails = await service.getProductDetails(id, lat, lng);
    return dispatchSuccess(SuccessCodes.ok, res, productDetails);
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/v1/products
 * Manually register a product in the catalog.
 */
export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, ean, ncm, description, icon } = req.body;
    if (!name || !name.trim()) {
      throw new BadRequest("Product name is required.", "MISSING_NAME");
    }

    const newProduct = await service.createProduct({
      name: name.trim(),
      ean: ean?.trim(),
      ncm: ncm?.trim(),
      description: description?.trim(),
      icon: icon?.trim(),
    });

    return dispatchSuccess(SuccessCodes.created, res, newProduct);
  } catch (error) {
    return next(error);
  }
}
