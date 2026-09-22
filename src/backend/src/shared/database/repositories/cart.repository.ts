import { eq, and, inArray, sql, desc } from "drizzle-orm";
import { db } from "../database";
import * as schema from "../schema";

const Cart = schema.cart;
const CartProduct = schema.cartProduct;
const Product = schema.product;
const Ocurrency = schema.ocurrency;
const Market = schema.market;

export interface CartItemEntity {
  productId: number;
  productName: string;
  productIcon: string | null;
  productEan: string | null;
  productDescription: string | null;
  quantity: number;
  addedAt: string;
}

export interface ProductMarketPrice {
  productId: number;
  marketId: number;
  marketName: string;
  marketLocation: any;
  productName?: string;
  productIcon?: string | null;
  value: number;
  isPromotion: boolean;
  createdAt: string;
}

class CartRepositoryClass {
  async getOrCreateCart(userId: number): Promise<{ id: number; userId: number }> {
    const existing = await db.select().from(Cart).where(eq(Cart.userId, userId)).limit(1);
    if (existing[0]) {
      return existing[0];
    }
    const created = await db.insert(Cart).values({ userId }).returning();
    return created[0]!;
  }

  async getCartWithItems(userId: number): Promise<{ id: number; items: CartItemEntity[] }> {
    const userCart = await this.getOrCreateCart(userId);

    const rows = await db
      .select({
        productId: CartProduct.productId,
        quantity: CartProduct.quantity,
        addedAt: CartProduct.addedAt,
        name: Product.name,
        icon: Product.icon,
        ean: Product.ean,
        description: Product.description,
      })
      .from(CartProduct)
      .innerJoin(Product, eq(CartProduct.productId, Product.id))
      .where(eq(CartProduct.cartId, userCart.id));

    const items: CartItemEntity[] = rows.map((r) => ({
      productId: r.productId,
      productName: r.name,
      productIcon: r.icon,
      productEan: r.ean,
      productDescription: r.description,
      quantity: r.quantity,
      addedAt: r.addedAt ? new Date(r.addedAt).toISOString() : new Date().toISOString(),
    }));

    return { id: userCart.id, items };
  }

  async addItem(cartId: number, productId: number, quantity: number = 1): Promise<void> {
    const existing = await db
      .select()
      .from(CartProduct)
      .where(and(eq(CartProduct.cartId, cartId), eq(CartProduct.productId, productId)))
      .limit(1);

    if (existing[0]) {
      await db
        .update(CartProduct)
        .set({ quantity: existing[0].quantity + quantity })
        .where(and(eq(CartProduct.cartId, cartId), eq(CartProduct.productId, productId)));
    } else {
      await db.insert(CartProduct).values({
        cartId,
        productId,
        quantity,
      });
    }
  }

  async updateItemQuantity(cartId: number, productId: number, quantity: number): Promise<void> {
    const safeQty = Math.floor(quantity);
    if (safeQty <= 0) {
      await this.removeItem(cartId, productId);
      return;
    }

    await db
      .update(CartProduct)
      .set({ quantity: safeQty })
      .where(and(eq(CartProduct.cartId, cartId), eq(CartProduct.productId, productId)));
  }

  async removeItem(cartId: number, productId: number): Promise<void> {
    await db
      .delete(CartProduct)
      .where(and(eq(CartProduct.cartId, cartId), eq(CartProduct.productId, productId)));
  }

  async clearCart(cartId: number): Promise<void> {
    await db.delete(CartProduct).where(eq(CartProduct.cartId, cartId));
  }

  /**
   * Fetches active, valid prices for a list of products across candidate markets.
   */
  async getPricesForProductsAcrossMarkets(
    productIds: number[],
    marketIds?: number[]
  ): Promise<ProductMarketPrice[]> {
    if (productIds.length === 0) return [];

    const conditions = [
      inArray(Ocurrency.productId, productIds),
      eq(Ocurrency.isSuspended, false),
    ];

    if (marketIds && marketIds.length > 0) {
      conditions.push(inArray(Ocurrency.marketId, marketIds));
    }

    const rows = await db
      .select({
        productId: Ocurrency.productId,
        marketId: Ocurrency.marketId,
        marketName: Market.name,
        productName: Product.name,
        productIcon: Product.icon,
        marketLocation: sql`ST_AsGeoJson(${Market.location})`,
        value: Ocurrency.value,
        isPromotion: Ocurrency.isPromotion,
        createdAt: Ocurrency.createdAt,
      })
      .from(Ocurrency)
      .innerJoin(Market, eq(Ocurrency.marketId, Market.id))
      .innerJoin(Product, eq(Ocurrency.productId, Product.id))
      .where(and(...conditions))
      .orderBy(desc(Ocurrency.createdAt));

    // Keep the most recent price per (productId, marketId)
    const priceMap = new Map<string, ProductMarketPrice>();
    for (const r of rows) {
      const key = `${r.productId}_${r.marketId}`;
      if (!priceMap.has(key)) {
        priceMap.set(key, {
          productId: r.productId,
          marketId: r.marketId,
          marketName: r.marketName,
          productName: r.productName,
          productIcon: r.productIcon,
          marketLocation: typeof r.marketLocation === "string" ? JSON.parse(r.marketLocation) : r.marketLocation,
          value: Number(r.value),
          isPromotion: Boolean(r.isPromotion),
          createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
        });
      }
    }

    return Array.from(priceMap.values());
  }
}

export const CartRepository = new CartRepositoryClass();
