import { useState, useEffect } from 'react';

const useIsMobile = (breakpoint = 768) => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // Inicial data
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth < breakpoint);
        };
        
        // Setup once
        checkIsMobile();

        // Listen for resize
        window.addEventListener('resize', checkIsMobile);
        
        return () => window.removeEventListener('resize', checkIsMobile);
    }, [breakpoint]);

    return isMobile;
};

export default useIsMobile;
