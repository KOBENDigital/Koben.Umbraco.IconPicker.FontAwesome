import { describe, expect, it } from "vitest";
import { renderIconMarkup as renderV6IconMarkup } from "./preview-v6.js";
import { renderIconMarkup as renderV7IconMarkup } from "./preview-v7.js";

describe("free icon preview rendering", () => {
  it.each([
    ["numeric icon", "fa-solid fa-0", "0"],
    ["solid icon", "fa-solid fa-house", "house"],
    ["regular icon", "fa-regular fa-address-book", "address-book"],
    ["brand icon", "fa-brands fa-airbnb", "airbnb"],
  ])("renders a Font Awesome 6 %s by its CSS name", (_description, iconClass, iconName) => {
    const markup = renderV6IconMarkup(iconClass);

    expect(markup).toContain(`data-icon=\"${iconName}\"`);
    expect(markup).not.toContain("<rect");
  });

  it("renders a Font Awesome 7 icon by its CSS name", () => {
    const markup = renderV7IconMarkup("fa-solid fa-house");

    expect(markup).toContain('data-icon="house"');
    expect(markup).not.toContain("<rect");
  });

  it("uses the fallback for an unknown icon", () => {
    expect(renderV6IconMarkup("fa-solid fa-does-not-exist")).toContain("<rect");
  });
});
