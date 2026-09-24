using Koben.Umbraco.IconPicker.FontAwesome.Core.Configuration;
using Koben.Umbraco.IconPicker.FontAwesome.Core.Constants;
using Koben.Umbraco.IconPicker.FontAwesome.Core.Contracts;
using Koben.Umbraco.IconPicker.FontAwesome.Core.Errors;
using Koben.Umbraco.IconPicker.FontAwesome.Core.Models;
using Koben.Umbraco.IconPicker.FontAwesome.Core.Services.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Cache;

namespace Koben.Umbraco.IconPicker.FontAwesome.Core.Services;

internal sealed class FontAwesomeCatalogService : IFontAwesomeCatalogService
{
	private readonly IFontAwesomeApiClient _apiClient;
	private readonly IAppPolicyCache _cache;
	private readonly FontAwesomeIconPickerOptions _options;
	private readonly ILogger<FontAwesomeCatalogService> _logger;

	[ActivatorUtilitiesConstructor]
	public FontAwesomeCatalogService(
			IFontAwesomeApiClient apiClient,
			AppCaches appCaches,
			IOptions<FontAwesomeIconPickerOptions> options,
			ILogger<FontAwesomeCatalogService> logger)
			: this(apiClient, appCaches.RuntimeCache, options, logger)
	{
	}

	internal FontAwesomeCatalogService(
			IFontAwesomeApiClient apiClient,
			IAppPolicyCache cache,
			IOptions<FontAwesomeIconPickerOptions> options,
			ILogger<FontAwesomeCatalogService> logger)
	{
		_apiClient = apiClient;
		_cache = cache;
		_options = options.Value;
		_logger = logger;
	}

	public async Task<FontAwesomeConfigurationResponse> GetConfigurationAsync(CancellationToken cancellationToken)
	{
		var releases = new[]
		{
						new FontAwesomeFreeReleaseResponse(6, _options.FreeVersion6, $"Font Awesome Free {_options.FreeVersion6}"),
						new FontAwesomeFreeReleaseResponse(7, _options.FreeVersion7, $"Font Awesome Free {_options.FreeVersion7}")
				};

		if (string.IsNullOrWhiteSpace(_options.ApiToken))
		{
			return new(false, releases, [], "Configure an API token to use Font Awesome Pro Kits.");
		}

		try
		{
			var kits = await _cache.GetCacheItemAsync(
					$"{FontAwesomeIconPickerConstants.CacheKeyPrefix}:kits",
					async () => (IReadOnlyCollection<FontAwesomeKitResponse>?)await _apiClient.GetKitsAsync(cancellationToken),
					TimeSpan.FromMinutes(_options.FreshCacheMinutes)) ?? [];
			return new(true, releases, kits);
		}
		catch (FontAwesomeApiException exception)
		{
			_logger.LogWarning(exception, "Font Awesome Kit metadata could not be refreshed.");
			return new(true, releases, [], exception.PublicMessage);
		}
	}

