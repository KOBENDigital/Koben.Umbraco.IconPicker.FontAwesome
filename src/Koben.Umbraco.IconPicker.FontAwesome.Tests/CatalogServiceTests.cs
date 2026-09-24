using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Cache;
using Koben.Umbraco.IconPicker.FontAwesome.Core;
using Koben.Umbraco.IconPicker.FontAwesome.Core.Configuration;
using Koben.Umbraco.IconPicker.FontAwesome.Core.Contracts;
using Koben.Umbraco.IconPicker.FontAwesome.Core.Errors;
using Koben.Umbraco.IconPicker.FontAwesome.Core.Models;
using Koben.Umbraco.IconPicker.FontAwesome.Core.Services;
using Koben.Umbraco.IconPicker.FontAwesome.Core.Services.Interfaces;

namespace Koben.Umbraco.IconPicker.FontAwesome.Tests;

public sealed class CatalogServiceTests
{
	[Fact]
	public async Task SearchBuildsCanonicalClassesForClassicSharpAndCustomIcons()
	{
		var service = CreateService(
				new CatalogIcon("house", "House", "official",
				[
						new CatalogVariant("classic", "solid", "fas", "solid"),
								new CatalogVariant("sharp", "solid", "fass", "sharp-solid")
				]),
				new CatalogIcon("company-logo", "Company Logo", "custom",
				[
						new CatalogVariant("kit", "custom", "fak", "kit")
				]));

		var result = await service.SearchAsync(new FontAwesomeSearchRequest(), CancellationToken.None);

		Assert.Equal("fa-solid fa-house", result.Items.Single(x => x.Name == "house").Variants.First().IconClass);
		Assert.Equal("fa-sharp fa-solid fa-house", result.Items.Single(x => x.Name == "house").Variants.Last().IconClass);
		Assert.Equal("fa-kit fa-company-logo", result.Items.Single(x => x.Name == "company-logo").Variants.Single().IconClass);
	}

	[Fact]
	public async Task SearchAppliesPolicyBeforePagination()
	{
		var service = CreateService(
				new CatalogIcon("house", "House", "official", [new CatalogVariant("classic", "solid", "fas", "solid")]),
				new CatalogIcon("user", "User", "official", [new CatalogVariant("sharp", "regular", "fasr", "sharp-regular")]),
				new CatalogIcon("star", "Star", "official", [new CatalogVariant("sharp", "solid", "fass", "sharp-solid")]));

		var result = await service.SearchAsync(new FontAwesomeSearchRequest
		{
			PageSize = 1,
			Families = ["sharp"],
			Styles = ["solid"],
			AllowedIcons = [new FontAwesomeIconIdentityRequest("official", "star")]
		}, CancellationToken.None);

		Assert.Equal(1, result.Total);
		Assert.Equal("star", result.Items.Single().Name);
		Assert.Equal(["classic", "sharp"], result.AvailableFamilies);
		Assert.Equal(["regular", "solid"], result.AvailableStyles);
	}

	[Fact]
	public async Task ProSearchRequiresAKit()
	{
		var service = CreateService();

		var exception = await Assert.ThrowsAsync<FontAwesomeRequestException>(() =>
				service.SearchAsync(new FontAwesomeSearchRequest { CatalogSource = "kit" }, CancellationToken.None));

		Assert.Contains("Kit", exception.Message);
	}

	[Fact]
	public async Task SearchUsesSmallerWindowOnlyForUnconstrainedInitialBrowse()
	{
		var client = new FakeApiClient(new CatalogWindow([], false));
		var service = CreateService(client);

		await service.SearchAsync(new FontAwesomeSearchRequest(), CancellationToken.None);
		Assert.Equal(50, client.LastLimit);

		await service.SearchAsync(new FontAwesomeSearchRequest { Query = "email" }, CancellationToken.None);
		Assert.Equal(500, client.LastLimit);

		await service.SearchAsync(new FontAwesomeSearchRequest { Families = ["sharp"] }, CancellationToken.None);
		Assert.Equal(500, client.LastLimit);
	}

	private static FontAwesomeCatalogService CreateService(params CatalogIcon[] icons)
	{
		var client = new FakeApiClient(new CatalogWindow(icons, false));
		return CreateService(client);
	}

	private static FontAwesomeCatalogService CreateService(FakeApiClient client)
	{
		return new FontAwesomeCatalogService(
				client,
				new ObjectCacheAppCache(),
				Options.Create(new FontAwesomeIconPickerOptions()),
				NullLogger<FontAwesomeCatalogService>.Instance);
	}

	private sealed class FakeApiClient(CatalogWindow window) : IFontAwesomeApiClient
	{
		public int LastLimit { get; private set; }

		public Task<IReadOnlyCollection<FontAwesomeKitResponse>> GetKitsAsync(CancellationToken cancellationToken) =>
				Task.FromResult<IReadOnlyCollection<FontAwesomeKitResponse>>([]);

		public Task<CatalogWindow> SearchFreeAsync(string version, string query, int limit, CancellationToken cancellationToken)
		{
			LastLimit = limit;
			return Task.FromResult(window);
		}

		public Task<CatalogWindow> SearchKitAsync(string kitToken, string query, int limit, CancellationToken cancellationToken)
		{
			LastLimit = limit;
			return Task.FromResult(window);
		}
	}
}
