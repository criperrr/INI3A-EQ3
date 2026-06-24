import type {
  AtLeastOne,
  CreateUserDTO,
  UpdateUserDTO,
} from "@/shared/types/database";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { SelectedFieldsFlat } from "drizzle-orm/pg-core";
import { NotFound } from "@/shared/errors/errors";
import { db } from "../database";
import * as schema from "@/shared/database/schema";
import type { SelectResultField } from "drizzle-orm/query-builders/select.types";

const User = schema.user;

const defaultUserFields = {
  id: User.id,
  name: User.name,
  email: User.email,
  roleId: User.roleId,
};

class UserRepositoryClass {
  constructor(private db: NodePgDatabase<typeof schema>) {}

  async createUser<T extends SelectedFieldsFlat = typeof defaultUserFields>(
    user: CreateUserDTO,
    returning: T = defaultUserFields as unknown as T,
  ) {
    type Row = { [K in keyof T]: SelectResultField<T[K], true> };
    const result = await this.db.insert(User).values(user).returning(returning) as unknown as Row[];
    return result[0];
  }

  async getUser(id: string | number) {
    return this.db.query.user.findFirst({
      where: (user, { eq }) => eq(user.id, Number(id)),
    });
  }

  async updateUser(id: string | number, user: AtLeastOne<UpdateUserDTO>) {
    return this.db
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

  async deleteUser(id: string | number) {
    return (await this.db.delete(User).where(eq(User.id, Number(id)))).rowCount;
  }
}

export const UserRepository = new UserRepositoryClass(db);
