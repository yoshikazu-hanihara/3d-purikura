// main.js

let scene, camera, renderer, controls;
let mugMesh, mugTexture, textureCanvas, textureContext;
let placedStickers = [];

init();
animate();

function init() {
  const canvas = document.getElementById("threeCanvas");
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth * 0.8, window.innerHeight * 0.8); // 適宜調整

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f0f0);

  camera = new THREE.PerspectiveCamera(45, canvas.width / canvas.height, 0.1, 1000);
  camera.position.set(0, 1, 3);

  controls = new THREE.OrbitControls(camera, renderer.domElement);

  // ライト
  const ambientLight = new THREE.AmbientLight(0xffffff, 1);
  scene.add(ambientLight);

  // GLTF Loader
  const loader = new THREE.GLTFLoader();
  loader.load(
    "/static/models/cat_mug.glb",
    function(gltf) {
      scene.add(gltf.scene);
      gltf.scene.traverse((child) => {
        if (child.isMesh && child.name === "MugBody") {
          mugMesh = child;
          if (mugMesh.material.map) {
            const originalMap = mugMesh.material.map;
            textureCanvas = document.createElement("canvas");
            textureCanvas.width = originalMap.image.width;
            textureCanvas.height = originalMap.image.height;
            textureContext = textureCanvas.getContext("2d");
            // 元のテクスチャをCanvasにコピー
            textureContext.drawImage(
              originalMap.image,
              0,
              0,
              textureCanvas.width,
              textureCanvas.height
            );
            mugTexture = new THREE.CanvasTexture(textureCanvas);
            mugTexture.flipY = false; // glTFは flipY=false が自然
            mugMesh.material.map = mugTexture;
            mugMesh.material.needsUpdate = true;
          }
        }
      });
    },
    undefined,
    function(error) {
      console.error("Error loading cat_mug.glb:", error);
    }
  );

  // 写真アップロード
  const photoInput = document.getElementById("photoInput");
  photoInput.addEventListener("change", (e) => {
    handlePhotoUpload(e);
  });

  // シールクリック
  document.querySelectorAll("#stickers img").forEach((imgEl) => {
    imgEl.addEventListener("click", () => {
      const stickerType = imgEl.dataset.sticker;
      placeSticker(stickerType);
    });
  });

  // デザイン送信
  const sendDesignBtn = document.getElementById("sendDesign");
  sendDesignBtn.addEventListener("click", () => {
    sendDesignToServer();
  });
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

function handlePhotoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  // 例: まずサーバーにアップロードしてファイルパスを取得
  const formData = new FormData();
  formData.append('photo', file);

  fetch('/upload_image', {
    method: 'POST',
    body: formData
  })
    .then((res) => res.json())
    .then((result) => {
      if (result.status === 'ok') {
        console.log("Uploaded photo:", result.url);
        // さらに 3D テクスチャへ貼り付け (簡易例)
        drawImageOntoMug(result.url);
      } else {
        alert("画像アップロード失敗: " + result.message);
      }
    })
    .catch((err) => {
      console.error(err);
      alert("画像アップロードエラー");
    });
}

function drawImageOntoMug(imageUrl) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    // マグのUV上に写真を描画
    if (textureContext) {
      const { width, height } = textureCanvas;
      const targetW = width * 0.5;
      const aspect = img.height / img.width;
      const targetH = targetW * aspect;
      const x = (width - targetW) / 2;
      const y = (height - targetH) / 2;

      textureContext.drawImage(img, x, y, targetW, targetH);
      mugTexture.needsUpdate = true;
    }
  };
  img.src = imageUrl; // 先ほどサーバーにアップロードされた URL
}

function placeSticker(stickerType) {
  // シール画像のURLを決定 (ローカルにあるものを使う)
  let stickerPath = "";
  if (stickerType === "heart") {
    stickerPath = "/static/images/sticker_heart.png";
  } else if (stickerType === "cat") {
    stickerPath = "/static/images/sticker_cat.png";
  }

  const img = new Image();
  img.onload = () => {
    if (textureContext) {
      // 例: Canvas上の(100,100)にサイズ(200,200)で貼る (固定的サンプル)
      textureContext.drawImage(img, 100, 100, 200, 200);
      mugTexture.needsUpdate = true;

      // もし在庫を消費する場合や配置位置を保持したい場合
      placedStickers.push({
        type: stickerType,
        x: 100,
        y: 100,
        w: 200,
        h: 200
      });
    }
  };
  img.src = stickerPath;
}

function sendDesignToServer() {
  if (!textureCanvas) {
    alert("テクスチャがまだ読み込まれていません");
    return;
  }
  const dataURL = textureCanvas.toDataURL("image/png");
  const payload = {
    texture: dataURL,
    stickers: placedStickers
  };

  fetch('/upload_design', {
    method: 'POST',
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
    .then(res => res.json())
    .then(result => {
      if (result.status === 'ok') {
        alert("デザインを送信しました！ ファイル名: " + result.filename);
      } else {
        alert("送信失敗: " + result.message);
      }
    })
    .catch(err => {
      console.error(err);
      alert("送信エラーが発生しました");
    });
}
