import { describe, expect, it } from "vitest";
import type { ManifestPropertyEditorUi } from "@umbraco-cms/backoffice/property-editor";
import { manifests } from "./index.js";

describe("property editor manifests", () => {
  it("exposes the icon picker but keeps its selection policy configuration-only", () => {
    const propertyEditors = manifests.filter(
      (manifest): manifest is ManifestPropertyEditorUi => manifest.type === "propertyEditorUi",
    );
    const picker = propertyEditors.find(
      (manifest) => manifest.alias === "Koben.Umbraco.IconPicker.FontAwesome",
    );
    const policy = propertyEditors.find(
      (manifest) => manifest.alias === "Koben.Umbraco.IconPicker.FontAwesome.Policy",
    );

    expect(picker?.type).toBe("propertyEditorUi");
    expect(picker?.meta).toMatchObject({ propertyEditorSchemaAlias: "Umbraco.Plain.String" });
    expect(policy?.type).toBe("propertyEditorUi");
    expect(policy?.meta).not.toHaveProperty("propertyEditorSchemaAlias");
  });
});
