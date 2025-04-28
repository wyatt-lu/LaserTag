import React from "react";
import { Modal, View, Text, StyleSheet, TouchableOpacity } from "react-native";

type Props = {
  visible: boolean;
  solo: () => void;
  team: () => void;
};

export default function ReusableButton({ visible, solo, team }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Choose Game Mode</Text>
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: "#3a160e", right: 5 }]}
              onPress={solo}
            >
              <Text style={styles.buttonText}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { left: 5 }]}
              onPress={team}
            >
              <Text style={[styles.buttonText, { color: "#3a160e" }]}>No</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    width: "75%",
    padding: 30,
    backgroundColor: "#824a32",
    borderRadius: 20,
    alignItems: "center",
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#faf6ea",
    fontFamily: "Bungee-Regular",
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  button: {
    flex: 1,
    padding: 25,
    marginTop: 20,
    alignItems: "center",
    backgroundColor: "#faf6ea",
    borderRadius: 5,
  },
  buttonText: {
    color: "#faf6ea",
    fontSize: 16,
    fontFamily: "Bungee-Regular",
  },
});
