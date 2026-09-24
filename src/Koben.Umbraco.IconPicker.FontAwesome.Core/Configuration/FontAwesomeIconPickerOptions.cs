namespace Koben.Umbraco.IconPicker.FontAwesome.Core.Configuration;

public sealed class FontAwesomeIconPickerOptions
{
	public string? ApiToken { get; set; }

	public Uri GraphQlEndpoint { get; set; } = new("https://api.fontawesome.com");

	public Uri TokenEndpoint { get; set; } = new("https://api.fontawesome.com/token");

	public string FreeVersion6 { get; set; } = "6.7.2";

	public string FreeVersion7 { get; set; } = "7.2.0";

	public int InitialBrowseWindowSize { get; set; } = 50;

	public int SearchWindowSize { get; set; } = 500;

	public int FreshCacheMinutes { get; set; } = 5;

	public int StaleCacheMinutes { get; set; } = 60;
}