import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  FlatList,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ProductCard from "../components/productCard";
import { useTheme } from "../content/themeContent";
import { getMarkets, type Market } from "../services/marketService";
import { createEntry } from "../services/entryService";
import { createProduct } from "../services/productService";

const COLORS = {
  vibrantBlue: "#0062CC",
  white: "#FFFFFF",
};

export default function RegisterProduct() {
  const params = useLocalSearchParams();
  const id = params.id ? Number(params.id) : undefined;
  const name = (params.name as string) || "";
  const imageUri = (params.imageUri as string) || "https://via.placeholder.com/150";
  const barcode = (params.barcode as string) || "";

  const [price, setPrice] = useState("");
  const [productName, setProductName] = useState(name);
  const [productDescription, setProductDescription] = useState("");
  const [productTags, setProductTags] = useState("");
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [showMarketModal, setShowMarketModal] = useState(false);

  const router = useRouter();
  const { themeStyles, isDark } = useTheme();

  useEffect(() => {
    async function loadMarkets() {
      try {
        const data = await getMarkets({ lat: -23.55052, lng: -46.633308 });
        setMarkets(data);
        if (data.length > 0) {
          setSelectedMarket(data[0]);
        }
      } catch {
        // Ignore errors
      }
    }
    loadMarkets();
  }, []);

  const handleRegister = async () => {
    if (!id && (!productName || !productName.trim())) {
      Alert.alert("Nome Inválido", "Por favor, digite o nome do produto.");
      return;
    }
    if (!price || isNaN(Number(price.replace(",", ".")))) {
      Alert.alert("Preço Inválido", "Por favor, insira um preço numérico válido.");
      return;
    }
    if (!selectedMarket) {
      Alert.alert("Mercado Requerido", "Por favor, selecione um mercado.");
      return;
    }

    try {
      let finalProductId = id;

      // 1. If product doesn't exist, create it first
      if (!finalProductId) {
        const newProduct = await createProduct({
          name: productName.trim(),
          ean: barcode || undefined,
          description: productDescription.trim() || undefined,
          tags: productTags.trim() || undefined,
        });
        finalProductId = newProduct.id;
      }

      // 2. Register price occurrence
      const numericPrice = Number(price.replace(",", "."));
      await createEntry({
        productId: finalProductId,
        marketId: selectedMarket.id,
        value: numericPrice,
      });

      Alert.alert("Sucesso!", "Preço e ocorrência cadastrados com sucesso.", [
        {
          text: "Ver Produto",
          onPress: () => {
            router.push({
              pathname: "/productDetails",
              params: { id: finalProductId },
            });
          },
        },
      ]);
    } catch (err: any) {
      Alert.alert("Erro ao Cadastrar", err.message || "Erro desconhecido.");
    }
  };

  return (
    <View style={[styles.container, themeStyles.bg]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.cardWrapper}>
          <ProductCard
            category={id ? "Produto Identificado" : "Novo Produto"}
            name={id ? name : productName || "Novo Produto"}
            imageUri={id ? imageUri : "https://via.placeholder.com/150"}
          >
            <View style={styles.formContainer}>
              {!id && (
                <>
                  <Text style={[styles.inputLabel, themeStyles.subText]}>
                    Nome do Produto:
                  </Text>
                  <TextInput
                    style={[styles.input, themeStyles.inputBg, themeStyles.text]}
                    placeholder="Ex: Sabonete Dove 90g"
                    placeholderTextColor={isDark ? "#9CA3AF" : "#666"}
                    value={productName}
                    onChangeText={setProductName}
                  />

                  <Text style={[styles.inputLabel, themeStyles.subText]}>
                    Descrição:
                  </Text>
                  <TextInput
                    style={[styles.input, themeStyles.inputBg, themeStyles.text]}
                    placeholder="Ex: Barra de limpeza suave"
                    placeholderTextColor={isDark ? "#9CA3AF" : "#666"}
                    value={productDescription}
                    onChangeText={setProductDescription}
                  />

                  <Text style={[styles.inputLabel, themeStyles.subText]}>
                    Tags (separadas por vírgula):
                  </Text>
                  <TextInput
                    style={[styles.input, themeStyles.inputBg, themeStyles.text]}
                    placeholder="Ex: sabonete, dove, higiene"
                    placeholderTextColor={isDark ? "#9CA3AF" : "#666"}
                    value={productTags}
                    onChangeText={setProductTags}
                  />
                </>
              )}

              <Text style={[styles.inputLabel, themeStyles.subText]}>
                Preço Encontrado:
              </Text>
              <TextInput
                style={[styles.input, themeStyles.inputBg, themeStyles.text]}
                placeholder="R$ 00,00"
                placeholderTextColor={isDark ? "#9CA3AF" : "#666"}
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
              />

              <Text style={[styles.inputLabel, themeStyles.subText]}>
                Local Encontrado:
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.pickerContainer, themeStyles.inputBg]}
                onPress={() => setShowMarketModal(true)}
              >
                <Text style={[styles.pickerText, themeStyles.text]}>
                  {selectedMarket ? selectedMarket.name : "Selecionar mercado..."}
                </Text>
                <Ionicons
                  name="caret-down"
                  size={16}
                  color={isDark ? "#FFFFFF" : "#333"}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.registerButton,
                  isDark ? themeStyles.inputBg : { backgroundColor: "#FFFFFF" },
                ]}
                activeOpacity={0.8}
                onPress={handleRegister}
              >
                <Text style={[styles.registerButtonText, themeStyles.text]}>
                  Cadastrar
                </Text>
              </TouchableOpacity>
            </View>
          </ProductCard>
        </View>
      </ScrollView>

      {/* Market Selector Modal */}
      <Modal visible={showMarketModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, themeStyles.card, themeStyles.border]}>
            <Text style={[styles.modalTitle, themeStyles.text]}>Selecione o Mercado</Text>
            <FlatList
              data={markets}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.marketOption, themeStyles.border]}
                  onPress={() => {
                    setSelectedMarket(item);
                    setShowMarketModal(false);
                  }}
                >
                  <Text style={[styles.marketOptionText, themeStyles.text]}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowMarketModal(false)}
            >
              <Text style={styles.closeModalButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingTop: 10,
    paddingBottom: 100,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  cardWrapper: { width: "100%", alignItems: "center" },
  formContainer: { width: "100%", marginBottom: 20 },
  inputLabel: { fontSize: 14, marginBottom: 6 },
  input: {
    borderRadius: 20,
    height: 45,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  pickerContainer: {
    borderRadius: 20,
    height: 45,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerText: { fontSize: 16 },
  buttonContainer: { alignItems: "center", width: "100%", marginTop: 8 },
  registerButton: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  registerButtonText: { fontSize: 16, fontWeight: "600" },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxHeight: "80%",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  marketOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  marketOptionText: {
    fontSize: 16,
  },
  closeModalButton: {
    marginTop: 16,
    backgroundColor: COLORS.vibrantBlue,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: "center",
  },
  closeModalButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
