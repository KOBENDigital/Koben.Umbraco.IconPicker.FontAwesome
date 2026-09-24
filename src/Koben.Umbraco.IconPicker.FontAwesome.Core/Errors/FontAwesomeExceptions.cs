namespace Koben.Umbraco.IconPicker.FontAwesome.Core.Errors;

public sealed class FontAwesomeRequestException(string message) : Exception(message);

public sealed class FontAwesomeApiException(string publicMessage) : Exception(publicMessage)
{
	public string PublicMessage { get; } = publicMessage;
}