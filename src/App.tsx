import React, { useState, useRef } from "react";
import './App.css';

interface Request {
    currentFloor: number;
    destinationFloor: number;
    direction: string;
}

function App() {
    const floors = [5, 4, 3, 2, 1];
    const [currentFloor, setCurrentFloor] = useState(1);
    const [statusMessage, setStatusMessage] = useState("idle");
    const [highlightFloor, setHighlightFloor] = useState(10);

    const compareUpRequests = (a: Request, b: Request) => {
        if (b.destinationFloor) {
            return a.destinationFloor - b.destinationFloor;
        } else {
            return 0;
        }
    };

    const compareDownRequests = (a: Request, b: Request) => {
        if (b.destinationFloor) {
            return b.destinationFloor - a.destinationFloor;
        } else {
            return 0;
        }
    };

    const upRequests: Array<Request> = [];
    const downRequests: Array<Request> = [];

    const upReqArray = useRef<Request[]>([]);
    const downReqArray = useRef<Request[]>([]);

    const currFloor = useRef(1);
    const currState = useRef("idle");
    const isInit = useRef(false);

    const PlaceUpRequest = (req: Request) => {
        upRequests.push(req);
        upRequests.sort(compareUpRequests);
        upReqArray.current = upRequests;
    };

    const PlaceDownRequest = (req: Request) => {
        downRequests.push(req);
        downRequests.sort(compareDownRequests);
        downReqArray.current = downRequests;
    };

    const onClickUp = (selectedFloor: number) => {
        PlaceUpRequest({ currentFloor: selectedFloor, destinationFloor: selectedFloor, direction: "up" });

        if (currFloor.current > selectedFloor) {

            PlaceDownRequest({ currentFloor: currFloor.current, destinationFloor: selectedFloor, direction: "idle" });
        }
        if (isInit.current === false) {
            SimulateElevator();
            isInit.current = true;
        }
    };

    const onClickDown = (selectedFloor: number) => {
        PlaceDownRequest({ currentFloor: selectedFloor, destinationFloor: selectedFloor, direction: "down" });

        if (currFloor.current < selectedFloor) {

            PlaceUpRequest({ currentFloor: currFloor.current, destinationFloor: selectedFloor, direction: "idle" });
        }
        if (isInit.current === false) {
            SimulateElevator();
            isInit.current = true;
        }
    };

    const onClickFloor = (selectedFloor: number) => {

        if (selectedFloor === floors[floors.length - 1]) {

            PlaceDownRequest({ currentFloor: currFloor.current, destinationFloor: selectedFloor, direction: "down" });
        } else if (selectedFloor == floors[1]) {

            PlaceUpRequest({ currentFloor: currFloor.current, destinationFloor: selectedFloor, direction: "up" });
        } else {
            if (currFloor.current <= selectedFloor) {

                PlaceUpRequest({ currentFloor: currFloor.current, destinationFloor: selectedFloor, direction: "up" });
            }
            else {

                PlaceDownRequest({ currentFloor: currFloor.current, destinationFloor: selectedFloor, direction: "down" });
            }
        }
        if (isInit.current === false) {
            SimulateElevator();
            isInit.current = true;
        }
    };

    const timeout = (delay: number) => {
        return new Promise(res => setTimeout(res, delay));
    };

    const SimulateElevator = async () => {
        while (1) {
            if (currState.current === "idle" || currState.current === "up") {
                await MoveUp();
                await MoveDown();
            }
            else {
                await MoveDown();
                await MoveUp();
            }
            currState.current = "idle";
            await setStatusMessage("Idle...");
            await timeout(1000);
        }
    };

    const MoveUp = async () => {

        var isInterFloor = false;

        while (upReqArray.current.length > 0) {
            const req = upReqArray.current[0];
            upReqArray.current.shift();
            while (req.destinationFloor >= currFloor.current) {
                const intermediateRequest = upReqArray.current.length > 0 ? upReqArray.current[0] : undefined;
                if (intermediateRequest != undefined && intermediateRequest.destinationFloor === currFloor.current) {
                    upReqArray.current.shift();
                    isInterFloor = true;
                }

                if (req.destinationFloor === currFloor.current || isInterFloor === true) {


                    if (req.direction != "idle" || isInterFloor === true) {
                        await timeout(2000);
                        await setStatusMessage("Opening Door...");
                        await setHighlightFloor(currFloor.current);
                        await timeout(3000);
                        await setStatusMessage("Closing Door...");
                        await setHighlightFloor(10);
                        await timeout(2000);
                        isInterFloor = false;
                    }

                    if (req.destinationFloor === currFloor.current) {
                        break;
                    }
                }
                else {

                    await setStatusMessage("Going Up...");
                    await timeout(3000);
                    currState.current = "up";

                    currFloor.current = currFloor.current + 1;
                    await setCurrentFloor(currFloor.current);

                }
            }
        }
    };

    const MoveDown = async () => {
        var isInterFloor = false;

        while (downReqArray.current.length > 0) {
            const req = downReqArray.current[0];
            downReqArray.current.shift();

            while (req.destinationFloor <= currFloor.current) {

                const intermediateRequest = downReqArray.current.length > 0 ? downReqArray.current[0] : undefined;

                if (intermediateRequest != undefined && intermediateRequest.destinationFloor === currFloor.current) {
                    downReqArray.current.shift();
                    isInterFloor = true;
                }

                if (req.destinationFloor == currFloor.current || isInterFloor === true) {

                    if (req.direction != "idle" || isInterFloor === true) {
                        await timeout(2000);
                        await setStatusMessage("Opening Door...");
                        await setHighlightFloor(currFloor.current);
                        await timeout(3000);
                        await setStatusMessage("Closing Door...");
                        await setHighlightFloor(10);
                        await timeout(2000);
                        isInterFloor = false;
                    }
                    if (req.destinationFloor === currFloor.current) {
                        break;
                    }
                }
                else {

                    await setStatusMessage("Going Down...");
                    await timeout(3000);
                    currState.current = "down";

                    currFloor.current = currFloor.current - 1;
                    await setCurrentFloor(currFloor.current);

                }
            }
        }

    };

    return (
        <div className="App">
            <div className="elevator">
                <h3 className="info">Current State: {statusMessage}</h3>
                <h3 className="info">Current Floor: {currentFloor}</h3>
                <div className="floors">
                    {floors.map((floor, key) => (
                        <div key={key} className="buttons">
                            <div className="up-down">
                                {floor !== 5 && (
                                    <button
                                        onClick={() => onClickUp(floor)}
                                        className="test	fa fa-angle-up"
                                    >Up</button>
                                )}
                                {floor !== 1 && (
                                    <button
                                        onClick={() => onClickDown(floor)}
                                        className="test fa fa-angle-down"
                                    >Down</button>
                                )}
                            </div>
                            <label
                                className={`floor ${highlightFloor === floor ? " currentFloor" : ""}`}> {floor}
                            </label>

                        </div>
                    ))}
                    <div className="insidePanel">
                        {floors.map((floor, key) => (
                            <div >
                                <button onClick={() => onClickFloor(floor)} className="insideButton">
                                    {floor}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

            </div>


        </div>
    );
}


export default App;
