import { useEffect, useRef, useState } from 'react';

interface ScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  delay?: number;
}

export const useScrollAnimation = <T extends HTMLElement = HTMLDivElement>(
  options: ScrollAnimationOptions = {}
) => {
  const {
    threshold = 0.1,
    rootMargin = '0px',
    triggerOnce = true,
    delay = 0,
  } = options;

  const elementRef = useRef<T>(null);
  const [isInView, setIsInView] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) {
      // If reduced motion is preferred, show content immediately
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && (!triggerOnce || !hasAnimated)) {
            // Add delay if specified
            if (delay > 0) {
              setTimeout(() => {
                setIsInView(true);
                setHasAnimated(true);
                element.classList.add('in-view');
              }, delay);
            } else {
              setIsInView(true);
              setHasAnimated(true);
              element.classList.add('in-view');
            }
          } else if (!triggerOnce && !entry.isIntersecting) {
            setIsInView(false);
            element.classList.remove('in-view');
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, rootMargin, triggerOnce, hasAnimated, delay]);

  return { ref: elementRef, isInView };
};

// Hook for parallax scrolling effects
export const useParallax = <T extends HTMLElement = HTMLDivElement>(
  speed: number = 0.5
) => {
  const elementRef = useRef<T>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) return;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const elementTop = element.offsetTop;
      const elementHeight = element.offsetHeight;
      const windowHeight = window.innerHeight;

      // Calculate if element is in viewport
      if (
        scrollY + windowHeight > elementTop &&
        scrollY < elementTop + elementHeight
      ) {
        const relativeScroll = scrollY + windowHeight - elementTop;
        const parallaxOffset = relativeScroll * speed - windowHeight;
        setOffset(parallaxOffset);
        element.style.transform = `translateY(${parallaxOffset}px)`;
      }
    };

    // Throttle scroll events for performance
    let ticking = false;
    const handleScrollThrottled = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScrollThrottled);
    handleScroll(); // Initial calculation

    return () => {
      window.removeEventListener('scroll', handleScrollThrottled);
    };
  }, [speed]);

  return { ref: elementRef, offset };
};

// Hook for staggered animations
export const useStaggeredAnimation = <T extends HTMLElement = HTMLDivElement>(
  itemCount: number,
  options: ScrollAnimationOptions = {}
) => {
  const containerRef = useRef<T>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const children = container.children;
    
    // Add stagger index to each child
    Array.from(children).forEach((child, index) => {
      (child as HTMLElement).style.setProperty('--stagger-index', index.toString());
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            container.classList.add('in-view');
            
            // Add in-view class to children with stagger delay
            Array.from(children).forEach((child, index) => {
              setTimeout(() => {
                child.classList.add('in-view');
              }, index * 100); // 100ms stagger delay
            });
          }
        });
      },
      {
        threshold: options.threshold || 0.1,
        rootMargin: options.rootMargin || '0px',
      }
    );

    observer.observe(container);

    return () => {
      observer.unobserve(container);
    };
  }, [itemCount, options]);

  return { ref: containerRef, isInView };
};

// Hook for text reveal animations
export const useTextReveal = <T extends HTMLElement = HTMLDivElement>() => {
  const elementRef = useRef<T>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Split text into words
    const text = element.innerText;
    const words = text.split(' ');
    
    element.innerHTML = words
      .map((word, index) => 
        `<span class="word" style="--word-index: ${index}">${word}</span>`
      )
      .join(' ');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isRevealed) {
            setIsRevealed(true);
            element.classList.add('revealed');
          }
        });
      },
      {
        threshold: 0.5,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [isRevealed]);

  return { ref: elementRef, isRevealed };
};

// Hook for page load animation
export const usePageLoader = (minimumLoadTime: number = 1500) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const startTime = Date.now();

    const handleLoad = () => {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minimumLoadTime - elapsedTime);

      setTimeout(() => {
        setIsLoading(false);
      }, remainingTime);
    };

    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
    }

    return () => {
      window.removeEventListener('load', handleLoad);
    };
  }, [minimumLoadTime]);

  return isLoading;
};