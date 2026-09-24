# Font Awesome Icon Picker for Umbraco 17

An Umbraco 17 property editor for selecting Font Awesome Free, Pro, and Kit custom icons. Editors search the Font Awesome catalog in the backoffice and the saved content value is a complete CSS class string:

```text
fa-solid fa-house
```

Non-Classic families include the family class:

```text
fa-sharp fa-solid fa-house
```

## TL;DR

1. Install the package and restart your Umbraco 17 application:

   ```powershell
   dotnet add package Koben.Umbraco.IconPicker.FontAwesome
   ```
2. In **Settings > Data Types**, create a data type using **Font Awesome Icon Picker**. Choose **Font Awesome Free** and its matching release to use the picker without any Font Awesome credentials.
3. Load the matching Font Awesome assets on the public site, then render the saved class string, for example `<i class="@Model.Icon" aria-hidden="true"></i>`.
4. To use a **Pro Kit**, add the owning Font Awesome account's API token to the application's `Koben:FontAwesomeIconPicker:ApiToken` configuration, restart the application, and select a published Kit in the data type. The API token stays server-side; the selected Kit ID is saved in the data type.

See [Server configuration](#server-configuration) and [Pro Kit configuration](#pro-kit-configuration) for the required token scopes, Kit requirements, domain configuration, and secret-storage options.

## Features

- Font Awesome Free 6.7.2 and 7.2.0 catalogs.
- Font Awesome Pro through a selected hosted Kit.
- Kit subsets, account entitlements, and uploaded custom icons.
- Fuzzy search through the Font Awesome GraphQL API.
- Family/pack and style filters which can be changed at any time.
- Per-Data-Type icon allowlists and catalog policies.
- Native Umbraco pagination with 24 results per page.
- Existing values can be previewed, changed, or cleared.
- Legacy values outside a tightened Data Type policy are preserved.
- Read-only property support.
- Models Builder output is simply `string?`.

## Requirements

- Umbraco CMS 17
- .NET 10
- A Font Awesome API token only when using Pro Kits
- A published hosted Font Awesome Kit for Pro and custom-icon previews

Font Awesome Free browsing does not require a token.

## Install in an existing Umbraco site

```powershell
dotnet add package Koben.Umbraco.IconPicker.FontAwesome
```

Build and restart the Umbraco application. The package copies its backoffice assets to:

```text
App_Plugins/Koben.Umbraco.IconPicker.FontAwesome
```

Create a Data Type in Umbraco and choose **Font Awesome Icon Picker**.

## Run the included Web project

The repository includes `src/Web`, a small Umbraco 17 sample site for trying the picker. It references the package projects directly and includes a uSync export that creates the following on a new installation:

- Font Awesome Icon Picker data types for Free 6.7.2, Free 7.2.0, and Pro Kit.
- A **Home Page** document type and template.
- A published **Home** page with one property for each data type.

It does not include a Font Awesome account token or a Kit ID. Those are installation-specific credentials/configuration and must never be committed to the export.

### Prerequisites

- .NET 10 SDK.
- A supported SQL Server instance available to the local application.
- Node.js and npm only when rebuilding the backoffice project after changing its TypeScript source. The checked-in sample can otherwise be built with .NET.

### Configure local secrets

`src/Web/Web.csproj` already has a User Secrets ID. Store the Umbraco connection
string and, if testing Pro Kits, the Font Awesome account API token there. For
example, this uses SQL Server LocalDB on Windows:

```powershell
dotnet user-secrets set --project src/Web "ConnectionStrings:umbracoDbDSN" "Server=(localdb)\\MSSQLLocalDB;Database=FontAwesomeIconPicker;Integrated Security=True;TrustServerCertificate=True"
dotnet user-secrets set --project src/Web "Koben:FontAwesomeIconPicker:ApiToken" "YOUR_FONT_AWESOME_API_TOKEN"
```

Omit the second command for a Free-only test. Use the connection string required by your own SQL Server instead of the LocalDB example when appropriate.

`src/Web/appsettings.json` contains the non-secret defaults used by the sample:

```json
{
  "ConnectionStrings": {
    "umbracoDbDSN": "FromUserSecretsOrKeyVault"
  },
  "Koben": {
    "FontAwesomeIconPicker": {
      "ApiToken": "FromUserSecretsOrKeyVault",
      "InitialBrowseWindowSize": 50,
      "SearchWindowSize": 500
    }
  }
}
```

Replace the two placeholder values through user secrets, environment variables, or your deployment secret store; do not replace them in the tracked settings file. The equivalent production environment variables are
`ConnectionStrings__umbracoDbDSN` and `Koben__FontAwesomeIconPicker__ApiToken`.

### Start and initialise the site

```powershell
dotnet run --project src/Web/Web.csproj
```

Open the HTTPS URL reported by `dotnet run`, complete the Umbraco installer if it is shown, then sign in to the backoffice. On the first boot uSync imports the sample schema and content from `src/Web/uSync/v17`. If the site was already running before the export was present, use the uSync dashboard to import the checked-in files instead.

### Complete the Pro Kit data type

The uSync export deliberately leaves the **Font Awesome Icon Picker - Font Awesome Pro Kit** data type's Kit ID blank. After the site has started:

1. In **Settings**, open **Data Types** and select **Font Awesome Icon Picker - Font Awesome Pro Kit**.
2. Set **Catalog source** to **Font Awesome Pro Kit** if it is not already selected.
3. Choose the published Kit belonging to the same Font Awesome account as the configured API token. This saves the Kit's public ID in the data type.
4. Save the data type, open **Content > Home**, select icons, and publish.

The sample home-page view includes a fixed Kit script only as a rendering demo. Replace it with the embed for the Kit you selected (or remove the Pro example) before treating the sample as a real website. The Free examples do not need the API token, but the public site must still load matching Font Awesome assets to render their saved classes.

## Server configuration

The Font Awesome account API token belongs to the installation, not to a Data Type. Keep it in user secrets, an environment variable, or a secret store.

```json
{
  "Koben": {
    "FontAwesomeIconPicker": {
      "ApiToken": "YOUR_FONT_AWESOME_API_TOKEN"
    }
  }
}
```

Environment-variable form:

```text
Koben__FontAwesomeIconPicker__ApiToken=YOUR_FONT_AWESOME_API_TOKEN
```

Do not put this account token in templates, client-side configuration, Data Type configuration, or source control. The package exchanges it server-side for a short-lived access token and never returns either token to the browser.

### Available options

| Setting | Default | Purpose |
| --- | --- | --- |
| `ApiToken` | empty | Font Awesome account API token used for Pro Kit discovery and search. |
| `GraphQlEndpoint` | `https://api.fontawesome.com` | Font Awesome GraphQL endpoint. |
| `TokenEndpoint` | `https://api.fontawesome.com/token` | Account-token exchange endpoint. |
| `FreeVersion6` | `6.7.2` | Exact Free 6 catalog version supported by the bundled preview data. |
| `FreeVersion7` | `7.2.0` | Exact Free 7 catalog version supported by the bundled preview data. |
| `InitialBrowseWindowSize` | `50` | Maximum ranked results fetched for an empty, unfiltered initial browse. Valid values are 24–50. |
| `SearchWindowSize` | `500` | Maximum ranked results materialized before policy filtering and paging. |
| `FreshCacheMinutes` | `5` | Normal catalog cache duration. |
| `StaleCacheMinutes` | `60` | Maximum cached-result age used during a temporary upstream outage. |

Do not change a Free version unless the package's corresponding preview dependencies are updated to the same exact version.

## Font Awesome API token and scopes

Create the API token from the Font Awesome account that owns the Kits. The exchanged token must include:

- `public` for public catalog metadata.
- `kits_read` for Kit discovery, subset metadata, official Kit search, and custom-upload search.

Font Awesome currently documents the token endpoint as a Pro-plan feature. If the Data Type is Free-only, omit `ApiToken`.

Official documentation:

- [Font Awesome GraphQL API](https://docs.fontawesome.com/apis/graphql)
- [Token endpoint and scopes](https://docs.fontawesome.com/apis/graphql/token-endpoint)
- [GraphQL objects and Kit search](https://docs.fontawesome.com/apis/graphql/objects)

## Pro Kit configuration

Before selecting a Kit in an Umbraco Data Type:

1. Create or choose the Kit in the same Font Awesome account as the API token.
2. Set its license to Pro.
3. Choose the required Font Awesome version and technology.
4. Configure its icon selection as Full Library, By Style, or By Icon.
5. Add any custom uploaded icons required by editors.
6. Publish the Kit and confirm its status is `published`.
7. Add every Umbraco backoffice host to the Kit's allowed domains.

The picker respects the Kit as its source of truth. If the Kit is subsetted By Style or By Icon, icons outside that subset will not appear even when the Data Type policy would otherwise allow them.

### Domains and local development

The hosted Kit must be permitted to load on the Umbraco backoffice domain because it supplies Pro/custom previews. The picker uses the Kit's JavaScript embed to render SVG previews directly. It loads the Kit stylesheet inside the preview's Shadow DOM only as a fallback for a Web Fonts Kit, so SVG Kits do not require a `.css` endpoint.

- Add production, staging, and test backoffice hosts to the Kit's domain list.
- Plain `localhost` is allowed by Font Awesome by default.
- Wildcards such as `*.localhost` are not supported.
- For local subdomains, use a reserved `.test` domain, map it to `127.0.0.1`, and add the matching domain or wildcard to the Kit.
- A restrictive Content Security Policy must allow the Kit resources required by Font Awesome.

See [Use a Kit](https://docs.fontawesome.com/web/setup/use-kit/) and [Font Awesome web troubleshooting](https://docs.fontawesome.com/web/troubleshoot).

### Kit pageviews

Loading a hosted Kit in the backoffice to preview Pro or custom icons can count as a Kit pageview. Review the allowance for the Font Awesome subscription and use domain restrictions to prevent unintended use. Free preview SVG data is bundled and does not load a Kit.

Font Awesome's hosted JavaScript runtime is page-global. If one content editor contains Data Types backed by different Kits, avoid giving custom icons in those Kits the same name; Font Awesome does not provide token-isolated global icon libraries on a single page.

## Data Type selection policy

Each Data Type independently configures:

- **Catalog source**: Font Awesome Free or Font Awesome Pro Kit.
- **Free release**: pinned Free 6 or Free 7.
- **Pro Kit**: a Kit owned by the configured Font Awesome account.
- **Allowed families / packs**: for example `classic, sharp, duotone`.
- **Allowed styles**: for example `solid, regular, semibold`.
- **Icon allowlist**: one identity per line, such as `official:house` or `custom:company-logo`.
- **Official/custom inclusion**: available for Kit-backed Data Types.

An empty family, style, or icon constraint means unrestricted within the selected catalog. Constraints intersect with the Kit's version, entitlements, and subset.

The policy is an editor/design-system guardrail, not a security boundary. A value saved before a policy change remains intact and is shown with a warning until an editor replaces or clears it.

## Stored value and Models Builder

The property editor uses the built-in `Umbraco.Plain.String` schema. No custom property value converter is installed.

Given a document property alias `icon`, Models Builder produces the equivalent of:

```csharp
public virtual string? Icon => this.Value<string>("icon");
```

After selecting House in Classic Solid:

```csharp
var iconClass = Model.Icon; // "fa-solid fa-house"
```

The combined string still allows editors to reopen the picker and replace the icon because the backoffice treats the saved value as the current selection, not as separate stored style/name fields.

## Rendering on the public site

This package does not load Font Awesome assets on the public website. The consuming site must load assets matching the Data Type's catalog.

### Pro Kit

Place the selected Kit's current embed code in the page `<head>`:

```html
<script src="https://kit.fontawesome.com/YOUR_KIT_CODE.js" crossorigin="anonymous"></script>
```

Then render the class string:

```cshtml
@if (!string.IsNullOrWhiteSpace(Model.Icon))
{
    <i class="@Model.Icon" aria-hidden="true"></i>
}
```

For a meaningful standalone icon, provide an accessible name on its owning element. Decorative icons should remain hidden from assistive technology.

### Font Awesome Free

Load the matching Free CSS/JS or self-hosted assets, then use the same Razor markup. Do not mix a Free 6 Data Type with only Free 7 assets (or the reverse) unless the consuming application's compatibility policy explicitly supports it.

## Search, filtering, and caching

The Font Awesome API supplies ranked fuzzy search results. An empty, unconstrained initial browse fetches at most 50 candidates so the picker can open after one upstream page. Typed searches and searches constrained by a Data Type Selection Policy retain the larger 500-candidate window, apply the policy, and only then page the filtered results. The visible Umbraco pager still shows 24 results per page.

Kit metadata, catalog windows, and the exchanged access token use Umbraco's `AppCaches.RuntimeCache`. Cache entries are process-local and expire automatically. During a short Font Awesome outage, a still-available stale catalog window is labelled in the UI. Existing content can always be saved without contacting Font Awesome.

## Troubleshooting

### Pro Kits do not appear

- Confirm `Koben:FontAwesomeIconPicker:ApiToken` is configured on the server.
- Confirm the token belongs to the account that owns the Kit.
- Confirm the exchanged token grants `kits_read`.
- Restart the application after changing secret configuration.

### A Pro or custom icon does not appear

- Publish the Kit.
- Confirm the icon/style is included by the Kit's Full Library, By Style, or By Icon selection.
- Confirm the Data Type family/style/identity policy also allows it.
- Confirm the Kit is permitted on the current backoffice domain.
- Check CSP and browser network errors for the hosted Kit script.
- Hard-refresh the backoffice after changing the Kit's technology or publishing a new Kit release.

### Search is capped

The API returned more than the package's bounded search window. Add a more specific search term or narrow the family/style filters.

### An old value shows a policy warning

The Data Type policy changed after the value was saved, or the catalog no longer exposes the variant. The package deliberately preserves it. Choose a replacement or clear it.

### Public page shows an empty square

The public site has not loaded the matching Font Awesome assets, the selected Kit does not include the icon, or the loaded Font Awesome major differs from the Data Type.

## Development

```powershell
cd src/Koben.Umbraco.IconPicker.FontAwesome.Backoffice
npm install
npm run build

cd ..
dotnet build Koben.Umbraco.IconPicker.FontAwesome.slnx
dotnet pack Koben.Umbraco.IconPicker.FontAwesome.Backoffice/Koben.Umbraco.IconPicker.FontAwesome.Backoffice.csproj
```

The local `Web` project references both package projects for backoffice validation.

## Security

- The account API token and exchanged access token remain server-side.
- Search requests are authenticated through Umbraco's backoffice authorization.
- External responses are mapped to package-owned response models.
- Tokens are not written to application logs.
- Data Type Kit tokens are public Kit identifiers used by Font Awesome embed URLs; they are not the Font Awesome account API credential.

## License

The package is distributed under the MIT license. Font Awesome icons, Kits, services, and Pro content remain subject to Font Awesome's licenses and subscription terms.
