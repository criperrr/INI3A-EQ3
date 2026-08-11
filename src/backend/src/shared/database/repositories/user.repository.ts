import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { db } from "../database";
import * as schema from "../schema";

import * as Repository from "@/shared/types/repositories";

const User = schema.user;

class UserRepositoryClass {
  constructor(private db: NodePgDatabase<typeof schema>) {}

  async createUser(user: Repository.CreateUser) {
    return this.db.insert(User).values(user).returning({
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

  async deleteUser(id: string | number) {
    return (await this.db.delete(User).where(eq(User.id, Number(id)))).rowCount;
  }
}

export const UserRepository = new UserRepositoryClass(db);
