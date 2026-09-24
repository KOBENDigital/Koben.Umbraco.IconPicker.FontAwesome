import { umbHttpClient } from "@umbraco-cms/backoffice/http-client";

export interface FontAwesomeFreeRelease {
  major: number;
  version: string;
  label: string;
}

export interface FontAwesomeKit {
  token: string;
  name: string;
  status?: string;
  license?: string;
  technology?: string;
  version?: string;
}

export interface FontAwesomeConfiguration {
  apiTokenConfigured: boolean;
  freeReleases: FontAwesomeFreeRelease[];
  kits: FontAwesomeKit[];
  warning?: string;
}

export interface IconIdentity {
  source: "official" | "custom";
  name: string;
}

export interface SelectionPolicy {
  catalogSource: "free" | "kit";
  releaseMajor: 6 | 7;
  kitToken?: string;
  families: string[];
  styles: string[];
  allowedIcons: IconIdentity[];
  includeOfficial: boolean;
  includeCustom: boolean;
}

export interface IconVariant {
  family: string;
  style: string;
  prefix: string;
  shorthand: string;
  iconClass: string;
}

export interface IconResult {
  name: string;
  label: string;
  source: "official" | "custom";
  variants: IconVariant[];
}

export interface IconSearchResponse {
  items: IconResult[];
  total: number;
  page: number;
  pageSize: number;
  capped: boolean;
  stale: boolean;
  availableFamilies: string[];
  availableStyles: string[];
  warning?: string;
}

export interface IconSearchRequest {
  catalogSource: "free" | "kit";
  releaseMajor: 6 | 7;
  kitToken?: string;
  query: string;
  page: number;
  pageSize: number;
  families: string[];
  styles: string[];
  allowedIcons: IconIdentity[];
  includeOfficial: boolean;
  includeCustom: boolean;
}

export const defaultPolicy: SelectionPolicy = {
  catalogSource: "free",
  releaseMajor: 7,
  families: [],
  styles: [],
  allowedIcons: [],
  includeOfficial: true,
  includeCustom: true,
};

const apiRoot = "/umbraco/management/api/v1/font-awesome-icon-picker";
const backofficeSecurity = [{ type: "http", scheme: "bearer" }] as const;

export const getConfiguration = async (): Promise<FontAwesomeConfiguration> => {
  const result = await umbHttpClient.get<FontAwesomeConfiguration>({
    url: apiRoot + "/configuration",
    security: backofficeSecurity,
    responseStyle: "fields",
  });
  if (result.error || !result.data)
    throw new Error("Catalog configuration could not be loaded.");
  return result.data;
};

export const searchIcons = async (
  body: IconSearchRequest,
  signal?: AbortSignal,
): Promise<IconSearchResponse> => {
  const result = await umbHttpClient.post<IconSearchResponse>({
    url: apiRoot + "/search",
    body,
    headers: { "Content-Type": "application/json" },
    security: backofficeSecurity,
    signal,
    responseStyle: "fields",
  });
  if (result.error || !result.data)
    throw new Error("The icon catalog request failed.");
  return result.data;
};

export const normalizePolicy = (value: unknown): SelectionPolicy => {
  if (!value || typeof value !== "object") return { ...defaultPolicy };
  const candidate = value as Partial<SelectionPolicy>;
  return {
    catalogSource: candidate.catalogSource === "kit" ? "kit" : "free",
    releaseMajor: candidate.releaseMajor === 6 ? 6 : 7,
    kitToken:
      typeof candidate.kitToken === "string" ? candidate.kitToken : undefined,
    families: Array.isArray(candidate.families)
      ? candidate.families.filter(isString)
      : [],
    styles: Array.isArray(candidate.styles)
      ? candidate.styles.filter(isString)
      : [],
    allowedIcons: Array.isArray(candidate.allowedIcons)
      ? candidate.allowedIcons.filter(
          (item): item is IconIdentity =>
            !!item &&
            typeof item.name === "string" &&
            (item.source === "official" || item.source === "custom"),
        )
      : [],
    includeOfficial: candidate.includeOfficial !== false,
    includeCustom: candidate.includeCustom !== false,
  };
};

const isString = (value: unknown): value is string => typeof value === "string";
