import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BarChart } from "../src/components/composite/data/BarChart";

const data = [
  { key: "a", label: "Alpha", value: 0 },
  { key: "b", label: "Beta", value: 0 },
];
const series = [
  {
    key: "actual",
    label: "Actual",
    values: { a: 40, b: null },
    references: { a: 50, b: 70 },
  },
  { key: "target", label: "Target", values: { a: 50, b: 70 } },
];
describe("category series", () => {
  it("distinguishes missing values, exposes every exact series and toggles a legend", async () => {
    const user = userEvent.setup();
    render(<BarChart data={data} series={series} />);
    expect(
      screen.getByRole("button", { name: "Beta: Actual \u2014; Target 70" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Actual" }));
    expect(screen.getByRole("button", { name: "Actual" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(
      screen.getByRole("button", { name: "Beta: Target 70" }),
    ).toBeInTheDocument();
  });
  it("selects without submitting and resets on blank or Escape", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <form>
        <BarChart data={data} series={series} onSelectKey={onSelect} />
      </form>,
    );
    const button = screen.getByRole("button", {
      name: "Alpha: Actual 40; Target 50",
    });
    expect(button).toHaveAttribute("type", "button");
    fireEvent.click(button);
    expect(onSelect).toHaveBeenLastCalledWith("a");
    const plot = container.querySelector('[tabindex="0"]')!;
    fireEvent.click(plot);
    expect(onSelect).toHaveBeenLastCalledWith(null);
    fireEvent.keyDown(plot, { key: "ArrowRight" });
    fireEvent.keyDown(plot, { key: "Enter" });
    expect(onSelect).toHaveBeenLastCalledWith("b");
    fireEvent.keyDown(plot, { key: "Escape" });
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });
  it("toggles an uncontrolled selection without navigation", () => {
    const onSelect = vi.fn();
    render(<BarChart data={data} series={series} onSelectKey={onSelect} />);
    const point = screen.getByRole("button", {
      name: "Alpha: Actual 40; Target 50",
    });
    fireEvent.click(point);
    fireEvent.click(point);
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });
  it("breaks line paths at unknown observations and leaves headroom above targets", () => {
    const points = [...data, { key: "c", label: "Gamma", value: 0 }];
    const { container } = render(
      <BarChart
        data={points}
        series={[{ key: "x", label: "X", values: { a: 100, b: null, c: 100 } }]}
        variant="line"
        referenceValue={100}
      />,
    );
    expect(container.querySelectorAll("polyline")).toHaveLength(2);
    const pointsString = container
      .querySelector("polyline")!
      .getAttribute("points")!;
    expect(Number(pointsString.split(",")[1])).toBeGreaterThan(5);
  });
});
