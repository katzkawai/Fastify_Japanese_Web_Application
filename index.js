// ============================================
// 日本語メモアプリケーション - Fastify版（改善版）
// ============================================
// このアプリケーションは、Fastifyフレームワークを使用して
// 日本語でメモを作成・管理できるWebアプリです。
// セキュリティ、エラーハンドリング、パフォーマンスを改善しています。

// ============================================
// 1. 必要なモジュールのインポート
// ============================================

// Fastify - 高速で軽量なNode.js用Webフレームワーク
const fastify = require('fastify')({ 
  // logger設定を環境に応じて変更
  logger: {
    level: process.env.LOG_LEVEL || 'info'
    // 注: prettyPrintは非推奨。開発環境では pino-pretty を使用してください
    // 実行例: NODE_ENV=development node index.js | npx pino-pretty
  }
});

// Node.jsの標準ファイルシステムモジュール（Promise版）
const fs = require('fs').promises;

// Node.jsの標準パスモジュール
const path = require('path');

// ============================================
// 2. 設定の定義（環境変数対応）
// ============================================

const config = {
  port: parseInt(process.env.PORT) || 3000,
  host: process.env.HOST || '0.0.0.0',
  dataFile: process.env.DATA_FILE || path.join(__dirname, 'data.json'),
  isDevelopment: process.env.NODE_ENV === 'development',
  cacheEnabled: process.env.CACHE_ENABLED !== 'false',
  cacheDuration: parseInt(process.env.CACHE_DURATION) || 5000
};

// データファイルのパスを定義
const DATA_FILE = config.dataFile;

// ============================================
// 3. ユーティリティ関数
// ============================================

// HTMLエスケープ関数（XSS対策）
function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') {
    return unsafe;
  }
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ============================================
// 4. キャッシュ管理
// ============================================

let memosCache = null;
let cacheTimestamp = null;

// キャッシュをクリアする関数
function clearCache() {
  memosCache = null;
  cacheTimestamp = null;
}

// ============================================
// 5. データ管理用のヘルパー関数（改善版）
// ============================================

// データファイルからメモデータを読み込む非同期関数
async function loadData() {
  try {
    // UTF-8エンコーディングでファイルを読み込む
    const data = await fs.readFile(DATA_FILE, 'utf8');
    
    // JSON文字列をJavaScriptオブジェクトに変換
    const parsedData = JSON.parse(data);
    
    // データの検証
    if (!Array.isArray(parsedData)) {
      throw new Error('データファイルの形式が不正です');
    }
    
    return parsedData;
  } catch (error) {
    if (error.code === 'ENOENT') {
      // ファイルが存在しない場合は空配列を返す
      fastify.log.info('データファイルが存在しません。新規作成します。');
      return [];
    } else if (error instanceof SyntaxError) {
      // JSONパースエラーの場合
      fastify.log.error('データファイルのJSONが不正です:', error);
      throw new Error('データファイルが破損しています。管理者に連絡してください。');
    } else {
      // その他のエラー
      fastify.log.error('データ読み込みエラー:', error);
      throw error;
    }
  }
}

// キャッシュ機能付きのデータ読み込み
async function loadDataWithCache() {
  // キャッシュが無効な場合は直接読み込む
  if (!config.cacheEnabled) {
    return await loadData();
  }

  const now = Date.now();
  
  // キャッシュが有効な場合はそれを返す
  if (memosCache && cacheTimestamp && (now - cacheTimestamp < config.cacheDuration)) {
    fastify.log.debug('キャッシュからデータを返します');
    return memosCache;
  }
  
  // キャッシュが無効な場合は新しく読み込む
  fastify.log.debug('ファイルからデータを読み込みます');
  memosCache = await loadData();
  cacheTimestamp = now;
  return memosCache;
}

// データをファイルに保存する非同期関数
async function saveData(data) {
  try {
    // バックアップを作成（オプション）
    if (process.env.BACKUP_ENABLED === 'true') {
      try {
        const backupPath = `${DATA_FILE}.backup`;
        await fs.copyFile(DATA_FILE, backupPath);
      } catch (backupError) {
        fastify.log.warn('バックアップの作成に失敗しました:', backupError);
      }
    }
    
    // データを保存
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    
    // キャッシュをクリア
    clearCache();
    
    fastify.log.debug('データを保存しました');
  } catch (error) {
    fastify.log.error('データ保存エラー:', error);
    throw new Error('データの保存に失敗しました。');
  }
}

