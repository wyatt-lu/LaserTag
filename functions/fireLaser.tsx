import { ref, get, update } from "firebase/database";

type PLD = {
  playerId: string;
  direction: number;
  x: number;
  y: number;
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
  LASER_LENGTH: number
) {
  console.log("entered fireLaser");
  const roomPlayerRef = ref(database, `rooms/${roomCode}/players`);
  const roomPlayerInfo = await get(roomPlayerRef);
  const roomsgklj = roomPlayerInfo.val();
  if (!roomsgklj) {
    console.log("No player data found in Firebase");
    return;
  }
  let playerLaserData: PLD[] = [];
  //const [playerLaserData, setPlayerLaserData] = useState<PLD[]>([]);
  Object.entries(roomsgklj).forEach(([playerId, roomData]) => {
    console.log("inside first loop");
    console.log(`Player ID: ${playerId}`);
    //initialize vars outside
    let curDir, curX, curY;
    // Loop through each property of the player
    Object.entries(roomData as { [key: string]: any }).forEach(
      ([key, value]) => {
        console.log(`${key}: ${value}`);
        if (key === "direction") {
          curDir = value;
        }
        if (key === "cartesian") {
          Object.entries(value as { [key: string]: any }).forEach(
            ([coordKey, coordValue]) => {
              if (coordKey === "x") {
                curX = coordValue;
              }
              if (coordKey === "y") {
                curY = coordValue;
              }
            }
          );
        }
      });
    console.log(`Direction: ${curDir}, X: ${curX}, Y: ${curY}`);
    if (curDir != null && curX != null && curY != null) {
      console.log("condition met: adding data to player-laser state");
      const fireCoords = {
        playerId: playerId,
        direction: curDir,
        x: curX,
        y: curY,
      };
      //update state and add data to array
      //setPlayerLaserData((prevData) => [...prevData, fireCoords]);
      playerLaserData.push(fireCoords);
    }
  });
  //generateLaserLine(playerLaserData);
  //Now call generateLaserLine once after all the data is collected
  if (playerLaserData.length > 0) {
    console.log("Generated playerLaserData: ", playerLaserData);
    generateLaserLine(playerLaserData, LASER_LENGTH, database, roomCode);
  } else {
    console.log("No valid player data collected");
  }
}

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
  // Horizontal line intersection
  const checkHorizontal = (
    y: number,
    startX: number,
    endX: number
  ): boolean => {
    return y >= by && y <= by + bh && startX <= bx + bw && endX >= bx;
  };
  // Vertical line intersection
  const checkVertical = (x: number, startY: number, endY: number): boolean => {
    return x >= bx && x <= bx + bw && startY <= by + bh && endY >= by;
  };
  // Check if line intersects any of the four sides of the box
  if (
    checkHorizontal(y1, x1, x2) ||
    checkHorizontal(y2, x1, x2) ||
    checkVertical(x1, y1, y2) ||
    checkVertical(x2, y1, y2)
  ) {
    return true;
  }
  return false;
};

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
      endX: endX,
      endY: endY,
    });
    boxList.forEach((hitBox) => {
      if (
        checkIntersection(
          player.x,
          player.y,
          endX,
          endY,
          hitBox.x,
          hitBox.y,
          hitBox.width,
          hitBox.height
        )
      ) {
        console.log(
          `Player ${hitBox.player} is hit by laser from ${player.playerId}!`
        );
        eliminatePlayer(hitBox.player, database, roomCode, player.playerId); // Use hitBox.player as the target player ID
        eliminatedPlayer = true;
        return;
      }
    });
  });
  return laserData;
};

const eliminatePlayer = async (
  playerId: string,
  database: any,
  roomCode: any,
  winnerPlayer: any
) => {
  console.log(`Eliminating player: ${playerId}`);
  const playerRef = ref(database, `rooms/${roomCode}/players/${playerId}`);
  await update(playerRef, { eliminated: true });

  const winnerPlayerRef = ref(
    database,
    `rooms/${roomCode}/players/${winnerPlayer}`
  );
  const winnerPlayerInfo = await get(winnerPlayerRef);
  if (winnerPlayerInfo.exists()) {
    const winnerPlayerData = winnerPlayerInfo.val();
    await update(winnerPlayerRef, { points: winnerPlayerData.points + 1 });
  }
};

const getHitBox = (dataArray: PLD[]) => {
  const boxList: Box[] = [];
  let x, y;
  dataArray.forEach((player) => {
    x = player.x;
    y = player.y;
    const hitBox = {
      player: player.playerId,
      x: x - 1,
      y: y - 1,
      width: 2,
      height: 2,
    };
    boxList.push(hitBox);
  });
  return boxList;
};

const degToRad = (deg: number) => {
  return deg * (Math.PI / 180);
};
