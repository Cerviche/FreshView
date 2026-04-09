// This script implements the Video class.
// -----------------------------------------------------------------------------

// Video represents a YouTube video.
class Video {
    // Constructs a new Video from the given HTML element.
    constructor(element) {
        this.element = element;
        this.display = element.style.display;
        this.id = undefined;
        this.title = undefined;
        this.viewed = undefined;
    }

    // -------------------------------------------------------------------------

    // Returns the ID of the YouTube URL associated with this Video.
    deriveURL() {
        // List of selectors that could match hyperlink tags associated with this Video.
        // These cover different YouTube page layouts (grid, search, playlists, etc.)
        const selectors = [
            // Grid layout (channel video tabs, subscriptions page)
            ":scope a#video-title.yt-simple-endpoint.style-scope.ytd-grid-video-renderer",
            
            // Old homepage layout (pre-2024)
            ":scope a#video-title-link.yt-simple-endpoint.style-scope.ytd-rich-grid-media",
            
            // Playlist page layout
            ":scope a.yt-simple-endpoint.style-scope.ytd-playlist-video-renderer",
            
            // Playlist panel (sidebar on watch page)
            ":scope a.yt-simple-endpoint.style-scope.ytd-playlist-panel-video-renderer",
            
            // Recommendation sidebar (old layout)
            ":scope a.yt-lockup-metadata-view-model-wiz__title",
            
            // Compact recommendations (old layout, may be deprecated)
            ":scope a.yt-simple-endpoint.style-scope.ytd-compact-video-renderer",
            
            // Search results page
            ":scope a#video-title.yt-simple-endpoint.style-scope.ytd-video-renderer",

            // NEW: YouTube homepage (2024+ layout using yt-lockup-view-model)
            // The title link uses the class ytLockupMetadataViewModelTitle
            ":scope a.ytLockupMetadataViewModelTitle",
            
            // Fallback for new homepage: any link inside the metadata text container
            ":scope .ytLockupMetadataViewModelTextContainer a",
            
            // Another fallback: the heading reset link
            ":scope .ytLockupMetadataViewModelHeadingReset a"
        ].join(", ");

        // Find a hyperlink tag associated with this Video.
        const hyperlink = this.element.querySelector(selectors);
        if (hyperlink === null) {
            Logger.warning("Video.deriveURL(): failed to find hyperlink element for Video", this.element, ".");
            return undefined;
        }

        // Extract the relative Video URL from the YouTube URL.
        // YouTube video URLs contain the video ID after "v=" parameter
        // Example: /watch?v=zScP-6v2hxU -> extracts "zScP-6v2hxU"
        const regex = /v=([a-zA-Z0-9_\-]+)/;
        const href = hyperlink.getAttribute("href");
        const matches = href.match(regex);
        if (matches === null) {
            Logger.warning("Video.deriveURL(): failed to find relative Video URL in attribute", href, "for Video", this.element, ".");
            return undefined;
        }
        return matches[1];
    }

    // Returns a hierarchical path to the HTML element associated with this Video.
    // This creates a unique path based on the element's position in the DOM tree.
    // Used to create a unique identifier for the video element itself.
    derivePath() {
        let path = "/";
        // Traverse up the DOM tree until we hit an element with an id
        for (let node = this.element; node.id !== undefined; node = node.parentNode) {
            let index = 0;
            // Count the position of this node among its siblings
            for (let sib = node.previousSibling; sib !== null; sib = sib.previousSibling) {
                ++index;
            }
            path = "/" + index + path;
        }
        return path;
    }

    // Fetches the ID of this Video.
    // The ID combines the DOM path and video URL to create a unique identifier.
    fetchID() {
        const url = this.deriveURL();
        const path = this.derivePath();
        const legal = url && path;
        this.id = legal ? path + url : undefined;
        return this.id;
    }

    // Returns the ID of this Video.
    getID() {
        return this.id || this.fetchID();
    }

