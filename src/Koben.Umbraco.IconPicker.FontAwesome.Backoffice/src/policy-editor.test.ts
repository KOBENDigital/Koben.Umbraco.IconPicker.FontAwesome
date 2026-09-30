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
      proKitConfigurationAvailable: true,
      freeReleases: [],
      kits: [{ token: "saved-kit", name: "Saved Kit", status: "published" }],
    });

    await vi.waitFor(() => {
      expect(element.shadowRoot?.querySelectorAll("select")[1]?.value).toBe("saved-kit");
    });
  });

  it("shows Pro setup guidance and hides policy fields when no API token is configured", async () => {
    getConfigurationMock.mockResolvedValue({
      apiTokenConfigured: false,
      proKitConfigurationAvailable: false,
      freeReleases: [],
      kits: [],
      warning: "Configure an API token to use Font Awesome Pro Kits.",
    } satisfies FontAwesomeConfiguration);

    const element = document.createElement("font-awesome-icon-picker-policy-editor");
    document.body.append(element);
    await vi.waitFor(() => {
      expect(element.shadowRoot?.querySelector("select")?.value).toBe("free");
    });

    expect(element.shadowRoot?.textContent).not.toContain("Configure an API token to use Font Awesome Pro Kits.");
    expect(element.shadowRoot?.textContent).toContain("Allowed families / packs");

    const sourceSelect = element.shadowRoot?.querySelector("select") as HTMLSelectElement;
    sourceSelect.value = "kit";
    sourceSelect.dispatchEvent(new Event("change"));
    await element.updateComplete;

    expect(element.shadowRoot?.textContent).toContain("Configure an API token to use Font Awesome Pro Kits.");
    expect(element.shadowRoot?.textContent).toContain("Example app settings");
    expect(element.shadowRoot?.textContent).toContain("Koben");
    expect(element.shadowRoot?.textContent).not.toContain("Choose a Kit");
    expect(element.shadowRoot?.textContent).not.toContain("Allowed families / packs");
    expect(element.shadowRoot?.querySelector("a")?.href).toBe(
      "https://github.com/KOBENDigital/Koben.Umbraco.IconPicker.FontAwesome/blob/main/README.md#server-configuration",
    );
  });

  it("hides Pro policy fields when the configured token cannot be exchanged", async () => {
    getConfigurationMock.mockResolvedValue({
      apiTokenConfigured: true,
      proKitConfigurationAvailable: false,
      freeReleases: [],
      kits: [],
      warning: "The configured Font Awesome API token could not be exchanged.",
    } satisfies FontAwesomeConfiguration);

    const element = document.createElement("font-awesome-icon-picker-policy-editor");
    element.value = { ...defaultPolicy, catalogSource: "kit" };
    document.body.append(element);

    await vi.waitFor(() => {
      expect(element.shadowRoot?.textContent).toContain("The configured Font Awesome API token could not be exchanged.");
    });

    expect(element.shadowRoot?.textContent).toContain("Example app settings");
    expect(element.shadowRoot?.textContent).not.toContain("Choose a Kit");
    expect(element.shadowRoot?.textContent).not.toContain("Allowed families / packs");
  });
});
