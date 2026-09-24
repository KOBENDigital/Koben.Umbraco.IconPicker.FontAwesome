# Font Awesome Icon Picker

An Umbraco property editor package context for finding and selecting icons from the Font Awesome catalog. It exists to give content editors a consistent icon selection value across Font Awesome Free and licensed Font Awesome Pro installations.

## Language

### Catalog and access

**Icon Catalog**:
The Font Awesome icons available for discovery and selection by an installation, including their supported families and styles.
_Avoid_: Icon library, icon set

**Free Catalog Access**:
Access limited to icons available under Font Awesome Free.
_Avoid_: Anonymous Pro access, trial access

**Pro Catalog Access**:
Access to the Font Awesome icons made available through an installation-owned Pro Kit, including Free icons.
_Avoid_: Bundled Pro access, shared Pro licence

**Font Awesome API Token**:
A secret credential owned by an installation that establishes its Font Awesome catalog entitlements.
_Avoid_: Kit token, package token, browser token

**Icon Class String**:
The complete, canonical sequence of Font Awesome CSS classes identifying one selected icon, including its family and style classes where required.
_Avoid_: Icon reference, SVG markup, Unicode value, partial class name

**Catalog Release**:
The pinned Font Awesome release against which icons are discovered when using Free Catalog Access.
_Avoid_: Latest, moving release, unversioned catalog

**Pro Kit**:
The installation-owned Font Awesome Kit that determines the release, subset, and entitled family-style variants available through Pro Catalog Access.
_Avoid_: Pro catalog, shared kit, API token

**Kit Token**:
The public identifier of a Pro Kit, saved in a Data Type to select that Kit. It may be used in Font Awesome embed URLs but is not the Font Awesome API Token.
_Avoid_: API token, secret, account credential

### Icon selection

**Icon Identity**:
The catalog identity of an official or custom icon independent of the family-style variant in which it is rendered. Official and custom icons with the same name have distinct identities.
_Avoid_: Icon Class String, variant

**Custom Icon**:
An icon uploaded to a Pro Kit rather than supplied by Font Awesome. It belongs only to that Kit and has a distinct Icon Identity even when its name matches an official icon.
_Avoid_: Official icon, Font Awesome Free icon

**Icon Variant**:
One renderable family-and-style form of an Icon Identity, such as Classic Solid or Sharp Regular. A Custom Icon has the Kit Custom variant.
_Avoid_: Icon Identity, Icon Class String

**Selection Policy**:
The Data Type-owned design-system guardrail that limits selectable icon identities and family-style variants. It constrains the supported backoffice picker experience but is not a security boundary.
_Avoid_: Authorization policy, licence entitlement, server validation

**Legacy Icon Value**:
An existing Icon Class String that is outside the current Selection Policy or no longer available in its catalog. It remains valid content until an editor deliberately replaces or clears it.
_Avoid_: Invalid content, corrupt value

## Example Dialogue

Dev: "Will installing the package automatically expose Pro icons?"
Domain expert: "No. Every installation has Free Catalog Access by default and gains Pro Catalog Access only when it has both its own Font Awesome API Token and a selected Pro Kit."
Dev: "What value does a content property expose after an editor selects an icon?"
Domain expert: "It exposes an Icon Class String such as `fa-solid fa-house`."
Dev: "Can one Document Type offer fewer icons than another?"
Domain expert: "Yes. Each Data Type can define its own Selection Policy over the same Icon Catalog."
Dev: "What happens when that policy changes?"
Domain expert: "Existing content becomes a Legacy Icon Value and is preserved until an editor deliberately chooses an allowed replacement."
