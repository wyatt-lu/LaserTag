import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import AppText from "./AppText";
import { auth } from "@/firebaseconfig";

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
  const teamColors = [
    { team: 1, color: "#8baaff" }, // blue
    { team: 2, color: "#ffe08b" }, // yellow
    { team: 3, color: "#ffbb8b" }, // orange
    { team: 4, color: "#bd99e6" }, // purple
    { team: 5, color: "#99d199" }, // green
    { team: 6, color: "#68dbcc" }, // teal
    { team: 7, color: "#e481c8" }, // pink
    { team: 8, color: "#ff9090" }, // red
  ];

  const getTeamColor = (teamNumber: number): string => {
    const teamColor = teamColors.find((team) => team.team === teamNumber);
    return teamColor ? teamColor.color : "#8baaff";
  };
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
                style={[
                  styles.option,
                  {
                    backgroundColor: getTeamColor(players[playerId].team),
                  },
                ]}
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
