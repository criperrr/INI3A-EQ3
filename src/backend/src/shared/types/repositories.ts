import type { InferSelectModel } from "drizzle-orm";
import * as schema from "@/shared/database/schema";
import type { AtLeastOne } from "../helpers/types.helpers";

export type User = InferSelectModel<typeof schema.user>;
export type CreateUser = Pick<User, "passHash" | "name" | "email">;
export type UpdateUser = AtLeastOne<
  Omit<
    User,
    "roleId" | "createdAt" | "dangerFlag" | "updatedAt" | "points" | "id"
  >
>;




