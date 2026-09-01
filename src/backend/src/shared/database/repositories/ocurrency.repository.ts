import { eq, and, desc, sql, gte } from "drizzle-orm";
import { db } from "../database";
import * as schema from "../schema";

const Ocurrency = schema.ocurrency;
const Cured = schema.cured;
const Market = schema.market;
const User = schema.user;
const Product = schema.product;

export interface CreateOccurrenceDTO {
  userId: number;
  marketId: number;
  productId: number;
  value: string | number;
  icon?: string | undefined;
  createdAt?: string | Date | undefined;
}

export interface UpdateOccurrenceDTO {
  value?: string | number | undefined;
  marketId?: number | undefined;
  isSuspended?: boolean | undefined;
  isResolved?: boolean | undefined;
  trustFlag?: boolean | undefined;
}


class OcurrencyRepositoryClass {
  async create(data: CreateOccurrenceDTO) {
    const formattedValue = typeof data.value === "number" ? data.value.toFixed(2) : String(data.value);

    return db
      .insert(Ocurrency)
      .values({
        userId: data.userId,
        marketId: data.marketId,
        productId: data.productId,
        value: formattedValue,
        icon: data.icon,
        ...(data.createdAt ? { createdAt: new Date(data.createdAt).toISOString() } : {}),
      })
      .returning();
  }

  async findById(id: number) {
    const result = await db
      .select({
        id: Ocurrency.id,
        userId: Ocurrency.userId,
        userName: User.name,
        marketId: Ocurrency.marketId,
        marketName: Market.name,
        productId: Ocurrency.productId,
        productName: Product.name,
        value: Ocurrency.value,
        trustFlag: Ocurrency.trustFlag,
        isSuspended: Ocurrency.isSuspended,
        isResolved: Ocurrency.isResolved,
        upvoteCount: Ocurrency.upvoteCount,
        downvoteCount: Ocurrency.downvoteCount,
        createdAt: Ocurrency.createdAt,
      })
      .from(Ocurrency)
      .leftJoin(User, eq(Ocurrency.userId, User.id))
      .leftJoin(Market, eq(Ocurrency.marketId, Market.id))
      .leftJoin(Product, eq(Ocurrency.productId, Product.id))
      .where(eq(Ocurrency.id, id));

    return result[0] || null;
  }

  async findByProduct(productId: number, currentUserId?: number) {
    if (currentUserId) {
      return db
        .select({
          id: Ocurrency.id,
          userId: Ocurrency.userId,
          userName: User.name,
          marketId: Ocurrency.marketId,
          marketName: Market.name,
          productId: Ocurrency.productId,
          value: Ocurrency.value,
          trustFlag: Ocurrency.trustFlag,
          isSuspended: Ocurrency.isSuspended,
          isResolved: Ocurrency.isResolved,
          upvoteCount: Ocurrency.upvoteCount,
          downvoteCount: Ocurrency.downvoteCount,
          createdAt: Ocurrency.createdAt,
          userVote: Cured.verdict,
        })
        .from(Ocurrency)
        .leftJoin(User, eq(Ocurrency.userId, User.id))
        .leftJoin(Market, eq(Ocurrency.marketId, Market.id))
        .leftJoin(Cured, and(eq(Cured.ocurrencyId, Ocurrency.id), eq(Cured.userId, currentUserId)))
        .where(and(eq(Ocurrency.productId, productId), eq(Ocurrency.isSuspended, false)))
        .orderBy(desc(Ocurrency.createdAt));
    }

    return db
      .select({
        id: Ocurrency.id,
        userId: Ocurrency.userId,
        userName: User.name,
        marketId: Ocurrency.marketId,
        marketName: Market.name,
        productId: Ocurrency.productId,
        value: Ocurrency.value,
        trustFlag: Ocurrency.trustFlag,
        isSuspended: Ocurrency.isSuspended,
        isResolved: Ocurrency.isResolved,
        upvoteCount: Ocurrency.upvoteCount,
        downvoteCount: Ocurrency.downvoteCount,
        createdAt: Ocurrency.createdAt,
        userVote: sql<boolean | null>`NULL`,
      })
      .from(Ocurrency)
      .leftJoin(User, eq(Ocurrency.userId, User.id))
      .leftJoin(Market, eq(Ocurrency.marketId, Market.id))
      .where(and(eq(Ocurrency.productId, productId), eq(Ocurrency.isSuspended, false)))
      .orderBy(desc(Ocurrency.createdAt));
  }

  async findByUser(userId: number, limit = 20) {
    return db
      .select({
        id: Ocurrency.id,
        productId: Ocurrency.productId,
        productName: Product.name,
        productIcon: Product.icon,
        marketId: Ocurrency.marketId,
        marketName: Market.name,
        value: Ocurrency.value,
        createdAt: Ocurrency.createdAt,
      })
      .from(Ocurrency)
      .leftJoin(Product, eq(Ocurrency.productId, Product.id))
      .leftJoin(Market, eq(Ocurrency.marketId, Market.id))
      .where(eq(Ocurrency.userId, userId))
      .orderBy(desc(Ocurrency.createdAt))
      .limit(limit);
  }

  async countByUser(userId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(Ocurrency)
      .where(eq(Ocurrency.userId, userId));

    return result[0]?.count || 0;
  }

