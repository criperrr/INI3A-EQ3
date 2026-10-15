import test from "node:test";
import assert from "node:assert/strict";
import { productService } from "../src/modules/product/product.service";
import { productController } from "../src/modules/product/product.controller";
import { ProductRepository } from "../src/shared/database/repositories/product.repository";
import { UserRepository } from "../src/shared/database/repositories/user.repository";
import { AuthRepository } from "../src/shared/database/repositories/auth.repository";
import { requireAuth, requireTwoFactor } from "../src/shared/middlewares/authMiddleware";
import { ForbiddenError, UnauthorizedError } from "../src/shared/errors/errors";
import { signAccessToken } from "../src/shared/util/jwt";
import { db } from "../src/shared/database/database";

test("ProductService.createCustomProduct - fails closed (throws UnauthorizedError) when userId is missing", async () => {
  await assert.rejects(
    async () => {
      await productService.createCustomProduct(
        {
          name: "Produto Sem Dono",
          category: "Geral",
        },
        undefined,
      );
    },
    (err: any) => {
      assert.ok(err instanceof UnauthorizedError);
      return true;
    },
  );
});

test("ProductRepository.createProduct - builds Drizzle insert payload with createdByUserId and persists it", async () => {
  let capturedValues: any = null;
  const origInsert = (db as any).insert;

  try {
    (db as any).insert = (table: any) => ({
      values: (val: any) => {
        capturedValues = val;
        return {
          returning: async () => [{ id: 888, ...val, createdAt: new Date().toISOString() }],
        };
      },
    });

    const created = await ProductRepository.createProduct({
      name: "Feijao Carioca 1kg",
      categories: ["Graos"],
      createdByUserId: 77,
    });

    assert.ok(created);
    assert.equal(created.id, 888);
    assert.equal(capturedValues.name, "Feijao Carioca 1kg");
    assert.equal(capturedValues.createdByUserId, 77);
  } finally {
    (db as any).insert = origInsert;
  }
});

test("ProductController - createCustomProduct captures req.user.id and forwards to productService", async () => {
  let capturedServiceData: any = null;
  let capturedServiceUserId: any = null;

  const origServiceCreate = productService.createCustomProduct;
  const origIncrementPoints = UserRepository.incrementPoints;

  try {
    (productService as any).createCustomProduct = async (data: any, userId?: number) => {
      capturedServiceData = data;
      capturedServiceUserId = userId;
      return {
        id: 102,
        barcode: "ID-102",
        name: data.name,
        category: "Limpeza",
        categories: ["Limpeza"],
        ean: null,
        ncm: null,
        icon: null,
        createdAt: new Date().toISOString(),
        lastPrice: "Preço não informado",
      };
    };
    (UserRepository as any).incrementPoints = async () => {};

    const req: any = {
      body: { name: "Detergente Neutro", category: "Limpeza" },
      user: { id: 88, email: "user88@test.com", name: "User 88", roleId: 1 },
    };

    let responseStatus = 0;
    let responseJson: any = null;
    const res: any = {
      status(code: number) {
        responseStatus = code;
        return this;
      },
      json(data: any) {
        responseJson = data;
        return this;
      },
    };
    const next = () => {};

    await productController.createCustomProduct(req, res, next);

    assert.equal(responseStatus, 201);
    assert.equal(capturedServiceUserId, 88);
    assert.equal(capturedServiceData.createdByUserId, 88);
  } finally {
    (productService as any).createCustomProduct = origServiceCreate;
    (UserRepository as any).incrementPoints = origIncrementPoints;
  }
});

test("authMiddleware - requireAuth rejects suspended user with dangerFlag === true", async () => {
  const token = signAccessToken({
    id: 301,
    email: "danger@test.com",
    name: "Suspended User",
    roleId: 1,
  });

  const origIsBlacklisted = AuthRepository.isAccessTokenBlacklisted;
  const origGetUserById = UserRepository.getUserById;

  try {
    (AuthRepository as any).isAccessTokenBlacklisted = async () => false;
    (UserRepository as any).getUserById = async (id: number) => {
      if (id === 301) {
        return {
          id: 301,
          name: "Suspended User",
          email: "danger@test.com",
          dangerFlag: true,
          twoFactorVerified: true,
        };
      }
      return null;
    };

    const req: any = {
      headers: { authorization: `Bearer ${token}` },
    };
    const res: any = {};
    let passedError: any = null;

    await requireAuth(req, res, (err?: any) => {
      passedError = err;
    });

    assert.ok(passedError instanceof ForbiddenError);
    assert.equal(
      passedError.customMessage,
      "Sua conta encontra-se suspensa por violação das diretrizes de segurança.",
    );
  } finally {
    (AuthRepository as any).isAccessTokenBlacklisted = origIsBlacklisted;
    (UserRepository as any).getUserById = origGetUserById;
  }
});

test("authMiddleware - requireAuth permits normal user with dangerFlag === false", async () => {
  const token = signAccessToken({
    id: 302,
    email: "normal@test.com",
    name: "Normal User",
    roleId: 1,
  });

  const origIsBlacklisted = AuthRepository.isAccessTokenBlacklisted;
  const origGetUserById = UserRepository.getUserById;

  try {
    (AuthRepository as any).isAccessTokenBlacklisted = async () => false;
    (UserRepository as any).getUserById = async (id: number) => {
      if (id === 302) {
        return {
          id: 302,
          name: "Normal User",
          email: "normal@test.com",
          dangerFlag: false,
          twoFactorVerified: true,
        };
      }
      return null;
    };

    const req: any = {
      headers: { authorization: `Bearer ${token}` },
    };
    const res: any = {};
    let nextCalled = false;
    let passedError: any = null;

    await requireAuth(req, res, (err?: any) => {
      nextCalled = true;
      passedError = err;
    });

    assert.equal(nextCalled, true);
    assert.equal(passedError, undefined);
    assert.equal(req.user?.id, 302);
  } finally {
    (AuthRepository as any).isAccessTokenBlacklisted = origIsBlacklisted;
    (UserRepository as any).getUserById = origGetUserById;
  }
});

test("authMiddleware - requireTwoFactor rejects suspended user with dangerFlag === true", async () => {
  const token = signAccessToken({
    id: 303,
    email: "danger2fa@test.com",
    name: "Danger 2FA User",
    roleId: 1,
  });

  const origIsBlacklisted = AuthRepository.isAccessTokenBlacklisted;
  const origGetUserById = UserRepository.getUserById;

  try {
    (AuthRepository as any).isAccessTokenBlacklisted = async () => false;
    (UserRepository as any).getUserById = async (id: number) => {
      if (id === 303) {
        return {
          id: 303,
          name: "Danger 2FA User",
          email: "danger2fa@test.com",
          dangerFlag: true,
          twoFactorVerified: true,
        };
      }
      return null;
    };

    const req: any = {
      headers: { authorization: `Bearer ${token}` },
    };
    const res: any = {};
    let passedError: any = null;

    await requireTwoFactor(req, res, (err?: any) => {
      passedError = err;
    });

    assert.ok(passedError instanceof ForbiddenError);
    assert.equal(
      passedError.customMessage,
      "Sua conta encontra-se suspensa por violação das diretrizes de segurança.",
    );
  } finally {
    (AuthRepository as any).isAccessTokenBlacklisted = origIsBlacklisted;
    (UserRepository as any).getUserById = origGetUserById;
  }
});
