document.addEventListener('DOMContentLoaded', () => {
  if (typeof FFmpegWASM === 'undefined' || typeof FFmpegWASM.FFmpeg === 'undefined') {
    alert("❌ FFmpegWASM n'est pas chargé. Vérifie le script ffmpeg.js dans index.html.");
    return;
  }

  const { FFmpeg } = FFmpegWASM;
  const ffmpeg = new FFmpeg();

  const loadBtn = document.getElementById('loadBtn');
  const transcodeBtn = document.getElementById('transcodeBtn');
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');
  const videoPlayer = document.getElementById('videoPlayer');
  const downloadLink = document.getElementById('downloadLink');
  const log = document.getElementById('log');

  ffmpeg.on('log', ({ message }) => {
    console.log(message);
  });

  ffmpeg.on('progress', ({ ratio }) => {
    const percent = Math.round(ratio * 100);
    progressBar.style.width = percent + '%';
    progressBar.textContent = percent + '%';
  });

  loadBtn.addEventListener('click', async () => {
    loadBtn.disabled = true;
    log.textContent = "Chargement de FFmpeg...";
    await ffmpeg.load({
      coreURL: '/ffmpeg/ffmpeg-core.js',
      wasmURL: '/ffmpeg/ffmpeg-core.wasm',
      workerURL: '/ffmpeg/ffmpeg-core.worker.js'
    });
    log.textContent = "✅ FFmpeg chargé.";
    transcodeBtn.classList.remove('d-none');
  });

  transcodeBtn.addEventListener('click', async () => {
    transcodeBtn.disabled = true;
    log.textContent = "Téléchargement de la vidéo source...";
    const response = await fetch('https://raw.githubusercontent.com/ffmpegwasm/testdata/master/Big_Buck_Bunny_180_10s.webm');
    const inputData = new Uint8Array(await response.arrayBuffer());

    await ffmpeg.writeFile('input.webm', inputData);

    log.textContent = "Transcodage en cours...";
    progressContainer.classList.remove('d-none');
    await ffmpeg.exec(['-i', 'input.webm', 'output.mp4']);

    const outputData = await ffmpeg.readFile('output.mp4');
    const blob = new Blob([outputData.buffer], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);

    videoPlayer.src = url;
    downloadLink.href = url;
    downloadLink.classList.remove('d-none');
    log.textContent = "✅ Transcodage terminé.";
  });
});
