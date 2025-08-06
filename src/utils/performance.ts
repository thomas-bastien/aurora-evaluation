// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private marks: Map<string, number> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Mark the start of a performance measurement
  mark(name: string): void {
    this.marks.set(name, performance.now());
    if (typeof performance.mark === 'function') {
      performance.mark(`${name}-start`);
    }
  }

  // Measure time since mark and return duration in ms
  measure(name: string): number {
    const startTime = this.marks.get(name);
    if (!startTime) {
      console.warn(`Performance mark "${name}" not found`);
      return 0;
    }

    const duration = performance.now() - startTime;
    
    if (typeof performance.measure === 'function') {
      try {
        performance.measure(name, `${name}-start`);
      } catch (error) {
        // Ignore measurement errors in development
      }
    }

    // Log in development mode
    if (import.meta.env.DEV) {
      console.log(`⚡ ${name}: ${duration.toFixed(2)}ms`);
    }

    this.marks.delete(name);
    return duration;
  }

  // Get Core Web Vitals if available
  static getCoreWebVitals(): Promise<{
    FCP?: number;
    LCP?: number;
    FID?: number;
    CLS?: number;
  }> {
    return new Promise((resolve) => {
      const vitals: any = {};

      // First Contentful Paint
      if ('PerformanceObserver' in window) {
        try {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.name === 'first-contentful-paint') {
                vitals.FCP = entry.startTime;
              }
            }
          });
          observer.observe({ entryTypes: ['paint'] });
        } catch (error) {
          // Observer not supported
        }
      }

      // Use setTimeout to resolve after a brief delay to collect metrics
      setTimeout(() => resolve(vitals), 1000);
    });
  }

  // Report bundle loading performance
  static reportBundlePerformance(): void {
    if (typeof performance.getEntriesByType === 'function') {
      const resourceEntries = performance.getEntriesByType('resource');
      const jsFiles = resourceEntries.filter((entry: any) => 
        entry.name.includes('.js') && entry.name.includes('/assets/')
      );
      
      const totalJSSize = jsFiles.reduce((total: number, entry: any) => 
        total + (entry.transferSize || 0), 0
      );

      const totalJSLoadTime = jsFiles.reduce((total: number, entry: any) => 
        total + (entry.duration || 0), 0
      );

      if (import.meta.env.DEV) {
        console.log(`📦 Bundle Performance:`);
        console.log(`   Total JS files: ${jsFiles.length}`);
        console.log(`   Total JS size: ${(totalJSSize / 1024).toFixed(2)} KB`);
        console.log(`   Total load time: ${totalJSLoadTime.toFixed(2)}ms`);
      }
    }
  }
}

// Hook for component performance monitoring
export const usePerformanceMonitor = () => {
  const monitor = PerformanceMonitor.getInstance();
  
  return {
    mark: monitor.mark.bind(monitor),
    measure: monitor.measure.bind(monitor),
  };
};

// Utility to report performance in development
export const reportPerformance = () => {
  if (import.meta.env.DEV) {
    // Report after page load
    window.addEventListener('load', () => {
      setTimeout(() => {
        PerformanceMonitor.reportBundlePerformance();
        PerformanceMonitor.getCoreWebVitals().then((vitals) => {
          console.log('🎯 Core Web Vitals:', vitals);
        });
      }, 2000);
    });
  }
};