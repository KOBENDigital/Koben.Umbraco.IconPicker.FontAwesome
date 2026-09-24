using Koben.Umbraco.IconPicker.FontAwesome.Core.Contracts;

namespace Koben.Umbraco.IconPicker.FontAwesome.Core.Services.Interfaces;

public interface IFontAwesomeCatalogService
{
	Task<FontAwesomeConfigurationResponse> GetConfigurationAsync(CancellationToken cancellationToken);

	Task<FontAwesomeSearchResponse> SearchAsync(FontAwesomeSearchRequest request, CancellationToken cancellationToken);
}