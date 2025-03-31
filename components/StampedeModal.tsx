import React, { useState } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import AppText from "./AppText";

interface SelectTargetModalProps {
  visible: boolean;
  onClose: () => void;
  players: { [key: string]: number };
  onSelect: (targetId: string) => void;
  currentPlayerTeam: number;
}

const SelectTargetModal: React.FC<SelectTargetModalProps> = ({
  visible,
  onClose,
  players,
  onSelect,
  currentPlayerTeam,
}) => {
  //   console.log(players);
  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <AppText style={styles.title}>Select a Target</AppText>
          <View style={styles.optionsContainer}>
            {/* {players.map((player) => (
              <TouchableOpacity
                key={player.id}
                onPress={() => onSelect(player.id)}
                disabled={player.team === currentPlayerTeam}
                style={[
                  styles.option,
                  //   player.team === currentPlayerTeam && styles.disabledItem,
                ]}
              >
                <AppText
                //   style={
                //     player.team === currentPlayerTeam && styles.disabledText
                //   }
                >
                  {player.username} [Team {player.team}]
                </AppText>
              </TouchableOpacity>
            ))} */}
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
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  option: {
    flex: 1,
    padding: 25,
    marginTop: 20,
    alignItems: "center",
    backgroundColor: "#faf6ea",
    borderRadius: 5,
  },
  optionText: {
    color: "#faf6ea",
    fontSize: 16,
    fontFamily: "Bungee-Regular",
  },
});

export default SelectTargetModal;
