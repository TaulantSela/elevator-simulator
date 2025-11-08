import React, { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";

type Direction = "up" | "down" | "idle";
type HallDirection = "up" | "down";

type NextStop = {
  floor: number;
  direction: Direction;
};

const FLOORS = [7, 6, 5, 4, 3, 2, 1];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const FLOOR_TRAVEL_TIME = 1600;
const DOOR_OPEN_BUFFER = 800;
const DOOR_OPEN_TIME = 2200;
const DOOR_CLOSE_TIME = 2200;

function App() {
  const [currentFloor, setCurrentFloor] = useState<number>(1);
  const [statusMessage, setStatusMessage] = useState<string>("Idle");
  const [doorOpenFloor, setDoorOpenFloor] = useState<number | null>(null);
  const [direction, setDirection] = useState<Direction>("idle");
  const [isProcessing, setIsProcessing] = useState(false);
  const [cabinRequests, setCabinRequests] = useState<number[]>([]);
  const [hallUpRequests, setHallUpRequests] = useState<number[]>([]);
  const [hallDownRequests, setHallDownRequests] = useState<number[]>([]);

  const currentFloorRef = useRef(currentFloor);
  const directionRef = useRef(direction);
  const doorStateRef = useRef(doorOpenFloor);
  const processingRef = useRef(false);
  const cabinRequestsRef = useRef(cabinRequests);
  const hallUpRequestsRef = useRef(hallUpRequests);
  const hallDownRequestsRef = useRef(hallDownRequests);

  useEffect(() => {
    currentFloorRef.current = currentFloor;
  }, [currentFloor]);

  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  useEffect(() => {
    doorStateRef.current = doorOpenFloor;
  }, [doorOpenFloor]);

  useEffect(() => {
    cabinRequestsRef.current = cabinRequests;
  }, [cabinRequests]);

  useEffect(() => {
    hallUpRequestsRef.current = hallUpRequests;
  }, [hallUpRequests]);

  useEffect(() => {
    hallDownRequestsRef.current = hallDownRequests;
  }, [hallDownRequests]);

  const hasPendingRequests = useCallback(
    () =>
      cabinRequestsRef.current.length > 0 ||
      hallUpRequestsRef.current.length > 0 ||
      hallDownRequestsRef.current.length > 0,
    []
  );

  const addCabinRequest = useCallback((floor: number) => {
    setCabinRequests((prev) =>
      prev.includes(floor) ? prev : [...prev, floor].sort((a, b) => a - b)
    );
  }, []);

  const addHallRequest = useCallback((floor: number, hallDirection: HallDirection) => {
    if (hallDirection === "up") {
      setHallUpRequests((prev) =>
        prev.includes(floor) ? prev : [...prev, floor].sort((a, b) => a - b)
      );
    } else {
      setHallDownRequests((prev) =>
        prev.includes(floor) ? prev : [...prev, floor].sort((a, b) => a - b)
      );
    }
  }, []);

  const clearRequestsAtFloor = useCallback((floor: number, servicedDirection: Direction | "idle") => {
    setCabinRequests((prev) => prev.filter((value) => value !== floor));
    setHallUpRequests((prev) => prev.filter((value) => value !== floor));
    setHallDownRequests((prev) => prev.filter((value) => value !== floor));
  }, []);

  const isFloorPending = useCallback(
    (floor: number) =>
      cabinRequestsRef.current.includes(floor) ||
      hallUpRequestsRef.current.includes(floor) ||
      hallDownRequestsRef.current.includes(floor),
    []
  );

  const closeDoors = useCallback(async (suppressStatus = false) => {
    if (doorStateRef.current === null) {
      if (!suppressStatus) {
        setStatusMessage("Doors already closed");
      }
      return;
    }

    setStatusMessage("Doors closing");
    await sleep(DOOR_CLOSE_TIME);
    doorStateRef.current = null;
    setDoorOpenFloor(null);

    if (!suppressStatus) {
      setStatusMessage("Doors closed");
    }
  }, []);

  const arriveAndService = useCallback(
    async (floor: number, servicedDirection: Direction | "idle") => {
      setDirection("idle");
      setStatusMessage(`Arrived at floor ${floor}`);
      await sleep(DOOR_OPEN_BUFFER);
      setStatusMessage("Doors opening");
      doorStateRef.current = floor;
      setDoorOpenFloor(floor);
      await sleep(DOOR_OPEN_TIME);
      setStatusMessage("Doors closing");
      await closeDoors(true);
      setStatusMessage("Doors closed");
      clearRequestsAtFloor(floor, servicedDirection);
    },
    [clearRequestsAtFloor, closeDoors]
  );

  const pickNextStop = useCallback((): NextStop | null => {
    const current = currentFloorRef.current;
    const dir = directionRef.current;

    const cabinHere = cabinRequestsRef.current.includes(current);
    const hallUpHere = hallUpRequestsRef.current.includes(current);
    const hallDownHere = hallDownRequestsRef.current.includes(current);

    if (cabinHere || hallUpHere || hallDownHere) {
      if (hallUpHere && !hallDownHere) {
        return { floor: current, direction: "up" };
      }
      if (hallDownHere && !hallUpHere) {
        return { floor: current, direction: "down" };
      }
      if (cabinHere) {
        if (dir === "up" || dir === "down") {
          return { floor: current, direction: dir };
        }
        return { floor: current, direction: "idle" };
      }
      return { floor: current, direction: dir === "down" ? "down" : "up" };
    }

    const upTargets = Array.from(
      new Set([
        ...cabinRequestsRef.current.filter((floor) => floor > current),
        ...hallUpRequestsRef.current.filter((floor) => floor > current),
      ])
    ).sort((a, b) => a - b);

    const downTargets = Array.from(
      new Set([
        ...cabinRequestsRef.current.filter((floor) => floor < current),
        ...hallDownRequestsRef.current.filter((floor) => floor < current),
      ])
    ).sort((a, b) => b - a);

    if (dir === "up") {
      if (upTargets.length) {
        return { floor: upTargets[0], direction: "up" };
      }
      if (downTargets.length) {
        return { floor: downTargets[0], direction: "down" };
      }
    } else if (dir === "down") {
      if (downTargets.length) {
        return { floor: downTargets[0], direction: "down" };
      }
      if (upTargets.length) {
        return { floor: upTargets[0], direction: "up" };
      }
    } else {
      if (upTargets.length && downTargets.length) {
        const nearestUp = upTargets[0];
        const nearestDown = downTargets[0];
        const upDistance = Math.abs(nearestUp - current);
        const downDistance = Math.abs(nearestDown - current);

        if (upDistance <= downDistance) {
          return { floor: nearestUp, direction: "up" };
        }
        return { floor: nearestDown, direction: "down" };
      }

      if (upTargets.length) {
        return { floor: upTargets[0], direction: "up" };
      }

      if (downTargets.length) {
        return { floor: downTargets[0], direction: "down" };
      }
    }

    if (hallUpRequestsRef.current.includes(current)) {
      return { floor: current, direction: "up" };
    }

    if (hallDownRequestsRef.current.includes(current)) {
      return { floor: current, direction: "down" };
    }

    return null;
  }, []);

  const moveToStop = useCallback(
    async (targetFloor: number, travelDirection: Direction) => {
      if (doorStateRef.current !== null) {
        await closeDoors(true);
      }

      if (!isFloorPending(targetFloor)) {
        return;
      }

      if (currentFloorRef.current === targetFloor) {
        await arriveAndService(targetFloor, travelDirection);
        return;
      }

      const step = targetFloor > currentFloorRef.current ? 1 : -1;
      const directionLabel: Direction = step > 0 ? "up" : "down";
      setDirection(directionLabel);

      while (currentFloorRef.current !== targetFloor) {
        setStatusMessage(`Moving ${directionLabel} to floor ${targetFloor}`);
        await sleep(FLOOR_TRAVEL_TIME);
        currentFloorRef.current += step;
        setCurrentFloor(currentFloorRef.current);
        await sleep(350);

        const shouldStopHere =
          cabinRequestsRef.current.includes(currentFloorRef.current) ||
          (directionLabel === "up" && hallUpRequestsRef.current.includes(currentFloorRef.current)) ||
          (directionLabel === "down" && hallDownRequestsRef.current.includes(currentFloorRef.current));

        if (shouldStopHere) {
          await arriveAndService(currentFloorRef.current, directionLabel);

          if (!isFloorPending(targetFloor)) {
            return;
          }

          setDirection(directionLabel);
        }
      }

      if (isFloorPending(targetFloor)) {
        await arriveAndService(targetFloor, directionLabel);
      }
    },
    [arriveAndService, closeDoors, isFloorPending]
  );

  useEffect(() => {
    if (processingRef.current || !hasPendingRequests()) {
      return;
    }

    processingRef.current = true;
    setIsProcessing(true);

    const processQueue = async () => {
      while (hasPendingRequests()) {
        const nextStop = pickNextStop();
        if (!nextStop) {
          break;
        }

        await moveToStop(nextStop.floor, nextStop.direction);
      }

      setStatusMessage("Idle");
      setDirection("idle");
      processingRef.current = false;
      setIsProcessing(false);
    };

    processQueue();
  }, [cabinRequests, hallDownRequests, hallUpRequests, hasPendingRequests, moveToStop, pickNextStop]);

  const handleManualDoorOpen = useCallback(async () => {
    if (isProcessing) {
      setStatusMessage("Cannot open doors while elevator is moving");
      return;
    }

    if (doorStateRef.current !== null) {
      setStatusMessage("Doors already open");
      return;
    }

    setDirection("idle");
    setStatusMessage("Opening doors");
    await sleep(DOOR_OPEN_BUFFER);
    const floor = currentFloorRef.current;
    doorStateRef.current = floor;
    setDoorOpenFloor(floor);
    await sleep(DOOR_OPEN_TIME);
    setStatusMessage("Doors open — choose a destination");
  }, [isProcessing]);

  const handleHallCall = useCallback(
    (floor: number, hallDirection: HallDirection) => {
      const pendingSet = hallDirection === "up" ? hallUpRequestsRef.current : hallDownRequestsRef.current;
      if (pendingSet.includes(floor)) {
        return;
      }

      const elevatorHere = floor === currentFloorRef.current;
      const doorsClosed = doorStateRef.current === null;
      const elevatorIdle = directionRef.current === "idle" && !isProcessing;

      if (elevatorHere && doorsClosed && elevatorIdle) {
        void handleManualDoorOpen();
        return;
      }

      addHallRequest(floor, hallDirection);
      setStatusMessage(`Registered ${hallDirection.toUpperCase()} call on floor ${floor}`);
    },
    [addHallRequest, isProcessing, handleManualDoorOpen]
  );

  const handleDestinationSelect = useCallback(
    (floor: number) => {
      if (floor === currentFloorRef.current || cabinRequestsRef.current.includes(floor)) {
        return;
      }
      addCabinRequest(floor);
    },
    [addCabinRequest]
  );

  return (
    <div className="app">
      <div className="elevator-card">
        <header className="elevator-header">
          <h1 className="title">Elevator Controller</h1>
          <p className="status">{statusMessage}</p>
          <p className="status">Current floor: {currentFloor}</p>
        </header>

        <div className="instructions">
          <p><strong>How to use:</strong></p>
          <ol>
            <li>Press ↑ or ↓ on your floor; if the elevator is already there, the doors open.</li>
            <li>When the status shows <q>Doors open</q>, tap your destination inside.</li>
            <li>The elevator serves active arrows in its travel direction before turning around.</li>
          </ol>
        </div>

        <div className="door-visual" aria-label="Elevator doors indicator">
          <button
            type="button"
            className={`door-icon${doorOpenFloor !== null ? " open" : ""}`}
            disabled
            aria-pressed={doorOpenFloor !== null}
          >
            <span className="door-panel left" aria-hidden="true" />
            <span className="door-panel right" aria-hidden="true" />
            <span className="door-icon-label">
              {doorOpenFloor !== null ? "Doors Open" : "Doors Closed"}
            </span>
          </button>
        </div>

        <div className="elevator-body">
          <section className="floor-column" aria-label="Hall call buttons">
            {FLOORS.map((floor) => {
              const isCurrent = floor === currentFloor;
              const isDoorOpen = doorOpenFloor === floor;
              const upQueued = hallUpRequests.includes(floor);
              const downQueued = hallDownRequests.includes(floor);

              return (
                <div key={`hall-${floor}`} className={`floor-row${isCurrent ? " active" : ""}${isDoorOpen ? " door-open" : ""}`}>
                  <div className="floor-number-badge">{floor}</div>
                  <div className="hall-controls">
                    {floor !== FLOORS[0] && (
                      <button
                        type="button"
                        className={`hall-button up${upQueued ? " queued" : ""}`}
                        onClick={() => handleHallCall(floor, "up")}
                        disabled={upQueued && !isDoorOpen}
                        aria-label={`Call elevator up from floor ${floor}`}
                      >
                        <span aria-hidden="true">↑</span>
                      </button>
                    )}
                    {floor !== FLOORS[FLOORS.length - 1] && (
                      <button
                        type="button"
                        className={`hall-button down${downQueued ? " queued" : ""}`}
                        onClick={() => handleHallCall(floor, "down")}
                        disabled={downQueued && !isDoorOpen}
                        aria-label={`Call elevator down from floor ${floor}`}
                      >
                        <span aria-hidden="true">↓</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </section>

          <section className="cabin-panel" aria-label="Cabin destination panel">
            <div className="panel-grid">
              {[...FLOORS].sort((a, b) => b - a).map((floor) => {
                const isQueued = cabinRequests.includes(floor);
                const isCurrent = currentFloor === floor;

                return (
                  <button
                    key={`panel-${floor}`}
                    type="button"
                    className={`panel-button${isQueued ? " queued" : ""}${isCurrent ? " current" : ""}`}
                    onClick={() => handleDestinationSelect(floor)}
                    disabled={isCurrent || isQueued}
                  >
                    {floor}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default App;