	public async Task<FontAwesomeSearchResponse> SearchAsync(FontAwesomeSearchRequest request, CancellationToken cancellationToken)
	{
		Validate(request);
		var normalizedQuery = request.Query.Trim();
		var windowSize = IsUnconstrainedInitialBrowse(request, normalizedQuery)
				? _options.InitialBrowseWindowSize
				: _options.SearchWindowSize;
		var key = request.CatalogSource == FontAwesomeIconPickerConstants.FreeSource
				? $"{FontAwesomeIconPickerConstants.CacheKeyPrefix}:free:{request.ReleaseMajor}:{windowSize}:{normalizedQuery.ToLowerInvariant()}"
				: $"{FontAwesomeIconPickerConstants.CacheKeyPrefix}:kit:{request.KitToken}:{windowSize}:{normalizedQuery.ToLowerInvariant()}";

		var window = await GetWindowAsync(key, request, normalizedQuery, windowSize, cancellationToken);
		var allowed = request.AllowedIcons.Count == 0
				? null
				: request.AllowedIcons.Select(x => $"{x.Source.Trim().ToLowerInvariant()}:{x.Name.Trim().ToLowerInvariant()}").ToHashSet();
		var familyFilter = request.Families.Select(Normalize).Where(x => x.Length > 0).ToHashSet();
		var styleFilter = request.Styles.Select(Normalize).Where(x => x.Length > 0).ToHashSet();

		var candidates = window.Icons
				.Where(icon => allowed is null || allowed.Contains($"{Normalize(icon.Source)}:{Normalize(icon.Name)}"))
				.Where(icon => icon.Source == FontAwesomeIconPickerConstants.OfficialIconSource ? request.IncludeOfficial : request.IncludeCustom)
				.Select(icon => icon with
				{
					Variants = icon.Variants
								.Where(variant => familyFilter.Count == 0 || familyFilter.Contains(Normalize(variant.Family)))
								.Where(variant => styleFilter.Count == 0 || styleFilter.Contains(Normalize(variant.Style)))
								.ToArray()
				})
				.Where(icon => icon.Variants.Count > 0)
				.ToArray();

		var availableFamilies = window.Icons.SelectMany(x => x.Variants).Select(x => x.Family).Distinct(StringComparer.OrdinalIgnoreCase).Order().ToArray();
		var availableStyles = window.Icons.SelectMany(x => x.Variants).Select(x => x.Style).Distinct(StringComparer.OrdinalIgnoreCase).Order().ToArray();
		var page = Math.Min(request.Page, Math.Max(1, (int)Math.Ceiling(candidates.Length / (double)request.PageSize)));
		var items = candidates.Skip((page - 1) * request.PageSize).Take(request.PageSize)
				.Select(icon => new FontAwesomeIconResponse(
						icon.Name,
						icon.Label,
						icon.Source,
						icon.Variants.Select(variant => new FontAwesomeVariantResponse(
								variant.Family,
								variant.Style,
								variant.Prefix,
								variant.Shorthand,
								icon.Source == FontAwesomeIconPickerConstants.CustomIconSource
										? $"fa-kit fa-{icon.Name}"
										: variant.IconClass(icon.Name))).ToArray()))
				.ToArray();

		return new(items, candidates.Length, page, request.PageSize, window.Capped, window.Stale,
				availableFamilies, availableStyles,
				window.Capped ? $"Only the first {window.Icons.Count} ranked matches are available. Refine the search to see more specific results." : null);
	}

	private async Task<CatalogWindow> GetWindowAsync(
			string key,
			FontAwesomeSearchRequest request,
			string normalizedQuery,
			int windowSize,
			CancellationToken cancellationToken)
	{
		var cached = _cache.GetCacheItem<CatalogWindow>(key);
		if (cached is not null)
		{
			return cached;
		}

		try
		{
			var window = request.CatalogSource == FontAwesomeIconPickerConstants.FreeSource
					? await _apiClient.SearchFreeAsync(VersionFor(request.ReleaseMajor), normalizedQuery, windowSize, cancellationToken)
					: await _apiClient.SearchKitAsync(request.KitToken!, normalizedQuery, windowSize, cancellationToken);
			_cache.InsertCacheItem(key, () => window, TimeSpan.FromMinutes(_options.FreshCacheMinutes));
			_cache.InsertCacheItem($"{key}:stale", () => window, TimeSpan.FromMinutes(_options.StaleCacheMinutes));
			return window;
		}
		catch (FontAwesomeApiException)
		{
			var stale = _cache.GetCacheItem<CatalogWindow>($"{key}:stale");
			if (stale is null)
			{
				throw;
			}

			_logger.LogWarning("Serving stale Font Awesome catalog data because the upstream refresh failed.");
			return stale with { Stale = true };
		}
	}

	private static bool IsUnconstrainedInitialBrowse(FontAwesomeSearchRequest request, string normalizedQuery) =>
			normalizedQuery.Length == 0
			&& request.Families.Count == 0
			&& request.Styles.Count == 0
			&& request.AllowedIcons.Count == 0
			&& (request.CatalogSource == FontAwesomeIconPickerConstants.FreeSource
					|| (request.IncludeOfficial && request.IncludeCustom));

	private string VersionFor(int major) => major switch
	{
		6 => _options.FreeVersion6,
		7 => _options.FreeVersion7,
		_ => throw new FontAwesomeRequestException("Unsupported Font Awesome Free release.")
	};

	private static void Validate(FontAwesomeSearchRequest request)
	{
		if (request.Page < 1 || request.PageSize is < 1 or > 50)
		{
			throw new FontAwesomeRequestException("Page must be positive and page size must be between 1 and 50.");
		}

		if (request.Query.Length > 100)
		{
			throw new FontAwesomeRequestException("Search text cannot exceed 100 characters.");
		}

		if (request.CatalogSource is not (FontAwesomeIconPickerConstants.FreeSource or FontAwesomeIconPickerConstants.KitSource))
		{
			throw new FontAwesomeRequestException("Catalog source must be either free or kit.");
		}

		if (request.CatalogSource == FontAwesomeIconPickerConstants.KitSource && string.IsNullOrWhiteSpace(request.KitToken))
		{
			throw new FontAwesomeRequestException("A Kit must be selected for a Pro catalog.");
		}
	}

	private static string Normalize(string value) => value.Trim().ToLowerInvariant();
}
