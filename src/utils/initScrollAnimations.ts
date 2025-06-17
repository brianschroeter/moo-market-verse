// Initialize scroll animations globally
export const initScrollAnimations = () => {
  // Small delay to ensure DOM is ready
  requestAnimationFrame(() => {
    // Check if IntersectionObserver is supported
    if (!('IntersectionObserver' in window)) {
      console.log('IntersectionObserver not supported, showing all content');
      return;
    }

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      console.log('User prefers reduced motion, disabling scroll animations');
      return;
    }

  // Create observer
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          // Optionally unobserve after animation
          // observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px', // Trigger slightly before element is fully in view
    }
  );

  // Observe all elements with animate-on-scroll class
  const animatedElements = document.querySelectorAll('.animate-on-scroll');
  animatedElements.forEach((element) => {
    observer.observe(element);
  });

  // Also handle any dynamically added elements
  const mutationObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof Element) {
          // Check if the node itself has the class
          if (node.classList?.contains('animate-on-scroll')) {
            observer.observe(node);
          }
          // Check for any children with the class
          const children = node.querySelectorAll?.('.animate-on-scroll');
          children?.forEach((child) => {
            observer.observe(child);
          });
        }
      });
    });
  });

  // Start observing the document for changes
  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

    console.log(`Initialized scroll animations for ${animatedElements.length} elements`);
  });
};