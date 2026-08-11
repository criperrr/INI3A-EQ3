import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Dimensions,
  ActivityIndicator
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../content/themeContent";
import { fetchProductByEan, ProductData } from "../services/productService";

const MOCK_PRODUCT = {
  category: "Produto Encontrado",
  name: "Filé de Salmão fresco com pele Bandeja 300g",
  imageUri:
    "https://img.freepik.com/fotos-premium/file-de-salmao-cru-fresco-no-fundo-branco-isolado_89814-118.jpg",
  lastPrice: "R$ 29,90 / R$ 99,67 Kg",
};

export default function RegisterProduct() {
  const [price, setPrice] = useState("");
  const [product, setProduct] = useState<ProductData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams<{
    ean?: string;
    barcode?: string;
    name?: string;
    category?: string;
    imageUri?: string;
    lastPrice?: string;
  }>();
  const { themeStyles, accent, isDark } = useTheme();

  const targetEan = params.ean || params.barcode;

  useEffect(() => {
    const hasValidParams = params.name && params.name !== "Produto Não Encontrado" && params.name !== "Nome indisponível" && params.name !== "Novo Produto";

    if (targetEan && !hasValidParams) {
      setIsLoading(true);
      fetchProductByEan(targetEan)
        .then((data) => {
          if (data) {
            setProduct(data);
          }
        })
        .finally(() => setIsLoading(false));
    }
  }, [targetEan, params.name]);

  const handleRegister = () => {
    router.push("/productDetails");
  };

  const scannedProduct = params.name ? {
    name: params.name,
    category: params.category || "Sem Categoria",
    imageUri: params.imageUri || "https://via.placeholder.com/150",
    lastPrice: params.lastPrice || "Preço não informado",
  } : null;

  const displayProduct = product || scannedProduct || MOCK_PRODUCT;

  return (
    <View style={[styles.container, themeStyles.bg]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Product Hero Section */}
        {isLoading ? (
          <View style={[styles.heroCard, themeStyles.card, themeStyles.border, styles.loadingCard]}>
            <ActivityIndicator size="large" color={accent} />
            <Text style={[styles.loadingText, themeStyles.text]}>Buscando informações do produto...</Text>
          </View>
        ) : (
          <View style={[styles.heroCard, themeStyles.card, themeStyles.border]}>
            <Image
              source={{ uri: displayProduct.imageUri || MOCK_PRODUCT.imageUri }}
              style={styles.heroImage}
              resizeMode="cover"
            />
            <View style={styles.heroContent}>
              <View style={[styles.categoryBadge, { backgroundColor: accent }]}>
                <Text style={styles.categoryText}>{displayProduct.category.toUpperCase()}</Text>
              </View>
              <Text style={[styles.productTitle, themeStyles.text]}>{displayProduct.name}</Text>
              
              <View style={[styles.lastPriceContainer, themeStyles.inputBg]}>
                <Ionicons name="pricetag-outline" size={16} color={isDark ? "#A0A0A0" : "#5A6B52"} />
                <Text style={[styles.lastPriceText, themeStyles.subText]}>Último preço: </Text>
                <Text style={[styles.lastPriceValue, themeStyles.text]}>{displayProduct.lastPrice || MOCK_PRODUCT.lastPrice}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Register Form Section */}
        <View style={styles.formSection}>
          <Text style={[styles.sectionTitle, themeStyles.text]}>Atualizar Preço</Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, themeStyles.subText]}>Preço Encontrado (R$)</Text>
            <View style={[styles.inputWrapper, themeStyles.inputBg, themeStyles.border]}>
              <Ionicons name="cash-outline" size={20} color={accent} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, themeStyles.text]}
                placeholder="00,00"
                placeholderTextColor={isDark ? "#9CA3AF" : "#666"}
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, themeStyles.subText]}>Local Encontrado</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.pickerWrapper, themeStyles.inputBg, themeStyles.border]}
            >
              <View style={styles.pickerLeft}>
                <Ionicons name="location-outline" size={20} color={accent} style={styles.inputIcon} />
                <Text style={[styles.pickerText, themeStyles.text]}>Confiança Max</Text>
              </View>
              <Ionicons name="chevron-down" size={20} color={isDark ? "#A0A0A0" : "#5A6B52"} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.registerButton, { backgroundColor: accent }]}
            activeOpacity={0.8}
            onPress={handleRegister}
          >
            <Ionicons name="checkmark-circle-outline" size={24} color="#FFF" style={styles.buttonIcon} />
            <Text style={styles.registerButtonText}>Cadastrar Novo Preço</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingTop: 16,
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  heroCard: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  heroImage: {
    width: "100%",
    height: 180,
  },
  heroContent: {
    padding: 20,
    alignItems: "center",
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
    marginTop: -32,
    borderWidth: 2,
    borderColor: "#FFF",
  },
  categoryText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FFF",
    letterSpacing: 1,
  },
  productTitle: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 28,
  },
  lastPriceContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    width: "100%",
    justifyContent: "center",
  },
  lastPriceText: {
    fontSize: 13,
    marginLeft: 6,
  },
  lastPriceValue: {
    fontSize: 14,
    fontWeight: "bold",
  },
  formSection: {
    width: "100%",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    marginLeft: 4,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    height: 54,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    height: "100%",
  },
  pickerWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    borderWidth: 1,
    height: 54,
    paddingHorizontal: 16,
  },
  pickerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  pickerText: {
    fontSize: 16,
    fontWeight: "500",
  },
  registerButton: {
    flexDirection: "row",
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonIcon: {
    marginRight: 8,
  },
  registerButtonText: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#FFF",
  },
  loadingCard: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 300,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
});
