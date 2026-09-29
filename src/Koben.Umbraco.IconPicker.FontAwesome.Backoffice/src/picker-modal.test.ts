// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultPolicy, type IconSearchResponse } from "./api.js";

const { searchIconsMock, renderKitIconMock } = vi.hoisted(() => ({
  searchIconsMock: vi.fn(),
  renderKitIconMock: vi.fn(),
}));

vi.mock("@umbraco-cms/backoffice/lit-element", async () => ({
  UmbLitElement: (await import("lit")).LitElement,
}));

vi.mock("@umbraco-cms/backoffice/modal", () => ({
  UmbModalToken: class {
    constructor(
      public readonly alias: string,
      public readonly options: unknown,
    ) {}
  },
}));

vi.mock("./api.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./api.js")>()),
  searchIcons: searchIconsMock,
}));

vi.mock("./preview.js", () => ({
  ensureKitLoaded: () => Promise.resolve(),
  renderFreeIcon: () => undefined,
  renderKitIcon: renderKitIconMock,
}));

await import("./picker-modal.js");

const response: IconSearchResponse = {
  items: [
    {
      name: "envelope",
      label: "Envelope",
      source: "official",
      variants: [
        {
          family: "classic",
          style: "solid",
          prefix: "fas",
          shorthand: "solid",
          iconClass: "fa-solid fa-envelope",
        },
      ],
    },
  ],
  total: 1,
  page: 1,
  pageSize: 24,
  capped: false,
  stale: false,
  availableFamilies: ["classic"],
  availableStyles: ["solid"],
};

