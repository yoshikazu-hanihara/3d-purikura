# app.py

import os
import base64
import uuid

from flask import Flask, render_template, request, jsonify, send_from_directory

UPLOAD_FOLDER = os.path.join('static', 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(__name__, static_folder='static', template_folder='templates')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER


@app.route('/')
def index():
    """
    アプリのメイン画面を表示するルート。
    templates/index.html を返す。
    """
    return render_template('index.html')


@app.route('/upload_image', methods=['POST'])
def upload_image():
    """
    ユーザーがアップロードした画像ファイルを受け取って保存するためのAPI
    - 1枚限定などの制御もフロント側/サーバー側で行う
    """
    file = request.files.get('photo')
    if not file:
        return jsonify({'status': 'error', 'message': 'No file uploaded'}), 400
    
    # ランダムファイル名で保存
    filename = str(uuid.uuid4()) + "_" + file.filename
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)

    return jsonify({
        'status': 'ok',
        'filename': filename,
        'url': f"/static/uploads/{filename}"
    })


@app.route('/upload_design', methods=['POST'])
def upload_design():
    """
    - フロントエンドから base64 形式のテクスチャ画像やシール配置情報を受け取る
    - 受け取った画像をサーバー側に保存し、メール送信などの処理を行う想定
    """
    data = request.json
    if not data:
        return jsonify({'status': 'error', 'message': 'No data found'}), 400
    
    texture_base64 = data.get('texture')
    if not texture_base64:
        return jsonify({'status': 'error', 'message': 'No texture data'}), 400

    # base64 分割
    header, encoded = texture_base64.split(',', 1)
    filename = str(uuid.uuid4()) + ".png"
    filepath = os.path.join(UPLOAD_FOLDER, filename)

    with open(filepath, "wb") as f:
        f.write(base64.b64decode(encoded))

    # 例: ステッカー情報や在庫管理 (本サンプルでは未実装)
    stickers = data.get('stickers', [])
    # ここでシール在庫減らすとか、DB登録など可能

    # 例: メール送信する場合 (コメントアウト例)
    # send_mail_with_attachment(
    #     smtp_server=...,
    #     port=...,
    #     login_user=...,
    #     login_password=...,
    #     from_addr=...,
    #     to_addrs=[...],
    #     subject="Cat Mug Order",
    #     body="User design attached",
    #     attach_file_path=filepath
    # )

    return jsonify({'status': 'ok', 'filename': filename})


if __name__ == '__main__':
    # 8000ポートで起動する例
    # Lightsail では適宜ポートを合わせる (80, 443, etc)
    app.run(host='0.0.0.0', port=8000, debug=True)
