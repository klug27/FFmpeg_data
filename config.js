document.addEventListener('DOMContentLoaded', () => {
  const { FFmpeg } = FFmpegWASM;
  const ffmpeg = new FFmpeg();
  let ffmpegLoaded = false;
  let cancelRequested = false;
  let totalUs = 0;
  let durationText = '';

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

  ffmpeg.on('log', ({ message }) => {
    console.log(message);
    if (message.includes('Duration:')) {
      durationText = message;
    }
  });

  ffmpeg.on('progress', ({ time }) => {
    let currentUs = 0;

    console.log("Durée fichier :", time, "µs");
    if (typeof time === 'number') {
      currentUs = time;
    } else if (typeof time === 'string') {
      const parts = time.split(':');
      if (parts.length === 3) {
        const h = parseInt(parts[0]);
        const m = parseInt(parts[1]);
        const s = parseFloat(parts[2]);
        currentUs = Math.round((h * 3600 + m * 60 + s) * 1_000_000);
      }
    } else {
      console.warn("⚠️ Progress ignoré : time invalide", time);
      return;
    }

    if (totalUs > 0) {
      const ratio = currentUs / totalUs;
      const percent = Math.min(100, Math.round(ratio * 100));
      progressBar.style.width = percent + '%';
      progressBar.textContent = percent < 100 ? `${percent}%` : 'Finalisation...';
      progressContainer.classList.remove('d-none');

      const seconds = currentUs / 1_000_000;
      const minutes = Math.floor(seconds / 60);
      const remaining = (seconds % 60).toFixed(2);
      log.textContent = `⏱ Temps écoulé : ${minutes} min ${remaining} s`;
    }
  });

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
    progressBar.style.width = '0%';
    progressBar.textContent = '0%';
    progressContainer.classList.add('d-none');
    downloadLink.classList.add('d-none');
    spinner.classList.remove('d-none');
    durationText = '';
    totalUs = 0;

    if (!ffmpegLoaded) {
      await ffmpeg.load({
        coreURL: '/ffmpeg/ffmpeg-core.js',
        wasmURL: '/ffmpeg/ffmpeg-core.wasm',
        workerURL: '/ffmpeg/ffmpeg-core.worker.js'
      });
      ffmpegLoaded = true;
      log.textContent = "✅ FFmpeg chargé.";
    }

    const ext = file.name.split('.').pop().toLowerCase();
    const inputName = `input.${ext}`;
    const inputData = new Uint8Array(await file.arrayBuffer());
    await ffmpeg.writeFile(inputName, inputData);

    // 🔍 Extraire la durée en microsecondes
    try {
      await ffmpeg.exec(['-i', inputName]);
      const match = durationText.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
      if (match) {
        const [_, h, m, s] = match;
        totalUs = Math.round((parseInt(h) * 3600 + parseInt(m) * 60 + parseFloat(s)) * 1_000_000);
        console.log("Durée totale :", totalUs, "µs");
      }
    } catch (e) {
      console.warn("Impossible d'extraire la durée :", e);
    }

    if (cancelRequested) {
      log.textContent = "⛔ Conversion annulée avant exécution.";
      spinner.classList.add('d-none');
      convertVideoBtn.disabled = false;
      return;
    }

    log.textContent = "Conversion en cours...";

    const args = ['-i', inputName];

    // 🎛️ Construction dynamique du filtre -vf
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

    progressContainer.classList.remove('d-none');
    spinner.classList.add('d-none');
    convertVideoBtn.disabled = false;

    // 🧼 Nettoyage mémoire
    ffmpeg.deleteFile(inputName);
    ffmpeg.deleteFile('output.rgb');
  });
});
