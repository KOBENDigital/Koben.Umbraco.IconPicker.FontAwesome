const previewSvgClass = "font-awesome-preview-svg";

/**
 * Font Awesome assigns the icon's CSS name to the generated SVG. Some names,
 * such as `stack`, are also Font Awesome layout utility classes. Previews need
 * a fixed-size SVG, so do not let an icon name change the surrounding card.
 */
export const normalizePreviewMarkup = (markup: string) =>
  markup.replace(/<svg(?=\s|>)([^>]*)>/i, (_match, attributes: string) =>
    `<svg${attributes.replace(/\sclass=(?:"[^"]*"|'[^']*')/i, "")} class="${previewSvgClass}">`,
  );

export const normalizePreviewSvg = (svg: SVGSVGElement) => {
  svg.setAttribute("class", previewSvgClass);
};
