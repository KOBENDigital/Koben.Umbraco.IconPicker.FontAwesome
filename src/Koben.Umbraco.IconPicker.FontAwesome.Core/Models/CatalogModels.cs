namespace Koben.Umbraco.IconPicker.FontAwesome.Core.Models;

internal sealed record CatalogIcon(
	string Name,
	string Label,
	string Source,
	IReadOnlyCollection<CatalogVariant> Variants);

internal sealed record CatalogVariant(string Family, string Style, string Prefix, string Shorthand)
{
	public string IconClass(string iconName) =>
		string.Equals(Family, "classic", StringComparison.OrdinalIgnoreCase)
			? $"fa-{Style} fa-{iconName}"
			: $"fa-{Family} fa-{Style} fa-{iconName}";
}

internal sealed record CatalogWindow(IReadOnlyCollection<CatalogIcon> Icons, bool Capped, bool Stale = false);