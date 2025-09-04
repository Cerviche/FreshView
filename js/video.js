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
        const selectors = [
            ":scope a#video-title.yt-simple-endpoint.style-scope.ytd-grid-video-renderer",  // Grid
            ":scope a#video-title-link.yt-simple-endpoint.style-scope.ytd-rich-grid-media", // Home (OLD)
            ":scope a.yt-simple-endpoint.style-scope.ytd-playlist-video-renderer",          // Playlist page
            ":scope a.yt-simple-endpoint.style-scope.ytd-playlist-panel-video-renderer",    // Playlist panel
            ":scope a.yt-lockup-metadata-view-model-wiz__title",                            // Recommendations
            ":scope a.yt-simple-endpoint.style-scope.ytd-compact-video-renderer",           // Recommendations (OLD, possibly no longer needed)
            ":scope a#video-title.yt-simple-endpoint.style-scope.ytd-video-renderer",       // Search

            // NEW: YouTube homepage (yt-lockup-view-model)
            ":scope a.yt-lockup-view-model__title",
            // NEW fallback: homepage thumbnail link
            ":scope a.yt-lockup-view-model__content-image",
        ].join(", ");

        // Find a hyperlink tag associated with this Video.
        const hyperlink = this.element.querySelector(selectors);
        if (hyperlink === null) {
            Logger.warning("Video.deriveURL(): failed to find hyperlink element for Video", this.element, ".");
            return undefined;
        }

        // Extract the relative Video URL from the YouTube URL.
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
    derivePath() {
        let path = "/";
        for (let node = this.element; node.id !== undefined; node = node.parentNode) {
            let index = 0;
            for (let sib = node.previousSibling; sib !== null; sib = sib.previousSibling) {
                ++index;
            }
            path = "/" + index + path;
        }
        return path;
    }

    // Fetches the ID of this Video.
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
        // OLD: Grid, Search, etc.
        // const title = this.element.querySelector(":scope #video-title[title]");

        // NEW: try old selector first, then homepage lockup title
        let title = this.element.querySelector(":scope #video-title[title]");
        if (!title) {
            title = this.element.querySelector(":scope a.yt-lockup-view-model__title");
        }

        if (title === null) {
            Logger.warning("Video.fetchTitle(): failed to find title element for Video", this.element, ".");
            return undefined;
        }

        // OLD: attribute only
        // this.title = title.getAttribute("title");

        // NEW: prefer attribute, fallback to text
        this.title = title.getAttribute("title") || title.textContent.trim();
        return this.title;
    }

    // Returns the title of this Video.
    getTitle() {
        return this.title || this.fetchTitle();
    }

    // Returns the view state of this Video.
    getViewed(threshold) {
        const selectors = [
            "div.ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment",           // Recommendations
            "div#progress.style-scope.ytd-thumbnail-overlay-resume-playback-renderer",  // everywhere else
        ].join(", ");

        const bar = this.element.querySelector(selectors);
        if (bar === null) {
            Logger.debug("Video.fetchViewed(): failed to find bar element for Video", this.element, ".");
            return undefined;
        }

        const width = bar.style.width.slice(0, -1);
        const progress = parseInt(width, 10);
        this.viewed = progress >= threshold;
        return this.viewed;
    }

    // -------------------------------------------------------------------------

    hide() {
        this.element.style.display = "none";
    }

    show() {
        this.element.style.display = this.display;
    }
}
