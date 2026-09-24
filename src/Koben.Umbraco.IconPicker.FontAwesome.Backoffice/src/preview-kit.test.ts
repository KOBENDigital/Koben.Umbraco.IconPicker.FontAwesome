// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";

const happyWindow = window as unknown as Window & {
  happyDOM: { settings: {
    disableCSSFileLoading: boolean;
    disableJavaScriptFileLoading: boolean;
    handleDisabledFileLoadingAsSuccess: boolean;
  } };
};
happyWindow.happyDOM.settings.disableCSSFileLoading = true;
happyWindow.happyDOM.settings.disableJavaScriptFileLoading = true;
happyWindow.happyDOM.settings.handleDisabledFileLoadingAsSuccess = true;

vi.mock("@umbraco-cms/backoffice/lit-element", async () => ({
  UmbLitElement: (await import("lit")).LitElement,
}));

const { ensureKitLoaded } = await import("./preview.js");

describe("Font Awesome Kit preview", () => {
  let consoleError: MockInstance;

  beforeEach(() => {
    consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleError.mockRestore();
    document.body.replaceChildren();
    document.head.querySelectorAll('[id^="font-awesome-kit-"]').forEach((element) => element.remove());
    delete window.FontAwesome;
  });

  it("renders an SVG from the loaded Kit runtime inside Shadow DOM", async () => {
    const token = "test-kit-svg";
    const script = document.createElement("script");
    script.id = `font-awesome-kit-${token}`;
    script.dataset.loaded = "true";
    document.head.append(script);
    window.FontAwesome = {
      findIconDefinition: vi.fn(() => ({ iconName: "house" })),
      icon: vi.fn(() => ({ html: ['<svg data-icon="house" viewBox="0 0 16 16"></svg>'] })),
      dom: { css: vi.fn(() => ".svg-inline--fa{display:inline-block}") },
    };

    const element = document.createElement("font-awesome-kit-preview");
    element.iconClass = "fa-solid fa-house";
    element.kitToken = token;
    element.prefix = "fas";
    document.body.append(element);

    await vi.waitFor(() => expect(element.shadowRoot?.querySelector('svg[data-icon="house"]')).not.toBeNull());
    expect(window.FontAwesome.findIconDefinition).toHaveBeenCalledWith({ prefix: "fas", iconName: "house" });
    expect(element.shadowRoot?.querySelector("style[data-kit-runtime]")?.textContent).toContain(".svg-inline--fa");
  });

  it("renders a persisted variant without an explicit prefix or a CSS request", async () => {
    const token = "test-kit-persisted";
    const script = document.createElement("script");
    script.id = `font-awesome-kit-${token}`;
    script.dataset.loaded = "true";
    document.head.append(script);
    window.FontAwesome = {
      findIconDefinition: vi.fn((lookup) =>
        lookup.prefix === "fads" && lookup.iconName === "truck"
          ? { iconName: "truck" }
          : undefined,
      ),
      icon: vi.fn(() => ({ html: ['<svg data-prefix="fads" data-icon="truck"></svg>'] })),
    };

    const element = document.createElement("font-awesome-kit-preview");
    element.iconClass = "fa-duotone fa-solid fa-truck";
    element.kitToken = token;
    document.body.append(element);

    await vi.waitFor(() => expect(element.shadowRoot?.querySelector('svg[data-icon="truck"]')).not.toBeNull());
    expect(window.FontAwesome.findIconDefinition).toHaveBeenCalledWith({ prefix: "fads", iconName: "truck" });
    expect(element.shadowRoot?.querySelector("link")).toBeNull();
  });

  it("retries a persisted preview while a newly loaded Kit initializes its icon library", async () => {
    const token = "test-kit-initializing";
    const script = document.createElement("script");
    script.id = `font-awesome-kit-${token}`;
    script.dataset.loaded = "true";
    document.head.append(script);
    let lookups = 0;
    window.FontAwesome = {
      findIconDefinition: vi.fn(() => (++lookups === 2 ? { iconName: "circle-user" } : undefined)),
      icon: vi.fn(() => ({ html: ['<svg data-icon="circle-user"></svg>'] })),
    };

    const element = document.createElement("font-awesome-kit-preview");
    element.iconClass = "fa-regular fa-circle-user";
    element.kitToken = token;
    document.body.append(element);

    await vi.waitFor(() => expect(element.shadowRoot?.querySelector('svg[data-icon="circle-user"]')).not.toBeNull());
    expect(window.FontAwesome.findIconDefinition).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["fa-jelly fa-regular fa-house", "fajr", "house"],
    ["fa-kit-duotone fa-company-logo", "fakd", "company-logo"],
  ])("distinguishes a persisted family class from the icon name", async (iconClass, expectedPrefix, expectedName) => {
    const token = `test-kit-${expectedPrefix}`;
    const script = document.createElement("script");
    script.id = `font-awesome-kit-${token}`;
    script.dataset.loaded = "true";
    document.head.append(script);
    window.FontAwesome = {
      findIconDefinition: vi.fn((lookup) =>
        lookup.prefix === expectedPrefix && lookup.iconName === expectedName
          ? { iconName: expectedName }
          : undefined,
      ),
      icon: vi.fn(() => ({ html: [`<svg data-icon="${expectedName}"></svg>`] })),
    };

    const element = document.createElement("font-awesome-kit-preview");
    element.iconClass = iconClass;
    element.kitToken = token;
    document.body.append(element);

    await vi.waitFor(() => expect(element.shadowRoot?.querySelector(`svg[data-icon="${expectedName}"]`)).not.toBeNull());
    expect(window.FontAwesome.findIconDefinition).toHaveBeenCalledWith({ prefix: expectedPrefix, iconName: expectedName });
  });

  it("allows a failed Kit script to be retried", async () => {
    const token = "test-kit-retry";
    const firstScript = document.createElement("script");
    firstScript.id = `font-awesome-kit-${token}`;
    document.head.append(firstScript);
    const firstLoad = ensureKitLoaded(token);
    firstScript.dispatchEvent(new Event("error"));
    await expect(firstLoad).rejects.toThrow("could not be loaded");
    expect(document.getElementById(`font-awesome-kit-${token}`)).toBeNull();

    const secondScript = document.createElement("script");
    secondScript.id = `font-awesome-kit-${token}`;
    document.head.append(secondScript);
    const secondLoad = ensureKitLoaded(token);
    expect(secondScript).not.toBe(firstScript);
    secondScript.dispatchEvent(new Event("load"));
    await expect(secondLoad).resolves.toBeUndefined();
  });

  it("converts a persisted modern class string using its reconstructed Kit prefix", async () => {
    const script = document.createElement("script");
    script.id = "font-awesome-kit-test-kit-css";
    script.dataset.loaded = "true";
    document.head.append(script);
    window.FontAwesome = {
      dom: {
        i2svg: vi.fn(({ node }) => {
          const icon = node.querySelector("i");
          expect(icon?.className).toBe("fa-regular fa-circle-user far");
          icon?.replaceWith(document.createElementNS("http://www.w3.org/2000/svg", "svg"));
        }),
      },
    };
    const element = document.createElement("font-awesome-kit-preview");
    element.iconClass = "fa-regular fa-circle-user";
    element.kitToken = "test-kit-css";
    document.body.append(element);
    await vi.waitFor(() => expect(element.shadowRoot?.querySelector("svg")).not.toBeNull());

    expect(element.shadowRoot?.querySelector("link")).toBeNull();
  });
});
