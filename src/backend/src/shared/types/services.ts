import type { InferSelectModel } from "drizzle-orm";
import * as schema from "@/shared/database/schema";
import type { AtLeastOne } from "../helpers/types.helpers";

export type User = Omit<InferSelectModel<typeof schema.user>, "passHash"> & {
  password: string;
};

export type CreateUser = Pick<User, "name" | "email" | "password">;
export type UpdateUser = AtLeastOne<
  Omit<
    User,
    "roleId" | "createdAt" | "dangerFlag" | "updatedAt" | "points" | "id"
  >
>;
// ele tem password e nao tem passHash
