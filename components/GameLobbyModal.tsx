import { auth, database } from "@/firebaseconfig";
import React, { useEffect, useId, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Pressable,
} from "react-native";
import ReusableButton from "./ReusableButton";
import { get, onValue, ref, update } from "firebase/database";
import { globalStyles } from "@/constants/styles";
import { IconSymbol } from "./ui/IconSymbol";
import AppText from "./AppText";
import * as Clipboard from "expo-clipboard";
import { RopeIcon } from "@/constants/icons";

type Props = {
  visible: boolean;
  roomCode: string | null;
  enterGame: () => void;
  closeLobby: () => void;
};

export default function GameLobbyModal({
  visible,
  roomCode,
  enterGame,
  closeLobby,
}: Props) {
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [playerTeams, setPlayerTeams] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    if (roomCode) {
      const roomRef = ref(database, `rooms/${roomCode}`);

      const unsubscribe = onValue(roomRef, (snapshot) => {
        const roomData = snapshot.val();
        setRoomInfo(roomData);

        if (!roomData) return;

        const initialTeams: { [key: string]: number } = {};
        Object.keys(roomData.players).forEach((player: any) => {
          initialTeams[player] = 1;
        });
        setPlayerTeams(initialTeams);
      });

      return () => unsubscribe();
    }
  }, [roomCode]);

  if (!roomInfo) {
    return null;
  }

  const handleTeams = (uid: string) => {
    if (roomInfo.roomType === "solo") return;

    const newTeam = playerTeams[uid] === 1 ? 2 : 1;
    setPlayerTeams((prev) => ({
      ...prev,
      [uid]: newTeam,
    }));

    const playerRef = ref(database, `rooms/${roomCode}/players/${uid}`);
    update(playerRef, {
      team: newTeam,
    });
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={globalStyles.container}>
        <View style={styles.topContainer}>
          <TouchableOpacity onPress={closeLobby}>
            <IconSymbol name="x.circle.fill" size={60} color={"#3a160e"} />
          </TouchableOpacity>
          <AppText>Room Code: </AppText>
          <TouchableOpacity
            onPress={() => {
              if (roomCode) {
                Clipboard.setStringAsync(roomCode);
              }
              Alert.alert("Copied.");
            }}
          >
            <AppText style={styles.code}>{roomCode}</AppText>
          </TouchableOpacity>
        </View>
        <RopeIcon style={styles.rope} width={"100%"} />
        <View style={styles.middleContainer}>
          {Object.keys(roomInfo.players)
            .sort((a: any, b: any) => {
              if (a === roomInfo.host) return -1;
              if (b === roomInfo.host) return 1;
              return 0;
            })
            .map((userId) => {
              const player = roomInfo.players[userId];
              return (
                <View key={userId} style={{ flexDirection: "row" }}>
                  <Pressable
                    style={[
                      styles.playerContainer,
                      userId === roomInfo.host && styles.hostPlayer,
                      playerTeams[userId] === 2 && styles.team2Player,
                    ]}
                    onPress={() => {
                      auth.currentUser?.uid === roomInfo.host
                        ? handleTeams(userId)
                        : () => {};
                    }}
                  >
                    <AppText>{player.username}</AppText>
                  </Pressable>
                </View>
              );
            })}
        </View>

        <View style={styles.bottomContainer}>
          <ReusableButton
            label={
              auth.currentUser?.uid === roomInfo.host
                ? "Start Game"
                : "Waiting for host to start..."
            }
            onPress={
              auth.currentUser?.uid === roomInfo.host ? enterGame : () => {}
            }
            buttonStyle={
              auth.currentUser?.uid === roomInfo.host
                ? {}
                : { backgroundColor: "#968e84" }
            }
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  topContainer: {
    top: 50,
    width: "100%",
    height: 75,
    justifyContent: "space-evenly",
    alignItems: "center",
    position: "absolute",
    flexDirection: "row",
  },
  middleContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  bottomContainer: {
    bottom: 50,
    position: "absolute",
    width: "100%",
    alignItems: "center",
  },
  code: {
    right: "30%",
    color: "#0EE",
    textDecorationLine: "underline",
  },
  rope: {
    top: "15%",
    position: "absolute",
  },
  playerContainer: {
    width: "75%",
    backgroundColor: "#ac7148",
    borderRadius: 15,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  hostPlayer: {
    backgroundColor: "#824a32",
  },
  team2Player: {
    backgroundColor: "#00FF00",
  },
});
