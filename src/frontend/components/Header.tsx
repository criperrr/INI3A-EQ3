import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { BlurView } from "expo-blur";
//icons
import { Ionicons } from "@expo/vector-icons";

export interface PossibleHeaderItems {
  title?: string;
  menu?: true;
  profile?: true;
  cart?: true;
  sideBar?: true;
}

export default function Header(items: PossibleHeaderItems) {
  return (
    <BlurView intensity={30} tint="light" style={styles.blurContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>{items.title}</Text>
        <View style={styles.itemsContainer}>
          {items.cart && (
            <TouchableOpacity>
              <Ionicons name="cart" size={48} color="white" />
            </TouchableOpacity>
          )}
          {items.profile && (
            <TouchableOpacity>
              <Ionicons name="person" size={48} color="white" />
            </TouchableOpacity>
          )}
          {items.menu && (
            <TouchableOpacity>
              <Ionicons name="menu" size={48} color="white" />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.sideBarContainer}>
          {items.sideBar && (
            <TouchableOpacity>
              <Ionicons name="list" size={48} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  blurContainer: {
    position: "absolute",
    top: 20,
    left: 16,
    right: 16,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
    zIndex: 10,
  },
  container: {
    height: 60,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(56, 189, 248, 0.2)",
  },
  itemsContainer: {
    position: "absolute",
    right: 20,
    flexDirection: "row",
    gap: 15,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  sideBarContainer: {
    position: "absolute",
    left: 20,
  },
});
