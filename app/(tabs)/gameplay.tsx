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
import MapView, { MapPressEvent, Marker, Polygon } from "react-native-maps";
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
import { useFocusEffect, useRouter } from "expo-router";
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

// Utility Functions
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

const cardinal = (degree: number): string => {
  if (degree >= 22.5 && degree < 67.5) return "NE";
  if (degree >= 67.5 && degree < 112.5) return "E";
  if (degree >= 112.5 && degree < 157.5) return "SE";
  if (degree >= 157.5 && degree < 202.5) return "S";
  if (degree >= 202.5 && degree < 247.5) return "SW";
  if (degree >= 247.5 && degree < 292.5) return "W";
  if (degree >= 292.5 && degree < 337.5) return "NW";
  return "N";
};

const calculateOffset = (
  lat: number,
  lon: number,
  distance: number,
  angle: number
) => {
  const radius = 6371000; // Earth's radius in meters
  const latOffset = (distance * Math.cos(angle)) / radius;
  const lonOffset =
    (distance * Math.sin(angle)) / (radius * Math.cos(degToRad(lat)));

  const newLat = lat + latOffset;
  const newLon = lon + lonOffset;

  return { lat: newLat, lon: newLon };
};

const degToRad = (deg: number) => {
  return deg * (Math.PI / 180);
};

