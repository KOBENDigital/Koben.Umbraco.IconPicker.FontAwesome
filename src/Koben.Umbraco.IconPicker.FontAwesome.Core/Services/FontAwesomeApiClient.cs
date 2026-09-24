using Koben.Umbraco.IconPicker.FontAwesome.Core.Configuration;
using Koben.Umbraco.IconPicker.FontAwesome.Core.Constants;
using Koben.Umbraco.IconPicker.FontAwesome.Core.Contracts;
using Koben.Umbraco.IconPicker.FontAwesome.Core.Errors;
using Koben.Umbraco.IconPicker.FontAwesome.Core.Models;
using Koben.Umbraco.IconPicker.FontAwesome.Core.Services.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Umbraco.Cms.Core.Cache;

namespace Koben.Umbraco.IconPicker.FontAwesome.Core.Services;

internal sealed class FontAwesomeApiClient : IFontAwesomeApiClient
{
	private readonly HttpClient _httpClient;
	private readonly FontAwesomeIconPickerOptions _options;
	private readonly IAppPolicyCache _cache;
	private readonly SemaphoreSlim _tokenLock = new(1, 1);

	[ActivatorUtilitiesConstructor]
	public FontAwesomeApiClient(
			HttpClient httpClient,
			IOptions<FontAwesomeIconPickerOptions> options,
			AppCaches appCaches)
			: this(httpClient, options, appCaches.RuntimeCache)
	{
	}

	internal FontAwesomeApiClient(
			HttpClient httpClient,
			IOptions<FontAwesomeIconPickerOptions> options,
			IAppPolicyCache cache)
	{
		_httpClient = httpClient;
		_options = options.Value;
		_cache = cache;
	}

	public async Task<IReadOnlyCollection<FontAwesomeKitResponse>> GetKitsAsync(CancellationToken cancellationToken)
	{
		const string query = "query PickerKits { me { kits { token name status licenseSelected technologySelected version release { version } } } }";
		using var document = await ExecuteAsync(query, null, cancellationToken);
		var kits = Data(document).GetProperty("me").GetProperty("kits");
		return kits.EnumerateArray().Select(kit => new FontAwesomeKitResponse(
				Text(kit, "token") ?? string.Empty,
				Text(kit, "name") ?? "Unnamed Kit",
				Text(kit, "status"),
				Text(kit, "licenseSelected"),
				Text(kit, "technologySelected"),
				kit.TryGetProperty("release", out var release) ? Text(release, "version") : Text(kit, "version")))
				.Where(x => x.Token.Length > 0 && string.Equals(x.License, "pro", StringComparison.OrdinalIgnoreCase))
				.ToArray();
	}

	public async Task<CatalogWindow> SearchFreeAsync(string version, string query, int limit, CancellationToken cancellationToken)
	{
		const string searchQuery = "query FreeSearch($version: String!, $query: String!, $page: Int!, $pageSize: Int!) { searchPaginated(version: $version, query: $query, page: $page, pageSize: $pageSize) { icons { id label familyStylesByLicense { free { family style prefix shorthand } } } } }";
		const string browseQuery = "query FreeBrowse($version: String!, $page: Int!, $pageSize: Int!) { release(version: $version) { iconsPaginated(license: FREE, page: $page, pageSize: $pageSize) { icons { id label familyStylesByLicense { free { family style prefix shorthand } } } } } }";
		var icons = new List<CatalogIcon>();
		var page = 1;
		while (icons.Count < limit)
		{
			var pageVariables = new { version, query, page, pageSize = Math.Min(50, limit - icons.Count) };
			using var document = await ExecuteAsync(query.Length == 0 ? browseQuery : searchQuery, pageVariables, cancellationToken);
			var data = Data(document);
			var container = query.Length == 0 ? data.GetProperty("release").GetProperty("iconsPaginated") : data.GetProperty("searchPaginated");
			var parsed = ParseOfficial(container.GetProperty("icons"));
			icons.AddRange(parsed);
			if (parsed.Count < pageVariables.pageSize) break;
			page++;
		}

		return new(icons, icons.Count >= limit);
	}

	public async Task<CatalogWindow> SearchKitAsync(string kitToken, string query, int limit, CancellationToken cancellationToken)
	{
		const string graphQl = "query KitSearch($kitToken: String!, $query: String!, $page: Int!, $pageSize: Int!) { official: me { kit(token: $kitToken) { searchKit(query: $query, page: $page, pageSize: $pageSize, searchMode: OFFICIAL) { icons { ... on IconWithVariants { name label variants { familyStyle { family style prefix shorthand } } } } } } } custom: me { kit(token: $kitToken) { searchKit(query: $query, page: $page, pageSize: $pageSize, searchMode: CUSTOM) { icons { ... on IconUpload { name unicodeHex } } } } } }";
		var icons = new Dictionary<string, CatalogIcon>(StringComparer.OrdinalIgnoreCase);
		var page = 1;
		while (icons.Count < limit)
		{
			var pageSize = Math.Min(50, limit - icons.Count);
			using var document = await ExecuteAsync(graphQl, new { kitToken, query, page, pageSize }, cancellationToken);
			var data = Data(document);
			var official = data.GetProperty("official").GetProperty("kit").GetProperty("searchKit").GetProperty("icons");
			var custom = data.GetProperty("custom").GetProperty("kit").GetProperty("searchKit").GetProperty("icons");
			var received = 0;
			foreach (var icon in ParseKitOfficial(official))
			{
				icons[$"official:{icon.Name}"] = icon;
				received++;
			}
			foreach (var upload in custom.EnumerateArray())
			{
				var name = Text(upload, "name");
				if (string.IsNullOrWhiteSpace(name)) continue;
				icons[$"custom:{name}"] = new(name, Humanize(name), FontAwesomeIconPickerConstants.CustomIconSource,
						[new CatalogVariant("kit", "custom", "fa-kit", "fa-kit")]);
				received++;
			}
			if (received < pageSize * 2) break;
			page++;
		}

		return new(icons.Values.Take(limit).ToArray(), icons.Count >= limit);
	}

