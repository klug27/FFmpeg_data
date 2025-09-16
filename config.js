document.addEventListener('DOMContentLoaded', () => {
  if (typeof FFmpegWASM === 'undefined' || typeof FFmpegWASM.FFmpeg === 'undefined') {
    alert("❌ FFmpegWASM n'est pas chargé. Vérifie le script ffmpeg.js.");
    return;
  }

  const { FFmpeg } = FFmpegWASM;
  const ffmpeg = new FFmpeg();
  let ffmpegLoaded = false;

  const convertBtn = document.getElementById('convertBtn');
  const imageInput = document.getElementById('imageInput');
  const resizeToggle = document.getElementById('resizeToggle');
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');
  const spinner = document.getElementById('spinner');
  const preview = document.getElementById('preview');
  const downloadLink = document.getElementById('downloadLink');
  const log = document.getElementById('log');

  let progressReceived = false;

  ffmpeg.on('progress', ({ ratio }) => {
    if (typeof ratio === 'number') {
      progressReceived = true;
      const percent = Math.round(ratio * 100);
      progressBar.style.width = percent + '%';
      progressBar.textContent = percent + '%';
    }
  });

  ffmpeg.on('log', ({ message }) => console.log(message));

  convertBtn.addEventListener('click', async () => {
    const file = imageInput.files[0];
    if (!file) {
      alert("📂 Veuillez d'abord sélectionner une image.");
      return;
    }

    convertBtn.classList.add('btn-converting');
    convertBtn.disabled = true;
    log.textContent = "Préparation de FFmpeg...";
    progressReceived = false;

    // Affiche le spinner immédiatement
    spinner.classList.remove('d-none');
    // Prépare la barre mais ne l'affiche que si nécessaire
    progressBar.style.width = '0%';
    progressBar.textContent = '0%';
    progressContainer.classList.add('d-none');

    if (!ffmpegLoaded) {
      await ffmpeg.load({
        coreURL: '/ffmpeg/ffmpeg-core.js',
        wasmURL: '/ffmpeg/ffmpeg-core.wasm',
        workerURL: '/ffmpeg/ffmpeg-core.worker.js'
      });
      ffmpegLoaded = true;
      log.textContent = "✅ FFmpeg chargé.";
    }

    log.textContent = "Conversion en cours...";

    const ext = file.name.split('.').pop().toLowerCase();
    const inputName = `input.${ext}`;
    const inputData = new Uint8Array(await file.arrayBuffer());

    await ffmpeg.writeFile(inputName, inputData);

    const args = ['-i', inputName];
    if (resizeToggle.checked) {
      args.push('-vf', 'scale=192:160');
    }
    args.push('-pix_fmt', 'bgr24', 'output.bmp');

    await ffmpeg.exec(args);

    const outputData = await ffmpeg.readFile('output.bmp');
    const bmpBlob = new Blob([outputData.buffer], { type: 'image/bmp' });
    const bmpURL = URL.createObjectURL(bmpBlob);

    preview.src = bmpURL;
    preview.classList.remove('d-none');
    downloadLink.href = bmpURL;
    downloadLink.classList.remove('d-none');
    log.textContent = "✅ Conversion terminée.";

    // Affiche la barre uniquement si FFmpeg a fourni un ratio
    if (progressReceived) {
      progressContainer.classList.remove('d-none');
    } else {
      progressContainer.classList.add('d-none');
    }

    spinner.classList.add('d-none');
    convertBtn.classList.remove('btn-converting');
    convertBtn.disabled = false;
  });
});
