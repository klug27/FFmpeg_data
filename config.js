document.addEventListener('DOMContentLoaded', () => {
  if (typeof FFmpegWASM === 'undefined' || typeof FFmpegWASM.FFmpeg === 'undefined') {
    alert("❌ FFmpegWASM n'est pas chargé. Vérifie le script ffmpeg.js.");
    return;
  }

  const { FFmpeg } = FFmpegWASM;
  const ffmpeg = new FFmpeg();

  const loadBtn = document.getElementById('loadBtn');
  const convertBtn = document.getElementById('convertBtn');
  const imageInput = document.getElementById('imageInput');
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');
  const preview = document.getElementById('preview');
  const downloadLink = document.getElementById('downloadLink');
  const log = document.getElementById('log');

  ffmpeg.on('progress', ({ ratio }) => {
    const percent = Math.round(ratio * 100);
    progressBar.style.width = percent + '%';
    progressBar.textContent = percent + '%';
  });

  ffmpeg.on('log', ({ message }) => console.log(message));

  loadBtn.addEventListener('click', async () => {
    loadBtn.disabled = true;
    log.textContent = "Chargement de FFmpeg...";
    await ffmpeg.load({
      coreURL: '/ffmpeg/ffmpeg-core.js',
      wasmURL: '/ffmpeg/ffmpeg-core.wasm',
      workerURL: '/ffmpeg/ffmpeg-core.worker.js'
    });
    log.textContent = "✅ FFmpeg chargé.";
    convertBtn.classList.remove('d-none');
  });

  convertBtn.addEventListener('click', async () => {
    const file = imageInput.files[0];
    if (!file) {
      alert("📂 Sélectionne une image d'abord.");
      return;
    }

    convertBtn.disabled = true;
    log.textContent = "Conversion en cours...";
    progressContainer.classList.remove('d-none');

    const ext = file.name.split('.').pop().toLowerCase();
    const inputName = `input.${ext}`;
    const inputData = new Uint8Array(await file.arrayBuffer());

    await ffmpeg.writeFile(inputName, inputData);

    await ffmpeg.exec([
      '-i', inputName,
      '-vf', 'scale=192:160',
      '-pix_fmt', 'bgr24',
      'output.bmp'
    ]);

    const outputData = await ffmpeg.readFile('output.bmp');
    const bmpBlob = new Blob([outputData.buffer], { type: 'image/bmp' });
    const bmpURL = URL.createObjectURL(bmpBlob);

    preview.src = bmpURL;
    preview.classList.remove('d-none');
    downloadLink.href = bmpURL;
    downloadLink.classList.remove('d-none');
    log.textContent = "✅ Conversion terminée.";
  });
});