describe("icon picker modal", () => {
  beforeEach(() => {
    searchIconsMock.mockReset();
    renderKitIconMock.mockReset();
    searchIconsMock.mockResolvedValue(response);
  });

  afterEach(() => {
    document.body.replaceChildren();
  });

  it("searches on first render when Umbraco assigned data before connection", async () => {
    const element = document.createElement("font-awesome-icon-picker-modal");
    element.data = { policy: { ...defaultPolicy, releaseMajor: 6 } };

    document.body.append(element);
    await element.updateComplete;
    await vi.waitFor(() => expect(searchIconsMock).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(element.shadowRoot?.querySelectorAll(".icon-card")).toHaveLength(1));

    expect(element.shadowRoot?.textContent).toContain("Envelope");
    expect(element.shadowRoot?.textContent).not.toContain("official");
  });

  it("keeps empty filter sections visible", async () => {
    searchIconsMock.mockResolvedValue({
      ...response,
      availableFamilies: [],
      availableStyles: [],
    });
    const element = document.createElement("font-awesome-icon-picker-modal");
    element.data = { policy: { ...defaultPolicy, releaseMajor: 6 } };

    document.body.append(element);
    await vi.waitFor(() => expect(element.shadowRoot?.textContent).toContain("No matching styles."));

    expect(element.shadowRoot?.textContent).toContain("Icon family");
    expect(element.shadowRoot?.textContent).toContain("Style");
  });

  it("retains known facet options after a narrower search", async () => {
    searchIconsMock
      .mockResolvedValueOnce({ ...response, availableFamilies: ["brands", "classic"] })
      .mockResolvedValueOnce({ ...response, availableFamilies: ["classic"] });
    const element = document.createElement("font-awesome-icon-picker-modal");
    element.data = { policy: { ...defaultPolicy, releaseMajor: 6 } };

    document.body.append(element);
    await vi.waitFor(() => expect(element.shadowRoot?.textContent).toContain("brands"));
    const searchInput = element.shadowRoot?.querySelector("uui-input");
    expect(searchInput).not.toBeNull();
    searchInput!.value = "email";
    searchInput!.dispatchEvent(new Event("input"));

    await vi.waitFor(() => expect(searchIconsMock).toHaveBeenCalledTimes(2));
    expect(element.shadowRoot?.textContent).toContain("brands");
  });

  it("prefers the Classic Solid variant for a Pro result preview", async () => {
    searchIconsMock.mockResolvedValue({
      ...response,
      items: [{
        ...response.items[0],
        variants: [
          { family: "chisel", style: "regular", prefix: "facr", shorthand: "chisel", iconClass: "fa-chisel fa-regular fa-envelope" },
          { family: "classic", style: "solid", prefix: "fas", shorthand: "solid", iconClass: "fa-solid fa-envelope" },
        ],
      }],
    });
    const element = document.createElement("font-awesome-icon-picker-modal");
    element.data = { policy: { ...defaultPolicy, catalogSource: "kit", kitToken: "test-kit" } };

    document.body.append(element);
    await vi.waitFor(() => expect(renderKitIconMock).toHaveBeenCalledWith("fa-solid fa-envelope", "test-kit", "fas"));
  });

  it("uses one Icon family filter at a time", async () => {
    searchIconsMock.mockResolvedValue({ ...response, availableFamilies: ["chisel", "classic"] });
    const element = document.createElement("font-awesome-icon-picker-modal");
    element.data = { policy: { ...defaultPolicy, releaseMajor: 6 } };

    document.body.append(element);
    await vi.waitFor(() => expect(element.shadowRoot?.querySelector('uui-radio[value="chisel"]')).not.toBeNull());
    const chiselRadio = element.shadowRoot?.querySelector('uui-radio[value="chisel"]') as unknown as { click(): void; updateComplete: Promise<unknown> };
    await chiselRadio.updateComplete;
    chiselRadio.click();
    await vi.waitFor(() => expect(searchIconsMock).toHaveBeenCalledTimes(2));
    expect(searchIconsMock.mock.calls[1][0].families).toEqual(["chisel"]);

    const classicRadio = element.shadowRoot?.querySelector('uui-radio[value="classic"]') as unknown as { click(): void; updateComplete: Promise<unknown> };
    await classicRadio.updateComplete;
    classicRadio.click();
    await vi.waitFor(() => expect(searchIconsMock).toHaveBeenCalledTimes(3));
    expect(searchIconsMock.mock.calls[2][0].families).toEqual(["classic"]);
  });

  it("ignores a stale search response after changing the Icon family", async () => {
    let resolveChiselSearch!: (result: IconSearchResponse) => void;
    const allFamiliesResult = {
      ...response,
      items: [{ ...response.items[0], label: "All Families Result" }],
      availableFamilies: ["chisel", "classic"],
    };
    searchIconsMock
      .mockResolvedValueOnce({ ...response, availableFamilies: ["chisel", "classic"] })
      .mockImplementationOnce(() => new Promise<IconSearchResponse>((resolve) => { resolveChiselSearch = resolve; }))
      .mockResolvedValueOnce(allFamiliesResult);
    const element = document.createElement("font-awesome-icon-picker-modal");
    element.data = { policy: { ...defaultPolicy, releaseMajor: 6 } };

    document.body.append(element);
    await vi.waitFor(() => expect(element.shadowRoot?.querySelector('uui-radio[value="chisel"]')).not.toBeNull());
    const familyGroup = element.shadowRoot?.querySelector("uui-radio-group") as unknown as { value: string; dispatchEvent(event: Event): boolean };
    familyGroup.value = "chisel";
    familyGroup.dispatchEvent(new Event("change"));
    await vi.waitFor(() => expect(searchIconsMock).toHaveBeenCalledTimes(2));
    familyGroup.value = "";
    familyGroup.dispatchEvent(new Event("change"));
    await vi.waitFor(() => expect(element.shadowRoot?.textContent).toContain("All Families Result"));

    resolveChiselSearch({ ...response, items: [{ ...response.items[0], label: "Chisel Result" }] });
    await new Promise((resolve) => setTimeout(resolve));
    expect(element.shadowRoot?.textContent).not.toContain("Chisel Result");
  });

  it("recreates a result card when its preview variant changes", async () => {
    searchIconsMock
      .mockResolvedValueOnce({
        ...response,
        availableFamilies: ["chisel", "classic"],
      })
      .mockResolvedValueOnce({
        ...response,
        items: [{
          ...response.items[0],
          variants: [{ family: "chisel", style: "regular", prefix: "facr", shorthand: "chisel", iconClass: "fa-chisel fa-regular fa-envelope" }],
        }],
        availableFamilies: ["chisel", "classic"],
      });
    const element = document.createElement("font-awesome-icon-picker-modal");
    element.data = { policy: { ...defaultPolicy, catalogSource: "kit", kitToken: "test-kit" } };

    document.body.append(element);
    await vi.waitFor(() => expect(element.shadowRoot?.querySelector(".icon-card")).not.toBeNull());
    const initialCard = element.shadowRoot?.querySelector(".icon-card");
    const chiselRadio = element.shadowRoot?.querySelector('uui-radio[value="chisel"]') as unknown as { click(): void; updateComplete: Promise<unknown> };
    await chiselRadio.updateComplete;
    chiselRadio.click();

    await vi.waitFor(() => expect(searchIconsMock).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(element.shadowRoot?.querySelector(".icon-card")).not.toBe(initialCard));
  });
});
