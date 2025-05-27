import {
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import React from "react";

type Props = {
  label?: string;
  theme?: string;
  onPress?: () => void;
  buttonStyle?: ViewStyle;
  buttonTextStyle?: TextStyle;
  disabled?: boolean;
};

export default function ReusableButton({
  label,
  theme,
  onPress,
  buttonStyle,
  buttonTextStyle,
  disabled,
}: Props) {
  return (
    <TouchableOpacity
      style={[styles.button, buttonStyle]}
      onPress={onPress}
      disabled={disabled}
    >
      {theme === "pfp" && (
        <FontAwesome name="picture-o" size={18} style={styles.buttonIcon} />
      )}
      {theme === "username" && (
        <FontAwesome name="address-book" size={18} style={styles.buttonIcon} />
      )}
      {theme === "ready" && (
        <FontAwesome name="address-book" size={18} style={styles.buttonIcon} />
      )}
      {label && (
        <Text style={[styles.buttonText, buttonTextStyle]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: "80%",
    backgroundColor: "#3a160e",
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
    fontFamily: "Bungee-Regular",
    textAlign: "center",
  },
});
