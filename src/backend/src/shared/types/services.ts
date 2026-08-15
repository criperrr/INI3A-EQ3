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

export type Product = InferSelectModel<typeof schema.product>;
export type CreateProduct = {
  name: string;
  ean?: string | null | undefined;
  ncm?: string | null | undefined;
  description?: string | null | undefined;
  icon?: string | null | undefined;
};
export type UpdateProduct = {
  name?: string | undefined;
  ean?: string | null | undefined;
  ncm?: string | null | undefined;
  description?: string | null | undefined;
  icon?: string | null | undefined;
};
export type ProductFilter = {
  search?: string | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
};


