import React, { useState, useEffect, useRef } from "react";
import "./App.css";

function App() {
  const delay = 1000; // 1 sec /* to be used in the setInterval or setTimeout */
  const floors = [5, 4, 3, 2, 1, 0]; /* looping through floors */
  const initialWaitingFloors: Array<number> =
    []; /* to be used as an array of more buttons clicked when inside the elevator */

  /*  the potential component state examples,
      the first value being the actual value
      and the second one being the function that can change that value 
  */
  const [status, setStatus] = useState("");
  const [destinationFloor, setDestinationFloor] = useState(0);
  const [isDisabled, setIsDisabled] = useState(false);
  const [floorChanged, setisfloorchanged] = useState(0);
  const [currentFloor, setCurrentFloor] = useState(0);
  const [waitingFloors, setWaitingFloors] = useState(initialWaitingFloors);

  /* setInterval example */
  const interval = setInterval(() => {
    /* 
    .
    more code to be executed every 'delay' milliseconds
    .
    */
  }, delay);
  // NOTE: setInterval needs to be stopped
  clearInterval(interval);

  /* setTimeout example */
  const timeout = setTimeout(() => {
    /* 
    .
    more code to be executed after 'delay' milliseconds
    .
    */
  }, delay);

  const onClickUp = (selectedFloor: number) => {
    // when clicking the button to go up from the outside
    setStatus(() => "up");
    /* 
    .
    more code...
    .
    */
  };

  const onClickDown = (selectedFloor: number) => {
    // when clicking the button to go down from the outside
    setStatus(() => "down");
    /* 
    .
    more code...
    .
    */
  };

  const onClickFloor = (selectedFloor: number) => {
    // When clicking the buttons from the inside

    // if the selectedFloor is bigger than the current floor, set the status to up, otherwise to down
    selectedFloor > currentFloor
      ? setStatus(() => "up")
      : setStatus(() => "down");

    /* 
    .
    more code...
    .
    */
  };

  /* Examples on how to control state on different scenarios */
  useEffect(() => {
    // runs once in the begining
    /* 
    .
    more code...
    .
    */
  }, []);

  useEffect(() => {
    // runs on every change
    /* 
    .
    more code...
    .
    */
  });

  useEffect(
    () => {
      // runs everytime variable changes
      /* 
    .
    more code...
    .
    */
    },
    [
      /* variable */
    ]
  );

  return (
    <div className="App">
      <div className="elevator">
        {!status && <h3 className="info">Current floor: {currentFloor}</h3>}
        {(status === "up" || status === "down") && (
          <h3 className="info">
            The elevator is going {status}. Current floor: {currentFloor}
          </h3>
        )}
        <div className="floors">
          {floors.map((floor, key) => (
            <div key={key} className="buttons">
              <div className="up-down">
                {floor !== 5 && (
                  <button
                    onClick={() => onClickUp(floor)}
                    className="test	fa fa-angle-up"
                  />
                )}
                {floor !== 0 && (
                  <button
                    onClick={() => onClickDown(floor)}
                    className="test fa fa-angle-down"
                  />
                )}
              </div>
              <button
                className={`floor ${
                  currentFloor === floor ? " currentFloor" : ""
                }
              ${waitingFloors.includes(floor) ? " clicked" : ""}`}
                onClick={() => onClickFloor(floor)}
              >
                {floor}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
