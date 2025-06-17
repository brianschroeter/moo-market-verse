import React, { useEffect } from 'react';

const SmoothScroll: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // Handle smooth scroll for anchor links
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a[href^="#"]');
      
      if (anchor) {
        e.preventDefault();
        const href = anchor.getAttribute('href');
        if (href && href !== '#') {
          const element = document.querySelector(href);
          if (element) {
            element.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            });
          }
        }
      }
    };

    // Add smooth scroll behavior to all internal links
    document.addEventListener('click', handleAnchorClick);

    // Handle scroll position restoration
    const handleScrollRestore = () => {
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
      }
    };

    handleScrollRestore();

    // Cleanup
    return () => {
      document.removeEventListener('click', handleAnchorClick);
    };
  }, []);

  return <>{children}</>;
};

export default SmoothScroll;