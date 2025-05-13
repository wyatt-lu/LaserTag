import { auth, database } from "@/firebaseconfig";
import { get, ref, remove, set, update } from "firebase/database";
import {
    latLngToCartesian,
    cartesianToLatLng,
    degree,
  } from "@/functions/locationUtilityFunctions";

export const useOx = () => {};
export const useHorseshoe = () => {};
export const useLasso = () => {};
export const cowboyHat = async (roomCode: string | string[]) => {
    if (!auth.currentUser) return;
    const playerId = auth.currentUser.uid;
    const playerRef = ref(database, `rooms/${roomCode}/players/${playerId}`);
    await update(playerRef, { cowboyHat: true });
    setTimeout(async () => {
      await update(playerRef, { cowboyHat: false });
    }, 5000);
  };
export 
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

    const fakeUserRef = ref(
      database,
      `rooms/${roomNum}/players/${randomFakeUserId}`
    );
    //create fakeUser data in database
    await set(fakeUserRef,{
        ...playerData, 
        fake: true,
    });

    //allow fake user to exist for 5 seconds
    const interval = async () => {
      const interval = setInterval(async () => {
        let xDelta = Math.random() * 4 - 2;
        let yDelta = Math.random() * 4 - 2;
        let fakeUserRef = ref(
          database,
          `rooms/${roomNum}/players/${randomFakeUserId}`
        );
        let fakeUserInfo = await get(fakeUserRef);
        if (!fakeUserInfo.exists()) return;

        let fakeUserData = fakeUserInfo.val();
        let newLat = fakeUserData.cartesian.x + xDelta;
        let newLong = fakeUserData.cartesian.y + yDelta;

        await update(fakeUserRef, { x: newLat, y: newLong });
        //update fake location every 1 sec
      }, 1000);
      // Stop the interval after 20 seconds
      setTimeout(async () => {
        clearInterval(interval);
        // console.log("timeout randomFakeUserId", randomFakeUserId);

        let fakeUserRef = ref(
          database,
          `rooms/${roomNum}/players/${randomFakeUserId}`
        );
        await remove(fakeUserRef);
      }, 20000);
    };
    interval();
  };
// "etc..."
