// React/Expo Imports

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Text, TouchableOpacity, View, FlatList } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import MapView, { Marker, Polygon } from "react-native-maps";
import { Magnetometer } from "expo-sensors";
import * as Location from "expo-location";
import { useLocalSearchParams } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";

// Firebase Imports
import { get, off, onValue, ref, remove, set, update } from "firebase/database";
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
import { fireLaser } from "@/functions/fireLaser";
import { styles } from "@/constants/styles";
import {
  teamColors,
  playerColors,
  powerUpTypes,
} from "@/constants/gameplayConstants";
import { renderPowerUpItem } from "@/functions/powerupUtilityFunctions";
import {
  latLngToCartesian,
  cartesianToLatLng,
  degree,
} from "@/functions/locationUtilityFunctions";

// Type Definitions
type LatLng = { latitude: number; longitude: number };
type PowerUp = {
  id: string;
  type: string;
  coordinate: LatLng;
};

export default function PlayScreen() {
  // Global Variables
  // Laser Type (length, width)
  const LASER_LENGTH = 7; // in meters
  const BOUNDARY_SIZE = { length: 30, width: 30 }; // meters
  const LOCATION_UPDATE_INTERVAL = 1000; // ms

  // Team Colors (team number, color)

  // Player Colors (player number, color)

  //Set Boundary
  const [boundary, setBoundary] = useState<any[]>([
    { latitude: 0, longitude: 0 },
    { latitude: 0, longitude: 0 },
    { latitude: 0, longitude: 0 },
    { latitude: 0, longitude: 0 },
  ]);

  // Set State Variable to Game (used state based on Firebase)
  // State Variable: Lobby, Game
  const [gameState, setGameState] = useState<"lobby" | "game" | null>(null);
  const [center, setCenter] = useState<LatLng>({
    latitude: 47.732473984376654,
    longitude: -122.32739349311144,
  });

  //Set Boundary

  const params = useLocalSearchParams();
  const { roomCode } = params;

  useEffect(() => {
    const getGameState = async () => {
      const roomRef = ref(database, `rooms/${roomCode}`);
      const roomInfo = await get(roomRef);
      if (!roomInfo.exists()) return;
      const roomData = roomInfo.val();
      let tempCenter = roomData.initialLocation;
      setCenter(tempCenter);
      //console.log("hello", center);

      setGameState(roomData.gameReady);
      setBoundary([
        {
          latitude: cartesianToLatLng(
            { x: BOUNDARY_SIZE.width / 2, y: BOUNDARY_SIZE.length / 2 },
            tempCenter
          ).latitude,
          longitude: cartesianToLatLng(
            { x: BOUNDARY_SIZE.width / 2, y: BOUNDARY_SIZE.length / 2 },
            tempCenter
          ).longitude,
        },
        {
          latitude: cartesianToLatLng(
            { x: -BOUNDARY_SIZE.width / 2, y: BOUNDARY_SIZE.length / 2 },
            tempCenter
          ).latitude,
          longitude: cartesianToLatLng(
            { x: -BOUNDARY_SIZE.width / 2, y: BOUNDARY_SIZE.length / 2 },
            tempCenter
          ).longitude,
        },
        {
          latitude: cartesianToLatLng(
            { x: -BOUNDARY_SIZE.width / 2, y: -BOUNDARY_SIZE.length / 2 },
            tempCenter
          ).latitude,
          longitude: cartesianToLatLng(
            { x: -BOUNDARY_SIZE.width / 2, y: -BOUNDARY_SIZE.length / 2 },
            tempCenter
          ).longitude,
        },
        {
          latitude: cartesianToLatLng(
            { x: BOUNDARY_SIZE.width / 2, y: -BOUNDARY_SIZE.length / 2 },
            tempCenter
          ).latitude,
          longitude: cartesianToLatLng(
            { x: BOUNDARY_SIZE.width / 2, y: -BOUNDARY_SIZE.length / 2 },
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
  
  interface Box {
    player: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }

  const [playerHitBox, setPlayerHitBox] = useState<Box>();

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
    //console.log("centerUpdate", center)
    // console.log("latitude", latitude)
    // console.log("longitude", longitude)
    // console.log("cartesian1", cartesian);
    const playerId = auth.currentUser.uid;
    const playerRef = ref(database, `rooms/${roomCode}/players/${playerId}`);
    setPlayerHitBox({
      player: auth.currentUser.uid,
      x: cartesian.x,
      y: cartesian.y,
      width: 2,
      height: 2,
    });
    await update(playerRef, {
      cartesian,
      direction,
    });
    //console.log("cartesian2", cartesian);
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
      const placeholderRef = ref_storage(storage, `${id}/pfp.jpg`);
      const url = await getDownloadURL(placeholderRef);
      return url;
    } catch (error) {
      console.error("Error fetching image URL:", error);
    }
  };

  // Get All Players Location from Firebase (cartesian)

  useEffect(() => {
    const playersRef = ref(database, `rooms/${roomCode}/players`);
    const unsubscribe = onValue(playersRef, (snapshot) => {
      try {
        const playersData = snapshot.val();
        const entries = Object.entries(playersData);
        const updatedPlayersList = [];

        for (const [id, data] of entries) {
          const player = { id, ...(data as any) };
          updatedPlayersList.push(player);
        }
        setPlayerArray(updatedPlayersList);
      } catch (error) {
        //console.log(error);
      }
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

  const getHitBox = (dataArray: PLD[]) => {
    const boxList: Box[] = [];
    let x, y
    dataArray.forEach(player => {
      x = player.x
      y = player.y
      const hitBox = {
        player: player.playerId,
        x: x - 1,
        y: y - 1,
        width: 2,
        height: 2,
      };
      boxList.push(hitBox)
    })
    return boxList
  };

  // Determine if Player is Hit (straight line laser, big hit box)

  // Generate Powerups
  type PLD = {
    playerId: string;
    direction: number;
    x: number;
    y: number;
  };

  type PowerUp = {
    id: string;
    type: string;
    cartesian: XY;
  };

  const powerUpTypes = [
    { type: "Lasso" },
    { type: "Horseshoe" },
    { type: "Cowboy Boots" },
    { type: "Bounty" },
    { type: "Sheriff Badge" },
    { type: "Cowboy Hat" },
    { type: "Cactus" },
    { type: "Ox Stampede" },
    { type: "Money" },
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
    const randLatLng = {
      latitude: Math.random() * (maxLat - minLat) + minLat,
      longitude: Math.random() * (maxLng - minLng) + minLng
    }
    return {
      x: latLngToCartesian(randLatLng, center).x,
      y: latLngToCartesian(randLatLng, center).y,
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
    generatePowerUpIntervalRef.current = setInterval(async () => {
      if (!roomCode) return;
      const newPowerUp = getRandomPowerUp();
      const powerUpsRef = ref(
        database,
        `rooms/${roomCode}/powerUps/${newPowerUp.id}`
      );
      await set(powerUpsRef, newPowerUp);

      const despawnTime = Math.random() * (36000 - 3000) + 3000;
      setTimeout(async () => {
        await remove(powerUpsRef);
      }, despawnTime);
      //18000 was original time
    }, Math.random() * (4000 - 3000) + 3000);

    return () => {
      if (generatePowerUpIntervalRef.current) {
        clearInterval(generatePowerUpIntervalRef.current);
      }
    };
  }, [gameState, center]);

  //set powerups up in a usestate
  useEffect(() => {
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

      return () => unsubscribe();
    };

    fetchPowerUps();
  }, [gameState]);

  //console.log("boundary", boundary);

  // Determine if Player Hit Box Intersects with Powerup Location (big human hit box, no powerup hit box)
  /*
useEffect(() => {
    if (!auth.currentUser) return;

    const playerId = auth.currentUser.uid;
    const playerRef = ref(database, `rooms/${roomCode}/players/${playerId}`);
    const checkLocationPowerUpAndCactus = async () => {
      const playerInfo = await get(playerRef);
      if (!playerInfo.exists()) return;
      const playerData = playerInfo.val();
      if (!playerData.eliminated) return;
      let playerPowerUps = userPowerUps;

      powerUps.map(async (powerUp) => {
        /* change the delta to be whatever value u want
        if (
          powerUp.coordinate.latitude - playerData.latitude <= 0.0001703 &&
          powerUp.coordinate.latitude - playerData.latitude >= -0.0001703 &&
          powerUp.coordinate.longitude - playerData.longitude <= 0.000703 &&
          powerUp.coordinate.longitude - playerData.longitude >= -0.0001703
        ) {
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
        if (
          cactus.latitude - playerData.latitude <= 0.0001703 &&
          cactus.latitude - playerData.latitude >= -0.0001703 &&
          cactus.longitude - playerData.longitude <= 0.000703 &&
          cactus.longitude - playerData.longitude >= -0.0001703
        ) {
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
*/

  // Powerup Function Calls (functions in seperate files)

  // Reset Game/Exit Game (Set State Variable to Lobby)

  // Game Ending Screen (modal)

  // Bottom Sheet (Powerup List, Player List, Fire Button)
  const snapPoints = useMemo(() => ["18%", "28%", "75%"], []);

  const mapRef = useRef<MapView | null>(null);
  const sheetRef = useRef<BottomSheet>(null);

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
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);

  const handleSnapPress = useCallback(() => {
    if (isBottomSheetOpen) {
      sheetRef.current?.close();
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

  // console.log("lat", cartesianToLatLng(playerArray[0].cartesian, center).latitude);
  // console.log("long", cartesianToLatLng(playerArray[0].cartesian, center).longitude);
  //console.log(playerArray)
  //console.log(playersURL)
  const [isPlayerListModal, setPlayerListModal] = useState(false);

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.topButtonsContainer}>
        <View style={styles.topButtonsContainerRow}>
          <View
            style={[
              styles.button,
              { aspectRatio: 1, borderRadius: 30, padding: 10 },
            ]}
          >
            <TouchableOpacity onPress={handleSnapPress}>
              <FontAwesome name="gear" size={26} style={styles.buttonIcon} />
            </TouchableOpacity>
          </View>
          <View style={styles.button}>
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
                          (player) => player.id === auth.currentUser?.uid
                        )?.team || 1
                      )
                    : "#FFFFAA",
                },
              ]}
            >
              {"  "}
              [TEAM{" "}
              {playerArray.find((player) => player.id === auth.currentUser?.uid)
                ?.team || 1}
              ]
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.topButtonsContainerRow,
            { justifyContent: "flex-end" },
          ]}
        >
          <View
            style={[
              styles.button,
              { aspectRatio: 1, borderRadius: 30, padding: 15 },
            ]}
          >
            <TouchableOpacity onPress={focusOnUserLocation}>
              <FontAwesome name="map" size={26} style={styles.buttonIcon} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
          zoomEnabled={true}
        >
          <Polygon
            coordinates={boundary}
            strokeColor="#FF0000"
            strokeWidth={2}
            fillColor="#FF000040"
          />

          {powerUps.map((powerUp) => (
            <PowerUpMarker
              key={powerUp.id}
              cartesian={powerUp.cartesian}
              center={center}
              name={powerUp.type}
            />
          ))}

          {playerArray.map((player) => {
            if (!player.cartesian) return null;
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
                <View
                  style={[styles.marker, { backgroundColor: playerColor }]}
                />
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
          <ReusableButton
            label="Fire"
            onPress={() => fireLaser(database, roomCode, LASER_LENGTH)}
          />
          <ReusableButton
            label="Player List"
            onPress={() => setPlayerListModal(true)}
          />
          <AppText>Inventory</AppText>

          <FlatList
            data={userPowerUps}
            keyExtractor={(item) => item.type}
            renderItem={renderPowerUpItem}
            numColumns={3}
            style={styles.powerUpList}
          />
        </BottomSheetView>
      </BottomSheet>

      <PlayerListModal
        visible={isPlayerListModal}
        onClose={() => setPlayerListModal(false)}
        players={playerArray}
        playerURLArray={playersURL}
        disabled={true}
      />
    </GestureHandlerRootView>
  );
}