// ============================================
// 6. ID管理の改善
// ============================================

let lastId = 0;

async function initializeLastId() {
  const memos = await loadData();
  if (memos.length > 0) {
    lastId = Math.max(...memos.map(m => m.id));
  }
}

function getNextId() {
  return ++lastId;
}

// ============================================
// 7. バリデーションスキーマ
// ============================================

// メモの作成・更新用スキーマ
const memoBodySchema = {
  type: 'object',
  required: ['title', 'content'],
  properties: {
    title: { 
      type: 'string',
      minLength: 1,
      maxLength: 200,
      pattern: '^[^<>]*$' // 基本的なHTMLタグを拒否
    },
    content: { 
      type: 'string',
      minLength: 1,
      maxLength: 5000
    }
  },
  additionalProperties: false
};

// IDパラメータのスキーマ
const idParamSchema = {
  type: 'object',
  properties: {
    id: { 
      type: 'string',
      pattern: '^[0-9]+$'
    }
  },
  required: ['id']
};

// ============================================
// 8. 静的ファイル配信の設定
// ============================================

// @fastify/staticプラグインを登録
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, 'public'),
  prefix: '/public/',
  cacheControl: true,
  maxAge: config.isDevelopment ? 0 : '7d'
});

// ============================================
// 9. グローバルエラーハンドラー
// ============================================

// カスタムエラーハンドラーを設定
fastify.setErrorHandler(async (error, request, reply) => {
  // エラーをログに記録
  fastify.log.error({
    err: error,
    request: {
      method: request.method,
      url: request.url,
      headers: request.headers
    }
  });

  // バリデーションエラーの場合
  if (error.validation) {
    return reply.status(400).send({
      error: 'バリデーションエラー',
      message: '入力内容に誤りがあります。',
      details: config.isDevelopment ? error.validation : undefined
    });
  }

  // その他のエラー
  const statusCode = error.statusCode || 500;
  const message = statusCode === 500 ? 
    'サーバーエラーが発生しました。' : 
    error.message;

  reply.status(statusCode).send({
    error: message,
    ...(config.isDevelopment && { 
      stack: error.stack,
      details: error.message 
    })
  });
});

// ============================================
// 10. ルート定義 - メインページ
// ============================================

