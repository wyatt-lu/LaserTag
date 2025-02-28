import React from "react";
import { Text, TextProps, StyleSheet } from "react-native";

export default function AppText(props: TextProps) {
  return (
    <Text {...props} style={[styles.text, props.style]}>
      {props.children}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    color: "#3a160e",
    fontFamily: "Bungee",
  },
});