	private async Task<JsonDocument> ExecuteAsync(string query, object? variables, CancellationToken cancellationToken)
	{
		var token = await GetAccessTokenAsync(cancellationToken);
		using var request = new HttpRequestMessage(HttpMethod.Post, _options.GraphQlEndpoint)
		{
			Content = JsonContent.Create(new { query, variables })
		};
		if (!string.IsNullOrWhiteSpace(token))
		{
			request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
		}
		using var response = await _httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
		if (!response.IsSuccessStatusCode)
		{
			throw new FontAwesomeApiException($"Font Awesome returned HTTP {(int)response.StatusCode}.");
		}
		var document = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
		if (document.RootElement.TryGetProperty("errors", out var errors) && errors.GetArrayLength() > 0)
		{
			document.Dispose();
			throw new FontAwesomeApiException("Font Awesome rejected the catalog request. Check the configured token, Kit, and entitlements.");
		}
		return document;
	}

	private async Task<string> GetAccessTokenAsync(CancellationToken cancellationToken)
	{
		var tokenCacheKey = $"{FontAwesomeIconPickerConstants.CacheKeyPrefix}:access-token";
		var cached = _cache.GetCacheItem<string>(tokenCacheKey);
		if (cached is not null) return cached;
		if (string.IsNullOrWhiteSpace(_options.ApiToken))
		{
			return string.Empty;
		}

		await _tokenLock.WaitAsync(cancellationToken);
		try
		{
			cached = _cache.GetCacheItem<string>(tokenCacheKey);
			if (cached is not null) return cached;
			using var request = new HttpRequestMessage(HttpMethod.Post, _options.TokenEndpoint);
			request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiToken);
			using var response = await _httpClient.SendAsync(request, cancellationToken);
			if (!response.IsSuccessStatusCode) throw new FontAwesomeApiException("The configured Font Awesome API token could not be exchanged.");
			using var document = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
			var accessToken = Text(document.RootElement, "access_token") ?? Text(document.RootElement, "accessToken");
			if (string.IsNullOrWhiteSpace(accessToken)) throw new FontAwesomeApiException("Font Awesome did not return an access token.");
			_cache.InsertCacheItem(tokenCacheKey, () => accessToken, TimeSpan.FromMinutes(50));
			return accessToken;
		}
		finally
		{
			_tokenLock.Release();
		}
	}

	private static IReadOnlyCollection<CatalogIcon> ParseOfficial(JsonElement results)
	{
		return results.EnumerateArray().Select(icon =>
		{
			var name = Text(icon, "id") ?? Text(icon, "name") ?? string.Empty;
			var variants = icon.TryGetProperty("familyStylesByLicense", out var byLicense)
					&& byLicense.TryGetProperty("free", out var free)
							? ParseFamilyStyles(free)
							: [];
			return new CatalogIcon(name, Text(icon, "label") ?? Humanize(name), FontAwesomeIconPickerConstants.OfficialIconSource, variants);
		}).Where(x => x.Name.Length > 0 && x.Variants.Count > 0).ToArray();
	}

	private static IReadOnlyCollection<CatalogIcon> ParseKitOfficial(JsonElement results)
	{
		return results.EnumerateArray().Select(icon =>
		{
			var name = Text(icon, "name") ?? string.Empty;
			var variants = icon.TryGetProperty("variants", out var variantArray)
					? variantArray.EnumerateArray()
							.Where(x => x.TryGetProperty("familyStyle", out _))
							.Select(x => ParseFamilyStyle(x.GetProperty("familyStyle")))
							.Where(x => x is not null).Cast<CatalogVariant>().Distinct().ToArray()
					: [];
			return new CatalogIcon(name, Text(icon, "label") ?? Humanize(name), FontAwesomeIconPickerConstants.OfficialIconSource, variants);
		}).Where(x => x.Name.Length > 0 && x.Variants.Count > 0).ToArray();
	}

	private static IReadOnlyCollection<CatalogVariant> ParseFamilyStyles(JsonElement styles) => styles.EnumerateArray()
			.Select(ParseFamilyStyle).Where(x => x is not null).Cast<CatalogVariant>().Distinct().ToArray();

	private static CatalogVariant? ParseFamilyStyle(JsonElement value)
	{
		var family = Text(value, "family");
		var style = Text(value, "style");
		if (string.IsNullOrWhiteSpace(family) || string.IsNullOrWhiteSpace(style)) return null;
		return new(family, style, Text(value, "prefix") ?? $"fa-{style}", Text(value, "shorthand") ?? $"fa-{style}");
	}

	private static JsonElement Data(JsonDocument document) => document.RootElement.GetProperty("data");

	private static string? Text(JsonElement element, string propertyName) =>
			element.TryGetProperty(propertyName, out var value) && value.ValueKind == JsonValueKind.String ? value.GetString() : null;

	private static string Humanize(string value) => string.Join(' ', value.Split('-', StringSplitOptions.RemoveEmptyEntries)
			.Select(word => char.ToUpperInvariant(word[0]) + word[1..]));
}
