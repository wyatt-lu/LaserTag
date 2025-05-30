// React/Expo Imports

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  Text,
  TouchableOpacity,
  View,
  FlatList,
  Modal,
  Pressable,
  Dimensions,
  Platform,
  StyleSheet,
  StatusBar,
  Vibration,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import MapView, {
  MapPressEvent,
  Marker,
  Polygon,
  Polyline,
} from "react-native-maps";
import { Magnetometer } from "expo-sensors";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
  configureReanimatedLogger,
  ReanimatedLogLevel,
  withSpring,
} from "react-native-reanimated";

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

import { useSound } from "@/constants/useSound";

// Firebase Imports
import {
  get,
  off,
  onValue,
  ref,
  remove,
  set,
  update,
  DataSnapshot,
} from "firebase/database";

import { auth, database } from "../../firebaseconfig";
import {
  getStorage,
  ref as ref_storage,
  getDownloadURL,
} from "firebase/storage";

// Component Imports
import AppText from "@/components/AppText";
import ReusableButton from "@/components/ReusableButton";
import PowerUpMarker from "@/components/PowerUpMarker";
import PlayerListModal from "@/components/PlayerListModal";
import GameEndModal from "@/components/GameEndModal";
import { fireLaser } from "@/functions/fireLaser";
// import { styles } from "@/constants/styles";
import {
  teamColors,
  playerColors,
  powerUpTypes,
} from "@/constants/gameplayConstants";
import {
  latLngToCartesian,
  cartesianToLatLng,
  degree,
} from "@/functions/locationUtilityFunctions";
import {
  cowboyBoots,
  cowboyHat,
} from "@/functions/powerupFunctions";
import {
  BootsIcon,
  CactusIcon,
  HatIcon,
} from "@/constants/icons";
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function PlayScreen() {
  // Global Variables
  // Laser Type (length, width)
  const LASER_LENGTH = 7; // in meters
  const PLAYER_HIT_BOX_SIZE = { height: 10, width: 10 };
  const LOCATION_UPDATE_INTERVAL = 1000; // ms
  const FIRE_LASER_COOLDOWN = 5; // seconds
  const [laserLines, setLaserLines] = useState<{ id: string; start: LatLng; end: LatLng }[]>([]);

  const { playSound } = useSound();

  // Team Colors (team number, color)

  // Player Colors (player number, color)

  //Set Boundary
  const [boundary, setBoundary] = useState<LatLng[]>([
    { latitude: 0, longitude: 0 },
    { latitude: 0, longitude: 0 },
    { latitude: 0, longitude: 0 },
    { latitude: 0, longitude: 0 },
  ]);
  const [boundarySize, setBoundarySize] = useState<any>({
    width: 0,
    height: 0,
  });
  // Set State Variable to Game (used state based on Firebase)
  // State Variable: Lobby, Game
  const [gameState, setGameState] = useState<
    "in-game" | "end-game" | "return" | null
  >(null);
  const [center, setCenter] = useState<LatLng>({
    latitude: 47.732473984376654,
    longitude: -122.32739349311144,
  });

  //Set Boundary

  const params = useLocalSearchParams();
  const router = useRouter();
  const { roomCode } = params;

  useEffect(() => {
    if (!roomCode || !auth.currentUser) return;

    const initializeGameState = async () => {
      try {
        const roomRef = ref(database, `rooms/${roomCode}`);
        const roomSnapshot = await get(roomRef);

        if (!roomSnapshot.exists()) {
          console.error("Room does not exist");
          return;
        }

        const roomData = roomSnapshot.val();

        // If game state doesn't exist yet, initialize it to "in-game"
        if (!roomData.gameState) {
          await update(roomRef, { gameState: "in-game" });
        }
      } catch (error) {
        console.error("Error initializing game state:", error);
      }
    };

    initializeGameState();

    // Set up real-time listener for game state changes
    const gameStateRef = ref(database, `rooms/${roomCode}/gameState`);
    const unsubscribe = onValue(gameStateRef, (snapshot) => {
      if (snapshot.exists()) {
        const newGameState = snapshot.val();
        setGameState(newGameState);

        if (newGameState === "end-game") {
          if (generatePowerUpIntervalRef.current) {
            clearInterval(generatePowerUpIntervalRef.current);
            generatePowerUpIntervalRef.current = null;
          }
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }

          // Clean up Firebase listeners for powerups
          if (roomCode) {
            const powerUpsRef = ref(database, `rooms/${roomCode}/powerUps`);
            off(powerUpsRef);
          }
        }
        if (newGameState === "return") {
          router.replace("/(tabs)/home");
          const roomRef = ref(database, `rooms/${roomCode}`);
          remove(roomRef);
        }
      }
    });
    return () => unsubscribe();
  }, [roomCode, router]);

  useEffect(() => {
    const getGameState = async () => {
      const roomRef = ref(database, `rooms/${roomCode}`);
      const roomInfo = await get(roomRef);
      if (!roomInfo.exists()) return;
      const roomData = roomInfo.val();
      let boundaryWidth = roomData.boundarySize.width;
      let boundaryHeight = roomData.boundarySize.height;
      let tempCenter = roomData.initialLocation;
      setCenter(tempCenter);
      setBoundarySize({ width: boundaryWidth, height: boundaryHeight });

      setPowerUps([]);
      setUserPowerUps([]);

      await AsyncStorage.setItem("eliminatedFully", "false");

      if (roomData.gameReady) {
        roomData.gameDuration
          ? startGameTimer(roomData.gameDuration)
          : startGameTimer(600);
        playSound("backgroundTheme");
        if (mapRef.current) {
          setTimeout(() => {
            mapRef.current?.animateToRegion(
              {
                latitude: tempCenter.latitude,
                longitude: tempCenter.longitude,
                latitudeDelta: 0.002222,
                longitudeDelta: 0.001521,
              },
              1000
            );
          }, 500);
        }
      }
      setBoundary([
        {
          latitude: cartesianToLatLng(
            { x: boundaryWidth / 2, y: -boundaryHeight / 2 },
            tempCenter
          ).latitude,
          longitude: cartesianToLatLng(
            { x: boundaryWidth / 2, y: -boundaryHeight / 2 },
            tempCenter
          ).longitude,
        },
        {
          latitude: cartesianToLatLng(
            { x: -boundaryWidth / 2, y: -boundaryHeight / 2 },
            tempCenter
          ).latitude,
          longitude: cartesianToLatLng(
            { x: -boundaryWidth / 2, y: -boundaryHeight / 2 },
            tempCenter
          ).longitude,
        },
        {
          latitude: cartesianToLatLng(
            { x: -boundaryWidth / 2, y: boundaryHeight / 2 },
            tempCenter
          ).latitude,
          longitude: cartesianToLatLng(
            { x: -boundaryWidth / 2, y: boundaryHeight / 2 },
            tempCenter
          ).longitude,
        },
        {
          latitude: cartesianToLatLng(
            { x: boundaryWidth / 2, y: boundaryHeight / 2 },
            tempCenter
          ).latitude,
          longitude: cartesianToLatLng(
            { x: boundaryWidth / 2, y: boundaryHeight / 2 },
            tempCenter
          ).longitude,
        },
      ]);
    };
    getGameState();
  }, [roomCode]);

  // Longitude Latitude to Cartesian Coordinate function (where Center = (0,0))

  type LatLng = { latitude: number; longitude: number };
  type XY = { x: number; y: number };

  // Change Player Location to Cartesian Coordinate
  // Send Player Location (cartesian) to Firebase

  // Current Player Location

  const [location, setLocation] = useState<Location.LocationObject>();
  const [magnetometerData, setMagnetometerData] = useState({
    x: 0,
    y: 0,
    z: 0,
  });
  Magnetometer.setUpdateInterval(LOCATION_UPDATE_INTERVAL);

  const magnetometerDataRef = useRef(magnetometerData);
  const magnetometerSubscriptionRef = useRef<any>(null);

  // Update User Location
  useEffect(() => {
    magnetometerDataRef.current = magnetometerData;
  }, [magnetometerData]);

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;

    const updateLocation = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        return;
      }

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 0.001,
        },
        (newLocation) => {
          setLocation(newLocation);
          setMagnetometerData((prevData) => {
            const direction = degree(prevData.x, prevData.y);
            updatePlayerLocation(
              newLocation.coords.latitude,
              newLocation.coords.longitude,
              direction
            );
            return prevData;
          });
        }
      );
    };

    const getCurrentDirection = () => {
      if (magnetometerSubscriptionRef.current) {
        magnetometerSubscriptionRef.current?.remove();
      }

      magnetometerSubscriptionRef.current = Magnetometer.addListener((data) => {
        setMagnetometerData(data);
      });
    };

    updateLocation();
    getCurrentDirection();

    return () => {
      locationSubscription?.remove();
      magnetometerSubscriptionRef.current?.remove();
    };
  }, [gameState]);

  const updatePlayerLocation = async (
    latitude: number,
    longitude: number,
    direction: number
  ) => {
    /*THIS IS A PATCH ISSUE IS THAT CENTER (VALUE NOT THE ACTUAL USESTATE) IS BEING
    PASSED TO LATLNGTOCARTESIAN INCORRECTLY (WITH THE DEFAULT LAKESIDE VALUE), DON'T
    KNOW WHY MAYBE HAS SOMETHING TO DO WITH HOOKS + SET INTERVAL NOT MESHING*/
    if (
      !auth.currentUser ||
      (center.latitude == 47.732473984376654 &&
        center.longitude == -122.32739349311144)
    )
      return;
    const cartesian = latLngToCartesian({ latitude, longitude }, center);
    const playerId = auth.currentUser.uid;
    const playerRef = ref(database, `rooms/${roomCode}/players/${playerId}`);
    outOfBounds(cartesian.x, cartesian.y);
    setPlayerHitBox({
      player: auth.currentUser.uid,
      x: cartesian.x,
      y: cartesian.y,
      width: PLAYER_HIT_BOX_SIZE.width,
      height: PLAYER_HIT_BOX_SIZE.height,
    });
    if (gameState === "in-game") {
      await update(playerRef, {
        cartesian,
        direction,
      });
    }
  };

  //Remove user from game if they leave the boundary

  const outOfBounds = async (x: number, y: number) => {
    if (
      x > boundarySize.width ||
      x < -boundarySize.width ||
      y > boundarySize.height ||
      y < -boundarySize.height
    ) {
      if (!auth.currentUser) return;
      const playerId = auth.currentUser.uid;
      const playerRef = ref(database, `rooms/${roomCode}/players/${playerId}`);
      await update(playerRef, { eliminated: true });
    }
  };
  // Get PlayerURL from Firebase (storage as URL)

  const storage = getStorage();

  const [playersURL, setPlayersURL] = useState<any[]>([]);
  const [playerArray, setPlayerArray] = useState<any[]>([]);

  useEffect(() => {
    const getPlayersURL = async () => {
      try {
        if (!auth.currentUser) return;

        const playerId = auth.currentUser.uid;
        const playerRef = ref(database, `players/${playerId}`);
        const playerInfo = await get(playerRef);

        if (playerInfo.exists()) {
          const playerData = playerInfo.val();
          const roomRef = ref(database, `rooms/${playerData.room}/players`);
          const roomInfo = await get(roomRef);
          if (roomInfo.exists()) {
            const roomData = roomInfo.val();
            const playersList = await Promise.all(
              Object.entries(roomData).map(async ([key]) => {
                if (key.length <= 7) {
                  return;
                }

                let userURL = await fetchUserURL(key);
                return { id: key, profile: userURL };
              })
            );
            setPlayersURL(playersList);
          }
        }
      } catch (error) {
        console.error("Error fetching player data:", error);
      }
    };

    getPlayersURL();
  }, [playerArray.length]);

  const fetchUserURL = async (id: any) => {
    try {
      if (!id) return;
      const playerRef = ref(database, `/rooms/${roomCode}/players/${id}`);
      const playerInfo = await get(playerRef);
      if (!playerInfo.exists()) return;
      const playerData = playerInfo.val();
      if (playerData.fake) return;

      const placeholderRef = ref_storage(storage, `${id}/pfp.jpg`);
      const url = await getDownloadURL(placeholderRef);
      return url;
    } catch (error) {
      console.error("Error fetching image URL:", error);
    }
  };

  // Get All Players Location from Firebase (cartesian)

  const [eliminatedFully, setEliminatedFully] = useState<boolean>(false);
  useEffect(() => {
    const playersRef = ref(database, `rooms/${roomCode}/players`);
    const unsubscribe = onValue(playersRef, async (snapshot) => {
      if (!auth.currentUser) return;
      try {
        const playersData = snapshot.val();
        const entries = Object.entries(playersData);
        const updatedPlayersList = [];

        for (const [id, data] of entries) {
          const player = { id, ...(data as any) };
          updatedPlayersList.push(player);
          //vibrate if out at all
          const stored = await AsyncStorage.getItem("eliminatedFully");
          console.log("stored", stored);
          if (player.eliminated && auth.currentUser.uid == player.id) {
            if (stored !== "true") {
              setEliminatedFully(true);
              await AsyncStorage.setItem("eliminatedFully", "true");
              Vibration.vibrate(300);
            } else {
              setEliminatedFully(true);
            }
          }
        }
        setPlayerArray(updatedPlayersList);
      } catch (error) {}
    });
    return () => {
      unsubscribe();
      off(playersRef);
    };
  }, [gameState]);

  // Set playerArray to include All Players URL and Location (cartesian)

  // Set Hit Box for each player (delta x, delta y)

  interface Box {
    player: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }

  const [playerHitBox, setPlayerHitBox] = useState<Box>();

  const inHitBox = async (powerup: PowerUp, player: Box) => {
    if (!auth.currentUser) return;
    const playerRef = ref(
      database,
      `rooms/${roomCode}/players/${auth.currentUser.uid}`
    );
    const playerInfo = await get(playerRef);
    if (!playerInfo.exists()) return;
    const playerData = playerInfo.val();
    if (playerData.cowboyHat) return false;

    if (
      Math.abs(player.x - powerup.cartesian.x) <= player.width / 2 &&
      Math.abs(player.y - powerup.cartesian.y) <= player.height / 2
    ) {
      return true;
    } else {
      return false;
    }
  };

  //eliminate player modal check
  const [eliminationMessage, setEliminationMessage] = useState<string | null>(
    null
  );
  const [shownEliminations, setShownEliminations] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    console.log("Room code is", roomCode);
    const roomPlayerRef = ref(database, `rooms/${roomCode}/players`);
    const handleSnapshot = (snapshot: DataSnapshot) => {
      const playersData = snapshot.val();
      if (!playersData) return;
      console.log("playersData", playersData);
      Object.entries(playersData).forEach(([playerId, playerData]) => {
        const { eliminated, username } = playerData as {
          eliminated: boolean;
          username: string;
        };
        console.log("Player:", username, "Eliminated:", eliminated);
        setShownEliminations((prev) => {
          if (eliminated && !prev.has(playerId)) {
            // New Set so React knows it's a change
            const newSet = new Set(prev);
            newSet.add(playerId);

            setEliminationMessage(`${username} has been eliminated`);
            setTimeout(() => setEliminationMessage(null), 3000);

            return newSet;
          }
          return prev;
        });
      });
    };
    onValue(roomPlayerRef, handleSnapshot);
    return () => off(roomPlayerRef, "value", handleSnapshot);
  }, [roomCode]);

  //checks if updating correctlyf
  useEffect(() => {
    console.log("eliminationMessage changed:", eliminationMessage);
  }, [eliminationMessage]);

  // Generate Powerups
  type PowerUp = {
    id: string;
    type: string;
    cartesian: XY;
  };

  const powerUpTypes = [
    { type: "Cowboy Boots" },
    { type: "Cowboy Hat" },
    { type: "Cactus" },
  ];

  const generatePowerUpIntervalRef = useRef<NodeJS.Timeout | null>(null);

  //all of user's powerups in their inventory
  const [userPowerUps, setUserPowerUps] = useState<
    { id: string; type: string; count: number }[]
  >([]);

  //all of the powerups currently in play in the game
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);

  //generate random powerup coordinate
  const generateRandomCartesianInBounds = () => {
    const minLat = boundary[2].latitude;
    const maxLat = boundary[0].latitude;
    const minLng = boundary[3].longitude;
    const maxLng = boundary[1].longitude;
    // console.log("minLat", minLat);
    // console.log("maxLat", maxLat);
    // console.log("minLng", minLng);
    // console.log("maxLng", maxLng);
    const randLatLng = {
      latitude: Math.random() * (maxLat - minLat) + minLat,
      longitude: Math.random() * (maxLng - minLng) + minLng,
    };
    const cartesian = latLngToCartesian(randLatLng, center);
    return {
      x: cartesian.x,
      y: cartesian.y,
    };
  };

  //make random powerups
  const getRandomPowerUp = (): PowerUp => {
    const randomType =
      powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
    return {
      id: Math.random().toString(36).substring(7), // Random ID
      type: randomType.type,
      cartesian: generateRandomCartesianInBounds(),
    };
  };

  //despawn powerups
  useEffect(() => {
    if (generatePowerUpIntervalRef.current) {
      clearInterval(generatePowerUpIntervalRef.current);
      generatePowerUpIntervalRef.current = null;
    }

    if (gameState === "in-game" && roomCode) {
      generatePowerUpIntervalRef.current = setInterval(async () => {
        const newPowerUp = getRandomPowerUp();
        const powerUpsRef = ref(
          database,
          `rooms/${roomCode}/powerUps/${newPowerUp.id}`
        );
        await set(powerUpsRef, newPowerUp);

        const despawnTime = Math.random() * (72000 - 3000) + 3000;
        setTimeout(async () => {
          // Only remove if still in-game state
          if (gameState === "in-game") {
            await remove(powerUpsRef);
          }
        }, despawnTime);
      }, Math.random() * (4000 - 3000) + 3600);
    }

    return () => {
      if (generatePowerUpIntervalRef.current) {
        clearInterval(generatePowerUpIntervalRef.current);
        generatePowerUpIntervalRef.current = null;
      }
    };
  }, [gameState, center]);

  //set powerups up in a usestate
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    const fetchPowerUps = async () => {
      if (!roomCode) return;

      const powerUpsRef = ref(database, `rooms/${roomCode}/powerUps`);
      const unsubscribe = onValue(powerUpsRef, (snapshot) => {
        const powerUpsData = snapshot.val();
        if (powerUpsData) {
          const powerUpsList = Object.values(powerUpsData).map(
            (powerUp: any) => ({
              id: powerUp.id,
              type: powerUp.type,
              cartesian: {
                x: powerUp.cartesian.x,
                y: powerUp.cartesian.y,
              },
            })
          );
          setPowerUps(powerUpsList);
        } else {
          setPowerUps([]);
        }
      });
    };
    fetchPowerUps();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [gameState]);

  // Determine if Player Hit Box Intersects with Powerup Location (big human hit box, no powerup hit box)

  useEffect(() => {
    if (!auth.currentUser) return;

    const playerId = auth.currentUser.uid;
    const playerRef = ref(database, `rooms/${roomCode}/players/${playerId}`);
    const checkLocationPowerUpAndCactus = async () => {
      const playerInfo = await get(playerRef);
      if (!playerInfo.exists()) return;
      const playerData = playerInfo.val();
      if (playerData.eliminated || !playerHitBox) return;
      let playerPowerUps = userPowerUps;
      powerUps.map(async (powerUp) => {
        /* change the delta to be whatever value u want*/
        if (await inHitBox(powerUp, playerHitBox)) {
          const existingPowerUp = playerPowerUps.find(
            (p) => p.type === powerUp.type
          );
          if (existingPowerUp) {
            existingPowerUp.count += 1;
          } else {
            playerPowerUps.push({
              id: powerUp.id,
              type: powerUp.type,
              count: 1,
            });
          }
          setUserPowerUps([...playerPowerUps]);

          try {
            const individualPowerRef = ref(
              database,
              `rooms/${roomCode}/powerUps/${powerUp.id}`
            );
            await remove(individualPowerRef);
          } catch (error) {
            console.error("Error removing power-up:", error);
          }
        }
      });
      const cactusRef = ref(database, `rooms/${roomCode}/cactus`);
      const cactusInfo = await get(cactusRef);
      if (!cactusInfo.exists()) return;
      const cactusData = cactusInfo.val();

      const cactusArray = Object.keys(cactusData).map((key) => ({
        id: key,
        ...cactusData[key],
      }));

      cactusArray.forEach(async (cactus) => {
        if (await inHitBox(cactus, playerHitBox)) {
          //remove current player from game if they are on an active cactus
          await update(playerRef, { eliminated: true });

          //reward the cactus placer
          const cactusPlacerRef = ref(
            database,
            `rooms/${roomCode}/players/${cactus.creator}`
          );
          const cactusPlacerInfo = await get(cactusPlacerRef);
          if (!cactusPlacerInfo.exists()) return;
          const cactusPlacerData = cactusPlacerInfo.val();
          let newPoints = cactusPlacerData.points + 1;
          await update(cactusPlacerRef, { points: newPoints });
          //remove the used cactus from cactus folder
          const usedCactusRef = ref(
            database,
            `rooms/${roomCode}/cactus/${cactus.id}`
          );
          await remove(usedCactusRef);
        }
      });
    };

    checkLocationPowerUpAndCactus();
  }, [playerArray]);

  //Cactus Power up (here because of all the vars it needs here and would need in powerupfunctions)

  const [activeCactusId, setActiveCactusId] = useState<string | null>(null);
  const [cactusModalVisible, setCactusModalVisible] = useState(false);
  const [selectedCactusLocation, setSelectedCactusLocation] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const cactusMapPress = (event: MapPressEvent) => {
    const tempLatLng = event.nativeEvent.coordinate;
    const tempXY = latLngToCartesian(tempLatLng, center);
    setSelectedCactusLocation(tempXY);
  };

  const handleConfirm = async () => {
    if (selectedCactusLocation && activeCactusId) {
      if (!auth.currentUser) return;
      const cactusRef = ref(
        database,
        `rooms/${roomCode}/cactus/${activeCactusId}`
      );
      await update(cactusRef, {
        cartesian: {
          x: selectedCactusLocation.x,
          y: selectedCactusLocation.y,
        },
        creator: auth.currentUser.uid,
      });
    }
    setSelectedCactusLocation(null);
    setCactusModalVisible(false);
    setActiveCactusId(null);
  };

  // Powerup Function Calls (functions in seperate files)

  //Using the powerup when user clicks the button:

  const usePowerUp = async (powerUp: {
    id: string;
    type: any;
    coordinate?: { latitude: number; longitude: number };
  }) => {
    //vibrate if use a powerup
    Vibration.vibrate(100);
    //return if user is eliminated: don't let them continue to use their powerups in their inventory
    if (!auth.currentUser) return;
    const playerRef = ref(
      database,
      `/rooms/${roomCode}/players/${auth.currentUser.uid}`
    );
    const playerInfo = await get(playerRef);
    if (!playerInfo.exists()) return;
    const playerData = playerInfo.val();
    if (playerData.eliminated) return;

    switch (powerUp.type) {
      case "Cowboy Boots":
        cowboyBoots();
        break;
      case "Cowboy Hat":
        cowboyHat(roomCode);
        break;
      case "Cactus":
        const seeIfUserHasCactus = async () => {
          const cactusRef = ref(database, `rooms/${roomCode}/cactus`);
          const cactusInfo = await get(cactusRef);
          if (!cactusInfo.exists()) {
            setActiveCactusId(powerUp.id ?? null);
            setCactusModalVisible(true);
            setUserPowerUps((prev) =>
              prev
                .map((p) =>
                  p.id === powerUp.id ? { ...p, count: p.count - 1 } : p
                )
                .filter((p) => p.count > 0)
            );
            return;
          }
          const cactusData = cactusInfo.val();

          const cactusArray = Object.keys(cactusData).map((key) => ({
            id: key,
            ...cactusData[key],
          }));
          let cactusAlreadyMade = false;
          for (const cactus of cactusArray) {
            if (!auth.currentUser) return;
            if (cactus.creator == auth.currentUser.uid) {
              cactusAlreadyMade = true;
              return;
            }
          }
          setActiveCactusId(powerUp.id ?? null);
          setCactusModalVisible(true);
          //only remove a powerup if cactus hasn't been made
          if (cactusAlreadyMade == false) {
            setUserPowerUps((prev) =>
              prev
                .map((p) =>
                  p.id === powerUp.id ? { ...p, count: p.count - 1 } : p
                )
                .filter((p) => p.count > 0)
            );
          }
        };
        seeIfUserHasCactus();
        return;
      default:
        console.log("Using unknown powerup");
        break;
      //use Powerups (-1 to count)
    }
    setUserPowerUps((prev) =>
      prev
        .map((p) => (p.id === powerUp.id ? { ...p, count: p.count - 1 } : p))
        .filter((p) => p.count > 0)
    );
  };

  const renderPowerUpItem = ({
    item,
  }: {
    item: { id: string; type: string; count: number };
  }) => {
    return (
      <TouchableOpacity
        style={styles.powerUpItem}
        onPress={() => {
          usePowerUp(item);
        }}
      >
        <View style={styles.powerUpIconContainer}>
          {item.type === "Cowboy Boots" && <BootsIcon width={30} height={30} />}
          {item.type === "Cactus" && <CactusIcon width={30} height={30} />}
          {item.type === "Cowboy Hat" && <HatIcon width={30} height={30} />}
        </View>
        <AppText style={styles.powerUpCount}>{item.count}</AppText>
      </TouchableOpacity>
    );
  };

  // Reset Game/Exit Game (Set State Variable to Lobby)

  // Game Ending Screen (modal)

  // Bottom Sheet (Powerup List, Player List, Fire Button)
  const snapPoints = useMemo(() => ["15%", "31%", "75%"], []);

  const mapRef = useRef<MapView | null>(null);
  const sheetRef = useRef<BottomSheet>(null);

  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);

  const handleSnapPress = useCallback(() => {
    if (isBottomSheetOpen) {
      sheetRef.current?.snapToIndex(0);
    } else {
      sheetRef.current?.snapToIndex(2);
    }
    setIsBottomSheetOpen(!isBottomSheetOpen);
  }, [isBottomSheetOpen]);

  const getPlayerColor = (colorId: number): string => {
    const playerColor = playerColors.find((player) => player.id === colorId);
    return playerColor ? playerColor.color : "#8baaff";
  };

  const getTeamColor = (teamNumber: number): string => {
    const teamColor = teamColors.find((team) => team.team === teamNumber);
    return teamColor ? teamColor.color : "#8baaff";
  };

  const [isPlayerListModal, setPlayerListModal] = useState(false);

  const [gameTime, setGameTime] = useState<number>(0); // Total game time in seconds
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const timerProgress = useSharedValue(1); // 1 = full, 0 = empty

  const progressBarStyle = useAnimatedStyle(() => {
    return {
      width: `${timerProgress.value * 100}%`,
      height: "100%",
      backgroundColor:
        timerProgress.value > 0.2
          ? timerProgress.value > 0.5
            ? "#88cb54"
            : "#ffe08b"
          : "#cb4533",
      borderRadius: 5,
    };
  });

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  useEffect(() => {
    const gameTimerRef = ref(database, `rooms/${roomCode}/gameTimer`);

    const unsubscribe = onValue(gameTimerRef, (snapshot) => {
      const timerData = snapshot.val();
      if (timerData) {
        setGameTime(timerData.totalTime || 0);
        setTimeRemaining(timerData.timeRemaining || 0);
        setIsTimerRunning(timerData.isRunning || false);

        // Animate the progress bar
        if (timerData.totalTime > 0) {
          timerProgress.value = withTiming(
            timerData.timeRemaining / timerData.totalTime,
            { duration: 1000, easing: Easing.linear }
          );
        }
      }
    });
    return () => unsubscribe();
  }, [gameState]);

  useEffect(() => {
    // Clear any existing timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Start a new timer if it should be running and we're in-game
    if (gameState === "in-game" && timeRemaining > 0) {
      timerIntervalRef.current = setInterval(async () => {
        setTimeRemaining((prev) => {
          const newTime = prev - 1;

          // Update Firebase with the new time
          if (roomCode) {
            const gameTimerRef = ref(database, `rooms/${roomCode}/gameTimer`);
            update(gameTimerRef, { timeRemaining: newTime });

            // If time is up, transition to end-game state
            if (newTime <= 0) {
              clearInterval(timerIntervalRef.current!);
              timerIntervalRef.current = null;

              // Update game state to end-game in Firebase
              const gameStateRef = ref(database, `rooms/${roomCode}/gameState`);
              set(gameStateRef, "end-game");
            }
          }

          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isTimerRunning, timeRemaining, roomCode]);

  const startGameTimer = async (durationInSeconds: number) => {
    if (!roomCode) return;

    // Clear existing timer if it exists
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Set new timer
    const gameTimerRef = ref(database, `rooms/${roomCode}/gameTimer`);
    await set(gameTimerRef, {
      totalTime: durationInSeconds,
      timeRemaining: durationInSeconds,
      isRunning: true,
      startedAt: Date.now(),
    });

    // Update game state to in-game
    const gameStateRef = ref(database, `rooms/${roomCode}/gameState`);
    await set(gameStateRef, "in-game");

    // Reset powerups
    const powerUpsRef = ref(database, `rooms/${roomCode}/powerUps`);
    await remove(powerUpsRef);

    // Update local state
    setTimeRemaining(durationInSeconds);
    setGameTime(durationInSeconds);
    setIsTimerRunning(true);
  };

  const resetGame = async () => {
    if (!auth.currentUser) return;

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

    // clear the interval that generates power-ups
    if (generatePowerUpIntervalRef.current) {
      clearInterval(generatePowerUpIntervalRef.current);
    }
    setBoundary([
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 0 },
    ]);
    //or null, idk
    setGameState(null);
    setLocation(undefined);
    //setlocation --> nothing?
    setMagnetometerData({ x: 0, y: 0, z: 0 });
    setPlayersURL([]);
    setPlayerArray([]);
    setUserPowerUps([]);
    setPlayerHitBox(undefined);
    setPowerUps([]);
    setUserPowerUps([]);
    setActiveCactusId(null);
    setCactusModalVisible(false);
    setSelectedCactusLocation({ x: 0, y: 0 });
    setIsBottomSheetOpen(false);
    setPlayerListModal(false);
    setGameTime(0);
    setTimeRemaining(0);
    setIsTimerRunning(false);
    setTimeout(() => {
      router.replace("/(tabs)/home");
    });
    const gameStateRef = ref(database, `rooms/${roomCode}/gameState`);
    set(gameStateRef, "return");
    sheetRef.current?.snapToIndex(0);
    await AsyncStorage.setItem("eliminatedFully", "false");
    setEliminatedFully(false);
  };

  const [isFireDisabled, setIsFireDisabled] = useState(false);
  const fireCooldownProgress = useSharedValue(1);

  const fireReloadBarStyle = useAnimatedStyle(() => ({
    width: `${fireCooldownProgress.value * 100}%`,
    height: 60,
    backgroundColor: fireCooldownProgress.value === 1 ? "#de2c4a" : "#968e84",
    borderRadius: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    padding: 20,
  }));

  const [isTopSheetVisible, setIsTopSheetVisible] = useState(true);

  const focusOnUserLocation = () => {
    if (mapRef.current && location) {
      mapRef.current.animateToRegion(
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.002222,
          longitudeDelta: 0.001521,
        },
        1000
      );
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar hidden={true} />
      <SafeAreaView style={styles.container} edges={[]}>
        <GestureHandlerRootView style={styles.container}>
          <View style={[styles.persistentButtonContainer]}>
            <View style={[styles.iconButton]}>
              <TouchableOpacity
                onPress={() => {
                  playSound("buttonClick");
                  setIsTopSheetVisible(!isTopSheetVisible);
                }}
              >
                <FontAwesome
                  name={isTopSheetVisible ? "times" : "bars"}
                  size={26}
                  style={styles.buttonIcon}
                />
              </TouchableOpacity>
            </View>
          </View>
          <Animated.View style={[styles.topButtonsContainer]}>
            {isTopSheetVisible && (
              <>
                <View style={styles.topButtonsContainerRow}>
                  <View style={styles.iconButtonSpacer} />
                  <TouchableOpacity
                    style={styles.userInfoButton}
                    onPress={() => {
                      playSound("buttonClick");
                      focusOnUserLocation();
                    }}
                  >
                    <Text style={styles.buttonText}>
                      {auth.currentUser?.displayName}
                    </Text>
                    <Text
                      style={[
                        styles.buttonText,
                        {
                          color: auth.currentUser
                            ? getTeamColor(
                                playerArray.find(
                                  (player) =>
                                    player.id === auth.currentUser?.uid
                                )?.team || 1
                              )
                            : "#FFFFAA",
                        },
                      ]}
                    >
                      {"  "}
                      [TEAM{" "}
                      {playerArray.find(
                        (player) => player.id === auth.currentUser?.uid
                      )?.team || 1}
                      ]
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.timerContainer}>
                  <Text style={styles.timerText}>
                    {formatTime(timeRemaining)}
                  </Text>
                  <View style={styles.timerProgressBackground}>
                    <Animated.View style={progressBarStyle} />
                  </View>
                </View>
              </>
            )}
          </Animated.View>
          {location?.coords?.latitude && location?.coords?.longitude ? (
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.002222,
                longitudeDelta: 0.001521,
              }}
              showsScale={true}
              mapPadding={{ top: 10, right: 10, bottom: 10, left: 10 }}
              mapType="hybrid"
              rotateEnabled={false}
              loadingEnabled={true}
              zoomEnabled={false}
            >
              <Polygon
                coordinates={boundary}
                strokeColor="#FF0000"
                strokeWidth={3}
                fillColor="rgba(255, 0, 0, 0.1)"
              />

              {powerUps.map((powerUp) => (
                <PowerUpMarker
                  key={powerUp.id}
                  cartesian={powerUp.cartesian}
                  center={center}
                  name={powerUp.type}
                />
              ))}
              {laserLines.map((line) => (
                <Polyline
                  key={line.id}
                  coordinates={[line.start, line.end]}
                  strokeColor="#FF0000"
                  strokeWidth={3}
                />
              ))}
              {playerArray.map((player) => {
                if (!player.cartesian || player.eliminated) return null;
                const playerColor = getPlayerColor(player.colorId); // get color based on player's colorId
                return (
                  <Marker
                    key={player.id}
                    coordinate={{
                      latitude: cartesianToLatLng(player.cartesian, center)
                        .latitude,
                      longitude: cartesianToLatLng(player.cartesian, center)
                        .longitude,
                    }}
                  >
                    {!player.cowboyHat && (
                      <View
                        style={[
                          styles.marker,
                          { backgroundColor: playerColor },
                        ]}
                      />
                    )}
                  </Marker>
                );
              })}
            </MapView>
          ) : (
            <Text>Loading map...</Text>
          )}

          <BottomSheet
            ref={sheetRef}
            snapPoints={snapPoints}
            enableDynamicSizing={false}
          >
            <BottomSheetView style={styles.contentContainer}>
              <View style={styles.fireButtonContainer}>
                <Animated.View style={[fireReloadBarStyle]}>
                  <Pressable
                    disabled={isFireDisabled}
                    onPress={async () => {
                      Vibration.vibrate(200);
                      playSound("lasso");
                      const laserVisuals = await fireLaser(
                        database,
                        roomCode,
                        LASER_LENGTH,
                        center
                      );
                      setLaserLines(laserVisuals);
                      setIsFireDisabled(true);
                      fireCooldownProgress.value = 0;
                      fireCooldownProgress.value = withTiming(1, {
                        duration: FIRE_LASER_COOLDOWN * 1000,
                        easing: Easing.linear,
                      });
                      setTimeout(() => {
                        setLaserLines([]); // remove visuals
                        setIsFireDisabled(false);
                      }, FIRE_LASER_COOLDOWN * 1000);
                    }}
                  >
                    <Text style={styles.fireButtonText}>
                      {!isFireDisabled ? "Throw Lasso" : "Reloading..."}
                    </Text>
                  </Pressable>
                </Animated.View>
              </View>
              <ReusableButton
                label="Player List"
                onPress={() => {
                  playSound("buttonClick");
                  setPlayerListModal(true);
                }}
                buttonStyle={styles.button}
              />
              <View style={styles.bottomSheetDivider} />
              <AppText style={styles.inventoryTitle}>Inventory</AppText>
              <FlatList
                data={userPowerUps}
                keyExtractor={(item) => item.type}
                renderItem={renderPowerUpItem}
                numColumns={3}
                style={styles.powerUpList}
              />
              <View style={styles.bottomSheetDivider} />
              <TouchableOpacity
                onPress={() => {
                  playSound("buttonClick");
                  resetGame();
                }}
              >
                <AppText>Exit Game</AppText>
              </TouchableOpacity>
          <Modal
            transparent
            visible={!!eliminationMessage}
            animationType="fade"
          >
            <View style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',}}>
              <View style={{
                backgroundColor: 'white',
                padding: 20,
                borderRadius: 10,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 5,
              }}>
                <Text style={{
                  fontSize: 18, 
                  fontWeight: 'bold', 
                  textAlign: 'center' }}>
                  {eliminationMessage}
                </Text>
              </View>
            </View>
          </Modal> 
          {eliminationMessage === null && (
          <Text style={{ textAlign: 'center', marginTop: 20 }}>
            Modal hidden
          </Text>
          )}
              <Modal visible={cactusModalVisible} animationType="slide">
                {location ? (
                  <View style={{ flex: 1 }}>
                    <MapView
                      style={{ flex: 1 }}
                      initialRegion={{
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        latitudeDelta: 0.002222,
                        longitudeDelta: 0.001521,
                      }}
                      mapType="hybrid"
                      showsScale
                      rotateEnabled={false}
                      loadingEnabled
                      zoomEnabled
                      onPress={cactusMapPress}
                    >
                      <Polygon
                        coordinates={boundary}
                        strokeColor="#FF0000"
                        strokeWidth={2}
                        fillColor="#FF000040"
                      />
                      {selectedCactusLocation && (
                        <Marker
                          coordinate={cartesianToLatLng(
                            selectedCactusLocation,
                            center
                          )}
                        >
                          <CactusIcon width={30} height={30} />
                        </Marker>
                      )}
                    </MapView>

                    {/* Buttons on top of the map */}
                    <View style={styles.cactusButtonContainer}>
                      <ReusableButton
                        label="Confirm"
                        onPress={() => {
                          playSound("buttonClick");
                          handleConfirm();
                        }}
                        buttonStyle={{ backgroundColor: "#88cb54" }}
                        buttonTextStyle={{ color: "#3a160e" }}
                      />
                      <ReusableButton
                        label="Cancel"
                        onPress={() => {
                          playSound("buttonClick");
                          setCactusModalVisible(false);
                        }}
                      />
                    </View>
                  </View>
                ) : (
                  <Text>Loading cactus...</Text>
                )}
              </Modal>
            </BottomSheetView>
          </BottomSheet>

          <PlayerListModal
            visible={isPlayerListModal}
            onClose={() => setPlayerListModal(false)}
            players={playerArray}
            playerURLArray={playersURL}
            disabled={true}
          />
          <GameEndModal
            visible={gameState === "end-game"}
            onClose={async () => {
              const gameStateRef = ref(database, `rooms/${roomCode}/gameState`);
              set(gameStateRef, "return");
              await AsyncStorage.setItem("eliminatedFully", "false");
            }}
            players={playerArray}
            playerURLArray={playersURL}
          />
        </GestureHandlerRootView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  map: {
    flex: 1,
  },

  contentContainer: {
    flex: 1,
    padding: 25,
    alignItems: "center",
    backgroundColor: "#fff",
  },

  topButtonsContainer: {
    position: "absolute",
    top: 50,
    zIndex: 1,
    width: "100%",
    paddingHorizontal: 20,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
  },

  topButtonsContainerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },

  persistentButtonContainer: {
    position: "absolute",
    top: 67,
    left: 35,
    zIndex: 1001,
  },

  iconButtonSpacer: {
    width: 60,
    height: 60,
  },

  button: {
    backgroundColor: "#3a160e",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3a160e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 12,
    minHeight: 50,
  },

  iconButton: {
    width: 50,
    height: 50,
    backgroundColor: "#3a160e",
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3a160e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 2,
    borderColor: "rgba(250, 246, 234, 0.3)",
  },

  userInfoButton: {
    marginTop: 20,
    marginRight: 15,
    backgroundColor: "#3a160e",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#3a160e",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    borderColor: "rgba(239, 208, 117, 0.2)",
  },

  buttonText: {
    fontSize: 16,
    color: "#faf6ea",
    fontFamily: "Bungee-Regular",
  },

  buttonIcon: {
    color: "#faf6ea",
  },

  timerContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 20,
  },

  timerText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#3a160e",
    marginBottom: 8,
    textShadowColor: "rgba(255, 255, 255, 0.8)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    fontFamily: "Bungee-Regular",
  },

  timerProgressBackground: {
    width: "100%",
    height: 20,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "000",
  },

  fireButtonContainer: {
    width: "80%",
    height: 60,
    backgroundColor: "rgba(58, 22, 14, 0.9)",
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 20,
    shadowColor: "#3a160e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  fireButtonText: {
    fontSize: 18,
    color: "#faf6ea",
    fontFamily: "Bungee-Regular",
    textAlign: "center",
    fontWeight: "600",
  },

  marker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },

  powerUpItem: {
    padding: 10,
    marginVertical: 5,
    marginHorizontal: 10,
    backgroundColor: "#fff",
    borderColor: "rgba(58, 22, 14, 0.2)",
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 60,
  },

  powerUpIconContainer: {
    marginRight: 5,
  },

  powerUpList: {
    marginTop: 20,
    width: "100%",
  },

  powerUpCount: {
    marginTop: 20,
    fontSize: 8,
    color: "#fff",
    backgroundColor: "#3a160e",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
    textAlign: "center",
  },

  loadingText: {
    fontSize: 18,
    color: "#3a160e",
    fontFamily: "Bungee-Regular",
    textAlign: "center",
    marginTop: 50,
  },

  bottomSheetDivider: {
    height: 3,
    width: "100%",
    backgroundColor: "#ccc",
    marginVertical: 10,
  },

  inventoryTitle: {
    fontSize: 20,
    color: "#3a160e",
    marginBottom: 10,
    fontFamily: "Bungee-Regular",
  },

  cactusButtonContainer: {
    position: "absolute",
    bottom: 20,
    width: "100%",
    alignItems: "center",
  },

  safeTopArea: {
    paddingTop: Platform.OS === "ios" ? 44 : 24,
  },
});
