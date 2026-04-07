import { StyleSheet, View, Text } from "react-native";

export default function Footer() {
  return (
    <View style={styles.container}>
      <Text>Footer</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "green",
    position: "absolute",
    bottom: 0,
    width: "100%",
    alignItems: "center",
    borderTopRightRadius: 24,
    borderTopLeftRadius: 24,
  },
});
