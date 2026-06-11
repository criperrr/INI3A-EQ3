import React, { useState, useEffect } from "react";
import { View, StyleSheet, Text, ScrollView, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import ProductCard from "../components/productCard";
import { useTheme } from "../content/themeContent";
import { getProduct, type ProductDetailResponse, type Offer } from "../services/productService";

const COLORS = {
  vibrantBlue: "#0062CC",
  chartGreen: "#3E6B42",
};

export default function ProductDetails() {
  const { themeStyles, isDark } = useTheme();
  const params = useLocalSearchParams();
  const id = Number(params.id);

  const [product, setProduct] = useState<ProductDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDetails() {
      if (!id || isNaN(id)) {
        setError("Produto inválido ou ID ausente.");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        // Fetch product details with Bauru coordinates as default center
        const data = await getProduct(id, -23.55052, -46.633308);
        setProduct(data);
      } catch (err: any) {
        setError(err.message || "Erro ao carregar os detalhes do produto.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchDetails();
  }, [id]);

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, themeStyles.bg]}>
        <ActivityIndicator size="large" color={COLORS.vibrantBlue} />
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={[styles.centerContainer, themeStyles.bg]}>
        <Text style={[styles.errorText, themeStyles.text]}>{error || "Produto não encontrado."}</Text>
      </View>
    );
  }

  const bestPrice =
    product.offers.length > 0
      ? `R$ ${Number(product.offers[0].price).toFixed(2).replace(".", ",")}`
      : "Nenhum preço registrado";

  return (
    <View style={[styles.container, themeStyles.bg]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardWrapper}>
          <ProductCard
            category="Produto"
            name={product.name}
            imageUri={product.icon || undefined}
          >
            <PriceDetails
              lastPrice={bestPrice}
              description={product.description || "Sem descrição disponível."}
              themeStyles={themeStyles}
            />
            <OffersList offers={product.offers} />
          </ProductCard>
        </View>
      </ScrollView>
    </View>
  );
}

// --- Componentes Internos ---

const PriceDetails = ({
  lastPrice,
  description,
  themeStyles,
}: {
  lastPrice: string;
  description: string;
  themeStyles: any;
}) => (
  <View style={styles.detailsContainer}>
    <Text style={[styles.priceLabel, themeStyles.subText]}>Melhor Preço Local:</Text>
    <Text style={[styles.priceValue, themeStyles.text]}>{lastPrice}</Text>
    <Text style={[styles.priceSubValue, themeStyles.subText]}>{description}</Text>
  </View>
);

const OffersList = ({ offers }: { offers: Offer[] }) => {
  const { themeStyles } = useTheme();

  const formatDistance = (dist: number | null) => {
    if (dist == null) return "";
    if (dist >= 1000) {
      return `${(dist / 1000).toFixed(1).replace(".", ",")} km`;
    }
    return `${Math.round(dist)} m`;
  };

  const formatPrice = (price: string) => {
    return `R$ ${Number(price).toFixed(2).replace(".", ",")}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
  };

  if (offers.length === 0) {
    return (
      <View style={styles.noOffersContainer}>
        <Text style={[styles.noOffersText, themeStyles.subText]}>
          Nenhuma oferta registrada próxima a você ainda.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.offersSection}>
      <Text style={[styles.sectionTitle, themeStyles.text]}>
        Comparativo de Ofertas Locais:
      </Text>
      {offers.map((offer) => (
        <View key={offer.ocurrency_id} style={[styles.offerRow, themeStyles.border]}>
          <View style={styles.offerMarketInfo}>
            <Text style={[styles.offerMarketName, themeStyles.text]} numberOfLines={1}>
              {offer.market_name}
            </Text>
            <Text style={[styles.offerMarketDistance, themeStyles.subText]}>
              {offer.distance_m != null ? `${formatDistance(offer.distance_m)} • ` : ""}
              Atualizado em {formatDate(offer.created_at)}
            </Text>
          </View>
          <Text style={[styles.offerPrice, { color: COLORS.vibrantBlue }]}>
            {formatPrice(offer.price)}
          </Text>
        </View>
      ))}
    </View>
  );
};

// --- Estilos ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
  content: {
    flexGrow: 1,
    paddingTop: 10,
    paddingBottom: 100,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  cardWrapper: {
    width: "100%",
    alignItems: "center",
  },
  detailsContainer: {
    alignItems: "center",
    marginBottom: 20,
    width: "100%",
  },
  priceLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 22,
    fontWeight: "bold",
  },
  priceSubValue: {
    fontSize: 14,
    fontWeight: "400",
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 10,
  },
  offersSection: {
    width: "100%",
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  noOffersContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  noOffersText: {
    fontSize: 14,
    textAlign: "center",
  },
  offerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  offerMarketInfo: {
    flex: 1,
    marginRight: 12,
  },
  offerMarketName: {
    fontSize: 14,
    fontWeight: "600",
  },
  offerMarketDistance: {
    fontSize: 11,
    marginTop: 2,
  },
  offerPrice: {
    fontSize: 15,
    fontWeight: "bold",
  },
});
