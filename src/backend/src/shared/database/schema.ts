import {
  pgTable,
  check,
  integer,
  varchar,
  unique,
  serial,
  index,
  foreignKey,
  text,
  boolean,
  timestamp,
  numeric,
  primaryKey,
  pgView,
  pgEnum,
  date,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { customType } from "drizzle-orm/pg-core";
import type { Point } from "../types/database";

export const recoveryMessageStatus = pgEnum("recovery_message_status", [
  "Satisfatório",
  "Insatisfatório",
  "Não Compareceu",
  "Não aconteceu",
]);
export const statusRec = pgEnum("status_rec", ["SAT", "INS", "NC", "NAC"]);

// !REFACTOR ****************************

// Criei um tipo custom que permite a comunicação com o POSTGIS e burla o dizzle
// Em geral isso pode funcionar MAS:

//	MUITAS querys terão que utilizar .raw, o que, sendo um problema, não é tão grande dado que provavelmente existe uma grande integração no
//Query Builder não sendo necessário criar uma query GIGANTE.

export const geography = customType<{ data: Point; driverData: string }>({
  dataType() {
    return "geography";
  },
  toDriver(point: Point): string {
    return `SRID=4326;POINT(${point.lng} ${point.lat})`;
  },
});

// ****************************

/*

export const spatialRefSys = pgTable(
  "spatial_ref_sys",
  {
    srid: integer().primaryKey().notNull(),
    authName: varchar("auth_name", { length: 256 }),
    authSrid: integer("auth_srid"),
    srtext: varchar({ length: 2048 }),
    proj4text: varchar("proj4text", { length: 2048 }),
  },
  (table) => [
    check("spatial_ref_sys_srid_check", sql`(srid > 0) AND (srid <= 998999)`),
  ],
);

*/

export const role = pgTable(
  "role",
  {
    id: serial().primaryKey().notNull(),
    name: varchar({ length: 80 }).notNull(),
    minPoints: integer("min_points").default(0).notNull(),
    authority: integer().default(0).notNull()
  },
  (table) => [
    unique("role_name_key").on(table.name),
    check("role_min_points_check", sql`min_points >= 0`),
  ],
);

export const scope = pgTable(
  "scope",
  {
    id: serial().primaryKey().notNull(),
    scopeName: varchar("scope_name", { length: 100 }).notNull(),
  },
  (table) => [unique("scope_scope_name_key").on(table.scopeName)],
);

export const user = pgTable(
  "user",
  {
    id: serial().primaryKey().notNull(),
    name: varchar({ length: 100 }).notNull(),
    email: varchar({ length: 255 }).notNull(),
    passHash: varchar("pass_hash", { length: 255 }).notNull(),
    //refreshToken: text("refresh_token"),
    birthdate: date(),
    points: integer().default(0).notNull(),
    dangerFlag: boolean("danger_flag").default(false).notNull(),
    // TODO: failed to parse database type 'geography'
    location: geography("location"),
    roleId: integer("role_id").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_user_location").using(
      "gist",
      table.location.asc().nullsLast().op("gist_geography_ops"),
    ),
    index("idx_user_role_id").using(
      "btree",
      table.roleId.asc().nullsLast().op("int4_ops"),
    ),
    foreignKey({
      columns: [table.roleId],
      foreignColumns: [role.id],
      name: "user_role_id_fkey",
    }),
    unique("user_email_key").on(table.email),
    check("user_points_check", sql`points >= 0`),
  ],
);

export const badge = pgTable(
  "badge",
  {
    id: serial().primaryKey().notNull(),
    name: varchar({ length: 100 }).notNull(),
    icon: text(),
    minPoints: integer("min_points").default(0).notNull(),
  },
  (table) => [
    unique("badge_name_key").on(table.name),
    check("badge_min_points_check", sql`min_points >= 0`),
  ],
);