  async update(id: number, data: UpdateOccurrenceDTO) {
    const updatePayload: Record<string, any> = {};
    if (data.value !== undefined) updatePayload.value = String(data.value);
    if (data.marketId !== undefined) updatePayload.marketId = data.marketId;
    if (data.isSuspended !== undefined) updatePayload.isSuspended = data.isSuspended;
    if (data.isResolved !== undefined) updatePayload.isResolved = data.isResolved;
    if (data.trustFlag !== undefined) updatePayload.trustFlag = data.trustFlag;

    return db
      .update(Ocurrency)
      .set(updatePayload)
      .where(eq(Ocurrency.id, id))
      .returning();
  }

  async delete(id: number): Promise<number> {
    const result = await db.delete(Ocurrency).where(eq(Ocurrency.id, id));
    return result.rowCount ?? 0;
  }

  async vote(userId: number, ocurrencyId: number, verdict: boolean) {
    // Check if user already voted
    const existingVote = await db.query.cured.findFirst({
      where: (table, { and, eq }) => and(eq(table.userId, userId), eq(table.ocurrencyId, ocurrencyId)),
    });

    if (existingVote) {
      if (existingVote.verdict === verdict) {
        // Vote already same -> Remove / toggle off vote
        await db
          .delete(Cured)
          .where(and(eq(Cured.userId, userId), eq(Cured.ocurrencyId, ocurrencyId)));

        if (verdict) {
          await db
            .update(Ocurrency)
            .set({
              upvoteCount: sql`GREATEST(${Ocurrency.upvoteCount} - 1, 0)`,
            })
            .where(eq(Ocurrency.id, ocurrencyId));
        } else {
          await db
            .update(Ocurrency)
            .set({
              downvoteCount: sql`GREATEST(${Ocurrency.downvoteCount} - 1, 0)`,
            })
            .where(eq(Ocurrency.id, ocurrencyId));
        }
        return { changed: true, isNewVote: false, removed: true, verdict: null };
      }

      // Update vote (flip verdict)
      await db
        .update(Cured)
        .set({ verdict, date: new Date().toISOString() })
        .where(and(eq(Cured.userId, userId), eq(Cured.ocurrencyId, ocurrencyId)));

      if (verdict) {
        await db
          .update(Ocurrency)
          .set({
            upvoteCount: sql`${Ocurrency.upvoteCount} + 1`,
            downvoteCount: sql`GREATEST(${Ocurrency.downvoteCount} - 1, 0)`,
          })
          .where(eq(Ocurrency.id, ocurrencyId));
      } else {
        await db
          .update(Ocurrency)
          .set({
            downvoteCount: sql`${Ocurrency.downvoteCount} + 1`,
            upvoteCount: sql`GREATEST(${Ocurrency.upvoteCount} - 1, 0)`,
          })
          .where(eq(Ocurrency.id, ocurrencyId));
      }
      return { changed: true, isNewVote: false, removed: false, verdict };
    }

    // Insert new vote
    await db.insert(Cured).values({
      userId,
      ocurrencyId,
      verdict,
    });

    if (verdict) {
      await db
        .update(Ocurrency)
        .set({ upvoteCount: sql`${Ocurrency.upvoteCount} + 1` })
        .where(eq(Ocurrency.id, ocurrencyId));
    } else {
      await db
        .update(Ocurrency)
        .set({ downvoteCount: sql`${Ocurrency.downvoteCount} + 1` })
        .where(eq(Ocurrency.id, ocurrencyId));
    }

    return { changed: true, isNewVote: true, verdict };
  }

  /**
   * Generates weekly contribution array for heatmap/profile (e.g. 18 weeks x 4 slots or 7 days)
   */
  async getUserContributionGrid(userId: number): Promise<number[][]> {
    const occurrences = await db
      .select({ createdAt: Ocurrency.createdAt })
      .from(Ocurrency)
      .where(eq(Ocurrency.userId, userId));

    // Group dates into an 18-week grid (each week has 4 blocks or days)
    const grid: number[][] = Array.from({ length: 18 }, () => [0, 0, 0, 0]);

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    for (const occ of occurrences) {
      const occDate = new Date(occ.createdAt).getTime();
      const diffDays = Math.floor((now - occDate) / dayMs);
      if (diffDays >= 0 && diffDays < 18 * 4) {
        const weekIndex = 17 - Math.floor(diffDays / 4);
        const dayIndex = 3 - (diffDays % 4);
        if (grid[weekIndex] && grid[weekIndex][dayIndex] !== undefined) {
          grid[weekIndex][dayIndex] = Math.min(grid[weekIndex][dayIndex] + 1, 3);
        }
      }
    }

    return grid;
  }

  async findRecentByUserAndProduct(userId: number, productId: number, windowMs = 5 * 60 * 1000) {
    const threshold = new Date(Date.now() - windowMs).toISOString();

    const [recent] = await db
      .select({
        id: Ocurrency.id,
        createdAt: Ocurrency.createdAt,
      })
      .from(Ocurrency)
      .where(
        and(
          eq(Ocurrency.userId, userId),
          eq(Ocurrency.productId, productId),
          gte(Ocurrency.createdAt, threshold),
        ),
      )
      .orderBy(desc(Ocurrency.createdAt))
      .limit(1);

    return recent || null;
  }
}

export const OcurrencyRepository = new OcurrencyRepositoryClass();

