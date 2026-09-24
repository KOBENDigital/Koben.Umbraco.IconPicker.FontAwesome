using Koben.Umbraco.IconPicker.FontAwesome.Core.Contracts;
using Koben.Umbraco.IconPicker.FontAwesome.Core.Models;

namespace Koben.Umbraco.IconPicker.FontAwesome.Core.Services.Interfaces;

internal interface IFontAwesomeApiClient
{
	Task<IReadOnlyCollection<FontAwesomeKitResponse>> GetKitsAsync(CancellationToken cancellationToken);

	Task<CatalogWindow> SearchFreeAsync(string version, string query, int limit, CancellationToken cancellationToken);

	Task<CatalogWindow> SearchKitAsync(string kitToken, string query, int limit, CancellationToken cancellationToken);
}