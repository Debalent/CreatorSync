namespace CreatorSync.Configuration;

/// <summary>
/// Configuration settings for YouTube API integration.
/// </summary>
public sealed class YouTubeSettings
{
    public const string SectionName = "YouTube";

    /// <summary>
    /// Gets or sets the YouTube API key.
    /// </summary>
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the default channel ID.
    /// </summary>
    public string ChannelId { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the API base URL.
    /// </summary>
    public string BaseUrl { get; set; } = "https://www.googleapis.com/youtube/v3";

    /// <summary>
    /// Gets or sets the maximum number of results per request.
    /// </summary>
    public int MaxResults { get; set; } = 50;

    /// <summary>
    /// Gets or sets the request timeout in seconds.
    /// </summary>
    public int TimeoutSeconds { get; set; } = 30;
}
