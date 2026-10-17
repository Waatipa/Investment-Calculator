import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CalculatorDateField } from "@/components/calculator-date-field";

afterEach(cleanup);
function Fields() {
  const [start, setStart] = useState("2022-01-10");
  const [end, setEnd] = useState("2022-02-10");
  return <><CalculatorDateField id="start" label="Investment date" value={start} onChange={setStart} /><CalculatorDateField id="end" label="Valuation date" value={end} min={start} onChange={setEnd} /></>;
}
it("saves the full date immediately on day click, closes, and allows selecting the next field", async () => {
  render(<Fields />);
  fireEvent.click(screen.getByRole("button", { name: "Choose investment date" }));
  fireEvent.focus(screen.getByRole("button", { name: "Tuesday, January 11th, 2022" }));
  fireEvent.click(screen.getByRole("button", { name: "Tuesday, January 11th, 2022" }));
  expect(screen.getByLabelText("Investment date")).toHaveValue("2022-01-11");
  await waitFor(() => expect(screen.queryByRole("grid")).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: "Choose valuation date" }));
  fireEvent.click(screen.getByRole("button", { name: "Friday, February 11th, 2022" }));
  expect(screen.getByLabelText("Valuation date")).toHaveValue("2022-02-11");
  await waitFor(() => expect(screen.queryByRole("grid")).not.toBeInTheDocument());
});
it("confirms and closes when the selected day is chosen again", async () => {
  const change = vi.fn();
  render(<CalculatorDateField id="date" label="Reporting date" value="2022-01-11" onChange={change} />);
  fireEvent.click(screen.getByRole("button", { name: "Choose reporting date" }));
  fireEvent.click(screen.getByRole("button", { name: /Tuesday, January 11th, 2022/ }));
  expect(change).toHaveBeenCalledWith("2022-01-11");
  await waitFor(() => expect(screen.queryByRole("grid")).not.toBeInTheDocument());
});