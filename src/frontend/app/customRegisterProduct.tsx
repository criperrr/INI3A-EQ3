import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../content/themeContent";
import { createCustomProduct } from "../services/productService";

export default function CustomRegisterProduct() {
  const params = useLocalSearchParams<{ ean?: string }>();
  const [ean, setEan] = useState(params.ean || "");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { themeStyles, accent, isDark } = useTheme();

  const handleRegister = async () => {
    if (!name.trim()) {
      Alert.alert("Atenção", "O nome do produto é obrigatório.");
      return;
    }

    setLoading(true);
    try {
      const created = await createCustomProduct({
        name: name.trim(),
        category: category.trim() || undefined,
        ean: ean.trim() || undefined,
      });

      setLoading(false);

      Alert.alert("Sucesso", "Produto cadastrado com sucesso!", [
        {
          text: "Continuar",
          onPress: () => {
            router.replace({
              pathname: "/registerProduct",
              params: {
                barcode: created.barcode || ean.trim(),
                name: created.name,
                category: created.category,
                imageUri: created.imageUri,
                lastPrice: created.lastPrice,
              },
            });
          },
        },
      ]);

    } catch (error: any) {
      setLoading(false);
      Alert.alert("Erro", error.message || "Não foi possível cadastrar o produto.");
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.container, themeStyles.bg]}>
        <ScrollView 
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
        <Ionicons name="cube-outline" size={80} color={accent} style={styles.icon} />
        <Text style={[styles.title, themeStyles.text]}>Novo Produto</Text>
        <Text style={[styles.subtitle, themeStyles.subText]}>
          Preencha os dados para cadastrar este produto na base.
        </Text>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, themeStyles.text]}>Código de Barras (Opcional)</Text>
          <View style={[styles.inputContainer, themeStyles.inputBg, themeStyles.border]}>
            <TextInput
              style={[styles.input, themeStyles.text]}
              placeholder="Deixe em branco para gerar um automático"
              placeholderTextColor={isDark ? "#9CA3AF" : "#666"}
              keyboardType="numeric"
              value={ean}
              onChangeText={setEan}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, themeStyles.text]}>Nome do Produto *</Text>
          <View style={[styles.inputContainer, themeStyles.inputBg, themeStyles.border]}>
            <TextInput
              style={[styles.input, themeStyles.text]}
              placeholder="Ex: Arroz Branco 5kg"
              placeholderTextColor={isDark ? "#9CA3AF" : "#666"}
              value={name}
              onChangeText={setName}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, themeStyles.text]}>Categoria</Text>
          <View style={[styles.inputContainer, themeStyles.inputBg, themeStyles.border]}>
            <TextInput
              style={[styles.input, themeStyles.text]}
              placeholder="Ex: Alimentos Básicos"
              placeholderTextColor={isDark ? "#9CA3AF" : "#666"}
              value={category}
              onChangeText={setCategory}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: accent }]}
          activeOpacity={0.8}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>Cadastrar Produto</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 40,
  },
  icon: { marginBottom: 16 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
  },
  inputGroup: {
    width: "100%",
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: "600",
  },
  inputContainer: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  input: {
    height: 56,
    fontSize: 16,
  },
  button: {
    width: "100%",
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
});
