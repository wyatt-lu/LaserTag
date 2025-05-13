import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import AppText from "./AppText";
import { auth } from "@/firebaseconfig";

interface PlayerListModalProps {
  visible: boolean;
  onClose: () => void;
  players: { [key: string]: any };
  playerURLArray: { id: number; profile: string }[];
  onSelect?: (targetId: string) => void;
  disabled?: boolean;
}

const PlayerListModal: React.FC<PlayerListModalProps> = ({
  visible,
  onClose,
  players,
  playerURLArray,
  onSelect = () => {},
  disabled = false,
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

  const playerColors = [
    { id: 1, color: "#3fb4ed" }, // blue
    { id: 2, color: "#aebf20" }, // yellow
    { id: 3, color: "#cb4533" }, // orange
    { id: 4, color: "#a032b6" }, // purple
    { id: 5, color: "#88cb54" }, // green
    { id: 6, color: "#1d5aab" }, // teal
    { id: 7, color: "#b81157" }, // pink
    { id: 8, color: "#896246" }, // red
    { id: 9, color: "#3f6ded" }, // dark blue
    { id: 10, color: "#bf9520" }, // dark yellow
    { id: 11, color: "#cb7233" }, // dark orange
    { id: 12, color: "#7032b6" }, // dark purple
    { id: 13, color: "#2f942f" }, // dark green
    { id: 14, color: "#229687" }, // dark teal
    { id: 15, color: "#b6218c" }, // dark pink
    { id: 16, color: "#894646" }, // dark red
  ];

  const getPlayerColor = (colorId: number): string => {
    const playerColor = playerColors.find((player) => player.id === colorId);
    return playerColor ? playerColor.color : "#8baaff";
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <AppText style={styles.title}>Player List</AppText>
          <View style={styles.optionsContainer}>
            {Object.keys(players).map((playerId) => {
              if (playerId.length<=7) return;
              const player = players[playerId];
              const playerURL = playerURLArray.find(
                (urlItem) => urlItem.id === player.id
              )?.profile;
              return (
                <TouchableOpacity
                  key={playerId}
                  onPress={() => onSelect(playerId)}
                  disabled={disabled}
                  style={[
                    styles.option,
                    {
                      borderColor: getPlayerColor(player.colorId),
                      borderWidth: 5,
                    },
                  ]}
                >
                  <View>
                    {!player.cowboyHat && playerURL && (
                      <Image
                        source={{ uri: playerURL }}
                        style={[
                          styles.user,
                          {
                            borderColor: getPlayerColor(player.colorId),
                            borderWidth: 2.5,
                          },
                        ]}
                      />
                    )}
                  </View>
                  <View style={styles.optionTextContainer}>
                    <AppText>{player.username}</AppText>
                    <AppText style={{ color: getTeamColor(player.team) }}>
                      [Team {player.team}]
                    </AppText>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.option, { marginTop: 20, borderRadius: 5 }]}
          >
            <AppText style={styles.optionText}>Close</AppText>
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
  optionsContainer: {
    flexDirection: "column",
    width: "95%",
  },
  option: {
    padding: 10,
    marginTop: 10,
    alignItems: "center",
    backgroundColor: "#faf6ea",
    borderRadius: 15,
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  optionTextContainer: {
    flexDirection: "column",
    justifyContent: "center",
    marginLeft: 10,
  },
  optionText: {
    color: "#3a160e",
    fontSize: 16,
    fontFamily: "Bungee-Regular",
  },
  user: {
    width: 60,
    height: 60,
    borderWidth: 2,
    borderRadius: 20,
  },
});

export default PlayerListModal;
