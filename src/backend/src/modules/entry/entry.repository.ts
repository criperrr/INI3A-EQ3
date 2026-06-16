import type { CreateUserDTO } from "@/shared/types/database";
import { db } from "@/shared/database/database";
import * as schema from "@/shared/database/schema";
import { eq } from "drizzle-orm";

const User = schema.user;

const publicUserFields = {
  id: User.id,
  name: User.name,
  email: User.email,
  roleId: User.roleId,
};

export async function createUser(user: CreateUserDTO) {
  return db.insert(User).values(user).returning(publicUserFields);
}

export async function getUser(id: string | number) {
  return db
    .select(publicUserFields)
    .from(User)
    .where(eq(User.id, Number(id)));
}

export async function getUserByEmail(email: string) {
  return db
    .select({
      ...publicUserFields,
      passHash: User.passHash,
      dangerFlag: User.dangerFlag,
    })
    .from(User)
    .where(eq(User.email, email));
}

export async function createOcurrency(data: {
  userId: number;
  marketId: number;
  productId: number;
  value: string;
}) {
  const result = await db.insert(schema.ocurrency).values(data).returning();
  return result[0];
}
