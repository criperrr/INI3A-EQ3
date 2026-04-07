import { View, StyleSheet } from "react-native";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Index() {
  return (
    <View style={styles.container}>
      <Header menu profile cart sideBar />

      <Footer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },
});
