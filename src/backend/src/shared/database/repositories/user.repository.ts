import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { db } from "../database";
import * as schema from "../schema";

import * as Repository from "@/shared/types/repositories";

const User = schema.user;

class UserRepositoryClass {
  constructor(private db: NodePgDatabase<typeof schema>) {}

  async createUser(user: Repository.CreateUser) {
    return this.db
      .insert(User)
      .values({
        ...user,
        roleId: user.roleId ?? 1,
        points: user.points ?? 0,
        equippedBannerId: user.equippedBannerId ?? 1,
        equippedAvatarFrameId: user.equippedAvatarFrameId ?? 10,
        equippedLevelFrameId: user.equippedLevelFrameId ?? 20,
      })
      .returning({
        id: User.id,
        name: User.name,
        email: User.email,
        roleId: User.roleId,
        createdAt: User.createdAt,
      });
  }

  async getUserById(id: string | number) {
    return this.db.query.user.findFirst({
      where: (user, { eq }) => eq(user.id, Number(id)),
    });
  }

  async getUserByEmail(email: string) {
    return this.db.query.user.findFirst({
      where: (user, { eq }) => eq(user.email, email),
    });
  }

  async updateUser(id: string | number, newUser: Repository.UpdateUser) {
    return this.db
      .update(User)
      .set(newUser)
      .returning({
        id: User.id,
        name: User.name,
        email: User.email,
        roleId: User.roleId,
        updatedAt: User.updatedAt,
      })
      .where(eq(User.id, Number(id)));
  }

  async incrementPoints(id: string | number, amount: number) {
    const userObj = await this.getUserById(id);
    if (!userObj) return null;

    const newPoints = Math.max(0, (userObj.points || 0) + amount);
    const [updated] = await this.db
      .update(User)
      .set({ points: newPoints })
      .returning({ id: User.id, points: User.points, roleId: User.roleId })
      .where(eq(User.id, Number(id)));

    // Check if new badges should be awarded automatically based on points
    const eligibleBadges = await this.db.query.badge.findMany();
    for (const b of eligibleBadges) {
      if (newPoints >= b.minPoints) {
        await this.awardBadge(id, b.id).catch(() => {});
      }
    }

    return updated;
  }

  async getUserWithRole(id: string | number) {
    const found = await this.db
      .select({
        id: User.id,
        name: User.name,
        email: User.email,
        points: User.points,
        roleId: User.roleId,
        dangerFlag: User.dangerFlag,
        birthdate: User.birthdate,
        equippedBannerId: User.equippedBannerId,
        equippedAvatarFrameId: User.equippedAvatarFrameId,
        equippedLevelFrameId: User.equippedLevelFrameId,
        createdAt: User.createdAt,
        updatedAt: User.updatedAt,
        roleName: schema.role.name,
        authority: schema.role.authority,
        minPoints: schema.role.minPoints,
      })
      .from(User)
      .leftJoin(schema.role, eq(User.roleId, schema.role.id))
      .where(eq(User.id, Number(id)));

    return found[0] || null;
  }

  async getUserBadges(userId: string | number) {
    return this.db
      .select({
        id: schema.badge.id,
        name: schema.badge.name,
        icon: schema.badge.icon,
        description: schema.badge.description,
        minPoints: schema.badge.minPoints,
        awardedAt: schema.userBadge.awardedAt,
      })
      .from(schema.userBadge)
      .innerJoin(schema.badge, eq(schema.userBadge.badgeId, schema.badge.id))
      .where(eq(schema.userBadge.userId, Number(userId)));
  }

  async getAllBadges() {
    return this.db.query.badge.findMany({
      orderBy: (table, { asc }) => [asc(table.minPoints), asc(table.id)],
    });
  }

  async awardBadge(userId: string | number, badgeId: number) {
    return this.db
      .insert(schema.userBadge)
      .values({
        userId: Number(userId),
        badgeId,
      })
      .onConflictDoNothing();
  }

  async getUserRank(userId: string | number) {
    const userObj = await this.getUserById(userId);
    if (!userObj) return 1;

    const allUsers = await this.db
      .select({ id: User.id, points: User.points })
      .from(User)
      .orderBy(User.points);

    // Sort descending by points
    allUsers.sort((a, b) => b.points - a.points);
    const rankIndex = allUsers.findIndex((u) => u.id === Number(userId));
    return rankIndex >= 0 ? rankIndex + 1 : 1;
  }

  async deleteUser(id: string | number) {
    return (await this.db.delete(User).where(eq(User.id, Number(id)))).rowCount;
  }
}

export const UserRepository = new UserRepositoryClass(db);

