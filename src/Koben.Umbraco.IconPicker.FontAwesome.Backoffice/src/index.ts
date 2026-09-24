export const manifests: Array<UmbExtensionManifest> = [
  {
    type: "modal",
    alias: "Koben.Umbraco.IconPicker.FontAwesome.Modal",
    name: "Font Awesome Icon Picker Modal",
    element: () => import("./picker-modal.js"),
  },
  {
    type: "propertyEditorUi",
    alias: "Koben.Umbraco.IconPicker.FontAwesome",
    name: "Font Awesome Icon Picker",
    element: () => import("./property-editor.js"),
    meta: {
      label: "Font Awesome Icon Picker",
      icon: "icon-picture",
      group: "pickers",
      propertyEditorSchemaAlias: "Umbraco.Plain.String",
      supportsReadOnly: true,
      settings: {
        properties: [
          {
            alias: "selectionPolicy",
            label: "Selection policy",
            description: "Choose the catalog and constrain which icons this Data Type exposes.",
            propertyEditorUiAlias: "Koben.Umbraco.IconPicker.FontAwesome.Policy",
          },
        ],
        defaultData: [
          {
            alias: "selectionPolicy",
            value: {
              catalogSource: "free",
              releaseMajor: 7,
              families: [],
              styles: [],
              allowedIcons: [],
              includeOfficial: true,
              includeCustom: true,
            },
          },
        ],
      },
    },
  },
  {
    type: "propertyEditorUi",
    alias: "Koben.Umbraco.IconPicker.FontAwesome.Policy",
    name: "Font Awesome Icon Picker Selection Policy",
    element: () => import("./policy-editor.js"),
    meta: {
      label: "Font Awesome Icon Picker Selection Policy",
      icon: "icon-filter",
      group: "configuration",
    },
  },
];
