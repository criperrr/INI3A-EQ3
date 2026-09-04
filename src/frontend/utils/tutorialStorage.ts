import AsyncStorage from "@react-native-async-storage/async-storage";

export const TUTORIAL_STORAGE_KEY = "@presco:hasSeenTutorial";

/**
 * Checks if the user has already seen the onboarding tutorial.
 * Returns false on any error or if the key is not present.
 */
export async function hasSeenTutorial(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(TUTORIAL_STORAGE_KEY);
    return value === "true";
  } catch (error) {
    console.warn("Failed to read tutorial status from storage:", error);
    return false;
  }
}

/**
 * Marks the onboarding tutorial as seen.
 */
export async function markTutorialAsSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
  } catch (error) {
    console.warn("Failed to persist tutorial status:", error);
  }
}

/**
 * Resets the tutorial status so the user can see it again.
 */
export async function resetTutorialStatus(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TUTORIAL_STORAGE_KEY);
  } catch (error) {
    console.warn("Failed to reset tutorial status:", error);
  }
}
