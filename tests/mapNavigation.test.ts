import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGoogleMapsQueryText,
  buildGoogleMapsUrl,
  buildGoogleMapsRouteUrl,
  formatAddressParts,
  formatCartShareMessage,
} from "../src/frontend/utils/mapQueryBuilder";

test("mapQueryBuilder - formatAddressParts filters falsy and joins with comma", () => {
  const result = formatAddressParts(["Rua Rio Branco, 20", undefined, "Bauru", null, "SP"]);
  assert.equal(result, "Rua Rio Branco, 20, Bauru, SP");
});

test("mapQueryBuilder - buildGoogleMapsQueryText with marketName and address combines them for place search", () => {
  const query = buildGoogleMapsQueryText({
    marketName: "Supermercado Tauste",
    address: "Rua Rio Branco, 20-40, Bauru, SP",
  });
  assert.equal(query, "Supermercado Tauste, Rua Rio Branco, 20-40, Bauru, SP");
});

test("mapQueryBuilder - buildGoogleMapsQueryText with only address returns nominal address", () => {
  const query = buildGoogleMapsQueryText({
    address: "Av. Paulista, 1000, São Paulo, SP",
  });
  assert.equal(query, "Av. Paulista, 1000, São Paulo, SP");
});

test("mapQueryBuilder - buildGoogleMapsQueryText with only marketName returns marketName", () => {
  const query = buildGoogleMapsQueryText({
    marketName: "Pão de Açúcar",
  });
  assert.equal(query, "Pão de Açúcar");
});

test("mapQueryBuilder - buildGoogleMapsQueryText falls back to coordinates when no address/name exists", () => {
  const query = buildGoogleMapsQueryText({
    coordinate: { latitude: -22.3145, longitude: -49.0587 },
  });
  assert.equal(query, "-22.3145,-49.0587");
});

test("mapQueryBuilder - buildGoogleMapsUrl generates place search url without dropped pin", () => {
  const url = buildGoogleMapsUrl({
    marketName: "Supermercado Confiança",
    address: "Av. Getúlio Vargas, Bauru, SP",
    mode: "search",
  });
  assert.ok(url.startsWith("https://www.google.com/maps/search/?api=1&query="));
  assert.ok(url.includes("Supermercado%20Confian%C3%A7a"));
  assert.ok(!url.includes("destination="));
});

test("mapQueryBuilder - buildGoogleMapsUrl generates directions url with nominal query when mode is directions", () => {
  const url = buildGoogleMapsUrl({
    marketName: "Supermercado Confiança",
    address: "Av. Getúlio Vargas, Bauru, SP",
    mode: "directions",
  });
  assert.ok(url.startsWith("https://www.google.com/maps/dir/?api=1&destination="));
  assert.ok(url.includes("Supermercado%20Confian%C3%A7a"));
});

test("mapQueryBuilder - buildGoogleMapsRouteUrl generates multi-stop url with escaped waypoints using %7C", () => {
  const url = buildGoogleMapsRouteUrl({
    origin: { latitude: -22.3145, longitude: -49.0587 },
    destination: "Supermercado Tauste, Av. Tiradentes, Bauru, SP",
    waypoints: [
      "Supermercado Confiança, Av. Getúlio Vargas, Bauru, SP",
      "Pão de Açúcar, Rua Gustavo Maciel, Bauru, SP",
    ],
    travelmode: "driving",
  });

  assert.ok(url.startsWith("https://www.google.com/maps/dir/?api=1"));
  assert.ok(url.includes("origin=-22.3145%2C-49.0587"));
  assert.ok(url.includes("destination=Supermercado%20Tauste%2C%20Av.%20Tiradentes%2C%20Bauru%2C%20SP"));
  // Must NOT contain literal unencoded pipe character
  assert.ok(!url.includes("|"), "URL should not contain unencoded pipe characters");
  // Must contain %7C as waypoints separator
  assert.ok(url.includes("%7C"), "URL should encode waypoints separator as %7C");
  assert.ok(url.includes("travelmode=driving"));
});

test("mapQueryBuilder - buildGoogleMapsRouteUrl works with single destination without waypoints", () => {
  const url = buildGoogleMapsRouteUrl({
    origin: "-22.3145,-49.0587",
    destination: "Supermercado Tauste, Bauru, SP",
  });

  assert.ok(url.startsWith("https://www.google.com/maps/dir/?api=1"));
  assert.ok(!url.includes("waypoints="));
  assert.ok(url.includes("destination="));
});

