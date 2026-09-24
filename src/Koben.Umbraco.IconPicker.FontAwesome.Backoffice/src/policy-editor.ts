import { css, customElement, html, nothing, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UmbChangeEvent } from "@umbraco-cms/backoffice/event";
import type { UmbPropertyEditorUiElement } from "@umbraco-cms/backoffice/property-editor";
import { UMB_MODAL_MANAGER_CONTEXT, type UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { defaultPolicy, getConfiguration, normalizePolicy, type FontAwesomeConfiguration, type SelectionPolicy } from "./api.js";
import { ICON_PICKER_MODAL } from "./picker-modal.js";

@customElement("font-awesome-icon-picker-policy-editor")
export default class FontAwesomeIconPickerPolicyEditorElement extends UmbLitElement implements UmbPropertyEditorUiElement {
  @state() private _value: SelectionPolicy = { ...defaultPolicy };
  @state() private _configuration?: FontAwesomeConfiguration;
  @state() private _error?: string;
  @state() private _modalManager?: UmbModalManagerContext;

  constructor() {
    super();
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => (this._modalManager = context));
  }

  @property({ attribute: false })
  get value() { return this._value; }
  set value(value: SelectionPolicy | undefined) { this._value = normalizePolicy(value); }

  connectedCallback(): void {
    super.connectedCallback();
    void this.#load();
  }

  async #load() {
    try {
      this._configuration = await getConfiguration();
    } catch (error) {
      this._error = error instanceof Error ? error.message : "Catalog configuration could not be loaded.";
    }
  }

  #update(patch: Partial<SelectionPolicy>) {
    this._value = { ...this._value, ...patch };
    this.dispatchEvent(new UmbChangeEvent());
  }

  #csv(value: string) {
    return value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  }

  #identities(value: string) {
    return value.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean).flatMap((item) => {
      const [source, ...nameParts] = item.split(":");
      const name = nameParts.join(":").trim();
      return (source === "official" || source === "custom") && name
        ? [{ source: source as "official" | "custom", name }]
        : [];
    });
  }

  async #chooseAllowedIcons() {
    const modal = this._modalManager?.open(this, ICON_PICKER_MODAL, {
      data: {
        policy: { ...this._value, allowedIcons: [] },
        headline: "Choose allowed Font Awesome icons",
        multiple: true,
        selectedIcons: this._value.allowedIcons,
      },
    });
    if (!modal) return;
    try {
      const selected = await modal.onSubmit();
      if (Array.isArray(selected)) this.#update({ allowedIcons: selected });
    } catch {
      // Closing the modal leaves the Data Type policy unchanged.
    }
  }

  render() {
    const freeReleases = this._configuration?.freeReleases ?? [];
    const kits = this._configuration?.kits ?? [];
    return html`
      <div class="policy">
        <label>
          <span>Catalog source</span>
          <select .value=${this._value.catalogSource} @change=${(event: Event) => this.#update({ catalogSource: (event.target as HTMLSelectElement).value === "kit" ? "kit" : "free" })}>
            <option value="free">Font Awesome Free</option>
            <option value="kit">Font Awesome Pro Kit</option>
          </select>
        </label>

        ${this._value.catalogSource === "free"
          ? html`<label>
              <span>Catalog release</span>
              <select .value=${String(this._value.releaseMajor)} @change=${(event: Event) => this.#update({ releaseMajor: (event.target as HTMLSelectElement).value === "6" ? 6 : 7 })}>
                ${(freeReleases.length ? freeReleases : [{ major: 6, label: "Font Awesome Free 6.7.2" }, { major: 7, label: "Font Awesome Free 7.2.0" }]).map(
                  (release) => html`<option value=${release.major}>${release.label}</option>`,
                )}
              </select>
            </label>`
          : html`<label>
              <span>Pro Kit</span>
              <select .value=${this._value.kitToken ?? ""} @change=${(event: Event) => this.#update({ kitToken: (event.target as HTMLSelectElement).value || undefined })}>
                <option value="" ?selected=${!this._value.kitToken}>Choose a Kit</option>
                ${kits.map((kit) => html`<option value=${kit.token} ?selected=${kit.token === this._value.kitToken} ?disabled=${kit.status !== "published"}>
                  ${kit.name}${kit.version ? ` · ${kit.version}` : ""}${kit.status !== "published" ? " · not published" : ""}
                </option>`)}
              </select>
            </label>`}

        ${this._configuration?.warning ? html`<uui-tag color="warning">${this._configuration.warning}</uui-tag>` : nothing}
        ${this._error ? html`<uui-tag color="danger">${this._error}</uui-tag>` : nothing}

        <label>
          <span>Allowed families / packs</span>
          <uui-input label="Allowed families or packs" placeholder="classic, sharp, duotone" .value=${this._value.families.join(", ")}
            @change=${(event: Event) => this.#update({ families: this.#csv((event.target as HTMLInputElement).value) })}></uui-input>
          <small>Comma-separated. Leave empty to allow every family available in the catalog.</small>
        </label>

        <label>
          <span>Allowed styles</span>
          <uui-input label="Allowed styles" placeholder="solid, regular, semibold" .value=${this._value.styles.join(", ")}
            @change=${(event: Event) => this.#update({ styles: this.#csv((event.target as HTMLInputElement).value) })}></uui-input>
          <small>Comma-separated. Leave empty to allow every style available in the catalog.</small>
        </label>

        <label>
          <span>Icon allowlist</span>
          <uui-button look="secondary" label="Choose allowed icons" @click=${this.#chooseAllowedIcons}>
            Choose allowed icons (${this._value.allowedIcons.length || "unrestricted"})
          </uui-button>
          <uui-textarea label="Allowed icon identities" placeholder="official:house&#10;custom:company-logo"
            .value=${this._value.allowedIcons.map((item) => `${item.source}:${item.name}`).join("\n")}
            @change=${(event: Event) => this.#update({ allowedIcons: this.#identities((event.target as HTMLTextAreaElement).value) })}></uui-textarea>
          <small>One <code>official:name</code> or <code>custom:name</code> identity per line. Leave empty for no icon allowlist.</small>
        </label>

        ${this._value.catalogSource === "kit"
          ? html`<div class="checks">
              <uui-checkbox label="Include official icons" .checked=${this._value.includeOfficial} @change=${(event: Event) => this.#update({ includeOfficial: (event.target as HTMLInputElement).checked })}>Include official icons</uui-checkbox>
              <uui-checkbox label="Include custom uploaded icons" .checked=${this._value.includeCustom} @change=${(event: Event) => this.#update({ includeCustom: (event.target as HTMLInputElement).checked })}>Include custom uploaded icons</uui-checkbox>
            </div>`
          : nothing}
      </div>
    `;
  }

  static styles = css`
    :host { display: block; }
    .policy { display: grid; gap: var(--uui-size-layout-1); max-width: 44rem; }
    label { display: grid; gap: var(--uui-size-space-3); }
    label > span { font-weight: 700; }
    select { min-height: 2.5rem; border: 1px solid var(--uui-color-border); border-radius: var(--uui-border-radius); background: var(--uui-color-surface); color: var(--uui-color-text); padding: 0 var(--uui-size-space-4); font: inherit; }
    select:focus-visible { outline: 2px solid var(--uui-color-focus); outline-offset: 1px; }
    uui-input, uui-textarea { width: 100%; }
    small { color: var(--uui-color-text-alt); }
    .checks { display: grid; gap: var(--uui-size-space-4); }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "font-awesome-icon-picker-policy-editor": FontAwesomeIconPickerPolicyEditorElement;
  }
}
