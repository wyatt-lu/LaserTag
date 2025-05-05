import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  Modal,
} from "react-native";
import { Magnetometer } from "expo-sensors";
import * as Location from "expo-location";
import {
  get,
  getDatabase,
  off,
  onValue,
  ref,
  remove,
  set,
  update,
} from "firebase/database";
import { auth, database } from "../../firebaseconfig";
import MapView, {
  LatLng,
  MapPressEvent,
  Marker,
  Polygon,
} from "react-native-maps";
import React from "react";
import {
  getStorage,
  ref as ref_storage,
  getDownloadURL,
  uploadBytes,
  deleteObject,
} from "firebase/storage";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import AppText from "@/components/AppText";
import ReusableButton from "@/components/ReusableButton";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import PowerUpMarker from "@/components/PowerUpMarker";
import PlayerListModal from "@/components/PlayerListModal";
import {
  BadgeIcon,
  BootsIcon,
  BountyIcon,
  CactusIcon,
  HatIcon,
  HorseshoeIcon,
  LassoIcon,
  OxIcon,
  MoneyIcon,
} from "@/constants/icons";
import { FlatList } from "react-native";
import { ScreenStackHeaderCenterView } from "react-native-screens";
//import * as PowerupFunctions from '../components/PowerUpFunctions';