test("mapQueryBuilder - buildGoogleMapsRouteUrl generates round-trip route starting and ending at user location", () => {
  const userCoords = "-22.3145,-49.0587";
  const url = buildGoogleMapsRouteUrl({
    origin: userCoords,
    destination: userCoords,
    waypoints: [
      "Supermercado Tauste, Av. Tiradentes, Bauru, SP",
      "Supermercado Confiança, Av. Getúlio Vargas, Bauru, SP",
    ],
    travelmode: "driving",
  });

  assert.ok(url.startsWith("https://www.google.com/maps/dir/?api=1"));
  assert.ok(url.includes("origin=-22.3145%2C-49.0587"));
  assert.ok(url.includes("destination=-22.3145%2C-49.0587"));
  assert.ok(url.includes("waypoints=Supermercado%20Tauste%2C%20Av.%20Tiradentes%2C%20Bauru%2C%20SP%7CSupermercado%20Confian%C3%A7a%2C%20Av.%20Get%C3%BAlio%20Vargas%2C%20Bauru%2C%20SP"));
  assert.ok(!url.includes("|"));
});

test("mapQueryBuilder - buildGoogleMapsRouteUrl omits origin so Google Maps uses device 'Sua localização'", () => {
  const url = buildGoogleMapsRouteUrl({
    destination: "Rua Rio Branco, 20-40, Bauru, SP",
    waypoints: [
      "Supermercado Tauste, Av. Tiradentes, Bauru, SP",
      "Supermercado Confiança, Av. Getúlio Vargas, Bauru, SP",
    ],
    travelmode: "driving",
  });

  assert.ok(url.startsWith("https://www.google.com/maps/dir/?api=1"));
  assert.ok(!url.includes("origin="));
  assert.ok(url.includes("destination=Rua%20Rio%20Branco%2C%2020-40%2C%20Bauru%2C%20SP"));
  assert.ok(url.includes("waypoints="));
  assert.ok(!url.includes("|"));
});

test("mapQueryBuilder - formatCartShareMessage excludes 'otimizada' and fuel costs, includes products total and route link", () => {
  const dummyRoute = "https://www.google.com/maps/dir/?api=1&destination=Tauste&travelmode=driving";
  const message = formatCartShareMessage({
    storeGroups: [
      {
        marketName: "Supermercado Tauste",
        items: [
          { quantity: 2, productName: "Leite Integral 1L", unitPrice: 4.5, subtotal: 9.0 },
          { quantity: 1, productName: "Café Torrado 500g", unitPrice: 18.0, subtotal: 18.0 },
        ],
        subtotalItems: 27.0,
      },
      {
        marketName: "Supermercado Confiança",
        items: [
          { quantity: 3, productName: "Arroz Tipo 1 5kg", unitPrice: 25.0, subtotal: 75.0 },
        ],
        subtotalItems: 75.0,
      },
    ],
    netSavings: 15.5,
    returnAddress: "Rua Rio Branco, 20-40, Centro, Bauru - SP",
    routeUrl: dummyRoute,
  });

  // Must have standard title without 'Otimizada'
  assert.ok(message.includes("🛒 *Minha Lista de Compras (Presco)*"));
  assert.ok(!message.toLowerCase().includes("otimizad"), "Message should not mention otimizada");

  // Must NOT have fuel costs or distance
  assert.ok(!message.toLowerCase().includes("combust"), "Message should not mention combustivel");
  assert.ok(!message.toLowerCase().includes(" km"), "Message should not mention distance in km");

  // Must include stores and items
  assert.ok(message.includes("Supermercado Tauste"));
  assert.ok(message.includes("Supermercado Confiança"));
  assert.ok(message.includes("2x Leite Integral 1L"));
  assert.ok(message.includes("*Total dos Produtos:* R$ 102,00"));
  assert.ok(message.includes("*Economia:* R$ 15,50"));

  // Must include precise return location
  assert.ok(message.includes("🏁 *Local de Retorno:* Rua Rio Branco, 20-40, Centro, Bauru - SP"));

  // Must include the route link
  assert.ok(message.includes("📍 *Trajeto no Google Maps:*"));
  assert.ok(message.includes(dummyRoute));
});

test("mapQueryBuilder - formatCartShareMessage handles empty savings and no routeUrl gracefully", () => {
  const message = formatCartShareMessage({
    storeGroups: [
      {
        marketName: "Padaria Central",
        items: [
          { quantity: 10, productName: "Pão Francês", unitPrice: 0.8, subtotal: 8.0 },
        ],
        subtotalItems: 8.0,
      },
    ],
    netSavings: 0,
    returnAddress: null,
    routeUrl: null,
  });

  assert.ok(message.includes("🛒 *Minha Lista de Compras (Presco)*"));
  assert.ok(!message.toLowerCase().includes("otimizad"));
  assert.ok(!message.toLowerCase().includes("combust"));
  assert.ok(!message.includes("Economia:"));
  assert.ok(!message.includes("Local de Retorno:"));
  assert.ok(!message.includes("Trajeto no Google Maps:"));
  assert.ok(message.includes("*Total dos Produtos:* R$ 8,00"));
});

