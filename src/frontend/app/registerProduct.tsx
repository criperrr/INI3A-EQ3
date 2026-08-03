import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ProductCard from "../components/productCard";
import { useTheme } from "../content/themeContent";

const MOCK_PRODUCT = {
  category: "Produto Encontrado",
  name: "Filé de Salmão fresco com pele Bandeja 300g",
  imageUri:
    "https://img.freepik.com/fotos-premium/file-de-salmao-cru-fresco-no-fundo-branco-isolado_89814-118.jpg",
  lastPrice: "R$ 29,90 / R$ 99,67 Kg",
};

interface RegisterFormProps {
  price: string;
  onChangePrice: (text: string) => void;
  onRegister: () => void;
}

export default function RegisterProduct() {
  const [price, setPrice] = useState("");
  const router = useRouter();
  const { themeStyles } = useTheme();

  const handleRegister = () => {
    router.push("/productDetails");
  };

  return (
    <View style={[styles.container, themeStyles.bg]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardWrapper}>
          <ProductCard
            category={MOCK_PRODUCT.category}
            name={MOCK_PRODUCT.name}
            imageUri={MOCK_PRODUCT.imageUri}
          >
            <PriceDetails lastPrice={MOCK_PRODUCT.lastPrice} />
            <RegisterForm
              price={price}
              onChangePrice={setPrice}
              onRegister={handleRegister}
            />
          </ProductCard>
        </View>
      </ScrollView>
    </View>
  );
}

// --- Componentes Internos ---

const PriceDetails = ({ lastPrice }: { lastPrice: string }) => {
  const { themeStyles } = useTheme();
  return (
    <View style={styles.detailsContainer}>
      <Text style={[styles.priceLabel, themeStyles.subText]}>
        Último Preço:
      </Text>
      <Text style={[styles.priceValue, themeStyles.text]}>{lastPrice}</Text>
    </View>
  );
};

const RegisterForm = ({
  price,
  onChangePrice,
  onRegister,
}: RegisterFormProps) => {
  const { themeStyles, isDark } = useTheme();
  return (
    <>
      <View style={styles.formContainer}>
        <Text style={[styles.inputLabel, themeStyles.subText]}>
          Preço Encontrado:
        </Text>
        <TextInput
          style={[styles.input, themeStyles.inputBg, themeStyles.text]}
          placeholder="R$ 00,00"
          placeholderTextColor={isDark ? "#9CA3AF" : "#666"}
          keyboardType="numeric"
          value={price}
          onChangeText={onChangePrice}
        />

        <Text style={[styles.inputLabel, themeStyles.subText]}>
          Local Encontrado:
        </Text>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.pickerContainer, themeStyles.inputBg]}
        >
          <Text style={[styles.pickerText, themeStyles.text]}>
            Confiança Max
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
          onPress={onRegister}
        >
          <Text style={[styles.registerButtonText, themeStyles.text]}>
            Cadastrar
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
};

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
  detailsContainer: {
    alignItems: "flex-start",
    marginBottom: 16,
    width: "100%",
  },
  priceLabel: { fontSize: 14, marginBottom: 2 },
  priceValue: { fontSize: 16, fontWeight: "bold" },
  formContainer: { width: "100%", marginBottom: 24 },
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
});
