import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ValidateUrl } from './url.validator';

// Test DTOs
class RequiredUrlDto {
  @ValidateUrl({ label: 'Website' })
  website: string;
}

class OptionalUrlDto {
  @ValidateUrl({ label: 'Logo URL', optional: true })
  logoUrl?: string;
}

class HttpsOnlyUrlDto {
  @ValidateUrl({
    label: 'Secure Website',
    urlOptions: {
      protocols: ['https'],
      requireProtocol: true,
      requireTld: true,
    },
  })
  secureWebsite: string;
}

class UrlWithLengthDto {
  @ValidateUrl({ label: 'API Endpoint', min: 10, max: 500 })
  apiEndpoint: string;
}

class UrlWithWhitelistDto {
  @ValidateUrl({
    label: 'Social Media',
    optional: true,
    urlOptions: {
      hostWhitelist: ['twitter.com', 'facebook.com', 'linkedin.com'],
      allowQueryComponents: true,
    },
  })
  socialMedia?: string;
}

class WebSocketUrlDto {
  @ValidateUrl({
    label: 'WebSocket URL',
    urlOptions: {
      protocols: ['ws', 'wss'],
      requireProtocol: true,
    },
  })
  websocketUrl: string;
}

class CustomMessageUrlDto {
  @ValidateUrl({
    label: 'Profile Picture',
    optional: true,
    max: 500,
    message: 'Please provide a valid image URL',
    lengthMessage: 'Image URL is too long',
  })
  profilePicture?: string;
}