export default function PlayScreen() {
  // Global Variables
  // Laser Type (length, width)
  const laserType = {
    length: 100, // in meters
    width: 10, // in meters
  };

  // Team Colors (team number, color)
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

  // Player Colors (player number, color)
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

  // Size of Boundary (length, width)
  const boundarySize = {
    length: 300, // in meters
    width: 300, // in meters
  };

  //Set boundary
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
      setCenter(roomData.initialLocation);
      setGameState(roomData.gameReady);
      setBoundary([
        {
          latitude: cartesianToLatLng(
            { x: boundarySize.width / 2, y: boundarySize.length / 2 },
            center
          ).latitude,
          longitude: cartesianToLatLng(
            { x: boundarySize.width / 2, y: boundarySize.length / 2 },
            center
          ).longitude,
        },
        {
          latitude: cartesianToLatLng(
            { x: -boundarySize.width / 2, y: boundarySize.length / 2 },
            center
          ).latitude,
          longitude: cartesianToLatLng(
            { x: -boundarySize.width / 2, y: boundarySize.length / 2 },
            center
          ).longitude,
        },
        {
          latitude: cartesianToLatLng(
            { x: -boundarySize.width / 2, y: -boundarySize.length / 2 },
            center
          ).latitude,
          longitude: cartesianToLatLng(
            { x: -boundarySize.width / 2, y: -boundarySize.length / 2 },
            center
          ).longitude,
        },
        {
          latitude: cartesianToLatLng(
            { x: boundarySize.width / 2, y: -boundarySize.length / 2 },
            center
          ).latitude,
          longitude: cartesianToLatLng(
            { x: boundarySize.width / 2, y: -boundarySize.length / 2 },
            center
          ).longitude,
        },
      ]);
    };
    getGameState();
  }, [roomCode]);

  // Longitude Latitude to Cartesian Coordinate function (where Center = (0,0))

  type LatLng = { latitude: number; longitude: number };
  type XY = { x: number; y: number };

  const latLngToCartesian = (point: LatLng, center: LatLng): XY => {
    const earthRadius = 6378137; // meters
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const deltaLat = toRad(point.latitude - center.latitude);
    const deltaLon = toRad(point.longitude - center.longitude);

    const meanLat = toRad((point.latitude + center.latitude) / 2);

    const x = earthRadius * deltaLon * Math.cos(meanLat);
    const y = earthRadius * deltaLat;

    return { x, y };
  };

  const cartesianToLatLng = (xy: XY, centerLatLng: LatLng): LatLng => {
    if (!xy) return { latitude: 0, longitude: 0 };
    const earthRadius = 6378137; // meters (WGS-84)

    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const toDeg = (rad: number) => (rad * 180) / Math.PI;

    const lat0 = toRad(centerLatLng.latitude);
    const lon0 = toRad(centerLatLng.longitude);

    // Calculate latitude
    const lat = lat0 + xy.y / earthRadius;

    // Calculate longitude (note the cos(mean latitude) factor)
    const lon = lon0 + xy.x / (earthRadius * Math.cos((lat0 + lat) / 2));

    return {
      latitude: toDeg(lat),
      longitude: toDeg(lon),
    };
  };

  // Change Player Location to Cartesian Coordinate
  // Send Player Location (cartesian) to Firebase

  // Current Player Location

  const [location, setLocation] = useState<Location.LocationObject>();
  const [magnetometerData, setMagnetometerData] = useState({
    x: 0,
    y: 0,
    z: 0,
  });
  Magnetometer.setUpdateInterval(1000);

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

  const degree = (x: number, y: number): number => {
    let degree = 0;
    if (Math.atan2(y, x) >= 0) {
      degree = Math.atan2(y, x) * (180 / Math.PI);
    } else {
      degree = (Math.atan2(y, x) + 2 * Math.PI) * (180 / Math.PI);
    }
    degree = Math.round(degree - 90 >= 0 ? degree - 90 : degree + 271);
    return degree;
  };

  const degToRad = (deg: number) => {
    return deg * (Math.PI / 180);
  };

  const updatePlayerLocation = async (
    latitude: number,
    longitude: number,
    direction: number
  ) => {
    if (!auth.currentUser) return;

    const cartesian = latLngToCartesian({ latitude, longitude }, center);

    const playerId = auth.currentUser.uid;
    const playerRef = ref(database, `rooms/${roomCode}/players/${playerId}`);
    await update(playerRef, {
      cartesian,
      direction,
    });
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
        console.log(error);
      }
    });
    return () => {
      unsubscribe();
      off(playersRef);
    };
  }, [gameState]);

  // Set playerArray to include All Players URL and Location (cartesian)

  // Set Hit Box for each player (delta x, delta y)

  const getHitBox = (player: any) => {
    const { x, y } = player.cartesian;
    const hitBox = {
      x: x - 1,
      y: y + 1,
      width: 2,
      height: 2,
    };
    return hitBox;
  };

  // Determine if Player is Hit (straight line laser, big hit box)

  // Generate Powerups
  type PowerUp = {
    id: string;
    type: string;
    coordinate: LatLng;
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
  const generateRandomCoordinateInBounds = () => {
    const minLat = boundary[2].latitude;
    const maxLat = boundary[0].latitude;
    const minLng = boundary[3].longitude;
    const maxLng = boundary[1].longitude;

    console.log("minLat", minLat);
    console.log("maxLat", maxLat);
    console.log("minLng", minLng);
    console.log("maxLng", maxLng);

    return {
      latitude: Math.random() * (maxLat - minLat) + minLat,
      longitude: Math.random() * (maxLng - minLng) + minLng,
    };
  };

  //make random powerups
  const getRandomPowerUp = (center: LatLng, radius: number): PowerUp => {
    const randomType =
      powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
    return {
      id: Math.random().toString(36).substring(7), // Random ID
      type: randomType.type,
      coordinate: generateRandomCoordinateInBounds(),
    };
  };

  //despawn powerups
  useEffect(() => {
    generatePowerUpIntervalRef.current = setInterval(async () => {
      if (!roomCode) return;
      //160 was original radius
      const newPowerUp = getRandomPowerUp(center, 10);
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
              coordinate: {
                latitude: powerUp.coordinate.latitude,
                longitude: powerUp.coordinate.longitude,
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

  console.log("boundary", boundary);
  const renderPowerUpItem = ({
    item,
  }: {
    item: { id: string; type: string; count: number };
  }) => {
    return (
      <TouchableOpacity
        style={styles.powerUpItem}
        onPress={() => {}} //usePowerUp(item)}
      >
        <View style={styles.powerUpIconContainer}>
          {item.type === "Sheriff Badge" && (
            <BadgeIcon width={30} height={30} />
          )}
          {item.type === "Cowboy Boots" && <BootsIcon width={30} height={30} />}
          {item.type === "Bounty" && <BountyIcon width={30} height={30} />}
          {item.type === "Cactus" && <CactusIcon width={30} height={30} />}
          {item.type === "Cowboy Hat" && <HatIcon width={30} height={30} />}
          {item.type === "Horseshoe" && (
            <HorseshoeIcon width={30} height={30} />
          )}
          {item.type === "Lasso" && <LassoIcon width={30} height={30} />}
          {item.type === "Ox Stampede" && <OxIcon width={30} height={30} />}
          {item.type === "Money" && <MoneyIcon width={30} height={30} />}
        </View>
        {/* <AppText style={styles.powerUpName}>{item.type}</AppText> */}
        {item.count > 1 && (
          <AppText style={styles.powerUpCount}>{item.count}</AppText>
        )}
      </TouchableOpacity>
    );
  };

  // Determine if Player Hit Box Intersects with Powerup Location (big human hit box, no powerup hit box)

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
              coordinate={powerUp.coordinate}
              name={powerUp.type}
            />
          ))}

          {playerArray.map((player) => {
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
          <ReusableButton label="Fire" onPress={() => {}} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    padding: 25,
    alignItems: "center",
    backgroundColor: "#faf6ea",
  },
  topButtonsContainer: {
    position: "absolute",
    top: 50,
    zIndex: 1,
    width: "100%",
    paddingHorizontal: 20,
  },
  topButtonsContainerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  map: {
    flex: 1,
  },
  fireButton: {
    alignSelf: "center",
    backgroundColor: "#FF3B30",
    width: "50%",
    height: "8%",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 25,
  },
  fireButtonText: {
    color: "white",
    marginTop: 4,
    fontWeight: "bold",
  },
  user: {
    width: 60,
    height: 60,
    borderColor: "#000",
    borderWidth: 2,
    borderRadius: 20,
    zIndex: 1,
  },
  marker: {
    width: 25,
    height: 25,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  button: {
    width: "auto",
    backgroundColor: "#3a160e",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#3a160e",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
  },
  buttonText: {
    fontSize: 18,
    color: "#faf6ea",
    fontFamily: "Bungee-Regular",
  },
  buttonIcon: {
    color: "#faf6ea",
  },
  exit: {
    bottom: 30,
    position: "absolute",
  },
  powerUpItem: {
    padding: 10,
    marginVertical: 5,
    marginHorizontal: 10,
    backgroundColor: "#f0f0f0",
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 5,
    flexDirection: "row",
    alignItems: "center",
  },
  powerUpIconContainer: {
    marginRight: 5,
  },
  powerUpName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  powerUpList: {
    marginTop: 20,
  },
  powerUpCount: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#3a160e",
    position: "absolute",
    right: 5,
    bottom: 5,
  },
});
