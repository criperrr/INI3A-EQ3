import React, { useState, memo, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme";
import { useI18n } from "../content/i18nContext";
import {
  PREDEFINED_PRODUCT_CATEGORIES,
  ProductCategoryItem,
  findCategoryDefinition,
  getLocalizedCategoryName,
} from "../constants/productCategories";

interface CategorySelectorProps {
  selectedCategory: string;
  onSelectCategory: (categoryName: string) => void;
  label?: string;
  showCustomOption?: boolean;
}

const CategorySelector = memo(function CategorySelector({
  selectedCategory,
  onSelectCategory,
  label,
  showCustomOption = true,
}: CategorySelectorProps) {
  const { themeStyles, accent, isDark, tokens } = useTheme();
  const { semantic } = tokens;
  const { t } = useI18n();

  const [isCustomMode, setIsCustomMode] = useState<boolean>(() => {
    if (!selectedCategory) return false;
    const found = findCategoryDefinition(selectedCategory);
    return !found && selectedCategory.trim().length > 0;
  });
  const [customText, setCustomText] = useState<string>(() => {
    const found = findCategoryDefinition(selectedCategory);
    return found ? "" : selectedCategory || "";
  });

  const matchedPreset = useMemo(() => {
    return findCategoryDefinition(selectedCategory);
  }, [selectedCategory]);

  const handleSelectPreset = useCallback(
    (item: ProductCategoryItem) => {
      setIsCustomMode(false);
      onSelectCategory(item.name);
    },
    [onSelectCategory]
  );

  const handleToggleCustom = useCallback(() => {
    setIsCustomMode(true);
    if (customText.trim()) {
      onSelectCategory(customText.trim());
    }
  }, [customText, onSelectCategory]);

  const handleCustomTextChange = useCallback(
    (text: string) => {
      setCustomText(text);
      onSelectCategory(text.trim());
    },
    [onSelectCategory]
  );

  return (
    <View style={styles.container}>
      {label && (
        <View style={styles.labelRow}>
          <Ionicons name="pricetag-outline" size={14} color={accent} style={styles.labelIcon} />
          <Text style={[styles.label, themeStyles.text]} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}

      {/* Preset Categories Horizontal / Wrapped Chips */}
      <View style={styles.chipsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScroll}
        >
          {PREDEFINED_PRODUCT_CATEGORIES.map((item) => {
            const isSelected = !isCustomMode && matchedPreset?.id === item.id;
            const localizedName = t(`productCategories.${item.i18nKey}` as any) || item.name;

            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.7}
                onPress={() => handleSelectPreset(item)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected
                      ? accent + "1A"
                      : isDark
                      ? "#1A2234"
                      : "#EBF1E6",
                    borderColor: isSelected ? accent : isDark ? "#2D3748" : "#D4DCC8",
                  },
                ]}
              >
                <Text style={styles.chipEmoji}>{item.emoji}</Text>
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: isSelected
                        ? accent
                        : isDark
                        ? "#E2E8F0"
                        : "#2D3748",
                      fontWeight: isSelected ? "700" : "500",
                    },
                  ]}
                  numberOfLines={1}
                >
                  {localizedName}
                </Text>
                {isSelected && (
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color={accent}
                    style={styles.checkIcon}
                  />
                )}
              </TouchableOpacity>
            );
          })}

          {showCustomOption && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleToggleCustom}
              style={[
                styles.chip,
                styles.customChip,
                {
                  backgroundColor: isCustomMode
                    ? accent + "1A"
                    : isDark
                    ? "#1E293B"
                    : "#F1F5F9",
                  borderColor: isCustomMode ? accent : isDark ? "#334155" : "#CBD5E1",
                },
              ]}
            >
              <Ionicons
                name="create-outline"
                size={14}
                color={isCustomMode ? accent : isDark ? "#94A3B8" : "#64748B"}
                style={styles.customIcon}
              />
              <Text
                style={[
                  styles.chipText,
                  {
                    color: isCustomMode
                      ? accent
                      : isDark
                      ? "#94A3B8"
                      : "#64748B",
                    fontWeight: isCustomMode ? "700" : "500",
                  },
                ]}
                numberOfLines={1}
              >
                {t("productCategories.customCategory")}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Input for custom category when in custom mode */}
      {isCustomMode && (
        <View style={styles.customInputWrapper}>
          <Text style={[styles.customInputLabel, themeStyles.subText]}>
            {t("productCategories.customCategory")}:
          </Text>
          <View
            style={[
              styles.inputContainer,
              themeStyles.inputBg,
              { borderColor: accent },
            ]}
          >
            <Ionicons
              name="pricetags-outline"
              size={18}
              color={accent}
              style={styles.inputLeadingIcon}
            />
            <TextInput
              style={[styles.input, themeStyles.text]}
              placeholder={t("productCategories.customCategoryPlaceholder")}
              placeholderTextColor={isDark ? "#9CA3AF" : "#666"}
              value={customText}
              onChangeText={handleCustomTextChange}
              autoCapitalize="words"
              maxLength={50}
            />
            {customText.length > 0 && (
              <TouchableOpacity
                onPress={() => handleCustomTextChange("")}
                style={styles.clearBtn}
              >
                <Ionicons
                  name="close-circle"
                  size={16}
                  color={isDark ? "#94A3B8" : "#64748B"}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
});

export default CategorySelector;

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginVertical: 4,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  labelIcon: {
    marginRight: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
  },
  chipsContainer: {
    marginBottom: 8,
  },
  horizontalScroll: {
    paddingVertical: 4,
    gap: 8,
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  customChip: {
    borderStyle: "dashed",
  },
  chipEmoji: {
    fontSize: 15,
    marginRight: 6,
  },
  chipText: {
    fontSize: 12,
  },
  checkIcon: {
    marginLeft: 5,
  },
  customIcon: {
    marginRight: 5,
  },
  customInputWrapper: {
    marginTop: 6,
  },
  customInputLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    height: 46,
  },
  inputLeadingIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    height: "100%",
  },
  clearBtn: {
    padding: 4,
  },
});
