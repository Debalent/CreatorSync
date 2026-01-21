using System.Net.Http.Headers;
using System.Text.Json;
using CreatorSync.Configuration;
using CreatorSync.Exceptions;
using CreatorSync.Models;

namespace CreatorSync.Services;

/// <summary>
/// Service for interacting with the Twitch API.
/// </summary>
public sealed class TwitchApiService : ITwitchApiService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<TwitchApiService> _logger;
    private readonly TwitchSettings _settings;
    private string? _accessToken;
    private DateTime _tokenExpiration = DateTime.MinValue;

    private const string StreamsEndpoint = "streams";
    private const string ClipsEndpoint = "clips";
    private const string UsersEndpoint = "users";

    public TwitchApiService(
        HttpClient httpClient,
        IOptions<TwitchSettings> settings,
        ILogger<TwitchApiService> logger)
    {
        _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _settings = settings?.Value ?? throw new ArgumentNullException(nameof(settings));

        _httpClient.BaseAddress = new Uri(_settings.BaseUrl);
        _httpClient.Timeout = TimeSpan.FromSeconds(_settings.TimeoutSeconds);
        _httpClient.DefaultRequestHeaders.Add("Client-ID", _settings.ClientId);
    }

    /// <inheritdoc/>
    public async Task<TwitchStream?> GetStreamStatusAsync(
        string? channelName = null,
        CancellationToken cancellationToken = default)
    {
        var effectiveChannelName = channelName ?? _settings.ChannelName;
        
        if (string.IsNullOrWhiteSpace(effectiveChannelName))
        {
            throw new ArgumentException("Channel name must be provided", nameof(channelName));
        }

        _logger.LogInformation("Checking stream status for channel {ChannelName}", effectiveChannelName);

        try
        {
            await EnsureValidAccessTokenAsync(cancellationToken);

            // First, get the user ID from the channel name
            var userId = await GetUserIdAsync(effectiveChannelName, cancellationToken);
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("User not found for channel {ChannelName}", effectiveChannelName);
                return null;
            }

            var requestUri = $"{StreamsEndpoint}?user_id={userId}";
            var response = await _httpClient.GetAsync(requestUri, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError(
                    "Twitch API request failed with status {StatusCode}: {Content}",
                    response.StatusCode,
                    content);
                
                throw new ApiException(
                    $"Twitch API request failed with status {response.StatusCode}",
                    response.StatusCode,
                    content);
            }

            var jsonResponse = await response.Content.ReadAsStringAsync(cancellationToken);
            var streamResponse = JsonSerializer.Deserialize<TwitchStreamResponse>(jsonResponse);

            var streamData = streamResponse?.Data?.FirstOrDefault();
            if (streamData == null)
            {
                _logger.LogInformation("Channel {ChannelName} is not currently live", effectiveChannelName);
                return null;
            }

            var stream = new TwitchStream
            {
                StreamId = streamData.Id ?? string.Empty,
                UserId = streamData.UserId ?? string.Empty,
                UserName = streamData.UserName ?? effectiveChannelName,
                GameName = streamData.GameName ?? "Unknown",
                Title = streamData.Title ?? "Untitled Stream",
                ViewerCount = streamData.ViewerCount,
                StartedAt = streamData.StartedAt,
                ThumbnailUrl = streamData.ThumbnailUrl?.Replace("{width}", "1920").Replace("{height}", "1080") ?? string.Empty
            };

            _logger.LogInformation(
                "Channel {ChannelName} is live with {ViewerCount} viewers",
                effectiveChannelName,
                stream.ViewerCount);

            return stream;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Network error while checking stream status");
            throw new ApiException("Failed to connect to Twitch API", ex);
        }
        catch (TaskCanceledException ex) when (ex.InnerException is TimeoutException)
        {
            _logger.LogError(ex, "Twitch API request timed out");
            throw new ApiException("Twitch API request timed out", ex);
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to parse Twitch API response");
            throw new ApiException("Invalid response from Twitch API", ex);
        }
    }

    /// <inheritdoc/>
    public async Task<IReadOnlyList<TwitchClip>> GetRecentClipsAsync(
        string? channelName = null,
        int maxResults = 10,
        CancellationToken cancellationToken = default)
    {
        var effectiveChannelName = channelName ?? _settings.ChannelName;
        
        if (string.IsNullOrWhiteSpace(effectiveChannelName))
        {
            throw new ArgumentException("Channel name must be provided", nameof(channelName));
        }

        if (maxResults < 1 || maxResults > 100)
        {
            throw new ArgumentOutOfRangeException(nameof(maxResults), "Max results must be between 1 and 100");
        }

        _logger.LogInformation(
            "Fetching {MaxResults} recent clips for channel {ChannelName}",
            maxResults,
            effectiveChannelName);

        try
        {
            await EnsureValidAccessTokenAsync(cancellationToken);

            var userId = await GetUserIdAsync(effectiveChannelName, cancellationToken);
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("User not found for channel {ChannelName}", effectiveChannelName);
                return Array.Empty<TwitchClip>();
            }

            var requestUri = $"{ClipsEndpoint}?broadcaster_id={userId}&first={maxResults}";
            var response = await _httpClient.GetAsync(requestUri, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError(
                    "Failed to fetch clips. Status: {StatusCode}, Content: {Content}",
                    response.StatusCode,
                    content);
                
                throw new ApiException(
                    $"Failed to fetch clips: {response.StatusCode}",
                    response.StatusCode,
                    content);
            }

            var jsonResponse = await response.Content.ReadAsStringAsync(cancellationToken);
            var clipsResponse = JsonSerializer.Deserialize<TwitchClipsResponse>(jsonResponse);

            if (clipsResponse?.Data == null)
            {
                _logger.LogWarning("No clips found for channel {ChannelName}", effectiveChannelName);
                return Array.Empty<TwitchClip>();
            }

            var clips = clipsResponse.Data.Select(clipData => new TwitchClip
            {
                ClipId = clipData.Id ?? string.Empty,
                Title = clipData.Title ?? "Untitled Clip",
                Url = clipData.Url ?? string.Empty,
                CreatedAt = clipData.CreatedAt,
                ViewCount = clipData.ViewCount,
                ThumbnailUrl = clipData.ThumbnailUrl ?? string.Empty,
                CreatorName = clipData.CreatorName ?? "Unknown"
            }).ToList();

            _logger.LogInformation(
                "Successfully fetched {Count} clips for channel {ChannelName}",
                clips.Count,
                effectiveChannelName);

            return clips.AsReadOnly();
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Network error while fetching clips");
            throw new ApiException("Failed to connect to Twitch API", ex);
        }
        catch (TaskCanceledException ex) when (ex.InnerException is TimeoutException)
        {
            _logger.LogError(ex, "Request timed out while fetching clips");
            throw new ApiException("Twitch API request timed out", ex);
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to parse clips response");
            throw new ApiException("Invalid response from Twitch API", ex);
        }
    }

    private async Task EnsureValidAccessTokenAsync(CancellationToken cancellationToken)
    {
        if (!string.IsNullOrEmpty(_accessToken) && DateTime.UtcNow < _tokenExpiration)
        {
            return;
        }

        _logger.LogInformation("Obtaining new Twitch access token");

        try
        {
            using var authClient = new HttpClient { BaseAddress = new Uri(_settings.AuthUrl) };
            
            var requestUri = $"token?client_id={_settings.ClientId}" +
                           $"&client_secret={_settings.ClientSecret}" +
                           "&grant_type=client_credentials";

            var response = await authClient.PostAsync(requestUri, null, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError("Failed to obtain access token. Status: {StatusCode}, Content: {Content}",
                    response.StatusCode, content);
                throw new ApiException($"Failed to authenticate with Twitch: {response.StatusCode}",
                    response.StatusCode, content);
            }

            var jsonResponse = await response.Content.ReadAsStringAsync(cancellationToken);
            var tokenResponse = JsonSerializer.Deserialize<TwitchTokenResponse>(jsonResponse);

            if (tokenResponse?.AccessToken == null)
            {
                throw new ApiException("Received invalid token response from Twitch");
            }

            _accessToken = tokenResponse.AccessToken;
            _tokenExpiration = DateTime.UtcNow.AddSeconds(tokenResponse.ExpiresIn - 300); // Refresh 5 minutes early

            _httpClient.DefaultRequestHeaders.Authorization = 
                new AuthenticationHeaderValue("Bearer", _accessToken);

            _logger.LogInformation("Successfully obtained Twitch access token");
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Network error while obtaining access token");
            throw new ApiException("Failed to authenticate with Twitch", ex);
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to parse token response");
            throw new ApiException("Invalid token response from Twitch", ex);
        }
    }

    private async Task<string?> GetUserIdAsync(string userName, CancellationToken cancellationToken)
    {
        var requestUri = $"{UsersEndpoint}?login={userName}";
        var response = await _httpClient.GetAsync(requestUri, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Failed to get user ID for {UserName}", userName);
            return null;
        }

        var jsonResponse = await response.Content.ReadAsStringAsync(cancellationToken);
        var userResponse = JsonSerializer.Deserialize<TwitchUserResponse>(jsonResponse);

        return userResponse?.Data?.FirstOrDefault()?.Id;
    }

    // Internal classes for JSON deserialization
    private class TwitchTokenResponse
    {
        [JsonPropertyName("access_token")]
        public string? AccessToken { get; set; }

        [JsonPropertyName("expires_in")]
        public int ExpiresIn { get; set; }
    }

    private class TwitchStreamResponse
    {
        [JsonPropertyName("data")]
        public List<StreamData>? Data { get; set; }
    }

    private class StreamData
    {
        [JsonPropertyName("id")]
        public string? Id { get; set; }

        [JsonPropertyName("user_id")]
        public string? UserId { get; set; }

        [JsonPropertyName("user_name")]
        public string? UserName { get; set; }

        [JsonPropertyName("game_name")]
        public string? GameName { get; set; }

        [JsonPropertyName("title")]
        public string? Title { get; set; }

        [JsonPropertyName("viewer_count")]
        public int ViewerCount { get; set; }

        [JsonPropertyName("started_at")]
        public DateTime StartedAt { get; set; }

        [JsonPropertyName("thumbnail_url")]
        public string? ThumbnailUrl { get; set; }
    }

    private class TwitchClipsResponse
    {
        [JsonPropertyName("data")]
        public List<ClipData>? Data { get; set; }
    }

    private class ClipData
    {
        [JsonPropertyName("id")]
        public string? Id { get; set; }

        [JsonPropertyName("url")]
        public string? Url { get; set; }

        [JsonPropertyName("title")]
        public string? Title { get; set; }

        [JsonPropertyName("view_count")]
        public int ViewCount { get; set; }

        [JsonPropertyName("created_at")]
        public DateTime CreatedAt { get; set; }

        [JsonPropertyName("thumbnail_url")]
        public string? ThumbnailUrl { get; set; }

        [JsonPropertyName("creator_name")]
        public string? CreatorName { get; set; }
    }

    private class TwitchUserResponse
    {
        [JsonPropertyName("data")]
        public List<UserData>? Data { get; set; }
    }

    private class UserData
    {
        [JsonPropertyName("id")]
        public string? Id { get; set; }
    }
}
