import { auth, database } from "@/firebaseconfig";
import { useRouter } from "expo-router";
import { globalStyles } from "@/constants/styles";
import AppText from "@/components/AppText";
import React, { useState } from "react";
import { useEffect } from "react";
import {
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  View,
  Alert,
  Image,
  Modal,
  Platform,
} from "react-native";
import {
  ref,
  get,
  set,
  update,
  onValue,
  onDisconnect,
  remove,
} from "firebase/database";
import { SignIcon } from "@/constants/icons";
import InputModal from "../../components/InputModal";
import ReusableButton from "@/components/ReusableButton";
import ImageViewer from "@/components/ImageViewer";
import {
  getStorage,
  ref as ref_storage,
  getDownloadURL,
  uploadBytes,
} from "firebase/storage";
import * as ImagePicker from "expo-image-picker";
import { IconSymbol } from "@/components/ui/IconSymbol";
import GameLobbyModal from "@/components/GameLobbyModal";
import { getAuth } from "firebase/auth";
import Icon from "react-native-vector-icons/MaterialIcons";
import * as Location from "expo-location";
import { useSound } from "@/constants/useSound";

export default function HomeScreen() {
  // HOME SCREEN //

  const { playSound } = useSound();

  const [isLobbyVisible, setIsLobbyVisible] = useState(false);

  const openLobby = () => setIsLobbyVisible(true);
  const closeLobby = () => setIsLobbyVisible(false);

  const [roomCode, setRoomCode] = useState<string | null>(null);

  const [isCodeInputVisible, setIsCodeInputVisible] = useState(false);

  const openInput = () => setIsCodeInputVisible(true);
  const closeInput = () => setIsCodeInputVisible(false);

  const [roomInfo, setRoomInfo] = useState<any>();

  const [isInGame, setIsInGame] = useState(false);

  useEffect(() => {
    if (!roomCode) return;

    const roomRef = ref(database, `rooms/${roomCode}`);
    const readyRef = ref(database, `rooms/${roomCode}/gameReady`);
    const startRef = ref(database, `rooms/${roomCode}/gameStart`);
    const gameStateRef = ref(database, `rooms/${roomCode}/gameState`);

    const waitForRoom = onValue(roomRef, (snapshot) => {
      if (!snapshot.exists()) {
        return;
      }
    });

    waitForRoom();
    const unsubscribeRoom = onValue(roomRef, (roomSnapshot) => {
      if (!roomSnapshot.exists()) {
        Alert.alert("Room Deleted", "Please join again.");
        closeLobby();
        setRoomCode(null);
        router.replace("/(tabs)/home");
      }
    });

    const unsubscribeGameState = onValue(gameStateRef, (snapshot) => {
      if (snapshot.exists()) {
        setIsInGame(snapshot.val() === "in-game");
      }
    });

    const unsubscribeReady = onValue(readyRef, (readySnapshot) => {
      if (readySnapshot.exists() && readySnapshot.val()) {
        closeLobby();
        router.replace({
          pathname: "/(tabs)/gameplay",
          params: { roomCode: roomCode },
        });
        // router.replace("/(tabs)/gameplay",{roomCode: roomCode});
        // closeLobby();
      }
    });

    const unsubscribeStart = onValue(startRef, (startSnapshot) => {
      const roomData = startSnapshot.val();
      setRoomInfo(roomData);
    });

    return () => {
      unsubscribeRoom();
      unsubscribeReady();
      unsubscribeStart();
      unsubscribeGameState();
    };
  }, [roomCode, isInGame]);

  /*const updatePlayerLaser = async () => {
      if (!auth.currentUser) return;
      const playerId = auth.currentUser.uid;
      const playerRef = ref(database, `players/${playerId}`);
      const snapshot = await get(playerRef)
      if (snapshot.exists()) {
        const playerData = snapshot.val();
        const roomRef = ref(database, `rooms/${playerData.room}/players/${playerId}`)
        await update(roomRef, {
          laser: playerData.laser
        });
      }
    }*/

  const createRoom = async () => {
    if (!auth.currentUser) return;
    closeRoomSettings();

    const generateRoomCode = () => {
      const letters = "0123456789";
      return Array.from(
        { length: 6 },
        () => letters[Math.floor(Math.random() * letters.length)]
      ).join("");
    };

    const newRoomCode = generateRoomCode();
    setRoomCode(newRoomCode);

    const roomRef = ref(database, `rooms/${newRoomCode}`);
    const playerRef = ref(database, `players/${auth.currentUser.uid}`);
    const laserRef = ref(database, `players/${auth.currentUser.uid}/laser`);
    const laserData = await get(laserRef);

    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== "granted") {
      console.log("Permission to access location was denied");
      return;
    }

    let hostLocation = await Location.getCurrentPositionAsync({});

    await set(roomRef, {
      host: auth.currentUser.uid,
      gameStarted: false,
      gameReady: false,
      initialLocation: {
        latitude: hostLocation.coords.latitude,
        longitude: hostLocation.coords.longitude,
      },
      boundarySize: {
        width: 100,
        height: 100,
      },
      players: {
        [auth.currentUser.uid]: {
          username: auth.currentUser.displayName,
          ready: false,
          team: 1,
          laser: laserData.val(),
          cowboyHat: false,
          fake: false,
          isEliminated: false,
          points: 0,
          colorId: 1,
        },
      },
    });
    await update(playerRef, { room: newRoomCode });

    onDisconnect(roomRef).remove();
    onDisconnect(playerRef).update({ room: null });
    onDisconnect(playerRef).update({ laser: null });
    openLobby();
  };

  const joinRoom = async (roomCode: string) => {
    closeInput();
    if (!auth.currentUser) return;
    if (roomCode.length !== 6) {
      Alert.alert("Too short. Room code must be 6 characters");
      return;
    }

    const roomRef = ref(database, `rooms/${roomCode}`);
    const roomSnapshot = await get(roomRef);
    const roomData = roomSnapshot.val();

    if (!roomSnapshot.exists()) {
      Alert.alert("Room not found");
      return;
    }

    const gameReadyRef = ref(database, `rooms/${roomCode}/gameReady`);
    const gameReadySnapshot = await get(gameReadyRef);
    const gameReady = gameReadySnapshot.val();

    const gameStartedRef = ref(database, `rooms/${roomCode}/gameStarted`);
    const gameStartedSnapshot = await get(gameStartedRef);
    const gameStarted = gameStartedSnapshot.val();

    if (gameStarted) {
      Alert.alert("Game has already started. You cannot join this room.");
      return;
    }

    if (roomData.host === auth.currentUser.uid) {
      if (gameReady) {
        router.replace("/(tabs)/gameplay");
      } else {
        openLobby();
      }
      return;
    }

    if (roomData.players && roomData.players[auth.currentUser.uid]) {
      if (gameReady) {
        router.replace("/(tabs)/gameplay");
      } else {
        openLobby();
      }
    }

    if (Object.keys(roomData.players).length >= 8) {
      Alert.alert("Room is full");
      return;
    }

    const laserRef = ref(database, `players/${auth.currentUser.uid}/laser`);
    const laserData = await get(laserRef);

    const playersRef = ref(database, `rooms/${roomCode}/players`);
    const playersSnapshot = await get(playersRef);
    const playersData = playersSnapshot.val() || {};
    const newColorId = Object.keys(playersData).length + 1; // Assign the next available colorId

    await update(ref(database, `rooms/${roomCode}/players`), {
      [auth.currentUser.uid]: {
        username: auth.currentUser.displayName,
        ready: false,
        team: 1,
        laser: laserData.val(),
        cowboyHat: false,
        isEliminated: false,
        points: 0,
        colorId: newColorId,
      },
    });

    await update(ref(database, `players/${auth.currentUser.uid}`), {
      room: roomCode,
    });

    const playerRef = ref(database, `players/${auth.currentUser.uid}`);
    const playerInRoomRef = ref(
      database,
      `rooms/${roomCode}/players/${auth.currentUser.uid}`
    );
    onDisconnect(playerInRoomRef).remove();
    onDisconnect(playerRef).update({ room: null });

    const hostRef = ref(database, `players/${roomData.host}`);
    const hostSnapshot = await get(hostRef);
    let hostUsername = "Unknown Host";
    if (hostSnapshot.exists()) {
      hostUsername = hostSnapshot.val().username;
    }

    setRoomCode(roomCode);
    setIsLobbyVisible(true);
  };

  // GAME LOBBY //

  const [isRoomSettingsVisible, setIsRoomSettingsVisible] = useState(false);

  const openRoomSettings = () => setIsRoomSettingsVisible(true);
  const closeRoomSettings = () => setIsRoomSettingsVisible(false);

  const beginReadyGame = async () => {
    if (!roomCode) return;
    const roomRef = ref(database, `rooms/${roomCode}`);

    await update(roomRef, {
      gameStarted: true,
    });
  };

  const enterGame = async () => {
    if (!roomCode) return;

    const roomRef = ref(database, `rooms/${roomCode}`);

    await update(roomRef, { gameReady: true });

    const playersRef = ref(database, `rooms/${roomCode}/players`);

    const playersSnapshot = await get(playersRef);
    const players = playersSnapshot.val();

    const allReady = Object.values(players).every(
      (player: any) => player.ready === true
    );

    if (allReady) {
      await update(roomRef, { gameReady: true });
    }
  };

  // SETTINGS PAGE //

  const [isSettingsVisible, setIsSettingsVisible] = useState(false);

  const openSettings = () => {
    setIsSettingsVisible(true);
  };
  const closeSettings = () => setIsSettingsVisible(false);

  const [isNameChangeVisible, setIsNameChangeVisible] = useState(false);

  const openNameChange = () => setIsNameChangeVisible(true);
  const closeNameChange = () => setIsNameChangeVisible(false);

  const storage = getStorage();

  const [selectedImage, setSelectedImage] = useState<string | undefined>(
    undefined
  );
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);

      if (auth.currentUser !== null) {
        const currentUid = auth.currentUser.uid;
        const currentUserRef = ref_storage(storage, `${currentUid}/pfp.jpg`);

        const image = await fetch(result.assets[0].uri);
        const imageBlob = await image.blob();
        await uploadBytes(currentUserRef, imageBlob);
      }
    } else {
      alert("Nothing changed");
    }
  };

  const fetchImageURL = async () => {
    try {
      if (auth.currentUser !== null) {
        const currentUid = auth.currentUser.uid;
        const placeholderRef = ref_storage(storage, `${currentUid}/pfp.jpg`);
        const url = await getDownloadURL(placeholderRef);
        return url;
      }
    } catch (error) {
      console.error("Error fetching image URL:", error);
    }
  };

  useEffect(() => {
    async function loadImage() {
      const url = await fetchImageURL();
      setImageUrl(url);
    }
    loadImage();
  }, [isSettingsVisible]);

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = getAuth().onAuthStateChanged((user) => {
      if (!user) {
        router.replace("/");
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLeave = async () => {
    if (auth.currentUser) {
      const playerRef = ref(database, `players/${auth.currentUser.uid}`);
      const playerSnapshot = await get(playerRef);

      if (playerSnapshot.exists()) {
        const playerData = playerSnapshot.val();

        await update(playerRef, { room: null });

        if (playerData.room !== null) {
          const roomRef = ref(database, `rooms/${playerData.room}`);
          const roomSnapshot = await get(roomRef);

          if (roomSnapshot.exists()) {
            const roomData = roomSnapshot.val();
            if (roomData.host === auth.currentUser.uid) {
              await remove(roomRef);
            } else {
              await remove(
                ref(
                  database,
                  `rooms/${playerData.room}/players/${auth.currentUser.uid}`
                )
              );
            }
          }
        }
      }
    }
  };

  const handleSignOut = async () => {
    handleLeave();

    await auth.signOut();
    router.replace("/");
  };

  const handleNameChange = async (newName: string) => {
    if (auth.currentUser) {
      const playerRef = ref(database, `players/${auth.currentUser.uid}`);
      update(playerRef, { username: newName });
    }
  };

  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (auth.currentUser) {
      const usernameRef = ref(
        database,
        `players/${auth.currentUser.uid}/username`
      );

      const unsubscribe = onValue(usernameRef, (snapshot) => {
        setUsername(snapshot.val());
      });

      return () => unsubscribe();
    }
  }, []);

  // console.log("isLobbyVisible", isLobbyVisible);
  // console.log("isInGame", isInGame);
  // useEffect(() => {
  //   console.log("GameLobbyModal visible:", isLobbyVisible);
  //   console.log("isInGame", isInGame);
  // }, [isLobbyVisible, isInGame]);
  return (
    <SafeAreaView style={globalStyles.container}>
      {/* // SETTINGS PAGE // */}
      <View style={[settingsStyles.topContainer, { position: "absolute" }]}>
        <TouchableOpacity
          onPress={() => {
            playSound("buttonClick");
            openSettings();
          }}
        >
          <Image
            source={{ uri: imageUrl }}
            style={settingsStyles.profileIcon}
          />
        </TouchableOpacity>
      </View>
      <Modal visible={isSettingsVisible} animationType="fade">
        <View style={settingsStyles.container}>
          <TouchableOpacity
            style={settingsStyles.topContainer}
            onPress={() => {
              playSound("buttonClick");
              closeSettings();
            }}
          >
            {Platform.OS === "ios" ? (
              <IconSymbol
                name="x.circle.fill"
                size={60}
                color={"#3a160e"}
                style={settingsStyles.closeButton}
              />
            ) : (
              <Icon
                name="close"
                size={60}
                color={"#3a160e"}
                style={settingsStyles.closeButton}
              />
            )}
          </TouchableOpacity>
          <View style={settingsStyles.profileHolder}>
            {imageUrl ? (
              <ImageViewer
                source={{ uri: imageUrl }}
                selectedImage={selectedImage}
              />
            ) : (
              <AppText style={styles.loadingText}>Loading image...</AppText>
            )}
          </View>

          <AppText style={settingsStyles.username}>{username}</AppText>
          <ReusableButton
            label="Choose Profile"
            theme="pfp"
            onPress={() => {
              playSound("buttonClick");
              pickImage();
            }}
          />
          <ReusableButton
            label="Change Username"
            theme="username"
            onPress={() => {
              playSound("buttonClick");
              openNameChange();
            }}
          />
          <InputModal
            visible={isNameChangeVisible}
            title="Change Username"
            onConfirm={handleNameChange}
            onClose={() => {
              playSound("buttonClick");
              closeNameChange();
            }}
          />
          <View
            style={{
              padding: 10,
              borderRadius: 5,
              bottom: 50,
              position: "absolute",
            }}
          >
            <TouchableOpacity
              onPress={() => {
                playSound("buttonClick");
                handleSignOut();
              }}
            >
              <AppText>Sign Out</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* // GAME LOBBY // */}

      {isLobbyVisible && (
        <GameLobbyModal
          visible={isLobbyVisible}
          roomCode={roomCode}
          beginReadyGame={beginReadyGame}
          enterGame={enterGame}
          closeLobby={() => {
            closeLobby();
            handleLeave();
          }}
        />
      )}
      

      {/* // HOME SCREEN // */}
      <View style={styles.joinContainer}>
        <AppText style={{ bottom: 75 }}>Adventure is waiting...</AppText>

        <SignIcon />

        <ReusableButton
          label="Create a Room"
          onPress={() => {
            playSound("buttonClick");
            createRoom();
          }}
        />
        <ReusableButton
          label="Join a Room"
          onPress={() => {
            playSound("buttonClick");
            openInput();
          }}
          buttonStyle={{ backgroundColor: "transparent", marginTop: -20 }}
          buttonTextStyle={{ color: "#824a32" }}
        />

        <InputModal
          visible={isCodeInputVisible}
          title="Join Room"
          placeholder="Enter Code"
          onClose={() => {
            playSound("buttonClick");
            closeInput();
          }}
          onConfirm={joinRoom}
          confirmText="Enter"
          closeText="Cancel"
          inputType="numeric"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  joinContainer: {
    position: "absolute",
    bottom: 30,
    alignItems: "center",
    width: "100%",
  },
  loadingText: {
    fontSize: 18,
    color: "#333",
    fontWeight: "bold",
  },
});

const settingsStyles = StyleSheet.create({
  container: {
    height: "100%",
    alignItems: "center",
    backgroundColor: "#faf6ea",
  },
  topContainer: {
    top: 50,
    width: "100%",
    height: 75,
    justifyContent: "center",
    alignItems: "center",
  },
  profileIcon: {
    width: 60,
    height: 60,
    borderColor: "#3a160e",
    borderRadius: 30,
    borderWidth: 2,
    left: "35%",
  },
  closeButton: { right: "35%" },
  profileHolder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "#3a160e",
    marginTop: 75,
    marginLeft: "auto",
    marginRight: "auto",
    marginBottom: 25,
    overflow: "hidden",
  },
  username: {
    marginBottom: 20,
    fontSize: 20,
  },
});