export const ocurrency = pgTable(
  "ocurrency",
  {
    id: serial().primaryKey().notNull(),
    userId: integer("user_id").notNull(),
    marketId: integer("market_id").notNull(),
    productId: integer("product_id").notNull(),
    value: numeric({ precision: 12, scale: 2 }).notNull(),
    icon: text(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    trustFlag: boolean("trust_flag").default(true).notNull(),
    isSuspended: boolean("is_suspended").default(false).notNull(),
    isResolved: boolean("is_resolved").default(false).notNull(),
    upvoteCount: integer("upvote_count").default(0).notNull(),
    downvoteCount: integer("downvote_count").default(0).notNull(),
    volate: boolean().default(false).notNull(),
  },
  (table) => [
    index("idx_ocurrency_market_id_created_at_desc").using(
      "btree",
      table.marketId.asc().nullsLast(),
      table.createdAt.desc().nullsFirst().op("timestamptz_ops"),
    ),

    index("idx_ocurrency_product_id_created_at_desc").using(
      "btree",
      table.productId.asc().nullsLast(),
      table.createdAt.desc().nullsFirst().op("timestamptz_ops"),
    ),

    index("idx_ocurrency_unresolved_partial")
      .using(
        "btree",
        table.isResolved.asc().nullsLast(),
        table.createdAt.asc().nullsLast().op("timestamptz_ops"),
      )
      .where(sql`is_resolved = false`),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "ocurrency_user_id_fkey",
    }),
    foreignKey({
      columns: [table.marketId],
      foreignColumns: [market.id],
      name: "ocurrency_market_id_fkey",
    }),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [product.id],
      name: "ocurrency_product_id_fkey",
    }),
    check("ocurrency_value_check", sql`value > (0)::numeric`),
    check("ocurrency_upvote_count_check", sql`upvote_count >= 0`),
    check("ocurrency_downvote_count_check", sql`downvote_count >= 0`),
  ],
);

export const market = pgTable(
  "market",
  {
    id: serial().primaryKey().notNull(),
    name: varchar({ length: 200 }).notNull(),
    // TODO: failed to parse database type 'geography'
    location: geography("location").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_market_location").using(
      "gist",
      table.location.asc().nullsLast().op("gist_geography_ops"),
    ),
  ],
);

export const product = pgTable(
  "product",
  {
    id: serial().primaryKey().notNull(),
    ean: text(),
    ncm: varchar({ length: 10 }),
    name: varchar({ length: 200 }).notNull(),
    description: text(),
    icon: text(),
    tags: text(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_product_ean_partial")
      .using("btree", table.ean.asc().nullsLast().op("text_ops"))
      .where(sql`(ean IS NOT NULL)`),
    index("idx_product_name_trgm").using(
      "gin",
      table.name.asc().nullsLast().op("gin_trgm_ops"),
    ),
    index("idx_product_ncm").using(
      "btree",
      table.ncm.asc().nullsLast().op("text_ops"),
    ),
  ],
);

export const cart = pgTable(
  "cart",
  {
    id: serial().primaryKey().notNull(),
    userId: integer("user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "cart_user_id_fkey",
    }).onDelete("cascade"),
  ],
);

export const roleScope = pgTable(
  "role_scope",
  {
    roleId: integer("role_id").notNull(),
    scopeId: integer("scope_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.roleId],
      foreignColumns: [role.id],
      name: "role_scope_role_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.scopeId],
      foreignColumns: [scope.id],
      name: "role_scope_scope_id_fkey",
    }).onDelete("cascade"),
    primaryKey({
      columns: [table.scopeId, table.roleId],
      name: "role_scope_pkey",
    }),
  ],
);

export const userBadge = pgTable(
  "user_badge",
  {
    userId: integer("user_id").notNull(),
    badgeId: integer("badge_id").notNull(),
    awardedAt: timestamp("awarded_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "user_badge_user_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.badgeId],
      foreignColumns: [badge.id],
      name: "user_badge_badge_id_fkey",
    }).onDelete("cascade"),
    primaryKey({
      columns: [table.userId, table.badgeId],
      name: "user_badge_pkey",
    }),
  ],
);

export const cartProduct = pgTable(
  "cart_product",
  {
    cartId: integer("cart_id").notNull(),
    productId: integer("product_id").notNull(),
    addedAt: timestamp("added_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.cartId],
      foreignColumns: [cart.id],
      name: "cart_product_cart_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [product.id],
      name: "cart_product_product_id_fkey",
    }).onDelete("cascade"),
    primaryKey({
      columns: [table.productId, table.cartId],
      name: "cart_product_pkey",
    }),
  ],
);

export const cured = pgTable(
  "cured",
  {
    userId: integer("user_id").notNull(),
    ocurrencyId: integer("ocurrency_id").notNull(),
    verdict: boolean().notNull(),
    date: timestamp({ withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_cured_ocurrency_id_date_asc").using(
      "btree",
      table.ocurrencyId.asc().nullsLast(),
      table.date.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "cured_user_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.ocurrencyId],
      foreignColumns: [ocurrency.id],
      name: "cured_ocurrency_id_fkey",
    }).onDelete("cascade"),
    primaryKey({
      columns: [table.userId, table.ocurrencyId],
      name: "cured_pkey",
    }),
  ],
);
