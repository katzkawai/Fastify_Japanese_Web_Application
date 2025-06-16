# 日本語メモアプリ (Japanese Memo App)

A beautiful and intuitive memo application built with Fastify that allows users to create, organize, and manage their notes in Japanese. This application features a clean, modern interface with full CRUD operations and persistent JSON-based storage, making it perfect for personal note-taking, journaling, or organizing thoughts and ideas.

## ✨ Key Features

- **📝 Full CRUD Operations**: Create, read, update, and delete memos with ease
- **📋 Title & Content Structure**: Organize memos with descriptive titles and detailed content
- **🇯🇵 Japanese Language Support**: Optimized UTF-8 encoding and Japanese font rendering
- **💾 Persistent Storage**: Data is automatically saved in JSON format and persists between sessions
- **🎨 Beautiful UI**: Modern, gradient-based design with smooth animations and transitions
- **📱 Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **⚡ Real-time Updates**: Instant UI updates after creating, editing, or deleting memos
- **🔍 Inline Editing**: Edit memos directly in the interface without navigating to separate pages
- **📊 Memo Statistics**: View total memo count and creation/update timestamps
- **🚀 RESTful API**: Clean API endpoints for programmatic access and integrations

## 🚀 Installation

### Prerequisites

Ensure you have the following installed on your system:

- **Node.js** (version 16.0 or higher)
- **npm** (usually comes with Node.js)
- A modern web browser (Chrome, Firefox, Safari, Edge)

### Step-by-Step Installation

1. **Clone or download the project**:
   ```bash
   git clone <your-repository-url>
   cd japanese-memo-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Verify installation**:
   ```bash
   npm list
   ```

4. **Start the application**:
   ```bash
   npm run dev
   ```

5. **Access the application**:
   Open your browser and navigate to: `http://localhost:3000`

## 📖 Usage Guide

### Starting the Application

```bash
# Start in development mode
npm run dev

# Or start in production mode
npm start
```

The application will start on port 3000 and display:
```
🚀 日本語メモアプリが http://localhost:3000 で起動しました
```

### Web Interface Operations

#### ✍️ Creating a New Memo
1. Navigate to the main page
2. Fill in the "新しいメモを作成" (Create New Memo) form:
   - **タイトル** (Title): Enter a descriptive title for your memo
   - **内容** (Content): Write the main content of your memo
3. Click "💾 メモを保存" (Save Memo) to create the memo

#### 📖 Viewing Memos
- All memos are displayed in the "📋 メモ一覧" (Memo List) section
- Each memo shows:
  - Title and content
  - Creation date and time
  - Last updated time (if different from creation time)
  - Action buttons for editing and deletion

#### ✏️ Editing a Memo
1. Find the memo you want to edit
2. Click the "✏️ 編集" (Edit) button
3. Modify the title and/or content in the edit form
4. Click "💾 更新" (Update) to save changes
5. Click "❌ キャンセル" (Cancel) to discard changes

#### 🗑️ Deleting a Memo
1. Locate the memo you want to delete
2. Click the "🗑️ 削除" (Delete) button
3. Confirm deletion in the popup dialog
4. The memo will be permanently removed

### API Endpoints

The application provides a RESTful API for programmatic access:

#### 📋 Get All Memos
```bash
curl -X GET http://localhost:3000/api/memos
```

**Response Example:**
```json
[
  {
    "id": 1,
    "title": "買い物リスト",
    "content": "牛乳、パン、卵を買う",
    "createdAt": "2025-01-02T12:00:00.000Z",
    "updatedAt": "2025-01-02T12:00:00.000Z"
  }
]
```

#### ✍️ Create a New Memo
```bash
curl -X POST http://localhost:3000/api/memos \
  -H "Content-Type: application/json" \
  -d '{
    "title": "新しいメモ",
    "content": "メモの内容をここに書きます"
  }'
```

#### ✏️ Update a Memo
```bash
curl -X PUT http://localhost:3000/api/memos/1 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "更新されたタイトル",
    "content": "更新された内容"
  }'
```

#### 🗑️ Delete a Memo
```bash
curl -X DELETE http://localhost:3000/api/memos/1
```

## 📁 Project Structure

```
japanese-memo-app/
├── index.js          # Main Fastify server application
├── package.json      # Project dependencies and scripts
├── data.json         # JSON file for memo data persistence
└── README.md         # This documentation file
```

## ⚙️ Configuration

### Port Configuration
To change the default port (3000), modify the `index.js` file:

```javascript
await fastify.listen({ 
  port: 8080,  // Change to your desired port
  host: '0.0.0.0' 
});
```

### Data Storage Location
To change the data file location, modify the `DATA_FILE` constant:

```javascript
const DATA_FILE = path.join(__dirname, 'my-memos.json'); // Custom filename
```

## 🎨 Features in Detail

### User Interface
- **Modern Design**: Clean, card-based layout with gradient backgrounds
- **Smooth Animations**: Hover effects and transitions for better user experience
- **Responsive Layout**: Automatically adapts to different screen sizes
- **Emoji Integration**: Visual icons for better navigation and user engagement

### Data Management
- **Automatic Timestamps**: Tracks creation and modification times
- **Data Validation**: Ensures both title and content are provided
- **Error Handling**: Comprehensive error messages for better debugging
- **File-based Storage**: Simple JSON file storage without database dependencies

### Developer Features
- **Clean API**: RESTful endpoints following best practices
- **Logging**: Built-in Fastify logging for debugging and monitoring
- **Error Responses**: Proper HTTP status codes and error messages

## 🔧 Troubleshooting

### Common Issues and Solutions

1. **Port Already in Use**
   ```
   Error: listen EADDRINUSE: address already in use :::3000
   ```
   **Solution**: Change the port number or stop the conflicting process:
   ```bash
   lsof -ti:3000 | xargs kill -9  # Kill process using port 3000
   ```

2. **Data File Corruption**
   If the `data.json` file becomes corrupted:
   ```bash
   rm data.json
   npm start  # Will create a new empty data file
   ```

3. **Module Installation Issues**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Japanese Text Display Issues**
   Ensure your browser supports UTF-8 encoding and has Japanese fonts installed.

## 🔮 Future Enhancements

Potential features for future versions:
- 🔍 Search and filter functionality
- 🏷️ Tags and categories for better organization
- 📤 Export memos to different formats (PDF, TXT)
- 🔐 User authentication and private memos
- 📱 Mobile app version
- ☁️ Cloud synchronization

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

---

**メモを楽しんでください！Happy note-taking!** 📝✨