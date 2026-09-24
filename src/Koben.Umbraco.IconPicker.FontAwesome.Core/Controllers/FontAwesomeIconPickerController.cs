using Koben.Umbraco.IconPicker.FontAwesome.Core.Constants;
using Koben.Umbraco.IconPicker.FontAwesome.Core.Contracts;
using Koben.Umbraco.IconPicker.FontAwesome.Core.Errors;
using Koben.Umbraco.IconPicker.FontAwesome.Core.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Api.Common.Attributes;
using Umbraco.Cms.Api.Management.Controllers;
using Umbraco.Cms.Api.Management.Routing;

namespace Koben.Umbraco.IconPicker.FontAwesome.Core.Controllers;

[ApiController]
[MapToApi(FontAwesomeIconPickerConstants.ApiName)]
[VersionedApiBackOfficeRoute("font-awesome-icon-picker")]
public sealed class FontAwesomeIconPickerController(IFontAwesomeCatalogService catalogService) : ManagementApiControllerBase
{
	[HttpGet("configuration")]
	[ProducesResponseType(typeof(FontAwesomeConfigurationResponse), StatusCodes.Status200OK)]
	public async Task<ActionResult<FontAwesomeConfigurationResponse>> GetConfiguration(CancellationToken cancellationToken) =>
			Ok(await catalogService.GetConfigurationAsync(cancellationToken));

	[HttpPost("search")]
	[ProducesResponseType(typeof(FontAwesomeSearchResponse), StatusCodes.Status200OK)]
	[ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
	[ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status502BadGateway)]
	public async Task<ActionResult<FontAwesomeSearchResponse>> Search(
			[FromBody] FontAwesomeSearchRequest request,
			CancellationToken cancellationToken)
	{
		try
		{
			return Ok(await catalogService.SearchAsync(request, cancellationToken));
		}
		catch (FontAwesomeRequestException exception)
		{
			return BadRequest(Problem(title: "Invalid icon search", detail: exception.Message, statusCode: StatusCodes.Status400BadRequest));
		}
		catch (FontAwesomeApiException exception)
		{
			return StatusCode(
				StatusCodes.Status502BadGateway,
				Problem(title: "Font Awesome is unavailable", detail: exception.PublicMessage, statusCode: StatusCodes.Status502BadGateway)
			);
		}
	}
}