// GETリクエストでルートパス（/）にアクセスした時の処理
fastify.get('/', async (request, reply) => {
  try {
    // データファイルからメモ一覧を読み込む
    const memos = await loadDataWithCache();
    
    // レスポンスのContent-Typeを設定
    reply.type('text/html; charset=utf-8');
    
    // HTMLテンプレートを返す（エスケープ処理付き）
    return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="日本語でメモを作成・管理できるWebアプリケーション">
    <title>日本語メモアプリ</title>
    <style>
        /* CSSは後で外部ファイルに移動予定 */
        body {
            font-family: 'Hiragino Sans', 'Yu Gothic', 'Meiryo', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 20px;
            min-height: 100vh;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 2rem;
        }
        .header h1 {
            color: white;
            font-size: 3rem;
            margin: 0;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .header p {
            color: white;
            font-size: 1.2rem;
            margin: 0.5rem 0;
            opacity: 0.9;
        }
        .card {
            background: white;
            padding: 2rem;
            border-radius: 15px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
            margin-bottom: 20px;
            transition: transform 0.2s ease;
        }
        .card:hover {
            transform: translateY(-2px);
        }
        .memo-form {
            margin-bottom: 2rem;
        }
        .form-group {
            margin-bottom: 1.5rem;
        }
        label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: bold;
            color: #333;
        }
        input[type="text"], textarea {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 1rem;
            box-sizing: border-box;
            transition: border-color 0.2s ease;
        }
        input[type="text"]:focus, textarea:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        textarea {
            resize: vertical;
            min-height: 100px;
        }
        button {
            background: #667eea;
            color: white;
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1rem;
            margin-right: 0.5rem;
            transition: all 0.2s ease;
        }
        button:hover {
            background: #5a67d8;
            transform: translateY(-1px);
        }
        button:disabled {
            background: #a0aec0;
            cursor: not-allowed;
            transform: none;
        }
        button.delete {
            background: #e53e3e;
        }
        button.delete:hover {
            background: #c53030;
        }
        button.edit {
            background: #38a169;
        }
        button.edit:hover {
            background: #2f855a;
        }
        button.cancel {
            background: #718096;
        }
        button.cancel:hover {
            background: #4a5568;
        }
        .memo-list {
            margin-top: 2rem;
        }
        .memo-item {
            background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            border-radius: 12px;
            border-left: 5px solid #667eea;
            transition: all 0.2s ease;
        }
        .memo-item:hover {
            transform: translateX(5px);
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .memo-title {
            font-size: 1.4rem;
            font-weight: bold;
            margin-bottom: 0.5rem;
            color: #2d3748;
        }
        .memo-content {
            font-size: 1.1rem;
            margin-bottom: 1rem;
            color: #4a5568;
            line-height: 1.6;
            white-space: pre-wrap;
        }
        .memo-meta {
            font-size: 0.85rem;
            color: #718096;
            margin-bottom: 1rem;
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
        }
        .memo-actions {
            margin-top: 1rem;
        }
        .edit-form {
            display: none;
            margin-top: 1.5rem;
            padding-top: 1.5rem;
            border-top: 2px solid #e2e8f0;
        }
        .edit-form.active {
            display: block;
        }
        .no-memos {
            text-align: center;
            color: #718096;
            font-style: italic;
            margin: 2rem 0;
        }
        .memo-count {
            text-align: center;
            color: #4a5568;
            margin-bottom: 1rem;
        }
        .error-message {
            background: #fed7d7;
            color: #c53030;
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1rem;
            display: none;
        }
        .success-message {
            background: #c6f6d5;
            color: #2f855a;
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1rem;
            display: none;
        }
        .loading {
            opacity: 0.6;
            pointer-events: none;
        }
        @media (max-width: 768px) {
            .container {
                padding: 0 10px;
            }
            .header h1 {
                font-size: 2rem;
            }
            .card {
                padding: 1.5rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📝 メモアプリ</h1>
            <p>あなたの大切な思考を記録しましょう</p>
        </div>
        
        <div class="card">
            <div class="error-message" id="errorMessage"></div>
            <div class="success-message" id="successMessage"></div>
            
            <div class="memo-form">
                <h2>新しいメモを作成</h2>
                <form id="addForm">
                    <div class="form-group">
                        <label for="newTitle">タイトル: <small>(最大200文字)</small></label>
                        <input type="text" id="newTitle" name="title" placeholder="メモのタイトルを入力..." required maxlength="200">
                    </div>
                    <div class="form-group">
                        <label for="newContent">内容: <small>(最大5000文字)</small></label>
                        <textarea id="newContent" name="content" placeholder="メモの内容を入力してください..." required maxlength="5000"></textarea>
                    </div>
                    <button type="submit" id="submitButton">💾 メモを保存</button>
                </form>
            </div>
        </div>
        
        <div class="card">
            <div class="memo-list">
                <h2>📋 メモ一覧</h2>
                <div class="memo-count">全 ${memos.length} 件のメモ</div>
                ${memos.length === 0 ? '<div class="no-memos">まだメモがありません。上のフォームから最初のメモを作成しましょう！</div>' : 
                  memos.map(memo => `
                    <div class="memo-item" data-id="${memo.id}">
                        <div class="memo-title">${escapeHtml(memo.title)}</div>
                        <div class="memo-content">${escapeHtml(memo.content)}</div>
                        <div class="memo-meta">
                            <span>📅 作成: ${new Date(memo.createdAt).toLocaleString('ja-JP')}</span>
                            ${memo.updatedAt !== memo.createdAt ? 
                              `<span>🔄 更新: ${new Date(memo.updatedAt).toLocaleString('ja-JP')}</span>` : ''
                            }
                        </div>
                        <div class="memo-actions">
                            <button class="edit" onclick="toggleEdit(${memo.id})">✏️ 編集</button>
                            <button class="delete" onclick="deleteMemo(${memo.id})">🗑️ 削除</button>
                        </div>
                        <div class="edit-form" id="edit-${memo.id}">
                            <h3>メモを編集</h3>
                            <div class="form-group">
                                <label>タイトル: <small>(最大200文字)</small></label>
                                <input type="text" id="editTitle-${memo.id}" value="${escapeHtml(memo.title)}" maxlength="200">
                            </div>
                            <div class="form-group">
                                <label>内容: <small>(最大5000文字)</small></label>
                                <textarea id="editContent-${memo.id}" maxlength="5000">${escapeHtml(memo.content)}</textarea>
                            </div>
                            <button onclick="updateMemo(${memo.id})">💾 更新</button>
                            <button class="cancel" onclick="toggleEdit(${memo.id})">❌ キャンセル</button>
                        </div>
                    </div>
                  `).join('')
                }
            </div>
        </div>
    </div>

    <script>
        // エラーメッセージを表示
        function showError(message) {
            const errorDiv = document.getElementById('errorMessage');
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        }

        // 成功メッセージを表示
        function showSuccess(message) {
            const successDiv = document.getElementById('successMessage');
            successDiv.textContent = message;
            successDiv.style.display = 'block';
            setTimeout(() => {
                successDiv.style.display = 'none';
            }, 3000);
        }

        // ローディング状態の管理
        function setLoading(isLoading) {
            const container = document.querySelector('.container');
            if (isLoading) {
                container.classList.add('loading');
            } else {
                container.classList.remove('loading');
            }
        }

        // 新しいメモを追加
        document.getElementById('addForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const title = document.getElementById('newTitle').value.trim();
            const content = document.getElementById('newContent').value.trim();
            
            if (!title || !content) {
                showError('タイトルと内容は必須です。');
                return;
            }
            
            setLoading(true);
            const submitButton = document.getElementById('submitButton');
            submitButton.disabled = true;
            
            try {
                const response = await fetch('/api/memos', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ title, content }),
                });
                
                if (response.ok) {
                    showSuccess('メモを保存しました。');
                    setTimeout(() => location.reload(), 1000);
                } else {
                    const error = await response.json();
                    showError(error.error || 'メモの保存に失敗しました。');
                }
            } catch (error) {
                showError('ネットワークエラーが発生しました。');
                console.error('Error:', error);
            } finally {
                setLoading(false);
                submitButton.disabled = false;
            }
        });
        
        // メモを削除
        async function deleteMemo(id) {
            if (!confirm('このメモを削除しますか？削除すると元に戻せません。')) {
                return;
            }
            
            setLoading(true);
            
            try {
                const response = await fetch(\`/api/memos/\${id}\`, {
                    method: 'DELETE',
                });
                
                if (response.ok) {
                    showSuccess('メモを削除しました。');
                    setTimeout(() => location.reload(), 1000);
                } else {
                    const error = await response.json();
                    showError(error.error || 'メモの削除に失敗しました。');
                }
            } catch (error) {
                showError('ネットワークエラーが発生しました。');
                console.error('Error:', error);
            } finally {
                setLoading(false);
            }
        }
        
        // 編集フォームの表示/非表示を切り替え
        function toggleEdit(id) {
            const editForm = document.getElementById(\`edit-\${id}\`);
            editForm.classList.toggle('active');
        }
        
        // メモを更新
        async function updateMemo(id) {
            const title = document.getElementById(\`editTitle-\${id}\`).value.trim();
            const content = document.getElementById(\`editContent-\${id}\`).value.trim();
            
            if (!title || !content) {
                showError('タイトルと内容は必須です。');
                return;
            }
            
            setLoading(true);
            
            try {
                const response = await fetch(\`/api/memos/\${id}\`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ title, content }),
                });
                
                if (response.ok) {
                    showSuccess('メモを更新しました。');
                    setTimeout(() => location.reload(), 1000);
                } else {
                    const error = await response.json();
                    showError(error.error || 'メモの更新に失敗しました。');
                }
            } catch (error) {
                showError('ネットワークエラーが発生しました。');
                console.error('Error:', error);
            } finally {
                setLoading(false);
            }
        }
    </script>
</body>
</html>
    `;
  } catch (error) {
    throw error; // グローバルエラーハンドラーに処理を委譲
  }
});

// ============================================
// 11. REST API エンドポイント
// ============================================

// API: 全メモ取得
fastify.get('/api/memos', async (request, reply) => {
  try {
    const memos = await loadDataWithCache();
    reply.send(memos);
  } catch (error) {
    throw error;
  }
});

// API: メモ追加
fastify.post('/api/memos', {
  schema: {
    body: memoBodySchema
  }
}, async (request, reply) => {
  try {
    const { title, content } = request.body;
    
    const memos = await loadData();
    const newId = getNextId();
    const now = new Date().toISOString();
    
    const newMemo = {
      id: newId,
      title: title.trim(),
      content: content.trim(),
      createdAt: now,
      updatedAt: now
    };
    
    memos.push(newMemo);
    await saveData(memos);
    
    reply.code(201).send(newMemo);
  } catch (error) {
    throw error;
  }
});

// API: メモ更新
fastify.put('/api/memos/:id', {
  schema: {
    params: idParamSchema,
    body: memoBodySchema
  }
}, async (request, reply) => {
  try {
    const id = parseInt(request.params.id);
    const { title, content } = request.body;
    
    const memos = await loadData();
    const memoIndex = memos.findIndex(m => m.id === id);
    
    if (memoIndex === -1) {
      reply.code(404).send({ error: 'メモが見つかりません' });
      return;
    }
    
    memos[memoIndex].title = title.trim();
    memos[memoIndex].content = content.trim();
    memos[memoIndex].updatedAt = new Date().toISOString();
    
    await saveData(memos);
    
    reply.send(memos[memoIndex]);
  } catch (error) {
    throw error;
  }
});

// API: メモ削除
fastify.delete('/api/memos/:id', {
  schema: {
    params: idParamSchema
  }
}, async (request, reply) => {
  try {
    const id = parseInt(request.params.id);
    const memos = await loadData();
    const memoIndex = memos.findIndex(m => m.id === id);
    
    if (memoIndex === -1) {
      reply.code(404).send({ error: 'メモが見つかりません' });
      return;
    }
    
    const deletedMemo = memos.splice(memoIndex, 1)[0];
    await saveData(memos);
    
    // 削除されたメモのIDを再利用しないようにする
    if (deletedMemo.id === lastId) {
      lastId--;
    }
    
    reply.send(deletedMemo);
  } catch (error) {
    throw error;
  }
});

// ============================================
// 12. プロセスレベルのエラーハンドリング
// ============================================

// 未処理の例外をキャッチ
process.on('uncaughtException', (error) => {
  fastify.log.fatal(error, 'Uncaught Exception');
  process.exit(1);
});

// 未処理のPromiseリジェクションをキャッチ
process.on('unhandledRejection', (reason, promise) => {
  fastify.log.fatal({ reason, promise }, 'Unhandled Rejection');
  process.exit(1);
});

// 正常終了時の処理
process.on('SIGTERM', async () => {
  fastify.log.info('SIGTERM signal received');
  try {
    await fastify.close();
    fastify.log.info('Server closed');
    process.exit(0);
  } catch (error) {
    fastify.log.error(error, 'Error closing server');
    process.exit(1);
  }
});

// ============================================
// 13. サーバー起動処理
// ============================================

const start = async () => {
  try {
    // 最後のIDを初期化
    await initializeLastId();
    
    // Fastifyサーバーを起動
    await fastify.listen({ 
      port: config.port,
      host: config.host
    });
    
    fastify.log.info(`🚀 日本語メモアプリが http://localhost:${config.port} で起動しました`);
    fastify.log.info(`環境: ${config.isDevelopment ? '開発' : '本番'}`);
    fastify.log.info(`キャッシュ: ${config.cacheEnabled ? '有効' : '無効'}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// アプリケーション開始
start();