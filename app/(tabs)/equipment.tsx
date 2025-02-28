import React from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

import { globalStyles } from "@/constants/styles";

export default function EquipmentScreen() {
  return (
    <SafeAreaView style={globalStyles.container}>
      <View style={styles.signout}>
        <Text style={styles.text}>Equipment</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  signout: {
    backgroundColor: "#333",
    padding: 10,
    borderRadius: 5,
  },
  text: {
    color: "#fff",
    fontFamily: "Bungee",
  },
});
