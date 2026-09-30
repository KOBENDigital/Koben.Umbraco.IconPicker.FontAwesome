using Koben.Umbraco.IconPicker.FontAwesome.Core.Configuration;
using Koben.Umbraco.IconPicker.FontAwesome.Core.Constants;
using Koben.Umbraco.IconPicker.FontAwesome.Core.Services;
using Koben.Umbraco.IconPicker.FontAwesome.Core.Services.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Umbraco.Cms.Api.Common.OpenApi;
using Umbraco.Cms.Api.Management.OpenApi;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;

namespace Koben.Umbraco.IconPicker.FontAwesome.Core.Composition;

public sealed class FontAwesomeIconPickerComposer : IComposer
{
	public void Compose(IUmbracoBuilder builder)
	{
		builder.Services.AddOptions<FontAwesomeIconPickerOptions>()
				.BindConfiguration(FontAwesomeIconPickerConstants.ConfigurationSection)
				.Validate(options => options.InitialBrowseWindowSize is >= 24 and <= 50,
						"InitialBrowseWindowSize must be between 24 and 50.")
				.Validate(options => options.SearchWindowSize is >= 50 and <= 500, "SearchWindowSize must be between 50 and 500.")
				.Validate(options => options.FreshCacheMinutes > 0 && options.StaleCacheMinutes >= options.FreshCacheMinutes,
						"Cache durations must be positive and stale cache duration cannot be shorter than fresh cache duration.")
				.ValidateOnStart();
		builder.Services.AddHttpClient<IFontAwesomeApiClient, FontAwesomeApiClient>();
		builder.Services.AddScoped<IFontAwesomeCatalogService, FontAwesomeCatalogService>();
		builder.AddBackOfficeOpenApiDocument(
				FontAwesomeIconPickerConstants.ApiName,
				document => document
						.WithTitle("Font Awesome Icon Picker API")
						.WithBackOfficeAuthentication());
	}
}
