import { auth, database } from "@/firebaseconfig";
import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Pressable,
  Text,
} from "react-native";
import ReusableButton from "./ReusableButton";
import { get, off, onValue, ref, update } from "firebase/database";
import { globalStyles } from "@/constants/styles";
import { IconSymbol } from "./ui/IconSymbol";
import AppText from "./AppText";
import * as Clipboard from "expo-clipboard";
import { RopeIcon } from "@/constants/icons";
import SliderComponent from "@react-native-community/slider";
import {
  GestureHandlerRootView,
  ScrollView,
} from "react-native-gesture-handler";
import { useSound } from "@/constants/useSound";

interface Player {
  username: string;
  team?: number;
  ready?: boolean;
}

interface RoomInfo {
  host: string;
  players: { [key: string]: Player };
  gameStarted?: boolean;
  gameReady?: boolean;
  numTeams?: number;
}

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
  const { playSound } = useSound();
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [playerTeams, setPlayerTeams] = useState<{ [key: string]: number }>({});
  const [numTeams, setNumTeams] = useState(1);
  const maxBoundary = 1000;
  const minBoundary = 1;
  const [boundaryWidth, setBoundaryWidth] = useState<number>(100);
  const [boundaryHeight, setBoundaryHeight] = useState<number>(100);
  const [gameDuration, setGameDuration] = useState<number>(600);

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
          Object.keys(roomData.players).forEach((playerId) => {
            initialTeams[playerId] = roomData.players[playerId].team || 1;
          });
          setPlayerTeams(initialTeams);

          const initialNumTeams = Math.min(
            Object.keys(roomData.players).length,
            roomData.numTeams || 1
          );
          setNumTeams(initialNumTeams);
        },
        (error) => {
          console.error("Error fetching room data:", error);
        }
      );

      return () => {
        unsubscribe();
      };
    }
  }, [roomCode]);

  if (!roomInfo) {
    return null;
  }

  const handleTeamChange = (playerId: string) => {
    const currentTeam = playerTeams[playerId];
    let newTeam = (currentTeam % numTeams) + 1;
    setPlayerTeams((prev) => ({
      ...prev,
      [playerId]: newTeam,
    }));

    const playerRef = ref(database, `rooms/${roomCode}/players/${playerId}`);
    update(playerRef, {
      team: newTeam,
    }).catch((error) => {
      console.error("Error updating player team:", error);
    });
  };

  const handleNumTeamsChange = (newNumTeams: number) => {
    if (newNumTeams < Math.max(...Object.values(playerTeams))) {
      Alert.alert(
        "Error",
        "Cannot reduce the number of teams below the current assignments."
      );
      return;
    }
    setNumTeams(newNumTeams);
    const roomRef = ref(database, `rooms/${roomCode}`);
    update(roomRef, {
      numTeams: newNumTeams,
    }).catch((error) => {
      console.error("Error updating number of teams:", error);
    });
  };

  const togglePlayerReady = async (playerId: string) => {
    if (!roomCode) return;

    const playerRef = ref(database, `rooms/${roomCode}/players/${playerId}`);
    const newReadyState = !roomInfo.players[playerId]?.ready;

    try {
      await update(playerRef, { ready: newReadyState });

      // check if all players are ready
      const updatedRoomSnapshot = await get(ref(database, `rooms/${roomCode}`));
      const updatedRoom = updatedRoomSnapshot.val();

      const allReady = Object.values(updatedRoom.players).every(
        (player: any) => player.ready === true
      );
      if (allReady) {
        await update(ref(database, `rooms/${roomCode}`), { gameReady: true });
        enterGame();
      } else {
        await update(ref(database, `rooms/${roomCode}`), { gameReady: false });
      }
    } catch (error) {
      console.error("Error updating player ready state:", error);
    }
  };

  //Change boundary sizes

  const handleBoundaryWidthChange = (newBoundary: number) => {
    if (newBoundary < minBoundary) {
      Alert.alert(
        "Error",
        "Cannot reduce the boundary size below the current assignments."
      );
      return;
    }
    setBoundaryWidth(newBoundary);
    const roomRef = ref(database, `rooms/${roomCode}/boundarySize`);
    update(roomRef, {
      width: newBoundary,
    }).catch((error) => {
      console.error("Error updating boundary size:", error);
    });
  };
  const handleBoundaryHeightChange = (newBoundary: number) => {
    if (newBoundary < minBoundary) {
      Alert.alert(
        "Error",
        "Cannot reduce the boundary size below the current assignments."
      );
      return;
    }
    setBoundaryHeight(newBoundary);
    const roomRef = ref(database, `rooms/${roomCode}/boundarySize`);
    update(roomRef, {
      height: newBoundary,
    }).catch((error) => {
      console.error("Error updating boundary size:", error);
    });
  };

  const handleDurationChange = (newDuration: number) => {
    const roomRef = ref(database, `rooms/${roomCode}`);
    setGameDuration(newDuration);
    update(roomRef, {
      gameDuration: newDuration,
    }).catch((error) => {
      console.error("Error updating game duration:", error);
    });
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <Modal visible={visible} animationType="slide">
      <GestureHandlerRootView>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => {
                playSound("buttonClick");
                closeLobby();
              }}
            >
              <IconSymbol name="x.circle.fill" size={60} color={"#3a160e"} />
            </TouchableOpacity>
            <View style={styles.roomCodeContainer}>
              <AppText style={styles.roomCodeLabel}>Room Code:</AppText>
              <TouchableOpacity
                onPress={async () => {
                  playSound("buttonClick");
                  if (roomCode) {
                    await Clipboard.setStringAsync(roomCode);
                    Alert.alert("Room code copied to clipboard.");
                  }
                }}
              >
                <AppText style={styles.code}>{roomCode}</AppText>
              </TouchableOpacity>
            </View>
          </View>

          <RopeIcon style={styles.rope} width={"100%"} />

          {auth.currentUser?.uid === roomInfo.host && (
            <View style={styles.hostControlsSection}>
              <View style={styles.sliders}>
                <View style={styles.sliderContainer}>
                  <AppText style={styles.sliderLabel}>Number of Teams:</AppText>
                  <SliderComponent
                    style={styles.slider}
                    minimumValue={1}
                    maximumValue={Object.keys(roomInfo.players).length}
                    step={1}
                    value={numTeams}
                    onValueChange={handleNumTeamsChange}
                    minimumTrackTintColor="#3a160e"
                    maximumTrackTintColor="#d3d3d3"
                    thumbTintColor="#b81157"
                  />
                  <AppText style={[styles.sliderLabel, { marginBottom: 21 }]}>
                    {numTeams} Team{numTeams > 1 ? "s" : ""}
                  </AppText>
                  <AppText style={styles.dimensionLabel}>
                    Game Duration:
                  </AppText>
                  <SliderComponent
                    style={styles.slider}
                    minimumValue={10}
                    maximumValue={1800}
                    step={10}
                    value={gameDuration}
                    onValueChange={handleDurationChange}
                    minimumTrackTintColor="#3a160e"
                    maximumTrackTintColor="#d3d3d3"
                    thumbTintColor="#b81157"
                  />
                  <AppText style={styles.sliderLabel}>
                    {formatTime(gameDuration)}
                  </AppText>
                </View>

                <View style={styles.sliderContainer}>
                  <AppText style={styles.sliderLabel}>
                    Boundary Dimensions:
                  </AppText>
                  <AppText style={styles.dimensionLabel}>Width (x) :</AppText>
                  <SliderComponent
                    style={styles.slider}
                    minimumValue={minBoundary}
                    maximumValue={maxBoundary}
                    step={25}
                    value={boundaryWidth}
                    onValueChange={handleBoundaryWidthChange}
                    minimumTrackTintColor="#3a160e"
                    maximumTrackTintColor="#d3d3d3"
                    thumbTintColor="#b81157"
                  />
                  <AppText style={styles.dimensionLabel}>Height (y) :</AppText>
                  <SliderComponent
                    style={styles.slider}
                    minimumValue={minBoundary}
                    maximumValue={maxBoundary}
                    step={25}
                    value={boundaryHeight}
                    onValueChange={handleBoundaryHeightChange}
                    minimumTrackTintColor="#3a160e"
                    maximumTrackTintColor="#d3d3d3"
                    thumbTintColor="#b81157"
                  />
                  <AppText style={styles.sliderLabel}>
                    {boundaryWidth} x {boundaryHeight}
                  </AppText>
                </View>
              </View>
            </View>
          )}

          <View style={styles.playersSection}>
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={true}
            >
              {Object.keys(roomInfo.players)
                .sort((a, b) => {
                  if (a === roomInfo.host) return -1;
                  if (b === roomInfo.host) return 1;
                  return 0;
                })
                .map((playerId) => {
                  const player = roomInfo.players[playerId];
                  const teamColors = [
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
                    teamColors.find(
                      (team) => team.team === playerTeams[playerId]
                    )?.color || "#8baaff";
                  const isReady = player.ready === true;
                  const isHost = playerId === roomInfo.host;
                  return (
                    <View key={playerId} style={styles.playerRow}>
                      <Pressable
                        style={[
                          styles.playerContainer,
                          { backgroundColor: teamColor },
                        ]}
                        onPress={
                          auth.currentUser?.uid === roomInfo.host
                            ? () => handleTeamChange(playerId)
                            : undefined
                        }
                      >
                        <AppText style={styles.playerName}>
                          {player.username}
                          {""}
                          <Text style={styles.hostIndicator}>
                            {isHost && " (Host)"}
                          </Text>
                        </AppText>
                        <AppText style={styles.teamText}>
                          [Team {playerTeams[playerId]}]
                        </AppText>
                      </Pressable>
                      {isReady && (
                        <AppText style={styles.readyText}>Ready</AppText>
                      )}
                    </View>
                  );
                })}
            </ScrollView>
          </View>

          <View style={styles.bottomSection}>
            {roomInfo.gameStarted ? (
              Object.keys(roomInfo.players).map((playerId) => {
                const isReady = roomInfo.players[playerId]?.ready === true;
                const readyLabel = isReady ? "Unready?" : "Ready?";
                return (
                  <View key={playerId} style={[styles.readyButton]}>
                    {auth.currentUser?.uid === playerId && (
                      <ReusableButton
                        label={readyLabel}
                        buttonTextStyle={{ position: "absolute" }}
                        buttonStyle={{ marginBottom: 60, borderRadius: 15 }}
                        onPress={() => {
                          playSound("buttonClick");
                          togglePlayerReady(playerId);
                        }}
                      />
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
      </GestureHandlerRootView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f0e8",
    paddingTop: 50,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    height: 70,
  },
  roomCodeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  roomCodeLabel: {
    fontSize: 16,
  },
  code: {
    color: "#32CD32",
    textDecorationLine: "underline",
    marginLeft: 5,
  },
  rope: {
    height: 30,
    marginVertical: 10,
  },
  hostControlsSection: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  sliders: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  sliderContainer: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 10,
  },
  sliderLabel: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 5,
  },
  dimensionLabel: {
    fontSize: 12,
    marginTop: 5,
  },
  slider: {
    width: 150,
    height: 30,
  },
  playersSection: {
    flex: 1,
    marginTop: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    width: "100%",
  },
  playerContainer: {
    flex: 1,
    borderRadius: 15,
    height: 50,
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
    paddingHorizontal: 15,
  },
  playerName: {
    fontSize: 16,
    fontWeight: "500",
  },
  hostIndicator: {
    fontSize: 12,
    color: "#de2c4a",
  },
  teamText: {
    fontSize: 14,
  },
  readyText: {
    color: "#32CD32",
    fontWeight: "bold",
    marginLeft: 15,
    fontSize: 14,
  },
  bottomSection: {
    alignItems: "center",
    paddingVertical: 20,
  },
  readyButton: {
    borderRadius: 15,
  },
  disabledButton: {
    backgroundColor: "#968e84",
  },
});
