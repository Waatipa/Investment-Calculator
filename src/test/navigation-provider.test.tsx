import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { NavigationProvider, NavigationTrail, useNavigationStep } from "@/components/navigation-trail";

const history = vi.hoisted(() => ({ href: "/europe", back: vi.fn(), listener: null as null | ((event: { action: { type: string } }) => void) }));
vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({ history: { back: history.back, subscribe: (listener: typeof history.listener) => { history.listener = listener; return () => { history.listener = null; }; } } }),
  useRouterState: ({ select }: { select: (state: { location: { href: string } }) => string }) => select({ location: { href: history.href } }),
}));

function Card() {
  const [stage, setStage] = useState(0);
  useNavigationStep(stage ? ["Company", ...(stage === 2 ? ["Results"] : [])] : [], () => setStage(stage - 1));
  return <><button onClick={() => setStage(stage + 1)}>Open next</button><output aria-label="Card stage">{stage}</output></>;
}
const App = () => <NavigationProvider><NavigationTrail /><Card /></NavigationProvider>;
afterEach(() => { cleanup(); vi.useRealTimers(); history.href = "/europe"; history.back.mockClear(); });

describe("Navigation provider", () => {
  it("returns through card stages before stopping at the external entry", () => {
    render(<App />);
    fireEvent.click(screen.getByText("Open next"));
    fireEvent.click(screen.getByText("Open next"));
    expect(screen.getByLabelText("Card stage")).toHaveTextContent("2");
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByLabelText("Card stage")).toHaveTextContent("1");
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByLabelText("Card stage")).toHaveTextContent("0");
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
    expect(history.back).not.toHaveBeenCalled();
  });
  it("drops abandoned forward visits when returning to the entry page", () => {
    const app = render(<App />);
    act(() => { history.href = "/compare"; history.listener?.({ action: { type: "PUSH" } }); });
    app.rerender(<App />);
    expect(screen.getByRole("button", { name: "Back" })).toBeEnabled();
    act(() => { history.href = "/europe"; history.listener?.({ action: { type: "BACK" } }); });
    app.rerender(<App />);
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
    fireEvent.click(screen.getByText("Open next"));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
    expect(history.back).not.toHaveBeenCalled();
  });
});