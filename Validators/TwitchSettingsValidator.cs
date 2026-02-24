using CreatorSync.Configuration;

namespace CreatorSync.Validators;

/// <summary>
/// Validator for Twitch configuration settings.
/// </summary>
public sealed class TwitchSettingsValidator : AbstractValidator<TwitchSettings>
{
    public TwitchSettingsValidator()
    {
        RuleFor(x => x.ClientId)
            .NotEmpty()
            .WithMessage("Twitch Client ID is required");

        RuleFor(x => x.ClientSecret)
            .NotEmpty()
            .WithMessage("Twitch Client Secret is required");

        RuleFor(x => x.ChannelName)
            .NotEmpty()
            .WithMessage("Twitch Channel Name is required");

        RuleFor(x => x.BaseUrl)
            .NotEmpty()
            .Must(BeAValidUrl)
            .WithMessage("Twitch Base URL must be a valid URL");

        RuleFor(x => x.TimeoutSeconds)
            .GreaterThan(0)
            .WithMessage("Timeout must be greater than 0 seconds");
    }

    private bool BeAValidUrl(string url)
    {
        return Uri.TryCreate(url, UriKind.Absolute, out var uriResult)
            && (uriResult.Scheme == Uri.UriSchemeHttp || uriResult.Scheme == Uri.UriSchemeHttps);
    }
}