    // Fetches the title of this Video.
    fetchTitle() {
        // Try old selector first (grid, search, etc.)
        let title = this.element.querySelector(":scope #video-title[title]");
        
        // NEW: Try homepage layout (2024+)
        // The title is inside a span within the link
        if (!title) {
            title = this.element.querySelector(":scope a.ytLockupMetadataViewModelTitle span");
        }
        
        // Alternative new homepage selector: the heading reset link
        if (!title) {
            title = this.element.querySelector(":scope .ytLockupMetadataViewModelHeadingReset a");
        }
        
        // Another fallback: look for any link with a title attribute in the metadata
        if (!title) {
            title = this.element.querySelector(":scope .ytLockupMetadataViewModelTextContainer a[title]");
        }
        
        // Last resort: find any anchor tag that contains a span with text
        if (!title) {
            const links = this.element.querySelectorAll(":scope .ytLockupMetadataViewModelTextContainer a");
            for (const link of links) {
                if (link.textContent && link.textContent.trim().length > 0) {
                    title = link;
                    break;
                }
            }
        }

        if (title === null) {
            Logger.warning("Video.fetchTitle(): failed to find title element for Video", this.element, ".");
            return undefined;
        }

        // Get the title text
        // Prefer the title attribute if it exists, otherwise use the text content
        this.title = title.getAttribute("title") || title.textContent.trim();
        return this.title;
    }

    // Returns the title of this Video.
    getTitle() {
        return this.title || this.fetchTitle();
    }

    // Returns the view state of this Video.
    // Checks if the video has been watched beyond the given threshold percentage.
    getViewed(threshold) {
        // Selectors for finding the progress/watched bar element
        // Order matters: try most specific/newest first
        const selectors = [
            // NEW: Homepage layout (2024+)
            // The progress bar segment that shows watch percentage
            "yt-thumbnail-overlay-progress-bar-view-model .ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment",
            
            // NEW: Alternative selector for the progress bar segment
            ".ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment",
            
            // OLD: Recommendations sidebar layout
            "div.ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment",
            
            // OLD: Standard video thumbnails (grid, search, etc.)
            "div#progress.style-scope.ytd-thumbnail-overlay-resume-playback-renderer"
        ].join(", ");

        const bar = this.element.querySelector(selectors);
        if (bar === null) {
            Logger.debug("Video.getViewed(): failed to find progress bar element for Video", this.element, ".");
            return undefined;
        }

        // Extract the width percentage from the style
        let widthPercentage = null;
        
        // Try different methods to get the width value
        // Method 1: Direct style property
        if (bar.style.width) {
            widthPercentage = bar.style.width;
        }
        // Method 2: Style attribute string (for elements with inline styles)
        else if (bar.getAttribute("style")) {
            const styleAttr = bar.getAttribute("style");
            const widthMatch = styleAttr.match(/width:\s*(\d+(?:\.\d+)?%)/);
            if (widthMatch) {
                widthPercentage = widthMatch[1];
            }
        }
        // Method 3: Check parent element's style (sometimes the width is on the parent)
        else if (bar.parentElement && bar.parentElement.style.width) {
            widthPercentage = bar.parentElement.style.width;
        }
        // Method 4: Check parent's style attribute
        else if (bar.parentElement && bar.parentElement.getAttribute("style")) {
            const styleAttr = bar.parentElement.getAttribute("style");
            const widthMatch = styleAttr.match(/width:\s*(\d+(?:\.\d+)?%)/);
            if (widthMatch) {
                widthPercentage = widthMatch[1];
            }
        }
        
        if (!widthPercentage) {
            Logger.debug("Video.getViewed(): no width style found for progress bar", this.element, ".");
            return undefined;
        }
        
        // Remove the '%' character and convert to number
        // Example: "75%" -> 75
        const progress = parseInt(widthPercentage, 10);
        
        // Check if the watched progress meets or exceeds the threshold
        // threshold is typically a number like 80 (meaning 80% watched)
        this.viewed = progress >= threshold;
        
        if (this.viewed) {
            Logger.debug("Video.getViewed(): video is fully watched (", progress, "% >= ", threshold, "%)");
        }
        
        return this.viewed;
    }

    // -------------------------------------------------------------------------
    // Visibility control methods
    // -------------------------------------------------------------------------

    // Hides the video element by setting its display style to "none"
    // This removes the video from the visible page layout
    hide() {
        this.element.style.display = "none";
    }

    // Shows the video element by restoring its original display style
    // This makes previously hidden videos visible again
    show() {
        this.element.style.display = this.display;
    }
}