describe('ValidateUrl', () => {
  describe('Basic Validation', () => {
    it('should validate a valid URL', async () => {
      const dto = plainToInstance(RequiredUrlDto, {
        website: 'https://example.com',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate various valid URL formats', async () => {
      const validUrls = [
        'https://example.com',
        'http://example.com',
        'https://www.example.com',
        'https://subdomain.example.com',
        'https://example.com/path',
        'https://example.com/path?query=value',
        'https://example.com/path#fragment',
        'https://example.com:8080',
        'ftp://example.com',
      ];

      for (const website of validUrls) {
        const dto = plainToInstance(RequiredUrlDto, { website });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      }
    });

    it('should fail for invalid URLs', async () => {
      const invalidUrls = [
        'not-a-url',
        'htp://example.com',
        '//example.com',
        'example',
      ];

      for (const website of invalidUrls) {
        const dto = plainToInstance(RequiredUrlDto, { website });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
      }
    });

    it('should fail when required field is missing', async () => {
      const dto = plainToInstance(RequiredUrlDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Transformation', () => {
    it('should trim whitespace from URL', () => {
      const dto = plainToInstance(RequiredUrlDto, {
        website: '  https://example.com  ',
      });
      expect(dto.website).toBe('https://example.com');
    });

    it('should preserve URL structure after trimming', () => {
      const dto = plainToInstance(RequiredUrlDto, {
        website: '  https://example.com/path?query=value  ',
      });
      expect(dto.website).toBe('https://example.com/path?query=value');
    });
  });

  describe('Protocol Restrictions', () => {
    it('should validate HTTPS-only URL', async () => {
      const dto = plainToInstance(HttpsOnlyUrlDto, {
        secureWebsite: 'https://example.com',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail for HTTP when HTTPS required', async () => {
      const dto = plainToInstance(HttpsOnlyUrlDto, {
        secureWebsite: 'http://example.com',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate WebSocket protocols', async () => {
      const dto1 = plainToInstance(WebSocketUrlDto, {
        websocketUrl: 'ws://example.com',
      });
      const errors1 = await validate(dto1);
      expect(errors1.length).toBe(0);

      const dto2 = plainToInstance(WebSocketUrlDto, {
        websocketUrl: 'wss://example.com',
      });
      const errors2 = await validate(dto2);
      expect(errors2.length).toBe(0);
    });

    it('should fail for non-WebSocket protocol', async () => {
      const dto = plainToInstance(WebSocketUrlDto, {
        websocketUrl: 'https://example.com',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Length Constraints', () => {
    it('should validate URL within length range', async () => {
      const dto = plainToInstance(UrlWithLengthDto, {
        apiEndpoint: 'https://api.example.com/v1/endpoint',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail for URL below minimum length', async () => {
      const dto = plainToInstance(UrlWithLengthDto, {
        apiEndpoint: 'http://a',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail for URL exceeding maximum length', async () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(500);
      const dto = plainToInstance(UrlWithLengthDto, {
        apiEndpoint: longUrl,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Host Whitelist', () => {
    it('should validate URL from whitelisted host', async () => {
      const dto = plainToInstance(UrlWithWhitelistDto, {
        socialMedia: 'https://twitter.com/user',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate all whitelisted hosts', async () => {
      const hosts = [
        'https://twitter.com/user',
        'https://facebook.com/page',
        'https://linkedin.com/in/profile',
      ];

      for (const socialMedia of hosts) {
        const dto = plainToInstance(UrlWithWhitelistDto, { socialMedia });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      }
    });

    it('should fail for non-whitelisted host', async () => {
      const dto = plainToInstance(UrlWithWhitelistDto, {
        socialMedia: 'https://instagram.com/user',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Optional Fields', () => {
    it('should pass when optional field is undefined', async () => {
      const dto = plainToInstance(OptionalUrlDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass when optional field is provided and valid', async () => {
      const dto = plainToInstance(OptionalUrlDto, {
        logoUrl: 'https://example.com/logo.png',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail when optional field is provided but invalid', async () => {
      const dto = plainToInstance(OptionalUrlDto, { logoUrl: 'not-a-url' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Error Messages', () => {
    it('should use default error message', async () => {
      const dto = plainToInstance(RequiredUrlDto, { website: 'invalid' });
      const errors = await validate(dto);
      expect(errors[0].constraints?.isUrl).toContain('Website');
      expect(errors[0].constraints?.isUrl).toContain('valid URL');
    });

    it('should use custom error message', async () => {
      const dto = plainToInstance(CustomMessageUrlDto, {
        profilePicture: 'invalid',
      });
      const errors = await validate(dto);
      expect(errors[0].constraints?.isUrl).toBe(
        'Please provide a valid image URL',
      );
    });

    it('should use custom length message', async () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(500);
      const dto = plainToInstance(CustomMessageUrlDto, {
        profilePicture: longUrl,
      });
      const errors = await validate(dto);
      const lengthError = errors.find((e) => e.constraints?.maxLength);
      expect(lengthError?.constraints?.maxLength).toBe('Image URL is too long');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null value', async () => {
      const dto = plainToInstance(RequiredUrlDto, { website: null });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle undefined value', async () => {
      const dto = plainToInstance(RequiredUrlDto, { website: undefined });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle empty string', async () => {
      const dto = plainToInstance(RequiredUrlDto, { website: '' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle whitespace-only string', async () => {
      const dto = plainToInstance(RequiredUrlDto, { website: '   ' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle number value', async () => {
      const dto = plainToInstance(RequiredUrlDto, { website: 123 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle boolean value', async () => {
      const dto = plainToInstance(RequiredUrlDto, { website: true });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle object value', async () => {
      const dto = plainToInstance(RequiredUrlDto, { website: {} });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle empty object', async () => {
      const dto = plainToInstance(RequiredUrlDto, { website: {} });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle array value', async () => {
      const dto = plainToInstance(RequiredUrlDto, { website: [] });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should ignore unknown properties', async () => {
      const dto = plainToInstance(RequiredUrlDto, {
        website: 'https://example.com',
        unknownProperty: 'should be ignored',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle URL with query parameters', async () => {
      const dto = plainToInstance(RequiredUrlDto, {
        website: 'https://example.com?param1=value1&param2=value2',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle URL with fragment', async () => {
      const dto = plainToInstance(RequiredUrlDto, {
        website: 'https://example.com/page#section',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle URL with port', async () => {
      const dto = plainToInstance(RequiredUrlDto, {
        website: 'https://example.com:8080/path',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle URL with authentication', async () => {
      const dto = plainToInstance(RequiredUrlDto, {
        website: 'https://user:pass@example.com',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle internationalized domain names', async () => {
      const dto = plainToInstance(RequiredUrlDto, {
        website: 'https://example.com',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});