// Main Component
export default function PlayScreen() {
  const [location, setLocation] = useState<Location.LocationObject>();
  const [magnetometerData, setMagnetometerData] = useState({
    x: 0,
    y: 0,
    z: 0,
  });
  Magnetometer.setUpdateInterval(1000);

  const magnetometerDataRef = useRef(magnetometerData);
  const magnetometerSubscriptionRef = useRef<any>(null);

  const storage = getStorage();

  const [playerURLArray, setPlayersURL] = useState<any[]>([]);
  const [playerLocationArray, setPlayersLocation] = useState<any[]>([]);
  const [playerTeams, setPlayerTeams] = useState<{ [key: string]: number }>({});
  const [playerArray, setPlayerArray] = useState<any[]>([]);
  const [roomCode, setRoomCode] = useState<string | null>(null);

  const generatePowerUpIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch Room Code
  useEffect(() => {
    const fetchRoomCode = async () => {
      if (!auth.currentUser) return;

      const playerId = auth.currentUser.uid;
      const playerRef = ref(database, `players/${playerId}`);
      const playerInfo = await get(playerRef);

      if (playerInfo.exists()) {
        const playerData = playerInfo.val();
        setRoomCode(playerData.room);
      }
    };

    fetchRoomCode();
  }, []);

  //Fetch Player Data
  useEffect(() => {
    if (!roomCode) return;

    const database = getDatabase();
    const playersRef = ref(database, `rooms/${roomCode}/players`);

    const unsubscribe = onValue(playersRef, (snapshot) => {
      const playersData = snapshot.val() || {};
      const playerList = Object.entries(playersData)
        .map(([id, data]) => ({
          id,
          ...(data as any),
        }))
        .filter((player) => !player.eliminated);
      setPlayerArray(playerList);
    });

    return () => {
      unsubscribe();
      off(playersRef);
    };
  }, [roomCode]);

  //Fetch Player Location
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
  }, []);

  // Update Player Location in Database
  const updatePlayerLocation = async (
    latitude: number,
    longitude: number,
    direction: number
  ) => {
    if (!auth.currentUser) return;

    const playerId = auth.currentUser.uid;
    const playerRef = ref(database, `players/${playerId}`);

    try {
      const snapshot = await get(playerRef);

      if (snapshot.exists()) {
        const playerData = snapshot.val();
        if (!playerData.room) {
          return;
        }
        const roomRef = ref(
          database,
          `rooms/${playerData.room}/players/${playerId}`
        );

        await update(roomRef, {
          latitude,
          longitude,
          direction,
        });
      }
    } catch (error) {
      console.error("Error updating player location:", error);
    }
  };

  //USER MOVES!!//
  const eliminatePlayer = (
    dataArray: PLD[],
    currentPlayer: string,
    laserBounds: any
  ) => {
    //filters through the datarray and locates players and their coordinates
    //checks if player coordinates during laser fire are within laser bounds
    //if true, log "player is eliminated"
    //if false, log "no one eliminated"
    //array to store eliminated players
    let elim = [];
    dataArray.forEach((player) => {
      if (player.playerId === currentPlayer) return;
      const playerLat = player.latitude;
      const playerLon = player.longitude;
      if (
        playerLat >= laserBounds.south &&
        playerLat <= laserBounds.north &&
        playerLon >= laserBounds.west &&
        playerLon <= laserBounds.east
      ) {
        console.log(`player${player.playerId} is eliminated.`);
        elim.push(player.playerId);
      }
    });
    if (elim.length == 0) {
      console.log("no players eliminated");
    }
    /*const usernameRef = ref(database, `usernames/${username}/uid`);
    get(usernameRef).then((snapshot) => {
      if (snapshot.exists()) {
        const uid = snapshot.val();
        update(ref(database, `players/${uid}`), { eliminated: true });
      } else {
        console.log("Username not found!");
      }
    });*/
  };

  type PLD = {
    playerId: string;
    direction: number;
    latitude: number;
    longitude: number;
  };

  const fireLaser = async () => {
    console.log(`entered firelaser`);
    //when button pressed, via snapshots, get the laser type and code
    //feed this code into generateLaserLine, which returns mock geometry that has a radius of the circle on the map
    //with the mock geometry code, then feed that code into eliminatePlayer method
    //checks whether player coordinates when laser was shot falls into mock geometry
    //if yes, eliminate player, if not, then nothing happens
    const roomPlayerRef = ref(database, `rooms/${roomCode}/players`);
    const roomPlayerInfo = await get(roomPlayerRef);
    const roomsgklj = roomPlayerInfo.val();
    if (!roomsgklj) {
      console.log("No player data found in Firebase");
      return;
    }
    console.log("about to enter first loop");
    let playerLaserData: PLD[] = [];
    //const [playerLaserData, setPlayerLaserData] = useState<PLD[]>([]);
    Object.entries(roomsgklj).forEach(([playerId, roomData]) => {
      console.log("inside first loop");
      const fireLaserRef = ref(
        database,
        `rooms/${roomCode}/players/${playerId}/fireLaser`
      );
      console.log(`Player ID: ${playerId}`);
      //initialize vars outside
      let curDir, curLat, curLon;
      // Loop through each property of the player
      Object.entries(roomData as { [key: string]: any }).forEach(
        ([key, value]) => {
          console.log(`  ${key}: ${value}`);
          if (key === "direction") {
            curDir = value;
          }
          if (key === "latitude") {
            curLat = value;
          }
          if (key === "longitude") {
            curLon = value;
          }
        }
      );
      console.log(
        `Direction: ${curDir}, Latitude: ${curLat}, Longitude: ${curLon}`
      );
      if (curDir != null && curLat != null && curLon != null) {
        console.log("condition met: adding data to player-laser state");

        const fireCoords = {
          playerId: playerId,
          direction: curDir,
          latitude: curLat,
          longitude: curLon,
        };
        //update state and add data to array
        //setPlayerLaserData((prevData) => [...prevData, fireCoords]);
        playerLaserData.push(fireCoords);
      }
    });
    //generateLaserLine(playerLaserData);
    // Now call generateLaserLine once after all the data is collected
    if (playerLaserData.length > 0) {
      console.log("Generated playerLaserData: ", playerLaserData);
      generateLaserLine(playerLaserData);
    } else {
      console.log("No valid player data collected");
    }
  };

  const generateLaserLine = async (dataArray: PLD[]) => {
    //via laser code, get laser information stored in the laser code and save into variables
    //do some math that creates the geometry mockup for default and 2x width
    //the length of the rectangle will be the length
    //rectangle will be pointing in the direction that the player is pointing, and it will branch out from the point where the player is
    let direction, latitude, longitude, length, width;
    if (!auth.currentUser) return;
    const playerId = auth.currentUser.uid;
    const playerData = dataArray.find((player) => player.playerId === playerId);
    if (playerData) {
      direction = playerData.direction;
      latitude = playerData.latitude;
      longitude = playerData.longitude;
      console.log(`Player ID: ${playerId}`);
      console.log(
        `Direction: ${direction}, Latitude: ${latitude}, Longitude: ${longitude}`
      );
    }
    //find laser
    const playerRef = ref(database, `players/${playerId}`);
    const playerSnapshot = await get(playerRef);
    if (playerSnapshot.exists()) {
      const playerData = playerSnapshot.val();
      const laserType = playerData.laser;
      console.log(`Player ID: ${playerId}, Laser Type: ${laserType}`);
      const laserRef = ref(database, `lasers/${laserType}`);
      const laserSnapshot = await get(laserRef);
      if (laserSnapshot.exists()) {
        const laserData = laserSnapshot.val();
        length = laserData.length;
        width = laserData.width;
      }
    }
    //convert direction to radians
    if (direction == null || latitude == null || longitude == null) return;
    const dirRad = degToRad(direction);

    //base position
    const origin = { lat: latitude, lon: longitude };
    const front = calculateOffset(origin.lat, origin.lon, length, dirRad);

    //Perpendicular offset (left/right)
    const perpAngle = dirRad + Math.PI / 2;

    const originLeft = calculateOffset(origin.lat, origin.lon, width / 2, perpAngle);
    const originRight = calculateOffset(origin.lat, origin.lon, width / 2, perpAngle + Math.PI);

    const frontLeft = calculateOffset(front.lat, front.lon, width / 2, perpAngle);
    const frontRight = calculateOffset(front.lat, front.lon, width / 2, perpAngle + Math.PI);

    const allLatitudes = [
      originLeft.lat,
      originRight.lat,
      frontLeft.lat,
      frontRight.lat,
    ];
    const allLongitudes = [
      originLeft.lon,
      originRight.lon,
      frontLeft.lon,
      frontRight.lon,
    ];

    const laserBounds = {
      north: Math.max(...allLatitudes),
      south: Math.min(...allLatitudes),
      east: Math.max(...allLongitudes),
      west: Math.min(...allLongitudes),
    };

    console.log("Laser Bounds:", laserBounds);
    eliminatePlayer(dataArray, playerId, laserBounds);
  };

  //helper function to calculate offset
  function calculateOffset(
    lat: number,
    lon: number,
    distance: number,
    angle: number
  ) {
    const radius = 6371000; // Earth's radius in meters
    const latOffset = (distance * Math.cos(angle)) / radius;
    const lonOffset =
      (distance * Math.sin(angle)) / (radius * Math.cos(degToRad(lat)));

    const newLat = lat + latOffset;
    const newLon = lon + lonOffset;

    return { lat: newLat, lon: newLon };
  }
  
  //get list of player's url once gameplay begins runnings
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
  }, []);

  const mapRef = useRef<MapView | null>(null);
  const sheetRef = useRef<BottomSheet>(null);

  const focusOnUserLocation = () => {
    if (mapRef.current && location) {
      mapRef.current.animateToRegion(
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.003022,
          longitudeDelta: 0.002521,
        },
        1000
      );
    }
  };

  const snapPoints = useMemo(() => ["18%", "28%", "75%"], []);

  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);

  const handleSnapPress = useCallback(() => {
    if (isBottomSheetOpen) {
      sheetRef.current?.close();
    } else {
      sheetRef.current?.snapToIndex(2);
    }
    setIsBottomSheetOpen(!isBottomSheetOpen);
  }, [isBottomSheetOpen]);

  const router = useRouter();

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

  //Circle Boundary Generation

  type LatLng = {
    latitude: number;
    longitude: number;
  };

  const generateCircleCoordinates = (
    center: LatLng,
    radius: number,
    numPoints: number
  ): LatLng[] => {
    const coordinates: LatLng[] = [];
    const earthRadius = 6378137;
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * (2 * Math.PI);
      const deltaLat = (radius / earthRadius) * Math.sin(angle);
      const deltaLng =
        (radius / (earthRadius * Math.cos((center.latitude * Math.PI) / 180))) *
        Math.cos(angle);

      coordinates.push({
        latitude: center.latitude + (deltaLat * 180) / Math.PI,
        longitude: center.longitude + (deltaLng * 180) / Math.PI,
      });
    }
    coordinates.push(coordinates[0]);
    return coordinates;
  };

  const getCenter = async () => {
    if (!auth.currentUser) return;

    const playerId = auth.currentUser.uid;
    const playerInfo = await get(ref(database, `players/${playerId}`));

    if (!playerInfo.exists()) return;

    const roomRef = ref(
      database,
      `rooms/${playerInfo.val().room}/initialLocation`
    );
    const roomInfo = await get(roomRef);
    return roomInfo.val();
  };

  const [center, setCenter] = useState<LatLng>({
    latitude: 47.732473984376654,
    longitude: -122.32739349311144,
  }); // default center at lakeside

  useFocusEffect(
    useCallback(() => {
      const initializeGame = async () => {
        const center = await getCenter();
        if (center) {
          setCenter(center);
        }
      };
      initializeGame();
    }, [])
  );

  const circleCoordinates = generateCircleCoordinates(center, 30, 30); //160 was original radius

  // Powerup Generation

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

  //generate random coords for powerups
  const generateRandomCoordinate = (center: LatLng, radius: number): LatLng => {
    const earthRadius = 6378137; // Earth's radius in meters
    const randomAngle = Math.random() * 2 * Math.PI; // Random angle in radians
    const randomRadius = Math.sqrt(Math.random()) * radius; // Random radius within the circle

    const deltaLat = (randomRadius / earthRadius) * Math.sin(randomAngle);
    const deltaLng =
      (randomRadius /
        (earthRadius * Math.cos((center.latitude * Math.PI) / 180))) *
      Math.cos(randomAngle);

    return {
      latitude: center.latitude + (deltaLat * 180) / Math.PI,
      longitude: center.longitude + (deltaLng * 180) / Math.PI,
    };
  };

  //make random powerups
  const getRandomPowerUp = (center: LatLng, radius: number): PowerUp => {
    const randomType =
      powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
    return {
      id: Math.random().toString(36).substring(7), // Random ID
      type: randomType.type,
      coordinate: generateRandomCoordinate(center, radius),
    };
  };

  //despawn powerups
  useEffect(() => {
    generatePowerUpIntervalRef.current = setInterval(async () => {
      if (!roomCode) return;
      //160 was original radius
      const newPowerUp = getRandomPowerUp(center, 30);
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
  }, [roomCode, center]);

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
  }, [roomCode]);

  //all of user's powerups in their inventory
  const [userPowerUps, setUserPowerUps] = useState<
    { id: string; type: string; count: number }[]
  >([]);

  //all of the powerups currently in play in the game
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);

  //see if powerups are close to user's location
  useEffect(() => {
    if (!auth.currentUser) return;

    const playerId = auth.currentUser.uid;
    const playerRef = ref(database, `rooms/${roomCode}/players/${playerId}`);
    const checkLocationPowerUpAndCactus = async () => {
      const playerInfo = await get(playerRef);
      if (!playerInfo.exists()) return;
      const playerData = playerInfo.val();
      let playerPowerUps = userPowerUps;

      powerUps.map(async (powerUp) => {
        /* change the delta to be whatever value u want*/
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

  // Powerup Usage

  const [isOxStampedeModalVisible, setOxStampedeModalVisible] = useState(false);

  const useOx = () => {
    console.log("Using Ox Stampede power-up");
    setOxStampedeModalVisible(true);
  };

  const handleTargetSelect = (targetId: string) => {
    setOxStampedeModalVisible(false);
    // do stuff on target's screen
    setDustStormActive(true);
  };

  const [isDustStormActive, setDustStormActive] = useState(false);

  const useHorseshoe = () => {
    console.log("Using Horseshoe power-up");
    // horseshoe logic
  };

  const useBadge = () => {
    console.log("Using Sheriff's Badge power-up");
    // sheriff's badge
  };

  const renderPowerUpItem = ({
    item,
  }: {
    item: { id: string; type: string; count: number };
  }) => {
    return (
      <TouchableOpacity
        style={styles.powerUpItem}
        onPress={() => usePowerUp(item)}
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
        <AppText style={styles.powerUpName}>{item.type}</AppText>
        {item.count > 1 && (
          <AppText style={styles.powerUpCount}>{item.count}</AppText>
        )}
      </TouchableOpacity>
    );
  };

  // INDIVIDUAL POWER UP FUNCTIONS //

  //Cowboy boots
  //realtime: make a copy of currentuser's info in new random id
  //storage: add currentuser's image into this random id
  //make random movements for fake user with math.random and a step counter,
  // northsouth random amount, east west random amount, add to og lat and long, and then update database
  //set interval? so after a certain amount of time, remove sthis player from storage and realtime?

  //console.log("old playerArray", playerArray);

  //console.log("old playerURLArray", playerURLArray);
  const cowboyBoots = async () => {
    //copy realtime database to fake user
    if (!auth.currentUser) return;

    const roomRef = ref(database, `players/${auth.currentUser.uid}`);
    const roomInfo = await get(roomRef);
    if (!roomInfo.exists()) return;
    const roomData = roomInfo.val();
    let roomNum = roomData.room;

    const playerRef = ref(
      database,
      `rooms/${roomNum}/players/${auth.currentUser.uid}`
    );
    const playerInfo = await get(playerRef);

    if (!playerInfo.exists()) return;
    const playerData = playerInfo.val();

    const randomFakeUserId = Math.random().toString(36).substring(7);

    //copy image to fake user

    const playerStorageRef = ref_storage(
      storage,
      `${auth.currentUser.uid}/pfp.jpg`
    );
    const fakeUserStorageRef = ref_storage(
      storage,
      `${randomFakeUserId}/pfp.jpg`
    );

    const playerUrl = await getDownloadURL(playerStorageRef);
    const response = await fetch(playerUrl);
    const blob = await response.blob();

    await uploadBytes(fakeUserStorageRef, blob);

    const fakeUserRef = ref(
      database,
      `rooms/${roomNum}/players/${randomFakeUserId}`
    );
    //create fakeUser data in database
    await set(fakeUserRef, playerData);

    //allow fake user to exist for 5 seconds
    const interval = async () => {
      const interval = setInterval(async () => {
        let latDelta = Math.random() * (0.0000503 - -0.0000503) + -0.0000503;
        let longDelta = Math.random() * (0.0000503 - -0.0000503) + -0.0000503;
        let fakeUserRef = ref(
          database,
          `rooms/${roomNum}/players/${randomFakeUserId}`
        );
        let fakeUserInfo = await get(fakeUserRef);
        if (!fakeUserInfo.exists()) return;

        let fakeUserData = fakeUserInfo.val();
        let newLat = fakeUserData.latitude + latDelta;
        let newLong = fakeUserData.longitude + longDelta;

        await update(fakeUserRef, { latitude: newLat, longitude: newLong });
        // console.log("playerArray", playerArray);
      }, 1000);
      // Stop the interval after 20 seconds
      setTimeout(async () => {
        clearInterval(interval);
        // console.log("timeout randomFakeUserId", randomFakeUserId);

        let fakeUserRef = ref(
          database,
          `rooms/${roomNum}/players/${randomFakeUserId}`
        );
        const fakeUserStorageRef = ref_storage(
          storage,
          `${randomFakeUserId}/pfp.jpg`
        );
        await remove(fakeUserRef);
        await deleteObject(fakeUserStorageRef);
      }, 20000);
    };
    interval();
  };

  //COWBOY HAT

  const cowboyHat = async () => {
    if (!auth.currentUser) return;

    const playerId = auth.currentUser.uid;
    const playerRef = ref(database, `rooms/${roomCode}/players/${playerId}`);
    await update(playerRef, { cowboyHat: true });
    setTimeout(async () => {
      await update(playerRef, { cowboyHat: false });
    }, 5000);
  };

  //CACTUS commented out just so i can push cowboyhat and cowhoy boots
  const [activeCactusId, setActiveCactusId] = useState<string | null>(null);
  const [cactusModalVisible, setCactusModalVisible] = useState(false);
  const [selectedCactusLocation, setSelectedCactusLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const cactusMapPress = (event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedCactusLocation({ latitude, longitude });
  };

  const handleConfirm = async () => {
    if (selectedCactusLocation && activeCactusId) {
      if (!auth.currentUser) return;
      //console.log("Confirmed location:", selectedLocation);
      //HEY THERE see if u can add the cactus button to trigger this function, then add the cactus id in the cactus folder :D
      const cactusRef = ref(
        database,
        `rooms/${roomCode}/cactus/${activeCactusId}`
      );
      await update(cactusRef, {
        latitude: selectedCactusLocation.latitude,
        longitude: selectedCactusLocation.longitude,
        creator: auth.currentUser.uid,
      });
    }
    setSelectedCactusLocation(null);
    setCactusModalVisible(false);
    setActiveCactusId(null);
  };

  const usePowerUp = (powerUp: {
    id: string;
    type: any;
    coordinate?: { latitude: number; longitude: number };
  }) => {
    switch (powerUp.type) {
      case "Cowboy Boots":
        cowboyBoots();
        break;
      case "Cowboy Hat":
        cowboyHat();
        break;
      case "Sheriff Badge":
        useBadge();
        break;
      case "Horseshoe":
        useHorseshoe();
        break;
      case "Lasso":
        console.log("Using Lasso power-up");
        break;
      case "Bounty":
        console.log("Using Bounty power-up");
        break;

      case "Cactus":
        const seeIfUserHasCactus = async () => {
          const cactusRef = ref(database, `rooms/${roomCode}/cactus`);
          const cactusInfo = await get(cactusRef);
          if (!cactusInfo.exists()) {
            console.log("hgelo");
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

          for (const cactus of cactusArray) {
            if (!auth.currentUser) return;
            if (cactus.creator == auth.currentUser.uid) {
              console.log("cactus.creator", cactus.creator);
              return;
            }
          }
          console.log("made it out!");
          setActiveCactusId(powerUp.id ?? null);
          setCactusModalVisible(true);
          setUserPowerUps((prev) =>
            prev
              .map((p) =>
                p.id === powerUp.id ? { ...p, count: p.count - 1 } : p
              )
              .filter((p) => p.count > 0)
          );
        };
        seeIfUserHasCactus();
        break;
      case "Ox Stampede":
        useOx();
        break;
      case "Money":
        console.log("Using Money power-up");
        break;
      default:
        console.log("Unknown power-up type");
        return;
    }
    setUserPowerUps((prev) =>
      prev
        .map((p) => (p.id === powerUp.id ? { ...p, count: p.count - 1 } : p))
        .filter((p) => p.count > 0)
    );
  };

  //  General Game Mechanics

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

    setUserPowerUps([]);
    setPowerUps([]);
    setPlayersURL([]);
    setPlayersLocation([]);
    setPlayerTeams({});
    setRoomCode(null);
    setCactusModalVisible(false);
    setPlayerArray([]);

    router.replace("/(tabs)/home");
  };

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
      {location ? (
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
            coordinates={circleCoordinates}
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
            const playerURL = playerURLArray.find(
              (urlItem) => urlItem.id === player.id
            )?.profile;
            const lat = player.latitude;
            const lon = player.longitude;
            const isValidCoordinate = typeof lat === 'number' && typeof lon === 'number';
            if (!isValidCoordinate) return null;
            return (
              <Marker
                key={player.id}
                coordinate={{
                  latitude: player.latitude,
                  longitude: player.longitude,
                }}
              >
                <View>
                  {!player.cowboyHat && playerURL ? (
                    <Image source={{ uri: playerURL }} style={styles.user} />
                  ) : (
                    <AppText> </AppText>
                  )}
                </View>
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
          <ReusableButton label="Fire" onPress={fireLaser} />
          <AppText>
            Direction:{" "}
            {degree(
              magnetometerDataRef.current.x,
              magnetometerDataRef.current.y
            )}
            °{" "}
            {cardinal(
              degree(
                magnetometerDataRef.current.x,
                magnetometerDataRef.current.y
              )
            )}
          </AppText>

          <AppText>Latitude: {location?.coords.latitude}</AppText>
          <AppText>Longitude: {location?.coords.longitude}</AppText>

          <FlatList
            data={userPowerUps}
            keyExtractor={(item) => item.type}
            renderItem={renderPowerUpItem}
            style={styles.powerUpList}
          />

          <Modal visible={cactusModalVisible} animationType="slide">
            {location ? (
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <MapView
                  style={StyleSheet.absoluteFillObject}
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
                  onPress={cactusMapPress}
                >
                  <Polygon
                    coordinates={circleCoordinates}
                    strokeColor="#FF0000"
                    strokeWidth={2}
                    fillColor="#FF000040"
                  />
                  {selectedCactusLocation && (
                    <Marker coordinate={selectedCactusLocation}>
                      <View>
                        <CactusIcon width={30} height={30} />
                      </View>
                    </Marker>
                  )}
                </MapView>

                <View
                  style={{
                    position: "absolute",
                    bottom: 20,
                    alignSelf: "center",
                  }}
                >
                  <ReusableButton label="Confirm" onPress={handleConfirm} />
                  <ReusableButton
                    label="Cancel"
                    onPress={() => setCactusModalVisible(false)}
                  />
                </View>
              </View>
            ) : (
              <Text>Loading cactus...</Text>
            )}
          </Modal>

          <TouchableOpacity onPress={resetGame} style={styles.exit}>
            <AppText>Exit Game</AppText>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheet>

      <PlayerListModal
        visible={isOxStampedeModalVisible}
        onClose={() => setOxStampedeModalVisible(false)}
        players={playerArray}
        onSelect={handleTargetSelect}
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
    backgroundColor: "#f0f0f0",
    borderRadius: 5,
    flexDirection: "row",
    alignItems: "center",
  },
  powerUpIconContainer: {
    marginRight: 10,
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
function wait(arg0: number) {
  throw new Error("Function not implemented.");
}
