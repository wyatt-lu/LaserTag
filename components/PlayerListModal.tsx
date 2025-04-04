import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import AppText from "./AppText";

interface PlayerListModalProps {
  visible: boolean;
  onClose: () => void;
  players: { [key: string]: any };
  onSelect: (targetId: string) => void;
}

const PlayerListModal: React.FC<PlayerListModalProps> = ({
  visible,
  onClose,
  players,
  onSelect,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <AppText style={styles.title}>Select a Target</AppText>
          <View style={styles.optionsContainer}>
            {Object.keys(players).map((playerId) => (
              <TouchableOpacity
                key={playerId}
                onPress={() => onSelect(playerId)}
                style={styles.option}
              >
                <AppText>
                  {players[playerId].username} [Team {players[playerId].team}]
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.option}>
            <AppText style={styles.optionText}>Cancel</AppText>
          </TouchableOpacity>
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
  optionsContainer: {
    flexDirection: "column",
    width: "100%",
  },
  option: {
    padding: 25,
    marginTop: 10,
    alignItems: "center",
    backgroundColor: "#faf6ea",
    borderRadius: 5,
  },
  optionText: {
    color: "#3a160e",
    fontSize: 16,
    fontFamily: "Bungee-Regular",
  },
});

export default PlayerListModal;
