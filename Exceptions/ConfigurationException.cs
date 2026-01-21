namespace CreatorSync.Exceptions;

/// <summary>
/// Exception thrown when configuration is invalid.
/// </summary>
public class ConfigurationException : Exception
{
    public ConfigurationException(string message) : base(message)
    {
    }

    public ConfigurationException(string message, Exception innerException) 
        : base(message, innerException)
    {
    }
}
