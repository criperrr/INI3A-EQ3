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
  selectedCategory?: string;
  selectedCategories?: string[];
  isMultiSelect?: boolean;
  onSelectCategory?: (categoryName: string) => void;
  onSelectCategories?: (categoryNames: string[]) => void;
  label?: string;
  showCustomOption?: boolean;
}

const CategorySelector = memo(function CategorySelector({
  selectedCategory = "",
  selectedCategories = [],
  isMultiSelect = false,
  onSelectCategory,
  onSelectCategories,
  label,
  showCustomOption = true,
}: CategorySelectorProps) {
  const { themeStyles, accent, isDark, tokens } = useTheme();
  const { semantic } = tokens;
  const { t } = useI18n();

  // Normalize selected list for multi-select
  const currentSelectedList = useMemo(() => {
    if (isMultiSelect) {
      if (selectedCategories && selectedCategories.length > 0) return selectedCategories;
      if (selectedCategory) {
        return selectedCategory.split(",").map((s) => s.trim()).filter(Boolean);
      }
      return [];
    }
    return selectedCategory ? [selectedCategory.trim()] : [];
  }, [isMultiSelect, selectedCategories, selectedCategory]);

  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [customText, setCustomText] = useState<string>("");

  const handleTogglePreset = useCallback(
    (item: ProductCategoryItem) => {
      if (isMultiSelect) {
        const isAlreadySelected = currentSelectedList.some(
          (c) => c.toLowerCase() === item.name.toLowerCase() || c.toLowerCase() === item.id.toLowerCase()
        );
        let updated: string[];
        if (isAlreadySelected) {
          updated = currentSelectedList.filter(
            (c) => c.toLowerCase() !== item.name.toLowerCase() && c.toLowerCase() !== item.id.toLowerCase()
          );
        } else {
          updated = [...currentSelectedList, item.name];
        }

        if (onSelectCategories) {
          onSelectCategories(updated);
        }
        if (onSelectCategory) {
          onSelectCategory(updated.join(", "));
        }
      } else {
        setIsCustomMode(false);
        if (onSelectCategory) {
          onSelectCategory(item.name);
        }
        if (onSelectCategories) {
          onSelectCategories([item.name]);
        }
      }
    },
    [isMultiSelect, currentSelectedList, onSelectCategory, onSelectCategories]
  );

  const handleToggleCustom = useCallback(() => {
    setIsCustomMode((prev) => !prev);
  }, []);

  const handleAddCustomCategory = useCallback(() => {
    const trimmed = customText.trim();
    if (!trimmed) return;

    if (isMultiSelect) {
      if (!currentSelectedList.includes(trimmed)) {
        const updated = [...currentSelectedList, trimmed];
        if (onSelectCategories) onSelectCategories(updated);
        if (onSelectCategory) onSelectCategory(updated.join(", "));
      }
      setCustomText("");
    } else {
      if (onSelectCategory) onSelectCategory(trimmed);
      if (onSelectCategories) onSelectCategories([trimmed]);
    }
  }, [customText, isMultiSelect, currentSelectedList, onSelectCategory, onSelectCategories]);

  const handleRemoveCategory = useCallback(
    (catToRemove: string) => {
      const updated = currentSelectedList.filter(
        (c) => c.toLowerCase() !== catToRemove.toLowerCase()
      );
      if (onSelectCategories) onSelectCategories(updated);
      if (onSelectCategory) onSelectCategory(updated.join(", "));
    },
    [currentSelectedList, onSelectCategories, onSelectCategory]
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.labelRow}>
          <Ionicons name="pricetags-outline" size={15} color={accent} style={styles.labelIcon} />
          <Text style={[styles.label, themeStyles.text]} numberOfLines={1}>
            {label || t("products.selectMultipleCategories")}
          </Text>
        </View>
        {isMultiSelect && currentSelectedList.length > 0 && (
          <View style={[styles.badgeCount, { backgroundColor: accent + "20" }]}>
            <Text style={[styles.badgeCountText, { color: accent }]}>
              {currentSelectedList.length}
            </Text>
          </View>
        )}
      </View>

      {/* Selected tags chip pills (if multi-select) */}
      {isMultiSelect && currentSelectedList.length > 0 && (
        <View style={styles.selectedRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectedScroll}
          >
            {currentSelectedList.map((cat) => {
              const def = findCategoryDefinition(cat);
              const displayName = def ? (t(`productCategories.${def.i18nKey}` as any) || def.name) : cat;
              return (
                <View
                  key={cat}
                  style={[
                    styles.selectedPill,
                    { backgroundColor: accent + "25", borderColor: accent },
                  ]}
                >
                  <Text style={styles.selectedPillEmoji}>{def ? def.emoji : "🏷️"}</Text>
                  <Text style={[styles.selectedPillText, { color: isDark ? "#FFFFFF" : "#1A202C" }]}>
                    {displayName}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveCategory(cat)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.removePillBtn}
                  >
                    <Ionicons name="close-circle" size={14} color={accent} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
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
            const isSelected = currentSelectedList.some(
              (c) => c.toLowerCase() === item.name.toLowerCase() || c.toLowerCase() === item.id.toLowerCase()
            );
            const localizedName = t(`productCategories.${item.i18nKey}` as any) || item.name;

            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.7}
                onPress={() => handleTogglePreset(item)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected
                      ? accent + "20"
                      : isDark
                      ? "#1A2234"
                      : "#EBF1E6",
                    borderColor: isSelected ? accent : isDark ? "#2D3748" : "#D4DCC8",
                    borderWidth: isSelected ? 1.5 : 1,
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
                name={isCustomMode ? "close-outline" : "add-outline"}
                size={15}
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
                {isCustomMode ? t("common.cancel") : t("productCategories.customCategory")}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Input for custom category when in custom mode */}
      {isCustomMode && (
        <View style={styles.customInputWrapper}>
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
              onChangeText={setCustomText}
              autoCapitalize="words"
              maxLength={50}
              onSubmitEditing={handleAddCustomCategory}
              returnKeyType="done"
            />
            {customText.length > 0 && (
              <TouchableOpacity
                onPress={handleAddCustomCategory}
                style={[styles.addBtn, { backgroundColor: accent }]}
              >
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  badgeCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeCountText: {
    fontSize: 11,
    fontWeight: "700",
  },
  selectedRow: {
    marginBottom: 8,
  },
  selectedScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  selectedPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  selectedPillEmoji: {
    fontSize: 13,
  },
  selectedPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  removePillBtn: {
    padding: 2,
    marginLeft: 2,
  },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
});
