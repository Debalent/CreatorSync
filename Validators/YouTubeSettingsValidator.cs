using CreatorSync.Configuration;

namespace CreatorSync.Validators;

/// <summary>
/// Validator for YouTube configuration settings.
/// </summary>
public sealed class YouTubeSettingsValidator : AbstractValidator<YouTubeSettings>
{
    public YouTubeSettingsValidator()
    {
        RuleFor(x => x.ApiKey)
            .NotEmpty()
            .WithMessage("YouTube API Key is required");

        RuleFor(x => x.ChannelId)
            .NotEmpty()
            .WithMessage("YouTube Channel ID is required");

        RuleFor(x => x.BaseUrl)
            .NotEmpty()
            .Must(BeAValidUrl)
            .WithMessage("YouTube Base URL must be a valid URL");

        RuleFor(x => x.MaxResults)
            .InclusiveBetween(1, 50)
            .WithMessage("Max results must be between 1 and 50");

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
