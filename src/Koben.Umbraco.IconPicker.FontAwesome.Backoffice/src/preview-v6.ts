import { icon, type IconDefinition, type IconPack } from "@fortawesome/fontawesome-svg-core";
import { fas } from "fa6-free-solid";
import { far } from "fa6-free-regular";
import { fab } from "fa6-free-brands";

const packs: Record<string, IconPack> = { solid: fas, regular: far, brands: fab };
const definitions = Object.fromEntries(
  Object.entries(packs).map(([style, pack]) => [
    style,
    new Map(Object.values(pack).map((definition) => [definition.iconName, definition])),
  ]),
) as Record<string, Map<string, IconDefinition>>;

export const renderIconMarkup = (iconClass: string) => {
  const classes = iconClass.split(/\s+/);
  const name = classes.find((value) => value.startsWith("fa-") && !variantClasses.has(value))?.slice(3);
  const style = classes.includes("fa-brands") ? "brands" : classes.includes("fa-regular") ? "regular" : "solid";
  const definition = name ? definitions[style]?.get(name) : undefined;
  return definition ? icon(definition).html.join("") : fallback;
};

const variantClasses = new Set([
  "fa-solid", "fa-regular", "fa-light", "fa-thin", "fa-semibold", "fa-brands",
  "fa-sharp", "fa-sharp-duotone", "fa-duotone", "fa-classic", "fa-kit",
]);
const fallback = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="currentColor"/><path d="M8 12h8" stroke="currentColor"/></svg>';
