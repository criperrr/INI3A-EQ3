import { db } from '../../shared/database/database';
import * as schema from '../../shared/database/schema';
import { eq, sql } from "drizzle-orm";
import bcrypt from 'bcrypt';

const User = schema.user;

export async function createUser(user: CreateUserDTO) {
    return db.insert(User)
      .values(user)
      .returning({
        id: User.id,
        name: User.name,
        email: User.email,
        roleId:User.roleId
      });
}

export async function  updateUser(id: string | number, user: UpdateUserDTO | UpdateUserStrictDTO) {
  return db.update(User).set(user).returning({
    id: User.id,
    name: User.name,
    email: User.email,
    roleId: User.roleId
  }).where(eq(User.id, Number(id)));
}

export async function deleteUser(id: string | number) {
  db.delete(User).where(eq(User.id, Number(id)));
}

//sem credenciais
export async function getUser(id: string | number) {
  return db
    .select({
      id: User.id,
      name: User.name,
      email: User.name,
      birthdate: User.birthdate,
      location: sql<string>`ST_AsGeoJSON(${User.location})`,
    })
    .from(User)
    .where(eq(User.id, Number(id)));
}

//com credenciais
export async function getUserCredentials(id: string | number) {
  return db.select({
    id: User.id,
    name: User.name,
    email: User.email,
    birthdate: User.birthdate,
    location: User.location,
    passHash: User.passHash,
    roleId: User.roleId
  }).from(User).where(eq(User.id, Number(id)));
}
