// src/utils/imageOptimization.js
// Utility per ottimizzazione immagini globale

export class ImageOptimizer {
  static formats = ['webp', 'avif', 'jpg', 'png'];
  static qualities = {
    high: 90,
    medium: 80,
    low: 60
  };

  static sizes = {
    thumbnail: { width: 150, height: 150 },
    small: { width: 300, height: 300 },
    medium: { width: 600, height: 600 },
    large: { width: 1200, height: 1200 },
    profile: { width: 200, height: 200 },
    avatar: { width: 80, height: 80 }
  };

  static generateOptimizedUrl(originalUrl, options = {}) {
    if (!originalUrl) return originalUrl;

    const {
      width,
      height,
      quality = 'medium',
      format = 'webp',
      fit = 'cover'
    } = options;

    // Se è un URL esterno, ritorna così com'è
    if (originalUrl.startsWith('http') && !originalUrl.includes(window.location.hostname)) {
      return originalUrl;
    }

    try {
      const url = new URL(originalUrl, window.location.origin);
      
      if (width) url.searchParams.set('w', width.toString());
      if (height) url.searchParams.set('h', height.toString());
      if (quality) {
        const qualityValue = typeof quality === 'string' ? this.qualities[quality] : quality;
        url.searchParams.set('q', qualityValue.toString());
      }
      if (format) url.searchParams.set('fm', format);
      if (fit) url.searchParams.set('fit', fit);

      return url.toString();
    } catch (error) {
      console.warn('Invalid URL for optimization:', originalUrl);
      return originalUrl;
    }
  }

  static generateSrcSet(originalUrl, options = {}) {
    if (!originalUrl) return '';

    const { quality = 'medium', format = 'webp' } = options;
    const densities = [1, 2, 3];
    
    return densities
      .map(density => {
        const scaledWidth = options.width ? Math.round(options.width * density) : undefined;
        const scaledHeight = options.height ? Math.round(options.height * density) : undefined;
        
        const optimizedUrl = this.generateOptimizedUrl(originalUrl, {
          ...options,
          width: scaledWidth,
          height: scaledHeight,
          quality,
          format
        });
        
        return `${optimizedUrl} ${density}x`;
      })
      .join(', ');
  }

  static async preloadImage(url, options = {}) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => resolve(img);
      img.onerror = reject;
      
      // Imposta attributi per ottimizzazione
      if (options.crossOrigin) img.crossOrigin = options.crossOrigin;
      if (options.decoding) img.decoding = options.decoding;
      
      img.src = url;
    });
  }

  static async preloadCriticalImages(urls, options = {}) {
    const {
      maxConcurrent = 3,
      timeout = 5000
    } = options;

    const chunks = [];
    for (let i = 0; i < urls.length; i += maxConcurrent) {
      chunks.push(urls.slice(i, i + maxConcurrent));
    }

    for (const chunk of chunks) {
      await Promise.allSettled(
        chunk.map(url => 
          Promise.race([
            this.preloadImage(url),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), timeout)
            )
          ])
        )
      );
    }
  }

  static supportsFormat(format) {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    
    switch (format) {
      case 'webp':
        return canvas.toDataURL('image/webp').indexOf('image/webp') === 5;
      case 'avif':
        return canvas.toDataURL('image/avif').indexOf('image/avif') === 5;
      default:
        return true;
    }
  }

  static getBestFormat() {
    if (this.supportsFormat('avif')) return 'avif';
    if (this.supportsFormat('webp')) return 'webp';
    return 'jpg';
  }

  static optimizeForDevice(originalUrl, options = {}) {
    const devicePixelRatio = (typeof window !== 'undefined') ? (window.devicePixelRatio || 1) : 1;
    const isRetina = devicePixelRatio >= 2;
    const isMobile = (typeof window !== 'undefined') && window.innerWidth <= 768;

    let optimizedOptions = { ...options };

    // Adatta qualità per device
    if (isMobile) {
      optimizedOptions.quality = options.quality || 'medium';
      // Riduci dimensioni per mobile
      if (optimizedOptions.width) optimizedOptions.width = Math.round(optimizedOptions.width * 0.8);
      if (optimizedOptions.height) optimizedOptions.height = Math.round(optimizedOptions.height * 0.8);
    } else if (isRetina) {
      optimizedOptions.quality = options.quality || 'high';
    }

    // Usa il miglior formato supportato
    optimizedOptions.format = options.format || this.getBestFormat();

    return this.generateOptimizedUrl(originalUrl, optimizedOptions);
  }
}

// Hook React per uso semplificato
export const useOptimizedImage = (src, options = {}) => {
  const [optimizedSrc, setOptimizedSrc] = React.useState('');
  
  React.useEffect(() => {
    if (src) {
      const optimized = ImageOptimizer.optimizeForDevice(src, options);
      setOptimizedSrc(optimized);
    }
  }, [src, JSON.stringify(options)]);
  
  return optimizedSrc;
};