import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
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
