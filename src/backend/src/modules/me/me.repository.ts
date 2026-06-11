import { db } from "@/shared/database/database";
import * as schema from "@/shared/database/schema";
import type { AtLeastOne, UpdateUserDTO } from "@/shared/types/database";
import { eq, sql } from "drizzle-orm";

const User = schema.user;

export async function updateUser(id: string | number, user: AtLeastOne<UpdateUserDTO>) {
  return db
    .update(User)
    .set(user)
    .returning({
      id: User.id,
      name: User.name,
      email: User.email,
      roleId: User.roleId,
      updatedAt: User.updatedAt,
    })
    .where(eq(User.id, Number(id)));
}

export async function deleteUser(id: string | number) {
  return (await db.delete(User).where(eq(User.id, Number(id)))).rowCount;
}

//sem credenciais
export async function getUser(id: string | number) {
  return db
    .select({
      id: User.id,
      name: User.name,
      email: User.name,
      birthdate: User.birthdate,
      location: sql`ST_AsGeoJson(${User.location})`,
    })
    .from(User)
    .where(eq(User.id, Number(id)));
}

//com credenciais
export async function getUserCredentials(id: string | number) {
  return db
    .select({
      id: User.id,
      name: User.name,
      email: User.email,
      birthdate: User.birthdate,
      location: User.location,
      passHash: User.passHash,
      roleId: User.roleId,
    })
    .from(User)
    .where(eq(User.id, Number(id)));
}
