import { db } from "../../shared/database/database";
import * as schema from "../../shared/database/schema";
import { eq, sql } from "drizzle-orm";

const User = schema.user;

export async function createUser(user: CreateUserDTO) {
  return db.insert(User).values(user).returning({
    id: User.id,
    name: User.name,
    email: User.email,
    roleId: User.roleId,
  });
}

export async function getUser(id: string | number) {
  const schemaDispatcher = {
    id: User.id,
    name: User.name,
    email: User.email,
    roleId: User.roleId,
  };

  return db
    .select(schemaDispatcher)
    .from(User)
    .where(eq(User.id, Number(id)));
}
