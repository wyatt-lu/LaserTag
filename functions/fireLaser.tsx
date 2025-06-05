import { ref, get, update, Database } from "firebase/database";
import { getAuth } from "firebase/auth";

export async function fireLaser(
  database: Database,
  roomCode: string | string[],
  LASER_LENGTH: number,
  center: { latitude: number; longitude: number }
) {
  const auth = getAuth();
  if (!auth.currentUser) return;

  const playerId = auth.currentUser.uid;
  const playerRef = ref(database, `rooms/${roomCode}/players/${playerId}`);
  const playerInfo = await get(playerRef);

  if (!playerInfo.exists()) return;

  const playerData = playerInfo.val();

  console.log("=== LASSO HAS BEEN THROWN ===");
  console.log("Lasso thrower:", playerData.username);

  if (
    playerData.isEliminated ||
    !playerData.isMarkerShowing ||
    playerData.lives === 0
  ) {
    console.log(
      playerData.username,
      "is either eliminated already or out of lives."
    );
    return;
  }

  const { cartesian, direction } = playerData;

  const roomPlayerRef = ref(database, `rooms/${roomCode}/players`);
  const roomPlayerInfo = await get(roomPlayerRef);

  if (!roomPlayerInfo.exists()) return;

  const roomPlayerData = roomPlayerInfo.val();

  const directionInRadians = (direction * Math.PI) / 180;
  const laserEndX = cartesian.x + LASER_LENGTH * Math.cos(directionInRadians);
  const laserEndY = cartesian.y + LASER_LENGTH * Math.sin(directionInRadians);

  for (const [targetPlayerId, targetPlayerData] of Object.entries(
    roomPlayerData
  )) {
    const target = targetPlayerData as any;

    if (
      targetPlayerId === playerId ||
      target.team === playerData.team ||
      target.isEliminated ||
      !target.isMarkerShowing ||
      target.lives === 0 ||
      !target.cartesian
    ) {
      console.log("Target is on same team or eliminated already.");
      continue;
    }

    if (target.cowboyHat) {
      console.log("Target is the doppleganger of a player.");
      continue;
    }

    console.log("Shooter position:", cartesian.x, cartesian.y);
    console.log("Shooter direction:", direction);
    console.log("Laser end:", laserEndX, laserEndY);
    console.log("Target position:", target.cartesian.x, target.cartesian.y);
    console.log(
      "Target rectangle:",
      target.cartesian.x - 5,
      target.cartesian.y - 5
    );

    const intersects = checkIfLineIntersectsRectangle(
      cartesian.x,
      cartesian.y,
      laserEndX,
      laserEndY,
      target.cartesian.x - 5,
      target.cartesian.y - 5,
      10,
      10
    );
    console.log("Line intersects rectangle:", intersects);
    if (!intersects) console.log("Lasso missed.");

    if (intersects) {
      const targetRef = ref(
        database,
        `rooms/${roomCode}/players/${targetPlayerId}`
      );

      console.log(
        `${target.username} has been eliminated by ${playerData.username}`
      );
      await update(targetRef, {
        isEliminated: true,
        eliminationReason: "Lasso",
      });

      const indiviPlayerRef = ref(database, `players/${playerId}`);
      const freshPlayerInfo = await get(indiviPlayerRef);
      const shooterData = freshPlayerInfo.val();
      const newPoints = (shooterData.points) + 1;
      console.log("newPoints")
      await update(playerRef, { points: newPoints });

      break;
    }
  }
}

const checkIfLineIntersectsRectangle = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rectX: number,
  rectY: number,
  rectWidth: number,
  rectHeight: number
): boolean => {
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    return (
      x1 >= rectX &&
      x1 <= rectX + rectWidth &&
      y1 >= rectY &&
      y1 <= rectY + rectHeight
    );
  }

  let t0 = 0;
  let t1 = 1;

  const p = [-dx, dx, -dy, dy];
  const q = [
    x1 - rectX,
    rectX + rectWidth - x1,
    y1 - rectY,
    rectY + rectHeight - y1,
  ];

  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) {
        if (t > t1) return false;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return false;
        if (t < t1) t1 = t;
      }
    }
  }
  return t0 <= t1;
};
