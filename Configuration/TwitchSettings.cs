namespace CreatorSync.Configuration;

/// <summary>
/// Configuration settings for Twitch API integration.
/// </summary>
public sealed class TwitchSettings
{
    public const string SectionName = "Twitch";

    /// <summary>
    /// Gets or sets the Twitch Client ID.
    /// </summary>
    public string ClientId { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the Twitch Client Secret.
    /// </summary>
    public string ClientSecret { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the Twitch channel name.
    /// </summary>
    public string ChannelName { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the API base URL.
    /// </summary>
    public string BaseUrl { get; set; } = "https://api.twitch.tv/helix";

    /// <summary>
    /// Gets or sets the auth base URL.
    /// </summary>
    public string AuthUrl { get; set; } = "https://id.twitch.tv/oauth2";

    /// <summary>
    /// Gets or sets the request timeout in seconds.
    /// </summary>
    public int TimeoutSeconds { get; set; } = 30;
}
