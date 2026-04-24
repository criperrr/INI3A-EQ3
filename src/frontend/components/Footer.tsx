import React from "react";
import { StyleSheet, View, Text } from "react-native";

export default function Footer() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>@Presco.ltda todos os direitos reservados</Text> {/*depois muda*/}
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

  label: {
    fontFamily: "Google Sans",
    fontSize: 20,
    textShadowRadius: 2,
  },
});
