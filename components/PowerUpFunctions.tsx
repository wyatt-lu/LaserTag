/*const usePowerUp = (powerUp: {
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
  };*/