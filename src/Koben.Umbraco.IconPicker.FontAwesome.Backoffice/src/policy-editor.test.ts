// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultPolicy, type FontAwesomeConfiguration } from "./api.js";

const { getConfigurationMock } = vi.hoisted(() => ({
  getConfigurationMock: vi.fn(),
}));

vi.mock("@umbraco-cms/backoffice/lit-element", async () => {
  const { LitElement } = await import("lit");
  return {
    UmbLitElement: class extends LitElement {
      consumeContext() {}
    },
  };
});

vi.mock("@umbraco-cms/backoffice/modal", () => ({
  UMB_MODAL_MANAGER_CONTEXT: {},
}));

vi.mock("./api.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./api.js")>()),
  getConfiguration: getConfigurationMock,
}));

vi.mock("./picker-modal.js", () => ({
  ICON_PICKER_MODAL: {},
}));

await import("./policy-editor.js");

describe("selection policy editor", () => {
  beforeEach(() => {
    getConfigurationMock.mockReset();
  });

  afterEach(() => {
    document.body.replaceChildren();
  });

  it("restores the selected Pro Kit after the Kit options load", async () => {
    let resolveConfiguration!: (configuration: FontAwesomeConfiguration) => void;
    getConfigurationMock.mockReturnValue(
      new Promise<FontAwesomeConfiguration>((resolve) => {
        resolveConfiguration = resolve;
      }),
    );

    const element = document.createElement("font-awesome-icon-picker-policy-editor");
    element.value = { ...defaultPolicy, catalogSource: "kit", kitToken: "saved-kit" };
    document.body.append(element);
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector("select")?.value).toBe("kit");
    expect(element.shadowRoot?.querySelectorAll("select")[1]?.value).toBe("");

    resolveConfiguration({
      apiTokenConfigured: true,
      freeReleases: [],
      kits: [{ token: "saved-kit", name: "Saved Kit", status: "published" }],
    });

    await vi.waitFor(() => {
      expect(element.shadowRoot?.querySelectorAll("select")[1]?.value).toBe("saved-kit");
    });
  });
});
