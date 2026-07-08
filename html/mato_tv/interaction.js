var menuDiv = document.getElementById('tv-menu');
var volumeSlider = document.getElementById('volume');
var volumeValue = document.getElementById('volume-value');
var playBtn = document.getElementById('play-btn');
var stopBtn = document.getElementById('stop-btn');
var closeBtn = document.getElementById('close-btn');

// Function to send NUI callback
function sendCallback(name, data) {
    fetch('https://cfx-nui-' + window.GetParentResourceName() + '/' + name, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify(data || {})
    }).catch(console.error);
}

// Handle volume slider change
volumeSlider.addEventListener('input', function() {
    volumeValue.textContent = this.value;
    sendCallback('volume', { volume: parseInt(this.value) });
});

// Play button
playBtn.addEventListener('click', function() {
    var url = document.getElementById('url').value.trim();
    var type = document.getElementById('type').value;
    var volume = parseInt(volumeSlider.value);
    if (url) {
        sendCallback('play', { url: url, type: type, volume: volume });
        menuDiv.style.display = 'none';
    }
});

// Stop button
stopBtn.addEventListener('click', function() {
    sendCallback('stop');
    menuDiv.style.display = 'none';
});

// Close button
closeBtn.addEventListener('click', function() {
    sendCallback('close');
    menuDiv.style.display = 'none';
});

// Listen for NUI message to open menu
window.addEventListener('message', function(event) {
    var data = event.data;
    if (data && data.action === 'open') {
        menuDiv.style.display = 'block';
        document.getElementById('url').value = '';
        volumeSlider.value = data.volume || 50;
        volumeValue.textContent = volumeSlider.value;
    }
});
