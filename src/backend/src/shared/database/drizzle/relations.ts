import { relations } from "drizzle-orm/relations";
import { role, user, ocurrency, market, product, cart, roleScope, scope, userBadge, badge, cartProduct, cured } from "./schema";

export const userRelations = relations(user, ({one, many}) => ({
	role: one(role, {
		fields: [user.roleId],
		references: [role.id]
	}),
	ocurrencies: many(ocurrency),
	carts: many(cart),
	userBadges: many(userBadge),
	cureds: many(cured),
}));

export const roleRelations = relations(role, ({many}) => ({
	users: many(user),
	roleScopes: many(roleScope),
}));

export const ocurrencyRelations = relations(ocurrency, ({one, many}) => ({
	user: one(user, {
		fields: [ocurrency.userId],
		references: [user.id]
	}),
	market: one(market, {
		fields: [ocurrency.marketId],
		references: [market.id]
	}),
	product: one(product, {
		fields: [ocurrency.productId],
		references: [product.id]
	}),
	cureds: many(cured),
}));

export const marketRelations = relations(market, ({many}) => ({
	ocurrencies: many(ocurrency),
}));

export const productRelations = relations(product, ({many}) => ({
	ocurrencies: many(ocurrency),
	cartProducts: many(cartProduct),
}));

export const cartRelations = relations(cart, ({one, many}) => ({
	user: one(user, {
		fields: [cart.userId],
		references: [user.id]
	}),
	cartProducts: many(cartProduct),
}));

export const roleScopeRelations = relations(roleScope, ({one}) => ({
	role: one(role, {
		fields: [roleScope.roleId],
		references: [role.id]
	}),
	scope: one(scope, {
		fields: [roleScope.scopeId],
		references: [scope.id]
	}),
}));

export const scopeRelations = relations(scope, ({many}) => ({
	roleScopes: many(roleScope),
}));

export const userBadgeRelations = relations(userBadge, ({one}) => ({
	user: one(user, {
		fields: [userBadge.userId],
		references: [user.id]
	}),
	badge: one(badge, {
		fields: [userBadge.badgeId],
		references: [badge.id]
	}),
}));

export const badgeRelations = relations(badge, ({many}) => ({
	userBadges: many(userBadge),
}));

export const cartProductRelations = relations(cartProduct, ({one}) => ({
	cart: one(cart, {
		fields: [cartProduct.cartId],
		references: [cart.id]
	}),
	product: one(product, {
		fields: [cartProduct.productId],
		references: [product.id]
	}),
}));

export const curedRelations = relations(cured, ({one}) => ({
	user: one(user, {
		fields: [cured.userId],
		references: [user.id]
	}),
	ocurrency: one(ocurrency, {
		fields: [cured.ocurrencyId],
		references: [ocurrency.id]
	}),
}));