// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultPolicy, type IconSearchResponse } from "./api.js";

const { searchIconsMock } = vi.hoisted(() => ({
  searchIconsMock: vi.fn(),
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
  ensureKitLoaded: vi.fn(),
  renderFreeIcon: () => undefined,
  renderKitIcon: () => undefined,
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
  });
});
