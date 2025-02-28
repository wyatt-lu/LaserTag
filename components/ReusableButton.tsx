import { StyleSheet, Text, TouchableOpacity } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import React from "react";

type Props = {
  label: string;
  theme?: string;
  onPress?: () => void;
};

export default function ReusableButton({ label, theme, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      {theme === "pfp" && (
        <FontAwesome name="picture-o" size={18} style={styles.buttonIcon} />
      )}
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: "80%",
    backgroundColor: "#c3976a",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#3a160e",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
  },
  buttonIcon: {
    paddingRight: 8,
    color: "#faf6ea",
  },
  buttonText: {
    fontSize: 18,
    color: "#faf6ea",
    fontFamily: "Bungee",
  },
});
