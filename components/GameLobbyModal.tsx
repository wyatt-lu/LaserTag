import { auth, database } from "@/firebaseconfig";
import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
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
import SliderComponent from "@react-native-community/slider";

type Props = {
  visible: boolean;
  roomCode: string | null;
  beginReadyGame: () => void;
  enterGame: () => void;
  closeLobby: () => void;
};

export default function GameLobbyModal({
  visible,
  roomCode,
  enterGame,
  beginReadyGame,
  closeLobby,
}: Props) {
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [playerTeams, setPlayerTeams] = useState<{ [key: string]: number }>({});
  const [numTeams, setNumTeams] = useState(2);

  useEffect(() => {
    if (roomCode) {
      const roomRef = ref(database, `rooms/${roomCode}`);

      const unsubscribe = onValue(
        roomRef,
        (snapshot) => {
          const roomData = snapshot.val();
          setRoomInfo(roomData);

          if (!roomData) return;

          const initialTeams: { [key: string]: number } = {};
          Object.keys(roomData.players).forEach((player: any) => {
            initialTeams[player] = roomData.players[player].team || 1;
          });
          setPlayerTeams(initialTeams);

          const maxTeams = Math.floor(Object.keys(roomData.players).length / 2);
          setNumTeams(maxTeams > 1 ? maxTeams : 2);
        },
        (error) => {
          console.error("Error fetching room data:", error);
        }
      );

      return () => unsubscribe();
    }
  }, [roomCode]);

  if (!roomInfo) {
    return null;
  }

  const handleTeams = (uid: string) => {
    if (roomInfo.roomType === "solo") return;

    const currentTeam = playerTeams[uid];
    let newTeam = (currentTeam % numTeams) + 1;
    setPlayerTeams((prev) => ({
      ...prev,
      [uid]: newTeam,
    }));

    const playerRef = ref(database, `rooms/${roomCode}/players/${uid}`);
    update(playerRef, {
      team: newTeam,
    }).catch((error) => {
      console.error("Error updating player team:", error);
    });
  };

  const handleNumTeamsChange = (value: number) => {
    setNumTeams(value);
    const roomRef = ref(database, `rooms/${roomCode}`);
    update(roomRef, {
      numTeams: value,
    }).catch((error) => {
      console.error("Error updating number of teams:", error);
    });
  };

  const toggleReady = async (userId: string) => {
    if (!roomCode) return;

    const playerRef = ref(database, `rooms/${roomCode}/players/${userId}`);
    const newReadyState = !roomInfo.players[userId]?.ready;

    await update(playerRef, { ready: newReadyState });

    // Check if all players are ready
    const updatedRoomSnapshot = await get(ref(database, `rooms/${roomCode}`));
    const updatedRoom = updatedRoomSnapshot.val();

    const roomRef = ref(database, `rooms/${roomCode}`);
    const allReady = Object.values(updatedRoom.players).every(
      (player: any) => player.ready === true
    );
    if (allReady) {
      await update(roomRef, { gameReady: true });
      enterGame();
    }
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
            onPress={async () => {
              if (roomCode) {
                await Clipboard.setStringAsync(roomCode);
                Alert.alert("Room code copied to clipboard.");
              }
            }}
          >
            <AppText style={styles.code}>{roomCode}</AppText>
          </TouchableOpacity>
        </View>
        <RopeIcon style={styles.rope} width={"100%"} />
        {auth.currentUser?.uid === roomInfo.host &&
          roomInfo.roomType !== "solo" && (
            <View style={styles.sliderContainer}>
              <AppText style={{ fontSize: 17 }}>
                Select Number of Teams:
              </AppText>
              <SliderComponent
                style={{ width: 200, height: 40 }}
                minimumValue={2}
                maximumValue={Math.floor(
                  Object.keys(roomInfo.players).length / 2 + 1
                )}
                step={1}
                value={numTeams}
                onValueChange={handleNumTeamsChange}
              />
              <AppText>Number of Teams: {numTeams}</AppText>
            </View>
          )}
        <View style={styles.middleContainer}>
          {Object.keys(roomInfo.players)
            .sort((a: any, b: any) => {
              if (a === roomInfo.host) return -1;
              if (b === roomInfo.host) return 1;
              return 0;
            })
            .map((userId) => {
              const player = roomInfo.players[userId];
              const TeamColors = [
                { team: 1, color: "#8baaff" }, //blue
                { team: 2, color: "#ffe08b" }, //yellow
                { team: 3, color: "#ffbb8b" }, //orange
                { team: 4, color: "#bd99e6" }, //purple
                { team: 5, color: "#99d199" }, //green
                { team: 6, color: "#68dbcc" }, //teal
                { team: 7, color: "#e481c8" }, //pink
                { team: 8, color: "#ff9090" }, //red
              ];
              const teamColor =
                TeamColors.find((team) => team.team === playerTeams[userId])
                  ?.color || "#8baaff";
              const isReady = player.ready === true;
              return (
                <View
                  key={userId}
                  style={{ flexDirection: "row", alignItems: "center" }}
                >
                  <Pressable
                    style={[
                      styles.playerContainer,
                      { backgroundColor: teamColor },
                    ]}
                    onPress={
                      auth.currentUser?.uid === roomInfo.host
                        ? () => handleTeams(userId)
                        : undefined
                    }
                  >
                    <AppText>{player.username}</AppText>
                    {roomInfo.roomType !== "solo" && (
                      <AppText style={{ marginLeft: 10 }}>
                        [Team {playerTeams[userId]}]
                      </AppText>
                    )}
                  </Pressable>
                  {isReady ? (
                    <AppText style={styles.readyText}>Ready</AppText>
                  ) : (
                    auth.currentUser?.uid === userId && (
                      <TouchableOpacity
                        style={[styles.invisibleReadyText]}
                        onPress={() => toggleReady(userId)}
                      >
                        <AppText>Ready?</AppText>
                      </TouchableOpacity>
                    )
                  )}
                </View>
              );
            })}
        </View>

        <View style={styles.bottomContainer}>
          {roomInfo.gameStarted ? (
            Object.keys(roomInfo.players).map((userId) => {
              const isReady = roomInfo.players[userId]?.ready === true;
              return (
                <View key={userId} style={[styles.playerContainerOnTop]}>
                  {isReady ? (
                    <AppText style={styles.readyText}></AppText>
                  ) : (
                    auth.currentUser?.uid === userId && (
                      <ReusableButton
                        label="Ready?"
                        buttonTextStyle={{ position: "absolute" }}
                        buttonStyle={{ marginBottom: 60, borderRadius: 15 }}
                        onPress={() => toggleReady(userId)}
                      />
                    )
                  )}
                </View>
              );
            })
          ) : (
            <ReusableButton
              label={
                auth.currentUser?.uid === roomInfo.host
                  ? "Start Game"
                  : "Waiting for host to start..."
              }
              onPress={
                auth.currentUser?.uid === roomInfo.host
                  ? beginReadyGame
                  : () => {}
              }
              buttonStyle={
                auth.currentUser?.uid === roomInfo.host
                  ? {}
                  : { backgroundColor: "#968e84" }
              }
            />
          )}
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
    paddingHorizontal: 20,
  },
  middleContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    marginTop: 100,
  },
  bottomContainer: {
    bottom: 50,
    position: "absolute",
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
  },
  code: {
    right: "30%",
    color: "#32CD32",
    textDecorationLine: "underline",
  },
  rope: {
    top: "15%",
    position: "absolute",
  },
  playerContainer: {
    width: "75%",
    borderRadius: 15,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    flexDirection: "row",
  },
  sliderContainer: {
    width: "80%",
    alignItems: "center",
  },
  readyText: {
    color: "#32CD32",
    fontWeight: "bold",
    marginLeft: 10,
    marginBottom: 20,
  },
  invisibleReadyText: {
    display: "none",
  },
  playerContainerOnTop: {
    width: "75%",
    borderRadius: 15,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    flexDirection: "row",
    position: "absolute",
  },
});
