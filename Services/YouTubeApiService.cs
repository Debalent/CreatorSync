using System.Net;
using System.Text.Json;
using CreatorSync.Configuration;
using CreatorSync.Exceptions;
using CreatorSync.Models;

namespace CreatorSync.Services;

/// <summary>
/// Service for interacting with the YouTube Data API.
/// </summary>
public sealed class YouTubeApiService : IYouTubeApiService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<YouTubeApiService> _logger;
    private readonly YouTubeSettings _settings;

    private const string SearchEndpoint = "search";
    private const string VideosEndpoint = "videos";

    public YouTubeApiService(
        HttpClient httpClient,
        IOptions<YouTubeSettings> settings,
        ILogger<YouTubeApiService> logger)
    {
        _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _settings = settings?.Value ?? throw new ArgumentNullException(nameof(settings));

        _httpClient.BaseAddress = new Uri(_settings.BaseUrl);
        _httpClient.Timeout = TimeSpan.FromSeconds(_settings.TimeoutSeconds);
    }

    /// <inheritdoc/>
    public async Task<IReadOnlyList<YouTubeVideo>> GetRecentVideosAsync(
        string? channelId = null,
        int maxResults = 10,
        CancellationToken cancellationToken = default)
    {
        var effectiveChannelId = channelId ?? _settings.ChannelId;
        
        if (string.IsNullOrWhiteSpace(effectiveChannelId))
        {
            throw new ArgumentException("Channel ID must be provided", nameof(channelId));
        }

        if (maxResults < 1 || maxResults > _settings.MaxResults)
        {
            throw new ArgumentOutOfRangeException(
                nameof(maxResults), 
                $"Max results must be between 1 and {_settings.MaxResults}");
        }

        _logger.LogInformation(
            "Fetching {MaxResults} recent videos for channel {ChannelId}", 
            maxResults, 
            effectiveChannelId);

        try
        {
            var queryParams = new Dictionary<string, string>
            {
                ["part"] = "snippet",
                ["channelId"] = effectiveChannelId,
                ["maxResults"] = maxResults.ToString(),
                ["order"] = "date",
                ["type"] = "video",
                ["key"] = _settings.ApiKey
            };

            var queryString = string.Join("&", queryParams.Select(kvp => $"{kvp.Key}={Uri.EscapeDataString(kvp.Value)}"));
            var requestUri = $"{SearchEndpoint}?{queryString}";

            var response = await _httpClient.GetAsync(requestUri, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError(
                    "YouTube API request failed with status {StatusCode}: {Content}", 
                    response.StatusCode, 
                    content);
                
                throw new ApiException(
                    $"YouTube API request failed with status {response.StatusCode}",
                    response.StatusCode,
                    content);
            }

            var jsonResponse = await response.Content.ReadAsStringAsync(cancellationToken);
            var searchResult = JsonSerializer.Deserialize<YouTubeSearchResponse>(jsonResponse);

            if (searchResult?.Items == null)
            {
                _logger.LogWarning("YouTube API returned null or empty response");
                return Array.Empty<YouTubeVideo>();
            }

            var videos = searchResult.Items.Select(item => new YouTubeVideo
            {
                VideoId = item.Id?.VideoId ?? string.Empty,
                Title = item.Snippet?.Title ?? "Untitled",
                Description = item.Snippet?.Description ?? string.Empty,
                PublishedAt = item.Snippet?.PublishedAt ?? DateTime.MinValue,
                ThumbnailUrl = item.Snippet?.Thumbnails?.High?.Url ?? string.Empty
            }).ToList();

            _logger.LogInformation(
                "Successfully fetched {Count} videos for channel {ChannelId}", 
                videos.Count, 
                effectiveChannelId);

            return videos.AsReadOnly();
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Network error while fetching YouTube videos");
            throw new ApiException("Failed to connect to YouTube API", ex);
        }
        catch (TaskCanceledException ex) when (ex.InnerException is TimeoutException)
        {
            _logger.LogError(ex, "YouTube API request timed out");
            throw new ApiException("YouTube API request timed out", ex);
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to parse YouTube API response");
            throw new ApiException("Invalid response from YouTube API", ex);
        }
    }

    /// <inheritdoc/>
    public async Task<VideoStatistics?> GetVideoStatisticsAsync(
        string videoId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(videoId))
        {
            throw new ArgumentException("Video ID cannot be null or empty", nameof(videoId));
        }

        _logger.LogInformation("Fetching statistics for video {VideoId}", videoId);

        try
        {
            var queryParams = new Dictionary<string, string>
            {
                ["part"] = "statistics",
                ["id"] = videoId,
                ["key"] = _settings.ApiKey
            };

            var queryString = string.Join("&", queryParams.Select(kvp => $"{kvp.Key}={Uri.EscapeDataString(kvp.Value)}"));
            var requestUri = $"{VideosEndpoint}?{queryString}";

            var response = await _httpClient.GetAsync(requestUri, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError(
                    "Failed to fetch video statistics. Status: {StatusCode}, Content: {Content}",
                    response.StatusCode,
                    content);
                
                throw new ApiException(
                    $"Failed to fetch video statistics: {response.StatusCode}",
                    response.StatusCode,
                    content);
            }

            var jsonResponse = await response.Content.ReadAsStringAsync(cancellationToken);
            var videoResponse = JsonSerializer.Deserialize<YouTubeVideoResponse>(jsonResponse);

            var stats = videoResponse?.Items?.FirstOrDefault()?.Statistics;
            
            if (stats == null)
            {
                _logger.LogWarning("No statistics found for video {VideoId}", videoId);
                return null;
            }

            _logger.LogInformation("Successfully fetched statistics for video {VideoId}", videoId);
            return stats;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Network error while fetching video statistics");
            throw new ApiException("Failed to connect to YouTube API", ex);
        }
        catch (TaskCanceledException ex) when (ex.InnerException is TimeoutException)
        {
            _logger.LogError(ex, "Request timed out while fetching video statistics");
            throw new ApiException("YouTube API request timed out", ex);
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to parse video statistics response");
            throw new ApiException("Invalid response from YouTube API", ex);
        }
    }

    // Internal classes for JSON deserialization
    private class YouTubeSearchResponse
    {
        public List<SearchItem>? Items { get; set; }
    }

    private class SearchItem
    {
        public VideoId? Id { get; set; }
        public Snippet? Snippet { get; set; }
    }

    private class VideoId
    {
        public string? VideoId { get; set; }
    }

    private class Snippet
    {
        public string? Title { get; set; }
        public string? Description { get; set; }
        public DateTime PublishedAt { get; set; }
        public Thumbnails? Thumbnails { get; set; }
    }

    private class Thumbnails
    {
        public Thumbnail? High { get; set; }
    }

    private class Thumbnail
    {
        public string? Url { get; set; }
    }

    private class YouTubeVideoResponse
    {
        public List<VideoItem>? Items { get; set; }
    }

    private class VideoItem
    {
        public VideoStatistics? Statistics { get; set; }
    }
}
