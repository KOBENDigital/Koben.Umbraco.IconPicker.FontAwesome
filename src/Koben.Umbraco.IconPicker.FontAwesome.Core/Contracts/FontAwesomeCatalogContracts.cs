using Koben.Umbraco.IconPicker.FontAwesome.Core.Constants;

namespace Koben.Umbraco.IconPicker.FontAwesome.Core.Contracts;

public sealed record FontAwesomeConfigurationResponse(
		bool ApiTokenConfigured,
		IReadOnlyCollection<FontAwesomeFreeReleaseResponse> FreeReleases,
		IReadOnlyCollection<FontAwesomeKitResponse> Kits,
		string? Warning = null);

public sealed record FontAwesomeFreeReleaseResponse(int Major, string Version, string Label);

public sealed record FontAwesomeKitResponse(
		string Token,
		string Name,
		string? Status,
		string? License,
		string? Technology,
		string? Version);

public sealed class FontAwesomeSearchRequest
{
	public string CatalogSource { get; init; } = FontAwesomeIconPickerConstants.FreeSource;
	public int ReleaseMajor { get; init; } = 7;
	public string? KitToken { get; init; }
	public string Query { get; init; } = string.Empty;
	public int Page { get; init; } = 1;
	public int PageSize { get; init; } = 24;
	public IReadOnlyCollection<string> Families { get; init; } = [];
	public IReadOnlyCollection<string> Styles { get; init; } = [];
	public IReadOnlyCollection<FontAwesomeIconIdentityRequest> AllowedIcons { get; init; } = [];
	public bool IncludeOfficial { get; init; } = true;
	public bool IncludeCustom { get; init; } = true;
}

public sealed record FontAwesomeIconIdentityRequest(string Source, string Name);

public sealed record FontAwesomeSearchResponse(
		IReadOnlyCollection<FontAwesomeIconResponse> Items,
		int Total,
		int Page,
		int PageSize,
		bool Capped,
		bool Stale,
		IReadOnlyCollection<string> AvailableFamilies,
		IReadOnlyCollection<string> AvailableStyles,
		string? Warning = null);

public sealed record FontAwesomeIconResponse(
		string Name,
		string Label,
		string Source,
		IReadOnlyCollection<FontAwesomeVariantResponse> Variants);

public sealed record FontAwesomeVariantResponse(
		string Family,
		string Style,
		string Prefix,
		string Shorthand,
		string IconClass);
