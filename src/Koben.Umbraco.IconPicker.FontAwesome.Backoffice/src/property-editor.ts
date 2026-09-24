import { css, customElement, html, nothing, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UmbChangeEvent } from "@umbraco-cms/backoffice/event";
import { type UmbPropertyEditorConfigCollection, type UmbPropertyEditorUiElement } from "@umbraco-cms/backoffice/property-editor";
import { UMB_MODAL_MANAGER_CONTEXT, type UmbModalManagerContext } from "@umbraco-cms/backoffice/modal";
import { defaultPolicy, normalizePolicy, type SelectionPolicy } from "./api.js";
import { ICON_PICKER_MODAL } from "./picker-modal.js";
import { ensureKitLoaded, renderFreeIcon, renderKitIcon } from "./preview.js";

@customElement("font-awesome-icon-picker-property-editor")
export default class FontAwesomeIconPickerPropertyEditorElement extends UmbLitElement implements UmbPropertyEditorUiElement {
  @property({ type: String }) value = "";
  @property({ type: Boolean, reflect: true }) readonly = false;
  @property({ type: Boolean }) mandatory = false;
  @state() private _policy: SelectionPolicy = { ...defaultPolicy };
  @state() private _modalManager?: UmbModalManagerContext;

  @property({ attribute: false })
  set config(config: UmbPropertyEditorConfigCollection | undefined) {
    this._policy = normalizePolicy(config?.getValueByAlias("selectionPolicy"));
    if (this._policy.catalogSource === "kit") void ensureKitLoaded(this._policy.kitToken).catch(() => undefined);
  }

  constructor() {
    super();
    this.consumeContext(UMB_MODAL_MANAGER_CONTEXT, (context) => (this._modalManager = context));
  }

  async #change() {
    const modal = this._modalManager?.open(this, ICON_PICKER_MODAL, {
      data: { policy: this._policy, currentValue: this.value },
    });
    if (!modal) return;
    try {
      const selected = await modal.onSubmit();
      if (typeof selected === "string") {
        this.value = selected;
        this.dispatchEvent(new UmbChangeEvent());
      }
    } catch {
      // Closing the modal is not an editor error.
    }
  }

  #clear(event?: Event) {
    event?.stopPropagation();
    this.value = "";
    this.dispatchEvent(new UmbChangeEvent());
  }

  #iconName() {
    const name = this.value
      .split(/\s+/)
      .find((part) => part.startsWith("fa-") && !knownVariantClasses.has(part))
      ?.slice(3);

    return name
      ? name
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")
      : "Selected icon";
  }

  #isLegacy() {
    if (!this.value) return false;
    const parts = this.value.split(/\s+/);
    const name = parts.find((part) => part.startsWith("fa-") && !knownVariantClasses.has(part))?.slice(3);
    if (!name) return true;
    if (this._policy.allowedIcons.length > 0 && !this._policy.allowedIcons.some((item) => item.name === name)) return true;
    if (this._policy.families.length > 0 && !this._policy.families.some((family) => parts.includes(`fa-${family}`))) return true;
    if (this._policy.styles.length > 0 && !this._policy.styles.some((style) => parts.includes(`fa-${style}`))) return true;
    return false;
  }

  #preview() {
    if (!this.value) return html`<uui-icon name="icon-picture" aria-hidden="true"></uui-icon>`;
    return this._policy.catalogSource === "free"
      ? renderFreeIcon(this.value, this._policy.releaseMajor)
      : renderKitIcon(this.value, this._policy.kitToken);
  }

  render() {
    const legacy = this.#isLegacy();
    return html`
      ${this.value
        ? html`
            <uui-ref-list>
              <uui-ref-node
                name=${this.#iconName()}
                detail=${this.value}
                standalone
                class="selected-icon"
                ?readonly=${this.readonly}
                @open=${this.#change}>
                <span class="icon-preview" slot="icon" aria-hidden="true">${this.#preview()}</span>
                ${this.readonly
                  ? nothing
                  : html`
                      <uui-action-bar slot="actions">
                        <uui-button label="Remove selected icon" @click=${this.#clear}>Remove</uui-button>
                      </uui-action-bar>
                    `}
              </uui-ref-node>
            </uui-ref-list>
          `
        : this.readonly
          ? html`<span class="empty">No icon selected</span>`
          : html`<uui-button id="add-icon" look="placeholder" label="Add icon" @click=${this.#change}>Add</uui-button>`}
      ${legacy ? html`<p class="help">The saved value is preserved. Replace or clear it when convenient.</p>` : nothing}
    `;
  }

  static styles = css`
    :host { display: block; }
    #add-icon, uui-ref-list { width: 100%; }
    .selected-icon { border: 1px solid var(--uui-color-border); border-radius: var(--uui-border-radius); }
    .selected-icon:hover { border-color: var(--uui-color-border-emphasis); }
    .icon-preview { width: 2rem; height: 2rem; display: grid; place-items: center; font-size: 1.5rem; }
    .icon-preview svg,
    .icon-preview > font-awesome-free-preview,
    .icon-preview > font-awesome-kit-preview { width: 100%; height: 100%; }
    .empty, .help { color: var(--uui-color-text-alt); }
    .help { margin: var(--uui-size-space-3) 0 0; }
  `;
}

const knownVariantClasses = new Set([
  "fa-solid", "fa-regular", "fa-light", "fa-thin", "fa-semibold", "fa-brands",
  "fa-sharp", "fa-sharp-duotone", "fa-duotone", "fa-classic", "fa-kit",
]);

declare global {
  interface HTMLElementTagNameMap {
    "font-awesome-icon-picker-property-editor": FontAwesomeIconPickerPropertyEditorElement;
  }
}
