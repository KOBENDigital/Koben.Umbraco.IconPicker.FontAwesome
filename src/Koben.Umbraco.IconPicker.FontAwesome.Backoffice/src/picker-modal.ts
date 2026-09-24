import {
  css,
  customElement,
  html,
  nothing,
  property,
  state,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import {
  UmbModalToken,
  type UmbModalExtensionElement,
} from "@umbraco-cms/backoffice/modal";
import {
  searchIcons,
  type IconResult,
  type IconSearchResponse,
  type IconIdentity,
  type SelectionPolicy,
} from "./api.js";
import { ensureKitLoaded, renderFreeIcon, renderKitIcon } from "./preview.js";

export interface IconPickerModalData {
  policy: SelectionPolicy;
  currentValue?: string;
  headline?: string;
  multiple?: boolean;
  selectedIcons?: IconIdentity[];
}

export const ICON_PICKER_MODAL = new UmbModalToken<IconPickerModalData, string | IconIdentity[]>(
  "Koben.Umbraco.IconPicker.FontAwesome.Modal",
  { modal: { type: "sidebar", size: "large" } },
);

@customElement("font-awesome-icon-picker-modal")
export default class FontAwesomeIconPickerModalElement
  extends UmbLitElement
  implements UmbModalExtensionElement<IconPickerModalData, string | IconIdentity[]>
{
  @property({ attribute: false }) modalContext?: UmbModalExtensionElement<IconPickerModalData, string | IconIdentity[]>["modalContext"];
  @property({ attribute: false }) data?: IconPickerModalData;

  @state() private _query = "";
  @state() private _page = 1;
  @state() private _families = new Set<string>();
  @state() private _styles = new Set<string>();
  @state() private _response?: IconSearchResponse;
  @state() private _loading = false;
  @state() private _error?: string;
  @state() private _variantIcon?: IconResult;
  @state() private _selected = new Map<string, IconIdentity>();

  #abort?: AbortController;
  #debounce?: number;
  #initializedData?: IconPickerModalData;

  connectedCallback(): void {
    super.connectedCallback();
  }

  protected firstUpdated(): void {
    this.#initializeData();
  }

  protected updated(changed: Map<PropertyKey, unknown>): void {
    if (changed.has("data")) this.#initializeData();
  }

  #initializeData() {
    if (!this.data || this.#initializedData === this.data) return;
    this.#initializedData = this.data;
    this._selected = new Map(
      (this.data.selectedIcons ?? []).map((item) => [item.source + ":" + item.name, item]),
    );
    void this.#search();
    this.#loadKit();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#abort?.abort();
    if (this.#debounce) window.clearTimeout(this.#debounce);
  }

  #loadKit() {
    if (this.data?.policy.catalogSource === "kit") void ensureKitLoaded(this.data.policy.kitToken).catch(() => undefined);
  }

  async #search() {
    const policy = this.data?.policy;
    if (!policy) return;
    this.#abort?.abort();
    this.#abort = new AbortController();
    this._loading = true;
    this._error = undefined;
    try {
      this._response = await searchIcons(
        {
          catalogSource: policy.catalogSource,
          releaseMajor: policy.releaseMajor,
          kitToken: policy.kitToken,
          query: this._query,
          page: this._page,
          pageSize: 24,
          families: [...this._families],
          styles: [...this._styles],
          allowedIcons: policy.allowedIcons,
          includeOfficial: policy.includeOfficial,
          includeCustom: policy.includeCustom,
        },
        this.#abort.signal,
      );
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        this._error = error instanceof Error ? error.message : "The icon catalog could not be loaded.";
      }
    } finally {
      this._loading = false;
    }
  }

  #queryChanged(event: Event) {
    this._query = (event.target as HTMLInputElement).value;
    this._page = 1;
    if (this.#debounce) window.clearTimeout(this.#debounce);
    this.#debounce = window.setTimeout(() => void this.#search(), 300);
  }

  #toggleFilter(kind: "family" | "style", value: string) {
    const next = new Set(kind === "family" ? this._families : this._styles);
    next.has(value) ? next.delete(value) : next.add(value);
    if (kind === "family") this._families = next;
    else this._styles = next;
    this._page = 1;
    void this.#search();
  }

  #pageChanged(event: Event) {
    this._page = (event.target as HTMLElement & { current: number }).current;
    void this.#search();
  }

  #chooseIcon(icon: IconResult) {
    if (this.data?.multiple) {
      const key = icon.source + ":" + icon.name;
      const selected = new Map(this._selected);
      selected.has(key) ? selected.delete(key) : selected.set(key, { source: icon.source, name: icon.name });
      this._selected = selected;
      return;
    }
    if (icon.variants.length === 1) this.#submit(icon.variants[0].iconClass);
    else this._variantIcon = icon;
  }

  #submit(iconClass: string) {
    this.modalContext?.setValue(iconClass);
    this.modalContext?.submit();
  }

  #submitAllowlist() {
    this.modalContext?.setValue([...this._selected.values()]);
    this.modalContext?.submit();
  }

  #renderPreview(iconClass: string, prefix?: string) {
    const policy = this.data?.policy;
    return policy?.catalogSource === "free"
      ? renderFreeIcon(iconClass, policy.releaseMajor)
      : renderKitIcon(iconClass, policy?.kitToken, prefix);
  }

  #renderFacet(title: string, values: string[], selected: Set<string>, kind: "family" | "style") {
    if (!values.length) return nothing;
    return html`
      <fieldset>
        <legend>${title}</legend>
        ${values.map(
          (value) => html`
            <uui-checkbox
              label=${value}
              .checked=${selected.has(value)}
              @change=${() => this.#toggleFilter(kind, value)}
            >${value}</uui-checkbox>
          `,
        )}
      </fieldset>
    `;
  }

  #renderVariantStep() {
    const icon = this._variantIcon;
    if (!icon) return nothing;
    return html`
      <div class="variant-heading">
        <uui-button look="secondary" @click=${() => (this._variantIcon = undefined)} label="Back to results">
          <uui-icon name="icon-arrow-left"></uui-icon> Back
        </uui-button>
        <div>
          <h2>Choose a variant</h2>
          <p>${icon.label}</p>
        </div>
      </div>
      <div class="variant-grid">
        ${icon.variants.map(
          (variant) => html`
            <button class="icon-card" type="button" @click=${() => this.#submit(variant.iconClass)}>
              <span class="preview">${this.#renderPreview(variant.iconClass, variant.prefix)}</span>
              <strong>${variant.family} ${variant.style}</strong>
              <code>${variant.iconClass}</code>
            </button>
          `,
        )}
      </div>
    `;
  }

  #renderResults() {
    if (this._variantIcon) return this.#renderVariantStep();
    if (this._loading && !this._response) return html`<uui-loader-bar aria-label="Loading icons"></uui-loader-bar>`;
    if (this._error) {
      return html`<uui-box headline="Icon catalog unavailable" class="message">
        <p>${this._error}</p>
        <uui-button look="primary" @click=${() => void this.#search()} label="Retry icon search">Retry</uui-button>
      </uui-box>`;
    }
    if (!this._response?.items.length) return html`<p class="empty">No icons match the current search and filters.</p>`;
    const totalPages = Math.max(1, Math.ceil(this._response.total / this._response.pageSize));
    return html`
      ${this._loading ? html`<uui-loader-bar aria-label="Refreshing icons"></uui-loader-bar>` : nothing}
      ${this._response.warning ? html`<uui-tag color="warning">${this._response.warning}</uui-tag>` : nothing}
      ${this._response.stale ? html`<uui-tag color="warning">Showing cached results</uui-tag>` : nothing}
      <p class="count" aria-live="polite">${this._response.total} icons</p>
      <div class="icon-grid">
        ${this._response.items.map(
          (icon) => html`
            <button
              class=${this._selected.has(icon.source + ":" + icon.name) ? "icon-card selected" : "icon-card"}
              type="button"
              @click=${() => this.#chooseIcon(icon)}
              aria-label=${(this.data?.multiple ? "Toggle " : "Choose ") + icon.label}
              aria-pressed=${this.data?.multiple ? String(this._selected.has(icon.source + ":" + icon.name)) : nothing}
            >
              <span class="preview">${this.#renderPreview(icon.variants[0].iconClass, icon.variants[0].prefix)}</span>
              <strong>${icon.label}</strong>
              <small>${icon.source}${icon.variants.length > 1 ? ` · ${icon.variants.length} variants` : ""}</small>
            </button>
          `,
        )}
      </div>
      ${totalPages > 1
        ? html`<uui-pagination
            label="Icon search pages"
            .total=${totalPages}
            .current=${this._response.page}
            @change=${this.#pageChanged}
          ></uui-pagination>`
        : nothing}
    `;
  }

  render() {
    const response = this._response;
    return html`
      <umb-body-layout headline=${this.data?.headline ?? "Choose a Font Awesome icon"}>
        <div class="toolbar">
          <uui-input
            type="search"
            label="Search icons"
            placeholder="Search icons"
            .value=${this._query}
            @input=${this.#queryChanged}
          >
            <uui-icon name="icon-search" slot="prepend"></uui-icon>
          </uui-input>
          <div class="chips" aria-label="Active filters">
            ${[...this._families].map((value) => html`<uui-tag look="secondary" @click=${() => this.#toggleFilter("family", value)}>${value} ×</uui-tag>`)}
            ${[...this._styles].map((value) => html`<uui-tag look="secondary" @click=${() => this.#toggleFilter("style", value)}>${value} ×</uui-tag>`)}
          </div>
        </div>
        <div class="layout">
          <aside aria-label="Icon filters">
            ${this.#renderFacet("Icon family", response?.availableFamilies ?? [], this._families, "family")}
            ${this.#renderFacet("Style", response?.availableStyles ?? [], this._styles, "style")}
          </aside>
          <main>${this.#renderResults()}</main>
        </div>
        <div slot="actions">
          <uui-button label="Cancel" @click=${() => this.modalContext?.reject()}>Cancel</uui-button>
          ${this.data?.multiple
            ? html`<uui-button look="primary" label="Use selected icons" @click=${this.#submitAllowlist}>
                Use ${this._selected.size} selected
              </uui-button>`
            : nothing}
        </div>
      </umb-body-layout>
    `;
  }

  static styles = css`
    :host { display: block; }
    .toolbar { padding: var(--uui-size-layout-1); border-bottom: 1px solid var(--uui-color-border); }
    uui-input { width: 100%; }
    .chips { display: flex; gap: var(--uui-size-space-2); flex-wrap: wrap; margin-top: var(--uui-size-space-3); }
    .layout { display: grid; grid-template-columns: 13rem minmax(0, 1fr); min-height: 30rem; }
    aside { padding: var(--uui-size-layout-1); border-right: 1px solid var(--uui-color-border); }
    main { padding: var(--uui-size-layout-1); min-width: 0; }
    fieldset { border: 0; padding: 0; margin: 0 0 var(--uui-size-layout-1); display: grid; gap: var(--uui-size-space-3); }
    legend { font-weight: 700; margin-bottom: var(--uui-size-space-4); }
    .icon-grid, .variant-grid { display: grid; grid-template-columns: repeat(4, minmax(8rem, 1fr)); gap: var(--uui-size-space-4); }
    .icon-card { appearance: none; border: 1px solid var(--uui-color-border); border-radius: var(--uui-border-radius); background: var(--uui-color-surface); color: inherit; padding: var(--uui-size-layout-1); min-height: 10rem; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--uui-size-space-3); cursor: pointer; text-align: center; }
    .icon-card:hover, .icon-card:focus-visible { border-color: var(--uui-color-focus); box-shadow: 0 0 0 2px var(--uui-color-focus); outline: 0; }
    .icon-card.selected { border-color: var(--uui-color-selected); background: var(--uui-color-selected-emphasis); }
    .preview { width: 2.5rem; height: 2.5rem; display: grid; place-items: center; font-size: 2rem; }
    .preview svg { width: 100%; height: 100%; }
    .icon-card strong, .icon-card small, .icon-card code { max-width: 100%; overflow-wrap: anywhere; }
    .count { font-weight: 700; }
    .empty, .message { margin: var(--uui-size-layout-1); }
    uui-pagination { display: block; margin-top: var(--uui-size-layout-1); }
    .variant-heading { display: flex; align-items: start; gap: var(--uui-size-layout-1); margin-bottom: var(--uui-size-layout-1); }
    .variant-heading h2, .variant-heading p { margin: 0; }
    @media (max-width: 800px) {
      .layout { grid-template-columns: 1fr; }
      aside { border-right: 0; border-bottom: 1px solid var(--uui-color-border); display: grid; grid-template-columns: 1fr 1fr; gap: var(--uui-size-space-5); }
      .icon-grid, .variant-grid { grid-template-columns: repeat(2, minmax(7rem, 1fr)); }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "font-awesome-icon-picker-modal": FontAwesomeIconPickerModalElement;
  }
}
