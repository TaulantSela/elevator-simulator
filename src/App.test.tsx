import React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import App from "./App";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

test("renders the simulator waiting at the ground floor", () => {
  render(<App />);
  expect(screen.getByRole("heading", { name: "Elevator Simulator" })).toBeInTheDocument();
  expect(screen.getByText("Waiting at floor 1")).toBeInTheDocument();
});

test("a down call from above brings the car and opens its doors", () => {
  render(<App />);
  const call = screen.getByRole("button", { name: "Call elevator down from floor 5" });

  fireEvent.click(call);
  expect(call).toHaveAttribute("aria-pressed", "true");

  // Four floors of travel, then the doors finish opening.
  act(() => {
    jest.advanceTimersByTime(4 * 1500 + 1100);
  });
  expect(screen.getByText("Doors open at floor 5")).toBeInTheDocument();
  expect(call).toHaveAttribute("aria-pressed", "false");
});

test("lists the planned stops in order", () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Go to floor 6" }));
  fireEvent.click(screen.getByRole("button", { name: "Call elevator down from floor 3" }));
  fireEvent.click(screen.getByRole("button", { name: "Go to floor 4" }));

  const stops = within(screen.getByRole("list", { name: "Next stops" })).getAllByRole("listitem");
  expect(stops.map((stop) => stop.textContent)).toEqual(["4", "6", "3↓ down"]);
});

test("the close button skips the rest of the dwell", () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Call elevator up from floor 1" }));
  act(() => {
    jest.advanceTimersByTime(1500); // doors fully open, dwell running
  });
  expect(screen.getByText("Doors open at floor 1")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Close doors" }));
  act(() => {
    jest.advanceTimersByTime(1100);
  });
  expect(screen.getByText("Waiting at floor 1")).toBeInTheDocument();
});

test("2× speed halves the trip, and pausing freezes the car", () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "2×" }));
  fireEvent.click(screen.getByRole("button", { name: "Go to floor 5" }));

  act(() => {
    jest.advanceTimersByTime((4 * 1500 + 1100) / 2);
  });
  expect(screen.getByText("Doors open at floor 5")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Go to floor 2" }));
  fireEvent.click(screen.getByRole("button", { name: "Pause" }));
  act(() => {
    jest.advanceTimersByTime(60_000);
  });
  expect(screen.getByText("Paused · Doors open at floor 5")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Resume" }));
  act(() => {
    jest.advanceTimersByTime(60_000);
  });
  expect(screen.getByText("Waiting at floor 2")).toBeInTheDocument();
});

test("passengers arrive, ride and show up in the stats", () => {
  render(<App seed={5} />);
  fireEvent.click(screen.getByRole("button", { name: "4×" }));
  fireEvent.click(screen.getByRole("button", { name: "Busy" }));

  act(() => {
    jest.advanceTimersByTime(45_000); // three simulated minutes
  });
  const stats = within(screen.getByRole("region", { name: "Passengers" }));
  const labels = stats.getAllByRole("term").map((term) => term.textContent);
  const values = stats.getAllByRole("definition").map((value) => value.textContent);
  expect(Number(values[labels.indexOf("Delivered")])).toBeGreaterThan(5);
});
