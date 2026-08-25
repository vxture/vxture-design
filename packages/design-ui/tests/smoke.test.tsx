import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "../src/components/base/form/Button";

describe("测试基座", () => {
  it("能渲染一个件并查到它", () => {
    render(<Button>保存</Button>);
    expect(screen.getByRole("button", { name: "保存" })).toBeInTheDocument();
  });
});
