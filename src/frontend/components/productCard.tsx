import React, { ReactNode, memo } from "react";
import { StyleSheet, View, Text } from "react-native";
import { Image } from "expo-image";
import { useTheme } from "../theme";
import { useI18n } from "../content/i18nContext";
import { getCategoryEmoji, getLocalizedCategoryName } from "../constants/productCategories";

interface ProductCardProps {
  name: string;
  category?: string;
  imageUri?: string;
  children?: ReactNode;
}

const ProductCard = memo(function ProductCard({
  name,
  category,
  imageUri,
  children,
}: ProductCardProps) {
  const { tokens } = useTheme();
  const { semantic } = tokens;

  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: semantic.colors.surface.card,
          borderColor: semantic.colors.border.default,
          borderRadius: semantic.radius.card,
          padding: semantic.spacing.cardPadding,
          ...semantic.elevation.card,
        },
      ]}
    >
      <ProductImage imageUri={imageUri} />

      <ProductInfo name={name} category={category} />

      {/* Divisor semântico */}
      <View
        style={[
          styles.divider,
          {
            backgroundColor: semantic.colors.border.divider,
            marginBottom: semantic.spacing.itemGap,
          },
        ]}
      />

      <View style={styles.actionContainer}>{children}</View>
    </View>
  );
});

export default ProductCard;

// --- Componentes Internos Memoizados ---
const ProductImage = memo(function ProductImage({
  imageUri,
}: {
  imageUri?: string;
}) {
  const { t } = useI18n();
  const { tokens } = useTheme();
  const { semantic } = tokens;

  return (
    <View
      style={[
        styles.imageContainer,
        {
          backgroundColor: semantic.colors.surface.input,
          borderRadius: semantic.radius.image,
          marginBottom: semantic.spacing.itemGap,
        },
      ]}
    >
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={styles.productImage}
          contentFit="contain"
          cachePolicy="memory-disk"
          transition={150}
        />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text
            style={[
              styles.placeholderText,
              {
                color: semantic.colors.text.secondary,
                ...semantic.typography.bodyMedium,
              },
            ]}
          >
            {t("common.noImage")}
          </Text>
        </View>
      )}
    </View>
  );
});

const ProductInfo = memo(function ProductInfo({
  name,
  category,
}: {
  name: string;
  category?: string;
}) {
  const { tokens } = useTheme();
  const { semantic } = tokens;
  const { t } = useI18n();

  return (
    <View
      style={[
        styles.infoContainer,
        { marginBottom: semantic.spacing.itemGap },
      ]}
    >
      {category && (
        <Text
          style={[
            styles.productCategory,
            {
              color: semantic.colors.text.secondary,
              ...semantic.typography.badge,
            },
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {getCategoryEmoji(category)} {getLocalizedCategoryName(category, t).toUpperCase()}
        </Text>
      )}
      <Text
        style={[
          styles.productName,
          {
            color: semantic.colors.text.primary,
            ...semantic.typography.productTitle,
          },
        ]}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {name}
      </Text>
    </View>
  );
});

// --- Estilos Estruturais ---
const styles = StyleSheet.create({
  cardContainer: {
    width: "100%",
    borderWidth: 1,
  },
  imageContainer: {
    width: "100%",
    aspectRatio: 1.4,
    overflow: "hidden",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {},
  infoContainer: {
    alignItems: "center",
    paddingHorizontal: 8,
  },
  productCategory: {
    marginBottom: 4,
  },
  productName: {
    textAlign: "center",
  },
  divider: {
    height: 1,
    width: "100%",
  },
  actionContainer: {
    width: "100%",
  },
});
