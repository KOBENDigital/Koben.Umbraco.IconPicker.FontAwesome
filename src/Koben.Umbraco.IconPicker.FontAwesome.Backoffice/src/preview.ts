import {
  css,
  customElement,
  html,
  nothing,
  property,
  state,
  unsafeHTML,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";

@customElement("font-awesome-free-preview")
class FontAwesomeFreePreviewElement extends UmbLitElement {
  @property({ type: String }) iconClass = "";
  @property({ type: Number }) releaseMajor: 6 | 7 = 7;
  @state() private _markup?: string;
  #request = 0;

  protected updated(changed: Map<PropertyKey, unknown>): void {
    if (changed.has("iconClass") || changed.has("releaseMajor"))
      void this.#load();
  }

  async #load() {
    const request = ++this.#request;
    this._markup = undefined;
    const renderer =
      this.releaseMajor === 6
        ? await import("./preview-v6.js")
        : await import("./preview-v7.js");
    if (request === this.#request)
      this._markup = renderer.renderIconMarkup(this.iconClass);
  }

  render() {
    return this._markup ? unsafeHTML(this._markup) : nothing;
  }

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    svg {
      display: block;
      width: 100%;
      height: 100%;
    }

    /* Kit runtime CSS sizes .svg-inline--fa in ems; previews must fill their host box. */
    svg.svg-inline--fa {
      width: 100%;
      height: 100%;
    }
  `;
}

export const renderFreeIcon = (iconClass: string, releaseMajor: 6 | 7) =>
  html`<font-awesome-free-preview
    .iconClass=${iconClass}
    .releaseMajor=${releaseMajor}
    aria-hidden="true"
  ></font-awesome-free-preview>`;

type FontAwesomeKitRuntime = {
  findIconDefinition?: (lookup: {
    prefix: string;
    iconName: string;
  }) => unknown;
  icon?: (definition: unknown) => { html?: string[] } | undefined;
  dom?: {
    css?: () => string;
    i2svg?: (options: { node: Node }) => Promise<unknown> | unknown;
  };
};

declare global {
  interface Window {
    FontAwesome?: FontAwesomeKitRuntime;
  }
}

const kitLoads = new Map<string, Promise<void>>();

export const ensureKitLoaded = (token?: string): Promise<void> => {
  if (!token || !/^[a-zA-Z0-9_-]+$/.test(token))
    return Promise.reject(new Error("Invalid Font Awesome Kit token."));
  const pending = kitLoads.get(token);
  if (pending) return pending;

  const id = "font-awesome-kit-" + token;
  const load = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    const script = existing ?? document.createElement("script");
    if (script.dataset.loaded === "true") {
      resolve();
      return;
    }
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true },
    );
    script.addEventListener(
      "error",
      () => {
        script.remove();
        kitLoads.delete(token);
        reject(new Error("The Font Awesome Kit could not be loaded."));
      },
      { once: true },
    );
    if (!existing) {
      script.id = id;
      script.src = "https://kit.fontawesome.com/" + token + ".js";
      script.crossOrigin = "anonymous";
      document.head.append(script);
    }
  });
  kitLoads.set(token, load);
  return load;
};

@customElement("font-awesome-kit-preview")
class FontAwesomeKitPreviewElement extends UmbLitElement {
  @property({ type: String }) iconClass = "";
  @property({ type: String }) kitToken = "";
  @property({ type: String }) prefix = "";
  @state() private _markup?: string;
  @state() private _runtimeCss = "";
  #request = 0;

  protected updated(changed: Map<PropertyKey, unknown>): void {
    if (
      changed.has("iconClass") ||
      changed.has("kitToken") ||
      changed.has("prefix")
    )
      void this.#load();
    const runtimeStyle = this.renderRoot.querySelector<HTMLStyleElement>("style[data-kit-runtime]");
    if (runtimeStyle) runtimeStyle.textContent = this._runtimeCss;
  }

  async #load() {
    const request = ++this.#request;
    this._markup = undefined;
    this._runtimeCss = "";
    try {
      await ensureKitLoaded(this.kitToken);
      const name = iconName(this.iconClass);
      for (let attempt = 0; attempt < kitRenderAttempts; attempt++) {
        if (request !== this.#request) return;
        const runtime = window.FontAwesome;
        this._runtimeCss = runtime?.dom?.css?.() ?? "";
        const definition = name
          ? prefixesFor(this.iconClass, this.prefix)
              .map((prefix) =>
                runtime?.findIconDefinition?.({ prefix, iconName: name }),
              )
              .find((candidate) => candidate !== undefined)
          : undefined;
        const markup = definition
          ? runtime?.icon?.(definition)?.html?.join("")
          : undefined;
        if (markup) {
          this._markup = markup;
          return;
        }

        await this.updateComplete;
        await runtime?.dom?.i2svg?.({ node: this.renderRoot });
        if (this.renderRoot.querySelector("svg")) return;
        await delay(kitRenderRetryDelayMs);
      }
    } catch {
      // The placeholder stays visible when the Kit cannot render the saved icon.
    }
  }

  render() {
    return html`
      <style data-kit-runtime></style>
      ${this._markup
        ? unsafeHTML(this._markup)
        : html`<i class=${kitConversionClasses(this.iconClass, this.prefix)} aria-hidden="true"></i>`}
    `;
  }

  static styles = FontAwesomeFreePreviewElement.styles;
}

const iconName = (iconClass: string) =>
  iconClass
    .split(/\s+/)
    .find((value) => value.startsWith("fa-") && !variantClasses.has(value))
    ?.slice(3);

const prefixesFor = (iconClass: string, explicitPrefix: string) => {
  if (explicitPrefix) return [explicitPrefix];
  const classes = new Set(iconClass.split(/\s+/));
  const family = kitFamilies.find(([className]) => classes.has(className))?.[1] ?? "classic";
  const style = kitStyles.find(([className]) => classes.has(className))?.[1] ?? "solid";
  return kitPrefixes[`${family}:${style}`] ?? [];
};

const kitConversionClasses = (iconClass: string, explicitPrefix: string) =>
  [...new Set([...iconClass.split(/\s+/).filter(Boolean), ...prefixesFor(iconClass, explicitPrefix)])].join(" ");

const kitRenderAttempts = 10;
const kitRenderRetryDelayMs = 50;
const delay = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

const kitFamilies: ReadonlyArray<readonly [string, string]> = [
  ["fa-sharp-duotone", "sharp-duotone"],
  ["fa-kit-duotone", "kit-duotone"],
  ["fa-jelly-fill", "jelly-fill"],
  ["fa-jelly-duo", "jelly-duo"],
  ["fa-notdog-duo", "notdog-duo"],
  ["fa-slab-press-duo", "slab-press-duo"],
  ["fa-slab-press", "slab-press"],
  ["fa-slab-duo", "slab-duo"],
  ["fa-utility-fill", "utility-fill"],
  ["fa-utility-duo", "utility-duo"],
  ["fa-duotone", "duotone"],
  ["fa-sharp", "sharp"],
  ["fa-brands", "brands"],
  ["fa-chisel", "chisel"],
  ["fa-etch", "etch"],
  ["fa-graphite", "graphite"],
  ["fa-jelly", "jelly"],
  ["fa-kit", "kit"],
  ["fa-mosaic", "mosaic"],
  ["fa-notdog", "notdog"],
  ["fa-pixel", "pixel"],
  ["fa-slab", "slab"],
  ["fa-thumbprint", "thumbprint"],
  ["fa-utility", "utility"],
  ["fa-vellum", "vellum"],
  ["fa-whiteboard", "whiteboard"],
  ["fa-classic", "classic"],
];

const kitStyles: ReadonlyArray<readonly [string, string]> = [
  ["fa-brands", "brands"],
  ["fa-semibold", "semibold"],
  ["fa-regular", "regular"],
  ["fa-light", "light"],
  ["fa-thin", "thin"],
  ["fa-solid", "solid"],
];

const kitPrefixes: Readonly<Record<string, readonly string[]>> = {
  "classic:solid": ["fas"],
  "classic:regular": ["far"],
  "classic:light": ["fal"],
  "classic:thin": ["fat"],
  "duotone:solid": ["fads", "fad"],
  "duotone:regular": ["fadr"],
  "duotone:light": ["fadl"],
  "duotone:thin": ["fadt"],
  "sharp:solid": ["fass"],
  "sharp:regular": ["fasr"],
  "sharp:light": ["fasl"],
  "sharp:thin": ["fast"],
  "sharp-duotone:solid": ["fasds"],
  "sharp-duotone:regular": ["fasdr"],
  "sharp-duotone:light": ["fasdl"],
  "sharp-duotone:thin": ["fasdt"],
  "brands:brands": ["fab"],
  "kit:solid": ["fak"],
  "kit-duotone:solid": ["fakd"],
  "chisel:regular": ["facr"],
  "etch:solid": ["faes"],
  "graphite:thin": ["fagt"],
  "jelly:regular": ["fajr"],
  "jelly-fill:regular": ["fajfr"],
  "jelly-duo:regular": ["fajdr"],
  "mosaic:solid": ["fams"],
  "notdog:solid": ["fans"],
  "notdog-duo:solid": ["fands"],
  "pixel:regular": ["fapr"],
  "slab:regular": ["faslr"],
  "slab-press:regular": ["faslpr"],
  "slab-duo:regular": ["fasldr"],
  "slab-press-duo:regular": ["faslpdr"],
  "thumbprint:light": ["fatl"],
  "utility:semibold": ["fausb"],
  "utility-fill:semibold": ["faufsb"],
  "utility-duo:semibold": ["faudsb"],
  "vellum:solid": ["favs"],
  "whiteboard:semibold": ["fawsb"],
};

const variantClasses = new Set([
  ...kitFamilies.map(([className]) => className),
  ...kitStyles.map(([className]) => className),
]);

export const renderKitIcon = (
  iconClass: string,
  kitToken?: string,
  prefix?: string,
) =>
  html`<font-awesome-kit-preview
    .iconClass=${iconClass}
    .kitToken=${kitToken ?? ""}
    .prefix=${prefix ?? ""}
    aria-hidden="true"
  ></font-awesome-kit-preview>`;

declare global {
  interface HTMLElementTagNameMap {
    "font-awesome-free-preview": FontAwesomeFreePreviewElement;
    "font-awesome-kit-preview": FontAwesomeKitPreviewElement;
  }
}
