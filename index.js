const fastify = require('fastify')({ 
  logger: true 
});
const fs = require('fs').promises;
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');

// データファイルの読み込み
async function loadData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // ファイルが存在しない場合は空配列を返す
    return [];
  }
}

// データファイルの保存
async function saveData(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// 静的ファイルの配信設定
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, 'public'),
  prefix: '/public/',
});

// ルートパス - メインページ
fastify.get('/', async (request, reply) => {
  try {
    const memos = await loadData();
    
    reply.type('text/html; charset=utf-8');
    
    return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>日本語メモアプリ</title>
    <style>
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
            <!-- 新しいメモ追加フォーム -->
            <div class="memo-form">
                <h2>新しいメモを作成</h2>
                <form id="addForm">
                    <div class="form-group">
                        <label for="newTitle">タイトル:</label>
                        <input type="text" id="newTitle" name="title" placeholder="メモのタイトルを入力..." required>
                    </div>
                    <div class="form-group">
                        <label for="newContent">内容:</label>
                        <textarea id="newContent" name="content" placeholder="メモの内容を入力してください..." required></textarea>
                    </div>
                    <button type="submit">💾 メモを保存</button>
                </form>
            </div>
        </div>
        
        <div class="card">
            <!-- メモ一覧 -->
            <div class="memo-list">
                <h2>📋 メモ一覧</h2>
                <div class="memo-count">全 ${memos.length} 件のメモ</div>
                ${memos.length === 0 ? '<div class="no-memos">まだメモがありません。上のフォームから最初のメモを作成しましょう！</div>' : 
                  memos.map(memo => `
                    <div class="memo-item" data-id="${memo.id}">
                        <div class="memo-title">${memo.title}</div>
                        <div class="memo-content">${memo.content}</div>
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
                                <label>タイトル:</label>
                                <input type="text" id="editTitle-${memo.id}" value="${memo.title}">
                            </div>
                            <div class="form-group">
                                <label>内容:</label>
                                <textarea id="editContent-${memo.id}">${memo.content}</textarea>
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
        // 新しいメモを追加
        document.getElementById('addForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('newTitle').value;
            const content = document.getElementById('newContent').value;
            
            try {
                const response = await fetch('/api/memos', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ title, content }),
                });
                
                if (response.ok) {
                    location.reload();
                } else {
                    const error = await response.json();
                    alert('メモの保存に失敗しました: ' + error.error);
                }
            } catch (error) {
                alert('エラーが発生しました: ' + error.message);
            }
        });
        
        // メモを削除
        async function deleteMemo(id) {
            if (confirm('このメモを削除しますか？削除すると元に戻せません。')) {
                try {
                    const response = await fetch(\`/api/memos/\${id}\`, {
                        method: 'DELETE',
                    });
                    
                    if (response.ok) {
                        location.reload();
                    } else {
                        const error = await response.json();
                        alert('メモの削除に失敗しました: ' + error.error);
                    }
                } catch (error) {
                    alert('エラーが発生しました: ' + error.message);
                }
            }
        }
        
        // 編集フォームの表示/非表示を切り替え
        function toggleEdit(id) {
            const editForm = document.getElementById(\`edit-\${id}\`);
            editForm.classList.toggle('active');
        }
        
        // メモを更新
        async function updateMemo(id) {
            const title = document.getElementById(\`editTitle-\${id}\`).value;
            const content = document.getElementById(\`editContent-\${id}\`).value;
            
            if (!title.trim() || !content.trim()) {
                alert('タイトルと内容は必須です。');
                return;
            }
            
            try {
                const response = await fetch(\`/api/memos/\${id}\`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ title, content }),
                });
                
                if (response.ok) {
                    location.reload();
                } else {
                    const error = await response.json();
                    alert('メモの更新に失敗しました: ' + error.error);
                }
            } catch (error) {
                alert('エラーが発生しました: ' + error.message);
            }
        }
    </script>
</body>
</html>
    `;
  } catch (error) {
    fastify.log.error(error);
    reply.code(500).send({ error: 'Internal Server Error' });
  }
});

// API: 全メモ取得
fastify.get('/api/memos', async (request, reply) => {
  try {
    const memos = await loadData();
    reply.send(memos);
  } catch (error) {
    fastify.log.error(error);
    reply.code(500).send({ error: 'Internal Server Error' });
  }
});

// API: メモ追加
fastify.post('/api/memos', async (request, reply) => {
  try {
    const { title, content } = request.body;
    
    if (!title || title.trim() === '') {
      reply.code(400).send({ error: 'タイトルが必要です' });
      return;
    }
    
    if (!content || content.trim() === '') {
      reply.code(400).send({ error: '内容が必要です' });
      return;
    }
    
    const memos = await loadData();
    const newId = memos.length > 0 ? Math.max(...memos.map(m => m.id)) + 1 : 1;
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
    fastify.log.error(error);
    reply.code(500).send({ error: 'Internal Server Error' });
  }
});

// API: メモ更新
fastify.put('/api/memos/:id', async (request, reply) => {
  try {
    const id = parseInt(request.params.id);
    const { title, content } = request.body;
    
    if (!title || title.trim() === '') {
      reply.code(400).send({ error: 'タイトルが必要です' });
      return;
    }
    
    if (!content || content.trim() === '') {
      reply.code(400).send({ error: '内容が必要です' });
      return;
    }
    
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
    fastify.log.error(error);
    reply.code(500).send({ error: 'Internal Server Error' });
  }
});

// API: メモ削除
fastify.delete('/api/memos/:id', async (request, reply) => {
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
    
    reply.send(deletedMemo);
  } catch (error) {
    fastify.log.error(error);
    reply.code(500).send({ error: 'Internal Server Error' });
  }
});

// サーバーを3000番ポートで起動
const start = async () => {
  try {
    await fastify.listen({ 
      port: 3000, 
      host: '0.0.0.0' 
    });
    console.log('🚀 日本語メモアプリが http://localhost:3000 で起動しました');
  } catch (err) {
    fastify.log.error(err);
    console.error('❌ サーバーの起動に失敗しました:', err.message);
    process.exit(1);
  }
};

// アプリケーション開始
start();