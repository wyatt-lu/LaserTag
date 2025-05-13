import React from "react";
import { Modal, View, TouchableOpacity, Image, StyleSheet } from "react-native";
import AppText from "./AppText"; // Adjust the path if necessary
import ReusableButton from "./ReusableButton";

interface GameEndModalProps {
  visible: boolean;
  onClose: () => void;
  players: { [key: string]: any };
  playerURLArray: { id: number; profile: string }[];
}

const GameEndModal: React.FC<GameEndModalProps> = ({
  visible,
  onClose,
  players,
  playerURLArray,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <AppText style={styles.title}>Game Over</AppText>
          <ReusableButton label="Return to Lobby" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
};

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
    paddingBottom: 15,
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
});

export default GameEndModal;
