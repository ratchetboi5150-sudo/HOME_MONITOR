var mediaElement = null;
var hlsInstance = null;
var unmuteBtn = null;
var unmuteButtonInitialized = false;

function ensureUnmuteButton() {
    if (!unmuteBtn) unmuteBtn = document.getElementById('unmute-btn');
    if (unmuteBtn && !unmuteButtonInitialized) {
        unmuteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (mediaElement) {
                try { mediaElement.muted = false; mediaElement.volume = mediaElement.volume || 0.5; } catch (err) { console.warn('unmute click failed', err); }
            }
            hideUnmuteBtn();
        });
        unmuteButtonInitialized = true;
    }
}

function showUnmuteBtn() {
    ensureUnmuteButton();
    if (unmuteBtn) unmuteBtn.classList.remove('hidden');
}

function hideUnmuteBtn() {
    if (!unmuteBtn) unmuteBtn = document.getElementById('unmute-btn');
    if (unmuteBtn) unmuteBtn.classList.add('hidden');
}

function clearMedia() {
    // Destroy any existing Hls instance first
    if (hlsInstance) {
        try { hlsInstance.destroy(); } catch (e) { console.warn('Hls destroy failed', e); }
        hlsInstance = null;
    }

    var container = document.getElementById('container');
    if (mediaElement) {
        try { mediaElement.pause && mediaElement.pause(); } catch (e) {}
        try {
            // remove only the media element; preserve unmute button and other UI
            if (mediaElement.parentNode) mediaElement.parentNode.removeChild(mediaElement);
        } catch (e) { console.warn('remove media failed', e); }
        mediaElement = null;
    }
    // do not wipe container.innerHTML (preserve UI like unmute button)
}

function createMediaElement(type) {
    clearMedia();
    var container = document.getElementById('container');
    if (type === 'video') {
        mediaElement = document.createElement('video');
        mediaElement.autoplay = true;
        mediaElement.loop = true;
        mediaElement.muted = true; // autoplay policy workaround; user can unmute via button or gesture
        mediaElement.playsInline = true;
        mediaElement.style.width = '100%';
        mediaElement.style.height = '100%';
        // insert before the unmute button if present so button stays on top
        var ref = document.getElementById('unmute-btn');
        if (ref && ref.parentNode) ref.parentNode.insertBefore(mediaElement, ref);
        else container.appendChild(mediaElement);

        // clicking the video is a user gesture - use it to unmute
        mediaElement.addEventListener('click', function() {
            try {
                if (mediaElement.muted) {
                    mediaElement.muted = false;
                    mediaElement.volume = mediaElement.volume || 0.5;
                    hideUnmuteBtn();
                }
            } catch (e) { console.warn('video click unmute failed', e); }
        });

    } else if (type === 'audio') {
        mediaElement = document.createElement('audio');
        mediaElement.controls = true;
        container.appendChild(mediaElement);
    } else if (type === 'image') {
        mediaElement = document.createElement('img');
        mediaElement.style.maxWidth = '100%';
        container.appendChild(mediaElement);
    }
    return mediaElement;
}

function isHlsUrl(url) {
    if (!url) return false;
    return url.toLowerCase().indexOf('.m3u8') !== -1 || url.toLowerCase().indexOf('application/vnd.apple.mpegurl') !== -1;
}

window.addEventListener('message', function(event) {
    var data = event.data;
    if (!data) return;
    if (data.action === 'play') {
        var el = createMediaElement(data.type);
        if (el) {
            if (data.type === 'video' || data.type === 'audio') {
                var url = data.url;
                // HLS handling for .m3u8
                if (data.type === 'video' && isHlsUrl(url) && window.Hls && window.Hls.isSupported && window.Hls.isSupported()) {
                    try {
                        hlsInstance = new window.Hls();
                        hlsInstance.loadSource(url);
                        hlsInstance.attachMedia(el);
                        hlsInstance.on(window.Hls.Events.MANIFEST_PARSED, function() {
                            // attempt to play after manifest parsed
                            el.play().catch(function(err){ console.warn('Autoplay prevented', err); });
                        });
                    } catch (e) {
                        console.error('Hls playback failed, falling back to native src', e);
                        el.src = url;
                        el.load();
                        el.play().catch(console.error);
                    }
                } else {
                    // Non-HLS or Hls not supported: use native src
                    el.src = url;
                    el.load();
                    el.play().catch(console.error);
                }
                // volume (0-100 expected)
                try {
                    var vol = (typeof data.volume !== 'undefined') ? (data.volume / 100) : 0.5;
                    el.volume = vol;
                    if (vol > 0) {
                        el.muted = false;
                        hideUnmuteBtn();
                    } else {
                        // show unmute hint if muted/zero volume
                        showUnmuteBtn();
                    }
                } catch (e) { console.warn('Setting volume failed', e); }
                if (data.type === 'audio') {
                    var container = document.getElementById('container');
                    var info = document.createElement('p');
                    info.style.color = 'white';
                    info.style.textAlign = 'center';
                    info.textContent = 'Audio Playing';
                    container.appendChild(info);
                }
            } else if (data.type === 'image') {
                el.src = data.url;
            }
        }
    } else if (data.action === 'stop') {
        clearMedia();
    } else if (data.action === 'volume') {
        if (mediaElement && (mediaElement.tagName === 'VIDEO' || mediaElement.tagName === 'AUDIO')) {
            try {
                mediaElement.volume = data.volume / 100;
                if (data.volume > 0) {
                    mediaElement.muted = false;
                    hideUnmuteBtn();
                } else {
                    mediaElement.muted = true;
                    showUnmuteBtn();
                }
            } catch (e) { console.warn('Setting volume failed', e); }
        }
    }
});

// initialize unmute button reference on load
document.addEventListener('DOMContentLoaded', function(){ ensureUnmuteButton(); });
