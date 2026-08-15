import React, { useState, useEffect } from "react";
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
import {
  createProduct,
  updateProduct,
  fetchProductById,
} from "../services/productService";

export default function CustomRegisterProduct() {
  const params = useLocalSearchParams<{
    id?: string;
    ean?: string;
    name?: string;
    category?: string;
    description?: string;
    icon?: string;
    imageUri?: string;
    mode?: string;
  }>();

  const isEditMode = params.mode === "edit" || !!params.id;
  const productId = params.id ? Number(params.id) : undefined;

  const [ean, setEan] = useState(params.ean || "");
  const [name, setName] = useState(params.name || "");
  const [category, setCategory] = useState(params.category || params.description || "");
  const [icon, setIcon] = useState(params.icon || params.imageUri || "");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);

  const router = useRouter();
  const { themeStyles, accent, isDark } = useTheme();

  useEffect(() => {
    if (isEditMode && productId && !params.name) {
      setInitialLoading(true);
      fetchProductById(productId)
        .then((product) => {
          if (product) {
            setName(product.name || "");
            setEan(product.ean || "");
            setCategory(product.description || "");
            setIcon(product.icon || "");
          }
        })
        .finally(() => setInitialLoading(false));
    }
  }, [isEditMode, productId]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Atenção", "O nome do produto é obrigatório.");
      return;
    }

    setLoading(true);
    try {
      if (isEditMode && productId) {
        const updated = await updateProduct(productId, {
          name: name.trim(),
          ean: ean.trim() || undefined,
          description: category.trim() || undefined,
          icon: icon.trim() || undefined,
        });

        setLoading(false);
        Alert.alert("Sucesso", "Produto atualizado com sucesso!", [
          {
            text: "OK",
            onPress: () => {
              router.replace({
                pathname: "/productDetails",
                params: {
                  id: String(updated.id),
                  name: updated.name,
                  category: updated.description || "Sem Categoria",
                  imageUri: updated.icon || "",
                  barcode: updated.ean || "",
                },
              });
            },
          },
        ]);
      } else {
        const created = await createProduct({
          name: name.trim(),
          ean: ean.trim() || undefined,
          description: category.trim() || undefined,
          icon: icon.trim() || undefined,
        });

        setLoading(false);
        Alert.alert("Sucesso", "Produto cadastrado com sucesso!", [
          {
            text: "Continuar",
            onPress: () => {
              router.replace({
                pathname: "/registerProduct",
                params: {
                  id: String(created.id),
                  barcode: created.ean || "",
                  name: created.name,
                  category: created.description || "Sem Categoria",
                  imageUri: created.icon || "",
                  lastPrice: "Preço não informado",
                },
              });
            },
          },
        ]);
      }
    } catch (error: any) {
      setLoading(false);
      Alert.alert("Erro", error.message || "Não foi possível salvar o produto.");
    }
  };

  if (initialLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, themeStyles.bg]}>
        <ActivityIndicator size="large" color={accent} />
        <Text style={[styles.loadingText, themeStyles.text]}>Carregando dados do produto...</Text>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.container, themeStyles.bg]}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Ionicons
            name={isEditMode ? "create-outline" : "cube-outline"}
            size={80}
            color={accent}
            style={styles.icon}
          />
          <Text style={[styles.title, themeStyles.text]}>
            {isEditMode ? "Editar Produto" : "Novo Produto"}
          </Text>
          <Text style={[styles.subtitle, themeStyles.subText]}>
            {isEditMode
              ? "Modifique os dados abaixo para atualizar o produto."
              : "Preencha os dados para cadastrar este produto na base."}
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, themeStyles.text]}>Código de Barras (EAN)</Text>
            <View style={[styles.inputContainer, themeStyles.inputBg, themeStyles.border]}>
              <TextInput
                style={[styles.input, themeStyles.text]}
                placeholder={isEditMode ? "Código de barras" : "Deixe em branco para automático"}
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
            <Text style={[styles.label, themeStyles.text]}>Categoria / Descrição</Text>
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

          <View style={styles.inputGroup}>
            <Text style={[styles.label, themeStyles.text]}>URL da Imagem (Opcional)</Text>
            <View style={[styles.inputContainer, themeStyles.inputBg, themeStyles.border]}>
              <TextInput
                style={[styles.input, themeStyles.text]}
                placeholder="Ex: https://exemplo.com/imagem.jpg"
                placeholderTextColor={isDark ? "#9CA3AF" : "#666"}
                value={icon}
                onChangeText={setIcon}
                autoCapitalize="none"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: accent }]}
            activeOpacity={0.8}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>
                {isEditMode ? "Salvar Alterações" : "Cadastrar Produto"}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "500",
  },
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
    marginBottom: 28,
  },
  inputGroup: {
    width: "100%",
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: "600",
  },
  inputContainer: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  input: {
    height: 54,
    fontSize: 16,
  },
  button: {
    width: "100%",
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "bold",
  },
});

