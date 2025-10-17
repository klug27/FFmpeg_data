document.addEventListener('DOMContentLoaded', () => {
  if (typeof FFmpegWASM === 'undefined' || typeof FFmpegWASM.FFmpeg === 'undefined') {
    alert("❌ FFmpegWASM n'est pas chargé. Vérifie le script ffmpeg.js.");
    return;
  }

  const { FFmpeg } = FFmpegWASM;
  const ffmpeg = new FFmpeg();
  let ffmpegLoaded = false;
  let cancelRequested = false;

  const convertVideoBtn = document.getElementById('convertVideoBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const videoInput = document.getElementById('videoInput');
  const fpsInput = document.getElementById('fpsInput');
  const widthInput = document.getElementById('widthInput');
  const heightInput = document.getElementById('heightInput');
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');
  const spinner = document.getElementById('spinner');
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

  cancelBtn.addEventListener('click', () => {
    cancelRequested = true;
    log.textContent = "⛔ Conversion annulée par l'utilisateur.";
    spinner.classList.add('d-none');
    convertVideoBtn.disabled = false;
  });

  convertVideoBtn.addEventListener('click', async () => {
    const file = videoInput.files[0];
    if (!file) {
      alert("📂 Veuillez sélectionner une vidéo.");
      return;
    }

    cancelRequested = false;
    convertVideoBtn.disabled = true;
    log.textContent = "Préparation de FFmpeg...";
    progressReceived = false;

    spinner.classList.remove('d-none');
    progressBar.style.width = '0%';
    progressBar.textContent = '0%';
    progressContainer.classList.add('d-none');
    downloadLink.classList.add('d-none');

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

    // Construction dynamique du filtre -vf
    const vfParts = [];

    const width = widthInput.value.trim();
    const height = heightInput.value.trim();
    if (width && height) {
      vfParts.push(`scale=${width}:${height}`);
    }

    const fps = fpsInput.value.trim();
    if (fps) {
      vfParts.push(`fps=${fps}`);
    }

    if (vfParts.length > 0) {
      args.push('-vf', vfParts.join(','));
    }

    args.push('-pix_fmt', 'bgr24', 'output.rgb');

    if (cancelRequested) {
      log.textContent = "⛔ Conversion annulée avant exécution.";
      spinner.classList.add('d-none');
      convertVideoBtn.disabled = false;
      return;
    }

    try {
      await ffmpeg.exec(args);
    } catch (err) {
      log.textContent = "❌ Erreur pendant la conversion.";
      console.error(err);
      spinner.classList.add('d-none');
      convertVideoBtn.disabled = false;
      return;
    }

    if (cancelRequested) {
      log.textContent = "⛔ Conversion interrompue après exécution.";
      spinner.classList.add('d-none');
      convertVideoBtn.disabled = false;
      return;
    }

    const outputData = await ffmpeg.readFile('output.rgb');
    const rgbBlob = new Blob([outputData.buffer], { type: 'application/octet-stream' });
    const rgbURL = URL.createObjectURL(rgbBlob);

    downloadLink.href = rgbURL;
    downloadLink.download = 'converted.rgb';
    downloadLink.classList.remove('d-none');
    log.textContent = `✅ Conversion terminée. Taille : ${rgbBlob.size} octets.`;

    if (progressReceived) {
      progressContainer.classList.remove('d-none');
    } else {
      progressContainer.classList.add('d-none');
    }

    spinner.classList.add('d-none');
    convertVideoBtn.disabled = false;

    // Nettoyage mémoire
    ffmpeg.deleteFile(inputName);
    ffmpeg.deleteFile('output.rgb');
  });
});
