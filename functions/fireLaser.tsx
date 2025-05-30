import { ref, get, update } from "firebase/database";
import { cartesianToLatLng } from "@/functions/locationUtilityFunctions";

type PLD = {
  playerId: string;
  direction: number;
  x: number;
  y: number;
  team: number;
};

type Box = {
  player: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type LL = {
  playerId: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

export async function fireLaser(
  database: any,
  roomCode: any,
  LASER_LENGTH: number,
  center: { latitude: number; longitude: number }
) {
  const roomPlayerRef = ref(database, `rooms/${roomCode}/players`);
  const roomPlayerInfo = await get(roomPlayerRef);
  const roomsData = roomPlayerInfo.val();
  if (!roomsData) return [];

  let playerLaserData: PLD[] = [];

  Object.entries(roomsData).forEach(([playerId, roomData]) => {
    let curDir, curX, curY, curTeam;
    Object.entries(roomData as { [key: string]: any }).forEach(([key, value]) => {
      if (key === "direction") curDir = value;
      if (key === "cartesian") {
        curX = value.x;
        curY = value.y;
      }
      if (key === "team") curTeam = value;
    });

    if (curDir != null && curX != null && curY != null && curTeam != null) {
      playerLaserData.push({
        playerId,
        direction: curDir,
        x: curX,
        y: curY,
        team: curTeam,
      });
    }
  });

  const laserData = await generateLaserLine(playerLaserData, LASER_LENGTH, database, roomCode);

  // Convert to visual lines
  return laserData.map((l) => ({
    id: `${l.playerId}-${Date.now()}`,
    start: cartesianToLatLng({ x: l.startX, y: l.startY }, center),
    end: cartesianToLatLng({ x: l.endX, y: l.endY }, center),
  }));
}

const generateLaserLine = async (
  dataArray: PLD[],
  laserLength: number,
  database: any,
  roomCode: any
) => {
  const laserData: LL[] = [];
  const boxList = getHitBox(dataArray);
  let eliminatedPlayer = false;

  dataArray.forEach((player) => {
    if (eliminatedPlayer) return;
    const angleRad = degToRad(player.direction);
    const endX = player.x + laserLength * Math.cos(angleRad);
    const endY = player.y + laserLength * Math.sin(angleRad);

    laserData.push({
      playerId: player.playerId,
      startX: player.x,
      startY: player.y,
      endX,
      endY,
    });

    boxList.forEach(async (hitBox) => {
      if (
        checkIntersection(player.x, player.y, endX, endY, hitBox.x, hitBox.y, hitBox.width, hitBox.height) &&
        hitBox.player !== player.playerId
      ) {
        const hitBoxPlayerRef = ref(database, `rooms/${roomCode}/players/${hitBox.player}`);
        const hitBoxPlayerInfo = await get(hitBoxPlayerRef);
        if (!hitBoxPlayerInfo.exists()) return;
        const hitBoxPlayerData = hitBoxPlayerInfo.val();
        if (hitBoxPlayerData.team === player.team) return;

        await eliminatePlayer(hitBox.player, database, roomCode, player.playerId);
        eliminatedPlayer = true;
      }
    });
  });

  return laserData;
};

const eliminatePlayer = async (
  winnerPlayer: string,
  database: any,
  roomCode: any,
  playerId: string
) => {
  const playerRef = ref(database, `rooms/${roomCode}/players/${playerId}`);
  await update(playerRef, { eliminated: true });
  const playerInfo = await get(playerRef);
  if (!playerInfo.exists()) return;
  const playerData = playerInfo.val();
  if (playerData.fake) return;

  const winnerRef = ref(database, `rooms/${roomCode}/players/${winnerPlayer}`);
  const winnerInfo = await get(winnerRef);
  if (!winnerInfo.exists()) return;
  const winnerData = winnerInfo.val();

  const newPoints = winnerData.points + 1;
  await update(winnerRef, { points: newPoints });

  const winnerGlobalRef = ref(database, `players/${winnerPlayer}`);
  const globalData = await get(winnerGlobalRef);
  if (globalData.exists()) {
    const currentPoints = globalData.val().points || 0;
    await update(winnerGlobalRef, { points: currentPoints + 1 });
  }
};

const getHitBox = (dataArray: PLD[]) => {
  return dataArray.map((player) => ({
    player: player.playerId,
    x: player.x - 1,
    y: player.y - 1,
    width: 2,
    height: 2,
  }));
};

const degToRad = (deg: number) => deg * (Math.PI / 180);

const checkIntersection = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  bx: number,
  by: number,
  bw: number,
  bh: number
): boolean => {
  const checkHorizontal = (y: number, startX: number, endX: number): boolean =>
    y >= by && y <= by + bh && startX <= bx + bw && endX >= bx;

  const checkVertical = (x: number, startY: number, endY: number): boolean =>
    x >= bx && x <= bx + bw && startY <= by + bh && endY >= by;

  return (
    checkHorizontal(y1, x1, x2) ||
    checkHorizontal(y2, x1, x2) ||
    checkVertical(x1, y1, y2) ||
    checkVertical(x2, y1, y2)
  );
};